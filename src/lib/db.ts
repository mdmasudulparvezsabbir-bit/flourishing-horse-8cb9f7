import pg from 'pg';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = (process.env.MONGODB_SQL_URL || process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL || '').trim();

const isCloudSql = !!process.env.SQL_HOST && !!process.env.SQL_USER;

let isPostgresActual = isCloudSql || (!!connectionString && 
  (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')));

let isMysqlActual = !isCloudSql && (!!connectionString && connectionString.startsWith('mysql://'));

if (!!connectionString && !isPostgresActual && !isMysqlActual && connectionString.includes('supabase')) {
  console.error("CRITICAL: connection string seems to be a Supabase URL (https://...) instead of a connection string (postgresql://...).");
}

let pgPool: any = null;
let mysqlPool: any = null;
let sqliteDb: any = null;

if (isPostgresActual) {
  if (isCloudSql) {
    console.log(`Cloud SQL (PostgreSQL) detected. Connecting via host proxy: ${process.env.SQL_HOST}`);
    const poolConfig: any = {
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 20
    };
    pgPool = new Pool(poolConfig);
    
    pgPool.on('error', (err: any) => {
      console.error('Unexpected error on idle PostgreSQL client (Cloud SQL)', err);
    });
  } else {
    // Automatically switch to Supabase transaction pooler port if on port 5432 
    // to avoid common timeout issues in serverless environments.
    let updatedConnectionString = connectionString;
    if (connectionString.includes('supabase.co:5432') && !connectionString.includes('pgbouncer=true')) {
       console.log("Switching Supabase connection to transaction pooler port (6543) for better reliability.");
       updatedConnectionString = connectionString.replace(':5432', ':6543') + (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }

    const match = updatedConnectionString.match(/@([^:/]+)/);
    const host = match ? match[1] : '';

    if (host === 'base' || host === '[YOUR-HOST]' || !host) {
      console.warn(`CRITICAL: Database host is invalid ('${host}'). Falling back to local SQLite.`);
      isPostgresActual = false;
    } else {
      console.log(`PostgreSQL Database URL detected. Connecting to: ${host}`);
      const poolConfig: any = {
        connectionString: updatedConnectionString,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
      };
      
      if (connectionString.includes('supabase') || connectionString.includes('render') || connectionString.includes('aiven') || connectionString.includes('aws') || connectionString.includes('cockroach')) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
      pgPool = new Pool(poolConfig);
      
      pgPool.on('error', (err: any) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
      });
    }
  }
} else if (isMysqlActual) {
  console.log("MySQL/MongoDB SQL Interface connection detected.");
  mysqlPool = mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: connectionString.includes('ssl=true') ? { rejectUnauthorized: false } : undefined
  });
}

export const isPostgres = isPostgresActual;
export const isMysql = isMysqlActual;

if (!isPostgres && !isMysql) {
  console.warn("Using local SQLite database.");
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  sqliteDb = new Database(dbPath);
}

// Helper to mimic the [rows, fields] return pattern of mysql2/better-sqlite3 mock
export const query = async (text: string, params: any[] = []) => {
  if (isPostgres) {
    try {
      // Basic conversion of ? to $1, $2, etc. for PostgreSQL
      let postgresText = text;
      let paramIndex = 1;
      while (postgresText.includes('?')) {
        postgresText = postgresText.replace('?', `$${paramIndex++}`);
      }

      // Convert SQLITE/MySQL specific terms to Postgres. Note: This is basic.
      postgresText = postgresText
        .replace(/AUTOINCREMENT/gi, 'SERIAL')
        .replace(/DATETIME DEFAULT \(datetime\('now','localtime'\)\)/gi, 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
        .replace(/DATETIME/gi, 'TIMESTAMP WITH TIME ZONE')
        .replace(/BOOLEAN/gi, 'BOOLEAN')
        .replace(/AUTO_INCREMENT/gi, 'SERIAL');

      const res = await pgPool.query(postgresText, params);
      
      // For SELECT queries, return [rows, fields]
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        return [res.rows, res.fields];
      }
      
      // For INSERT/UPDATE/DELETE, return [result, fields]
      const mysqlResult = {
        affectedRows: res.rowCount,
        insertId: res.rows[0]?.id || null, 
        ...(res.rows[0] || {}), // Include returned fields like 'id' directly on the result object
        ...res
      };
      return [mysqlResult, null];
    } catch (err: any) {
      // Provide more context for common DNS/Connection errors
      if (err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') {
        console.error(`PostgreSQL DNS Error (${err.code}): Failed to resolve database host. Please verify your DATABASE_URL.`);
      } else if (err.code === 'ECONNREFUSED') {
        console.error(`PostgreSQL Connection Error: Connection refused at ${err.address}:${err.port}.`);
      } else {
        console.error('PostgreSQL Database Error:', err.message || err);
      }
      throw err;
    }
  } else if (isMysql) {
    try {
      const [rows, fields] = await mysqlPool.execute(text, params);
      return [rows, fields];
    } catch (err: any) {
      console.error('MySQL/MongoDB SQL Error:', err.message || err);
      throw err;
    }
  } else {
    // SQLite Implementation
    try {
      let sqliteSql = text
        .replace(/SERIAL/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
        .replace(/TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP/gi, "DATETIME DEFAULT (datetime('now','localtime'))")
        .replace(/TIMESTAMP WITH TIME ZONE/gi, "DATETIME")
        .replace(/UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
        .replace(/REFERENCES [^(]+(?:\([^)]+\))?/gi, ''); // Basic removal of foreign keys for simple transitions

      // Convert Date objects, booleans, and undefined in params for SQLite
      const sqliteParams = params.map(param => {
        if (param instanceof Date) return param.toISOString();
        if (typeof param === 'boolean') return param ? 1 : 0;
        if (param === undefined) return null;
        if (param !== null && typeof param === 'object') return JSON.stringify(param);
        return param;
      });

      if (sqliteSql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = sqliteDb.prepare(sqliteSql);
        const rows = stmt.all(...sqliteParams);
        return [rows, null];
      } else {
        const stmt = sqliteDb.prepare(sqliteSql);
        const result = stmt.run(...sqliteParams);
        const mysqlResult = {
          ...result,
          insertId: result.lastInsertRowid,
          affectedRows: result.changes
        };
        return [mysqlResult, null];
      }
    } catch (error) {
      console.error('SQLite Database Error:', error);
      throw error;
    }
  }
};

export default { query, isPostgres, isMysql };
