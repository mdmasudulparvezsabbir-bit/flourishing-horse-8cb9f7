import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import * as jose from "jose";
import pool from "../src/lib/db";
import { createClient as createSupabaseClient, createAdminClient } from "./supabaseServer";

import dotenv from "dotenv";

dotenv.config();

// Global error handlers to prevent the app from pausing/crashing on unhandled async errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const isValidUUID = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const app = express();
const supabaseAdmin = createAdminClient();
app.use(cookieParser());
const DB_FILE = path.join(process.cwd(), "db.json");
const JWKS_FILE = path.join(process.cwd(), "api", "jwks.json");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

let jwks: any = null;
async function loadJWKS() {
  try {
    const data = await fs.readFile(JWKS_FILE, "utf-8");
    jwks = JSON.parse(data);
    console.log("JWKS loaded successfully");
  } catch (error) {
    // Ignore if file doesn't exist
  }
}
loadJWKS();

// Fallback Data Store (if MySQL fails)
let fallbackData: any = { 
  users: [], 
  income: [], 
  expenses: [], 
  requisitions: [], 
  notifications: [], 
  stock_items: [],
  purchases: [],
  due_payments: [],
  stock_out: [],
  settings: { 
    companyName: "Abirlink ERP", 
    balances: { cash: 0, bkash: 0, nagad: 0, dbbl: 0 },
    logo: null,
    netlifyBuildHook: "",
    netlifyPreviewHook: "",
    netlifyDeployKey: "",
    cloudflareToken: "",
    cloudflareApi: ""
  } 
};
let useFallback = false;
let sdkEnabled = true;

async function loadFallback() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    fallbackData = JSON.parse(data);
    console.log("Loaded fallback data from db.json");
  } catch (error) {
    console.log("No db.json found, using empty fallback state.");
  }
  
  // Ensure default admin exists in fallback
  if (fallbackData.users.length === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    fallbackData.users.push({
      id: 1,
      username: "admin",
      password: hashedPassword,
      role: "Admin",
      name: "System Admin",
      photo: null,
      created_at: new Date()
    });
    await saveFallback();
  }
}

async function saveFallback() {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(fallbackData, null, 2));
  } catch (error) {
    console.error("Failed to save fallback data:", error);
  }
}

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://erp.abirlinkcommunicationbd.com",
    "http://erp.abirlinkcommunicationbd.com"
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// DB Initialization
async function initializeDB() {
  console.log("Initializing Database Connection to Supabase...");
  
  try {
    // Ping Supabase
    if (supabaseAdmin) {
      const currentSchema = process.env.SUPABASE_SCHEMA || 'public';
      console.log(`Probing Supabase SDK connection (schema: ${currentSchema})...`);
      
      try {
        const { data: pingData, error: pingError } = await supabaseAdmin.from('users').select('*').limit(1);
        
        if (pingError) {
          const errorMsg = pingError.message || "";
          
          if (errorMsg.includes('Invalid schema: public')) {
             console.log("[Supabase Config] Schema 'public' needs to be enabled in dashboard settings.");
          }
          
          if (errorMsg.includes('relation "users" does not exist') || errorMsg.includes('Could not find the table')) {
             console.log("[Database Config] Connected to Supabase backend; pending tables setup.");
             useFallback = false;
             sdkEnabled = true;
          } else {
             console.log("[Database Setup] SDK connector off-grid. Directing connection to local pool / SQLite configuration.");
             sdkEnabled = false;
          }
        } else {
          console.log(`[Database Setup] Supabase connection completed successfully.`);
          useFallback = false;
          sdkEnabled = true;
        }
      } catch (connErr: any) {
        console.log("[Database Setup] Supabase service not reachable or offline. Directing database requests to local pool / SQLite.");
        sdkEnabled = false;
      }
    } else {
      console.log("[Database Setup] Supabase credentials not found. Using local database storage.");
      sdkEnabled = false;
    }

    const isPostgres = pool.isPostgres;
    const isMysql = pool.isMysql;
    
    // Quick probe to test connection
    await pool.query("SELECT 1");
    console.log("SQL Database pool probe successful.");
    useFallback = false;

    if (isPostgres) {
      console.log("Using Postgres/Supabase mode.");
      // Explicitly set the search path to public to avoid "schema: public" errors
      try {
        await pool.query("SET search_path TO public");
        console.log("Search path set to 'public'");
      } catch (e: any) {
        console.warn("Failed to set search path to 'public':", e.message);
      }
      
      // The schema should be handled by migration scripts, but ensure tables exist
      await pool.query("CREATE SCHEMA IF NOT EXISTS public");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'User',
          name TEXT NOT NULL,
          photo TEXT DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS income (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          amount DECIMAL(15,2) NOT NULL,
          category TEXT NOT NULL,
          source TEXT NOT NULL,
          description TEXT,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          amount DECIMAL(15,2) NOT NULL,
          category TEXT NOT NULL,
          subcategory TEXT,
          source TEXT NOT NULL,
          description TEXT,
          attachment TEXT,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'Pending',
          manager_note TEXT,
          admin_note TEXT,
          deducted_amount DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          company_name TEXT DEFAULT 'Abirlink ERP',
          logo TEXT DEFAULT NULL,
          balances JSONB,
          netlify_build_hook TEXT DEFAULT NULL,
          netlify_preview_hook TEXT DEFAULT NULL,
          netlify_deploy_key TEXT DEFAULT NULL
        )
      `);

      try {
        await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS netlify_build_hook TEXT DEFAULT NULL");
        await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS netlify_preview_hook TEXT DEFAULT NULL");
        await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS netlify_deploy_key TEXT DEFAULT NULL");
        await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS cloudflare_token TEXT DEFAULT NULL");
        await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS cloudflare_api TEXT DEFAULT NULL");
      } catch (colErr: any) {
        console.log("Settings columns already exist in Postgres.");
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS requisitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          title TEXT NOT NULL,
          items TEXT NOT NULL,
          total_amount DECIMAL(15,2) NOT NULL,
          reason TEXT,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'Pending',
          admin_note TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          quantity DECIMAL(15,2) DEFAULT 0,
          unit TEXT DEFAULT 'pcs',
          last_purchase_price DECIMAL(15,2) DEFAULT 0,
          min_stock_level DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID REFERENCES stock_items(id),
          quantity DECIMAL(15,2) NOT NULL,
          price_per_unit DECIMAL(15,2) NOT NULL,
          total_amount DECIMAL(15,2) NOT NULL,
          paid_amount DECIMAL(15,2) DEFAULT 0,
          due_amount DECIMAL(15,2) DEFAULT 0,
          supplier TEXT,
          source TEXT NOT NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'Pending',
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      try {
        await pool.query("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending'");
      } catch (colErr: any) {
        console.log("Status column already exists or matches pg schema.");
      }

      // Automatically register DB-level trigger to decrement stock level when a purchase is marked 'Approved'
      try {
        await pool.query(`
          CREATE OR REPLACE FUNCTION decrement_stock_on_approve()
          RETURNS TRIGGER AS $$
          BEGIN
            IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status <> 'Approved') THEN
              IF NEW.item_id IS NOT NULL THEN
                UPDATE stock_items 
                SET quantity = quantity - NEW.quantity 
                WHERE id = NEW.item_id;
              END IF;
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await pool.query(`
          DROP TRIGGER IF EXISTS trg_decrement_stock_on_approve ON purchases;
        `);

        await pool.query(`
          CREATE TRIGGER trg_decrement_stock_on_approve
          AFTER UPDATE ON purchases
          FOR EACH ROW
          EXECUTE FUNCTION decrement_stock_on_approve();
        `);
        console.log("[Trigger Setup] PostgreSQL stock decrement trigger registered.");
      } catch (triggerErr: any) {
        console.warn("[Trigger Warning] PostgreSQL trigger setup issue:", triggerErr.message);
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS due_payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_id UUID REFERENCES purchases(id),
          amount DECIMAL(15,2) NOT NULL,
          source TEXT NOT NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_out (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID REFERENCES stock_items(id),
          quantity DECIMAL(15,2) NOT NULL,
          destination TEXT NOT NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS room_members (
          room_id UUID REFERENCES rooms(id),
          user_id UUID REFERENCES users(id),
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (room_id, user_id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id UUID REFERENCES rooms(id),
          user_id UUID REFERENCES users(id) NOT NULL,
          body TEXT NOT NULL,
          inserted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          is_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else if (isMysql) {
      console.log("Using MySQL (MongoDB SQL Interface) schema.");
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(128) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role VARCHAR(50) DEFAULT 'User',
          name VARCHAR(255) NOT NULL,
          photo TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS income (
          id VARCHAR(128) PRIMARY KEY,
          userId VARCHAR(128),
          amount DECIMAL(15,2) NOT NULL,
          category VARCHAR(255) NOT NULL,
          source VARCHAR(255) NOT NULL,
          description TEXT,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id VARCHAR(128) PRIMARY KEY,
          userId VARCHAR(128),
          amount DECIMAL(15,2) NOT NULL,
          category VARCHAR(255) NOT NULL,
          subcategory VARCHAR(255),
          source VARCHAR(255) NOT NULL,
          description TEXT,
          attachment TEXT,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'Pending',
          managerNote TEXT,
          adminNote TEXT,
          deductedAmount DECIMAL(15,2) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(128) PRIMARY KEY,
          userId VARCHAR(128),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          companyName VARCHAR(255) DEFAULT 'Abirlink ERP',
          logo TEXT DEFAULT NULL,
          balances JSON,
          netlifyBuildHook TEXT DEFAULT NULL,
          netlifyPreviewHook TEXT DEFAULT NULL,
          netlifyDeployKey TEXT DEFAULT NULL
        )
      `);

      try {
        const [settingsCols]: any = await pool.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'settings' AND COLUMN_NAME = 'netlifyBuildHook'
        `);
        if (!settingsCols || settingsCols.length === 0) {
          await pool.query("ALTER TABLE settings ADD COLUMN netlifyBuildHook TEXT DEFAULT NULL");
          await pool.query("ALTER TABLE settings ADD COLUMN netlifyPreviewHook TEXT DEFAULT NULL");
          await pool.query("ALTER TABLE settings ADD COLUMN netlifyDeployKey TEXT DEFAULT NULL");
        }
        const [cfCols]: any = await pool.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'settings' AND COLUMN_NAME = 'cloudflareToken'
        `);
        if (!cfCols || cfCols.length === 0) {
          await pool.query("ALTER TABLE settings ADD COLUMN cloudflareToken TEXT DEFAULT NULL");
          await pool.query("ALTER TABLE settings ADD COLUMN cloudflareApi TEXT DEFAULT NULL");
        }
      } catch (err) {}

      await pool.query(`
        CREATE TABLE IF NOT EXISTS requisitions (
          id VARCHAR(128) PRIMARY KEY,
          userId VARCHAR(128),
          title VARCHAR(255) NOT NULL,
          items TEXT NOT NULL,
          totalAmount DECIMAL(15,2) NOT NULL,
          reason TEXT,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'Pending',
          adminNote TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_items (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          quantity DECIMAL(15,2) DEFAULT 0,
          unit VARCHAR(50) DEFAULT 'pcs',
          last_purchase_price DECIMAL(15,2) DEFAULT 0,
          min_stock_level DECIMAL(15,2) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id VARCHAR(128) PRIMARY KEY,
          itemId VARCHAR(128),
          quantity DECIMAL(15,2) NOT NULL,
          pricePerUnit DECIMAL(15,2) NOT NULL,
          totalAmount DECIMAL(15,2) NOT NULL,
          paidAmount DECIMAL(15,2) DEFAULT 0,
          dueAmount DECIMAL(15,2) DEFAULT 0,
          supplier VARCHAR(255),
          source VARCHAR(255) NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'Pending',
          userId VARCHAR(128),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      try {
        const [purchaseCols]: any = await pool.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'purchases' AND COLUMN_NAME = 'status'
        `);
        if (!purchaseCols || purchaseCols.length === 0) {
          await pool.query("ALTER TABLE purchases ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'");
        }
      } catch (colErr: any) {
        // Safe fail if column matches schema
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS due_payments (
          id VARCHAR(128) PRIMARY KEY,
          purchaseId VARCHAR(128),
          amount DECIMAL(15,2) NOT NULL,
          source VARCHAR(255) NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId VARCHAR(128),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_out (
          id VARCHAR(128) PRIMARY KEY,
          itemId VARCHAR(128),
          quantity DECIMAL(15,2) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId VARCHAR(128),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS room_members (
          room_id VARCHAR(128),
          userId VARCHAR(128),
          role VARCHAR(50) DEFAULT 'member',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (room_id, userId)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(128) PRIMARY KEY,
          room_id VARCHAR(128),
          userId VARCHAR(128) NOT NULL,
          body TEXT NOT NULL,
          inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          is_completed BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      console.log("Using SQLite schema.");
      // Create Users Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'User',
          name TEXT NOT NULL,
          photo TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Income Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS income (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          category TEXT NOT NULL,
          source TEXT NOT NULL,
          description TEXT,
          date DATETIME DEFAULT (datetime('now','localtime')),
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Expenses Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          category TEXT NOT NULL,
          subcategory TEXT,
          source TEXT NOT NULL,
          description TEXT,
          attachment TEXT,
          date DATETIME DEFAULT (datetime('now','localtime')),
          status TEXT DEFAULT 'Pending',
          managerNote TEXT,
          adminNote TEXT,
          deductedAmount DECIMAL(15,2) DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Notifications Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          date DATETIME DEFAULT (datetime('now','localtime')),
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Settings Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          companyName TEXT DEFAULT 'Abirlink ERP',
          logo TEXT DEFAULT NULL,
          balances TEXT,
          netlifyBuildHook TEXT DEFAULT NULL,
          netlifyPreviewHook TEXT DEFAULT NULL,
          netlifyDeployKey TEXT DEFAULT NULL
        )
      `);

      try {
        const [settingsMeta]: any = await pool.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'");
        if (settingsMeta && settingsMeta[0] && settingsMeta[0].sql) {
          const tableSql = settingsMeta[0].sql;
          if (!tableSql.includes('netlifyBuildHook')) {
            await pool.query("ALTER TABLE settings ADD COLUMN netlifyBuildHook TEXT DEFAULT NULL");
          }
          if (!tableSql.includes('netlifyPreviewHook')) {
            await pool.query("ALTER TABLE settings ADD COLUMN netlifyPreviewHook TEXT DEFAULT NULL");
          }
          if (!tableSql.includes('netlifyDeployKey')) {
            await pool.query("ALTER TABLE settings ADD COLUMN netlifyDeployKey TEXT DEFAULT NULL");
          }
          if (!tableSql.includes('cloudflareToken')) {
            await pool.query("ALTER TABLE settings ADD COLUMN cloudflareToken TEXT DEFAULT NULL");
          }
          if (!tableSql.includes('cloudflareApi')) {
            await pool.query("ALTER TABLE settings ADD COLUMN cloudflareApi TEXT DEFAULT NULL");
          }
        }
      } catch (err) {}

      // Create Requisitions Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS requisitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          title TEXT NOT NULL,
          items TEXT NOT NULL,
          totalAmount DECIMAL(15,2) NOT NULL,
          reason TEXT,
          date DATETIME DEFAULT (datetime('now','localtime')),
          status TEXT DEFAULT 'Pending',
          adminNote TEXT,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Stock Items Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          quantity DECIMAL(15,2) DEFAULT 0,
          unit TEXT DEFAULT 'pcs',
          last_purchase_price DECIMAL(15,2) DEFAULT 0,
          min_stock_level DECIMAL(15,2) DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Purchases Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          itemId INTEGER NOT NULL,
          quantity DECIMAL(15,2) NOT NULL,
          pricePerUnit DECIMAL(15,2) NOT NULL,
          totalAmount DECIMAL(15,2) NOT NULL,
          paidAmount DECIMAL(15,2) DEFAULT 0,
          dueAmount DECIMAL(15,2) DEFAULT 0,
          supplier TEXT,
          source TEXT NOT NULL,
          date DATETIME DEFAULT (datetime('now','localtime')),
          status TEXT DEFAULT 'Pending',
          userId INTEGER NOT NULL,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      try {
        const [purchasesMeta]: any = await pool.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchases'");
        if (purchasesMeta && purchasesMeta[0] && purchasesMeta[0].sql) {
          const tableSql = purchasesMeta[0].sql;
          if (!tableSql.includes('status')) {
            await pool.query("ALTER TABLE purchases ADD COLUMN status TEXT DEFAULT 'Pending'");
          }
        }
      } catch (colErr: any) {
        // Safe fail if column matches schema
      }

      // Create Due Payments Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS due_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          purchaseId INTEGER NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          source TEXT NOT NULL,
          date DATETIME DEFAULT (datetime('now','localtime')),
          userId INTEGER NOT NULL,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      // Create Stock Out Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_out (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          itemId INTEGER NOT NULL,
          quantity DECIMAL(15,2) NOT NULL,
          destination TEXT NOT NULL,
          date DATETIME DEFAULT (datetime('now','localtime')),
          userId INTEGER NOT NULL,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS room_members (
          room_id INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at DATETIME DEFAULT (datetime('now','localtime')),
          PRIMARY KEY (room_id, userId)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id INTEGER,
          userId INTEGER NOT NULL,
          body TEXT NOT NULL,
          inserted_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          is_completed BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT (datetime('now','localtime'))
        )
      `);
    }

    // Check if default admin exists
    const [users]: any = await pool.query("SELECT * FROM users WHERE username = 'admin'");
    if (users.length === 0) {
      console.log("Creating default admin...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const isPostgres = pool.isPostgres;
      const isMysql = pool.isMysql;
      
      if (isPostgres) {
        await pool.query(
          "INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?) RETURNING id",
          ["admin", hashedPassword, "Admin", "System Admin"]
        );
      } else if (isMysql) {
        await pool.query(
          "INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)",
          [crypto.randomUUID(), "admin", hashedPassword, "Admin", "System Admin"]
        );
      } else {
        await pool.query(
          "INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)",
          ["admin", hashedPassword, "Admin", "System Admin"]
        );
      }
    }

    // Check if default settings exist
    const [settings]: any = await pool.query("SELECT * FROM settings");
    if (settings.length === 0) {
      console.log("Creating default settings...");
      const isPostgres = pool.isPostgres;
      const isMysql = pool.isMysql;
      const defaultBalances = { cash: 0, bkash: 0, nagad: 0, dbbl: 0 };
      
      if (isPostgres) {
        await pool.query(
          "INSERT INTO settings (company_name, balances) VALUES (?, ?)",
          ["Abirlink ERP", JSON.stringify(defaultBalances)]
        );
      } else if (isMysql) {
        await pool.query(
          "INSERT INTO settings (companyName, balances) VALUES (?, ?)",
          ["Abirlink ERP", JSON.stringify(defaultBalances)]
        );
      } else {
        await pool.query(
          "INSERT INTO settings (companyName, balances) VALUES (?, ?)",
          ["Abirlink ERP", JSON.stringify(defaultBalances)]
        );
      }
    }

    // Check if default rooms exist
    const [rooms]: any = await pool.query("SELECT * FROM rooms WHERE name = 'general'");
    if (rooms.length === 0) {
      console.log("Creating default 'general' room...");
      await pool.query("INSERT INTO rooms (name) VALUES (?)", ["general"]);
    }

    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    console.error("Switching to Offline Mode (JSON Fallback).");
    useFallback = true;
    await loadFallback();
  }
}
initializeDB();

// Ensure uploads directory exists
async function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
}
ensureUploadsDir();

// Notification Helper
async function addNotification(userId: any, title: string, message: string, type: "info" | "success" | "warning" = "info") {
  try {
    if (supabaseAdmin && sdkEnabled) {
      const { error } = await supabaseAdmin.from('notifications').insert([{
        user_id: userId,
        title,
        message,
        type,
        date: new Date(),
        read: false
      }]);
      if (!error) return; // Success
    }

    const isPostgres = pool.isPostgres;
    
    // Safety check for Postgres UUID: If userId is numeric, it shouldn't be used in UUID queries
    if (isPostgres && (typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId)))) {
      console.warn(`Skipping notification for numeric user ID ${userId} in Postgres mode`);
      return;
    }

    if (useFallback) {
      fallbackData.notifications.unshift({
        id: Date.now().toString(),
        userId,
        title,
        message,
        type,
        date: new Date(),
        is_read: false
      });
      await saveFallback();
    } else {
      let query = "INSERT INTO notifications (userId, title, message, type, date, is_read) VALUES (?, ?, ?, ?, ?, ?)";
      if (isPostgres) {
        query = "INSERT INTO notifications (user_id, title, message, type, date, is_read) VALUES (?, ?, ?, ?, ?, ?)";
      }
      await pool.query(
        query,
        [userId, title, message, type, new Date(), false]
      );
    }
  } catch (error) {
    console.error("Failed to add notification:", error);
  }
}

// Auth Middleware
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    // Try standard JWT with secret first (local auth)
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Fall through to JWK verification if secret fails
    }

    if (decoded) {
      // Special check: If we are in Postgres mode with UUIDs but the token has a numeric ID,
      // it means the token is from an old schema or fallback mode.
      const isPostgres = pool.isPostgres;
      const isNumericId = typeof decoded.id === 'number' || (typeof decoded.id === 'string' && /^\d+$/.test(decoded.id));
      
      if (isPostgres && isNumericId) {
        console.warn(`Auth token has numeric ID (${decoded.id}) but database is using UUIDs. Forcing re-login.`);
        return res.status(401).json({ error: "Session expired due to system upgrade. Please log in again." });
      }
      
      req.user = decoded;
      return next();
    }

    // Try JWK verification (Supabase auth)
    if (jwks) {
      try {
        const JWKS = jose.createLocalJWKSet(jwks);
        const { payload } = await jose.jwtVerify(token, JWKS);
        
        // Map Supabase claims to local user structure
        req.user = {
          id: payload.sub,
          username: payload.email as string || (payload as any).username || payload.sub,
          role: (payload.app_metadata as any)?.role || (payload as any).role || (payload as any).user_metadata?.role || "User",
          ...payload
        };
        return next();
      } catch (joseErr: any) {
        console.error("JWK Verification failed:", joseErr.message);
      }
    }

    res.status(401).json({ error: "Invalid token" });
  } catch (err: any) {
    console.error("Authentication error:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// --- Supabase Server-Side Fetching Example ---
// This replaces the Next.js "Server Component" pattern
app.get("/api/supabase-todos", authenticate, async (req: any, res: any) => {
  const supabase = createSupabaseClient(req, res);
  if (!supabase) {
    return res.status(500).json({ error: "Supabase server client not configured" });
  }

  try {
    const { data: todos, error } = await supabase.from('todos').select('*');
    if (error) throw error;
    res.json(todos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    let user;
    if (supabaseAdmin && sdkEnabled) {
      const { data: supabaseUsers, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (!error && supabaseUsers) {
        user = supabaseUsers;
      }
    }

    if (!user) {
      if (useFallback) {
        user = fallbackData.users.find((u: any) => u.username === username);
      } else {
        const [users]: any = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        user = users[0];
      }
    }
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role, name: user.name, photo: user.photo } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/users", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    if (useFallback) {
      const users = fallbackData.users.map(({ password, ...u }: any) => u);
      return res.json(users);
    }
    const [users]: any = await pool.query("SELECT id, username, role, name, photo, created_at FROM users");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/users", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { username, password, role, name, photo } = req.body;
    const isPostgres = pool.isPostgres;

    if (useFallback) {
      if (fallbackData.users.some((u: any) => u.username === username)) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: Date.now().toString(), username, password: hashedPassword, role, name, photo, created_at: new Date() };
      fallbackData.users.push(newUser);
      await saveFallback();
      const { password: _, ...userWithoutPassword } = newUser;
      return res.json(userWithoutPassword);
    }

    const isMysql = pool.isMysql;
    const [existingUsers]: any = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = isMysql ? crypto.randomUUID() : null;
    
    let queryStr = "INSERT INTO users (username, password, role, name, photo) VALUES (?, ?, ?, ?, ?) RETURNING id, username, role, name, photo";
    let params = [username, hashedPassword, role, name, photo];
    
    if (isMysql) {
      queryStr = "INSERT INTO users (id, username, password, role, name, photo) VALUES (?, ?, ?, ?, ?, ?)";
      params = [id, username, hashedPassword, role, name, photo];
    } else if (!pool.isPostgres) {
      queryStr = "INSERT INTO users (username, password, role, name, photo) VALUES (?, ?, ?, ?, ?)";
    }

    const [result]: any = await pool.query(queryStr, params);
    
    if (pool.isPostgres) {
      res.json(result.rows ? result.rows[0] : { id: result.id, username, role, name, photo });
    } else if (isMysql) {
      res.json({ id, username, role, name, photo });
    } else {
      res.json({ id: result.insertId, username, role, name, photo });
    }
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505' || error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: "Username already exists" });
    }
    console.error("User creation error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/users/:id", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { username, password, role, name, photo } = req.body;
    const id = req.params.id;
    
    if (useFallback) {
      const index = fallbackData.users.findIndex((u: any) => u.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "User not found" });
      
      if (fallbackData.users.some((u: any) => u.username === username && u.id.toString() !== id.toString())) {
        return res.status(400).json({ error: "Username already exists" });
      }

      fallbackData.users[index] = { ...fallbackData.users[index], username, role, name, photo };
      if (password) {
        fallbackData.users[index].password = await bcrypt.hash(password, 10);
      }
      await saveFallback();
      return res.json({ id, username, role, name, photo });
    }

    const [existingUsers]: any = await pool.query("SELECT id FROM users WHERE username = ? AND id != ?", [username, id]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    let query = "UPDATE users SET username = ?, role = ?, name = ?, photo = ? WHERE id = ?";
    let params = [username, role, name, photo, id];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = "UPDATE users SET username = ?, password = ?, role = ?, name = ?, photo = ? WHERE id = ?";
      params = [username, hashedPassword, role, name, photo, id];
    }
    
    await pool.query(query, params);
    res.json({ id, username, role, name, photo });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505' || error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: "Username already exists" });
    }
    console.error("User update error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.put("/api/profile", authenticate, async (req: any, res) => {
  try {
    const { password, name, photo } = req.body;
    const id = req.user.id;
    
    let finalPhoto = photo;
    if (photo && photo.startsWith("data:image/")) {
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext = photo.match(/^data:image\/(\w+);base64,/)[1];
      const nameStr = `${Date.now()}-${id || "profile"}.${ext}`;
      const filePath = path.join(process.cwd(), "uploads", nameStr);
      await fs.writeFile(filePath, buffer);
      finalPhoto = `/uploads/${nameStr}`;
    }

    if (useFallback) {
      const index = fallbackData.users.findIndex((u: any) => u.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "User not found" });

      if (name) {
        fallbackData.users[index].name = name;
      }
      if (finalPhoto !== undefined) {
        fallbackData.users[index].photo = finalPhoto;
      }
      if (password) {
        fallbackData.users[index].password = await bcrypt.hash(password, 10);
      }
      await saveFallback();
      const updated = fallbackData.users[index];
      return res.json({ id: updated.id, username: updated.username, role: updated.role, name: updated.name, photo: updated.photo });
    }

    const [users]: any = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    const currentUser = users[0];
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const newName = name || currentUser.name;
    const newPhoto = finalPhoto !== undefined ? finalPhoto : currentUser.photo;

    let query = "UPDATE users SET name = ?, photo = ? WHERE id = ?";
    let params = [newName, newPhoto, id];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = "UPDATE users SET password = ?, name = ?, photo = ? WHERE id = ?";
      params = [hashedPassword, newName, newPhoto, id];
    }

    await pool.query(query, params);
    res.json({ id, username: currentUser.username, role: currentUser.role, name: newName, photo: newPhoto });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.delete("/api/users/:id", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const id = req.params.id;
    if (useFallback) {
      fallbackData.users = fallbackData.users.filter((u: any) => u.id.toString() !== id.toString());
      await saveFallback();
      return res.json({ success: true });
    }
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.get("/api/income", authenticate, async (req: any, res) => {
  try {
    if (supabaseAdmin && sdkEnabled) {
      let query = supabaseAdmin.from('income').select('*');
      if (req.user.role !== "Admin" && req.user.role !== "Manager") {
        query = query.eq('user_id', req.user.id);
      }
      const { data, error } = await query;
      if (!error && data) {
        return res.json(data.map(i => ({ ...i, userId: i.user_id })));
      }
    }

    const isPostgres = pool.isPostgres;
    if (useFallback) {
      let income = fallbackData.income;
      if (req.user.role !== "Admin" && req.user.role !== "Manager") {
        income = income.filter((i: any) => i.userId.toString() === req.user.id.toString());
      }
      return res.json(income);
    }
    let query = "SELECT * FROM income";
    let params: any[] = [];
    if (req.user.role !== "Admin" && req.user.role !== "Manager") {
      query = isPostgres ? "SELECT * FROM income WHERE user_id = ?" : "SELECT * FROM income WHERE userId = ?";
      params = [req.user.id];
    }
    const [income]: any = await pool.query(query, params);
    
    // Normalize to camelCase for frontend if needed (or just send as is if frontend handles snake_case)
    if (isPostgres) {
      const normalized = income.map((i: any) => ({
        ...i,
        userId: i.user_id,
        // other fields...
      }));
      return res.json(normalized);
    }
    res.json(income);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch income" });
  }
});

app.post("/api/income", authenticate, async (req: any, res) => {
  try {
    const { amount, source, category, note, date } = req.body;
    const incomeDate = date ? new Date(date) : new Date();
    const description = note || "";

    if (supabaseAdmin && sdkEnabled) {
      const { data, error } = await supabaseAdmin
        .from('income')
        .insert([{
          user_id: req.user.id,
          amount,
          category,
          source,
          note: description,
          date: incomeDate
        }])
        .select()
        .single();

      if (!error && data) {
        // Notify Admins and Managers
        const { data: admins } = await supabaseAdmin.from('users').select('id').in('role', ['Admin', 'Manager']);
        if (admins) {
          for (const user of admins) {
            await addNotification(user.id, "New Income Added", `${req.user.username} added ${amount} to ${source}`, "success");
          }
        }
        return res.json({ ...data, userId: data.user_id, description: data.note });
      }
    }

    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      const newIncome = { id: Date.now().toString(), userId: req.user.id, amount, source, category, description, date: incomeDate };
      fallbackData.income.push(newIncome);
      await saveFallback();
      
      // Notify Admins and Managers
      const adminsAndManagers = fallbackData.users.filter((u: any) => u.role === "Admin" || u.role === "Manager");
      for (const user of adminsAndManagers) {
        await addNotification(user.id, "New Income Added", `${req.user.username} added ${amount} to ${source}`, "success");
      }
      return res.json(newIncome);
    }
    
    let query = "INSERT INTO income (userId, amount, category, source, description, date) VALUES (?, ?, ?, ?, ?, ?)";
    if (isPostgres) {
      query = "INSERT INTO income (user_id, amount, category, source, description, date) VALUES (?, ?, ?, ?, ?, ?) RETURNING id";
    }

    const [result]: any = await pool.query(query, [req.user.id, amount, category, source, description, incomeDate]);
    
    // Notify Admins and Managers
    const adminQuery = isPostgres ? "SELECT id FROM users WHERE role IN ('Admin', 'Manager')" : "SELECT id FROM users WHERE role IN ('Admin', 'Manager')";
    const [adminsAndManagers]: any = await pool.query(adminQuery);
    for (const user of adminsAndManagers) {
      await addNotification(user.id, "New Income Added", `${req.user.username} added ${amount} to ${source}`, "success");
    }

    res.json({ id: isPostgres ? result.id : result.insertId, userId: req.user.id, amount, category, source, description, date: incomeDate });
  } catch (error) {
    console.error("Failed to add income:", error);
    res.status(500).json({ error: "Failed to add income" });
  }
});

app.get("/api/expenses", authenticate, async (req: any, res) => {
  try {
    if (supabaseAdmin && sdkEnabled) {
      let query = supabaseAdmin.from('expenses').select('*');
      if (req.user.role !== "Admin" && req.user.role !== "Manager") {
        query = query.eq('user_id', req.user.id);
      }
      const { data, error } = await query;
      if (!error && data) {
        return res.json(data.map(e => ({
          ...e,
          userId: e.user_id,
          managerNote: e.manager_note,
          adminNote: e.admin_note,
          deductedAmount: e.deducted_amount
        })));
      }
    }

    const isPostgres = pool.isPostgres;
    if (useFallback) {
      let expenses = fallbackData.expenses;
      if (req.user.role !== "Admin" && req.user.role !== "Manager") {
        expenses = expenses.filter((e: any) => e.userId.toString() === req.user.id.toString());
      }
      return res.json(expenses);
    }
    let query = "SELECT * FROM expenses";
    let params: any[] = [];
    if (req.user.role !== "Admin" && req.user.role !== "Manager") {
      query = isPostgres ? "SELECT * FROM expenses WHERE user_id = ?" : "SELECT * FROM expenses WHERE userId = ?";
      params = [req.user.id];
    }
    const [expenses]: any = await pool.query(query, params);
    
    if (isPostgres) {
      const normalized = expenses.map((e: any) => ({
        ...e,
        userId: e.user_id,
        managerNote: e.manager_note,
        adminNote: e.admin_note,
        deductedAmount: e.deducted_amount
      }));
      return res.json(normalized);
    }
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

app.post("/api/expenses", authenticate, async (req: any, res) => {
  try {
    const { amount, source, category, subcategory, note, attachment, date } = req.body;
    const expenseDate = date ? new Date(date) : new Date();
    const description = note || "";

    if (supabaseAdmin && sdkEnabled) {
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .insert([{
          user_id: req.user.id,
          amount,
          category,
          subcategory,
          source,
          note: description,
          attachment,
          date: expenseDate,
          status: "Pending"
        }])
        .select()
        .single();
      
      if (!error && data) {
        // Notify Managers
        const { data: managers } = await supabaseAdmin.from('users').select('id').in('role', ['Admin', 'Manager']);
        if (managers) {
          for (const user of managers) {
            await addNotification(user.id, "New Expense Pending", `${req.user.username} submitted an expense of ${amount}`, "warning");
          }
        }
        return res.json({
          ...data,
          userId: data.user_id,
          description: data.note,
          managerNote: data.manager_note,
          deductedAmount: data.deducted_amount
        });
      }
    }

    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      const newExpense = { 
        id: Date.now().toString(), 
        userId: req.user.id, 
        amount, 
        source, 
        category, 
        subcategory, 
        description, 
        attachment, 
        date: expenseDate, 
        status: "Pending", 
        managerNote: "", 
        deductedAmount: 0 
      };
      fallbackData.expenses.push(newExpense);
      await saveFallback();
      
      // Notify Managers
      const managers = fallbackData.users.filter((u: any) => u.role === "Admin" || u.role === "Manager");
      for (const user of managers) {
        await addNotification(user.id, "New Expense Pending", `${req.user.username} submitted an expense of ${amount}`, "warning");
      }
      return res.json(newExpense);
    }
    
    let query = "INSERT INTO expenses (userId, amount, category, subcategory, source, description, attachment, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";
    if (isPostgres) {
      query = "INSERT INTO expenses (user_id, amount, category, subcategory, source, description, attachment, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending') RETURNING id";
    }

    const [result]: any = await pool.query(query, [req.user.id, amount, category, subcategory, source, description, attachment, expenseDate]);

    // Notify Managers
    const adminQuery = isPostgres ? "SELECT id FROM users WHERE role IN ('Admin', 'Manager')" : "SELECT id FROM users WHERE role IN ('Admin', 'Manager')";
    const [managers]: any = await pool.query(adminQuery);
    for (const user of managers) {
      await addNotification(user.id, "New Expense Pending", `${req.user.username} submitted an expense of ${amount}`, "warning");
    }

    res.json({ 
      id: isPostgres ? result.id : result.insertId, 
      userId: req.user.id, 
      amount, 
      category, 
      subcategory, 
      source, 
      description, 
      attachment, 
      date: expenseDate, 
      status: "Pending" 
    });
  } catch (error) {
    console.error("Failed to add expense:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

app.put("/api/expenses/:id/verify", authenticate, async (req: any, res) => {
  if (req.user.role !== "Manager" && req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { note, deductedAmount } = req.body;
    const id = req.params.id;
    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      const index = fallbackData.expenses.findIndex((e: any) => e.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "Expense not found" });
      
      fallbackData.expenses[index].status = "Verified";
      fallbackData.expenses[index].managerNote = note;
      fallbackData.expenses[index].deductedAmount = deductedAmount || 0;
      await saveFallback();
      
      const expense = fallbackData.expenses[index];
      // Notify Admins
      const admins = fallbackData.users.filter((u: any) => u.role === "Admin");
      for (const user of admins) {
        await addNotification(user.id, "Expense Verified", `An expense of ${expense.amount} has been verified.`, "info");
      }
      // Notify Submitter
      await addNotification(expense.userId, "Expense Verified", `Your expense of ${expense.amount} has been verified.`, "success");
      return res.json(expense);
    }
    
    let query = "UPDATE expenses SET status = 'Verified', managerNote = ?, deductedAmount = ? WHERE id = ?";
    if (isPostgres) {
      query = "UPDATE expenses SET status = 'Verified', manager_note = ?, deducted_amount = ? WHERE id = ?";
    }
    await pool.query(query, [note, deductedAmount || 0, id]);
    
    const [expenses]: any = await pool.query("SELECT * FROM expenses WHERE id = ?", [id]);
    const expense = expenses[0];
    
    if (isPostgres && expense) {
      expense.userId = expense.user_id;
      expense.managerNote = expense.manager_note;
      expense.deductedAmount = expense.deducted_amount;
    }

    // Notify Admins
    const adminQuery = isPostgres ? "SELECT id FROM users WHERE role = 'Admin'" : "SELECT id FROM users WHERE role = 'Admin'";
    const [admins]: any = await pool.query(adminQuery);
    for (const user of admins) {
      await addNotification(user.id, "Expense Verified", `An expense of ${expense.amount} has been verified.`, "info");
    }

    // Notify Submitter
    await addNotification(isPostgres ? expense.user_id : expense.userId, "Expense Verified", `Your expense of ${expense.amount} has been verified.`, "success");

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to verify expense" });
  }
});

app.put("/api/expenses/:id/approve", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { deductedAmount, adminNote } = req.body;
    const id = req.params.id;
    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      const index = fallbackData.expenses.findIndex((e: any) => e.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "Expense not found" });
      
      fallbackData.expenses[index].status = "Approved";
      fallbackData.expenses[index].adminNote = adminNote;
      if (deductedAmount !== undefined) {
        fallbackData.expenses[index].deductedAmount = deductedAmount;
      }
      await saveFallback();
      
      const expense = fallbackData.expenses[index];
      // Notify Submitter
      await addNotification(expense.userId, "Expense Approved", `Your expense of ${expense.amount} has been approved.`, "success");
      return res.json(expense);
    }
    
    let query = "UPDATE expenses SET status = 'Approved', deductedAmount = ?, adminNote = ? WHERE id = ?";
    if (isPostgres) query = "UPDATE expenses SET status = 'Approved', deducted_amount = ?, admin_note = ? WHERE id = ?";
    await pool.query(query, [deductedAmount !== undefined ? deductedAmount : 0, adminNote || "", id]);
    
    const [expenses]: any = await pool.query("SELECT * FROM expenses WHERE id = ?", [id]);
    const expense = expenses[0];
    
    if (isPostgres && expense) {
      expense.userId = expense.user_id;
      expense.managerNote = expense.manager_note;
      expense.adminNote = expense.admin_note;
      expense.deductedAmount = expense.deducted_amount;
    }

    // Notify Submitter
    await addNotification(isPostgres ? expense.user_id : expense.userId, "Expense Approved", `Your expense of ${expense.amount} has been approved.`, "success");

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve expense" });
  }
});

app.put("/api/expenses/:id/reject", authenticate, async (req: any, res) => {
  if (req.user.role !== "Manager" && req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { note } = req.body;
    const id = req.params.id;
    const isPostgres = pool.isPostgres;
    const role = req.user.role;
    
    if (useFallback) {
      const index = fallbackData.expenses.findIndex((e: any) => e.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "Expense not found" });
      
      fallbackData.expenses[index].status = "Rejected";
      if (role === "Manager") {
        fallbackData.expenses[index].managerNote = note;
      } else {
        fallbackData.expenses[index].adminNote = note;
      }
      await saveFallback();
      
      const expense = fallbackData.expenses[index];
      await addNotification(expense.userId, "Expense Rejected", `Your expense of ${expense.amount} has been rejected.`, "warning");
      return res.json(expense);
    }
    
    let query = role === "Manager" 
      ? "UPDATE expenses SET status = 'Rejected', managerNote = ? WHERE id = ?"
      : "UPDATE expenses SET status = 'Rejected', adminNote = ? WHERE id = ?";
      
    if (isPostgres) {
      query = role === "Manager"
        ? "UPDATE expenses SET status = 'Rejected', manager_note = ? WHERE id = ?"
        : "UPDATE expenses SET status = 'Rejected', admin_note = ? WHERE id = ?";
    }
    
    await pool.query(query, [note || "Rejected by " + role, id]);
    
    const [expenses]: any = await pool.query("SELECT * FROM expenses WHERE id = ?", [id]);
    const expense = expenses[0];
    
    if (isPostgres && expense) {
      expense.userId = expense.user_id;
      expense.managerNote = expense.manager_note;
      expense.adminNote = expense.admin_note;
      expense.deductedAmount = expense.deducted_amount;
    }

    await addNotification(isPostgres ? expense.user_id : expense.userId, "Expense Rejected", `Your expense of ${expense.amount} has been rejected.`, "warning");

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to reject expense" });
  }
});

app.post("/api/upload", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  const { image, filename } = req.body;
  if (!image) return res.status(400).json({ error: "No image provided" });

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = image.match(/^data:image\/(\w+);base64,/)[1];
  const name = `${Date.now()}-${filename || "logo"}.${ext}`;
  const filePath = path.join(process.cwd(), "uploads", name);

  try {
    await fs.writeFile(filePath, buffer);
    res.json({ url: `/uploads/${name}` });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Public settings for Login page
app.get("/api/public/settings", async (req, res) => {
  try {
    const isPostgres = pool.isPostgres;
    const queryStr = isPostgres ? "SELECT company_name, logo FROM settings LIMIT 1" : "SELECT companyName, logo FROM settings LIMIT 1";
    const [settings]: any = await pool.query(queryStr);
    const setting = settings[0] || { companyName: "Abirlink ERP", logo: null };
    if (isPostgres && setting) {
      setting.companyName = setting.company_name;
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch public settings" });
  }
});

// Public upload for Admin branding (requires admin credentials)
app.post("/api/public/upload-logo", async (req, res) => {
  const { username, password, image, filename } = req.body;
  try {
    const [users]: any = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = users[0];
    
    if (!user || user.role !== "Admin" || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    if (!image) return res.status(400).json({ error: "No image provided" });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const ext = image.match(/^data:image\/(\w+);base64,/)[1];
    const name = `${Date.now()}-${filename || "logo"}.${ext}`;
    const filePath = path.join(process.cwd(), "uploads", name);

    await fs.writeFile(filePath, buffer);
    const url = `/uploads/${name}`;
    
    await pool.query("UPDATE settings SET logo = ?", [url]);
    res.json({ url });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/settings", authenticate, async (req, res) => {
  try {
    if (supabaseAdmin && sdkEnabled) {
      const { data, error } = await supabaseAdmin.from('settings').select('*').limit(1).single();
      if (!error && data) {
        if (data.balances && typeof data.balances === 'string') {
          data.balances = JSON.parse(data.balances);
        }
        return res.json({
          ...data,
          companyName: data.company_name || data.companyName
        });
      }
    }

    if (useFallback) {
      return res.json(fallbackData.settings);
    }
    const isPostgres = pool.isPostgres;
    const [settings]: any = await pool.query("SELECT * FROM settings LIMIT 1");
    let setting = settings[0];
    
    if (!setting) {
      setting = {
        companyName: "Abirlink ERP",
        logo: null,
        balances: { cash: 0, bkash: 0, nagad: 0, dbbl: 0 },
        netlifyBuildHook: "",
        netlifyPreviewHook: "",
        netlifyDeployKey: "",
        cloudflareToken: "",
        cloudflareApi: ""
      };
    } else {
      if (setting.balances) {
        setting.balances = typeof setting.balances === 'string' ? JSON.parse(setting.balances) : setting.balances;
      }
      if (isPostgres) {
        setting.companyName = setting.company_name;
        setting.netlifyBuildHook = setting.netlify_build_hook;
        setting.netlifyPreviewHook = setting.netlify_preview_hook;
        setting.netlifyDeployKey = setting.netlify_deploy_key;
        setting.cloudflareToken = setting.cloudflare_token || "";
        setting.cloudflareApi = setting.cloudflare_api || "";
      } else {
        setting.netlifyBuildHook = setting.netlifyBuildHook || "";
        setting.netlifyPreviewHook = setting.netlifyPreviewHook || "";
        setting.netlifyDeployKey = setting.netlifyDeployKey || "";
        setting.cloudflareToken = setting.cloudflareToken || "";
        setting.cloudflareApi = setting.cloudflareApi || "";
      }
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put("/api/settings", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { companyName, logo, balances, netlifyBuildHook, netlifyPreviewHook, netlifyDeployKey, cloudflareToken, cloudflareApi } = req.body;
    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      fallbackData.settings = { companyName, logo, balances, netlifyBuildHook, netlifyPreviewHook, netlifyDeployKey, cloudflareToken, cloudflareApi };
      await saveFallback();
      return res.json(fallbackData.settings);
    }
    
    const balancesStr = JSON.stringify(balances);
    if (isPostgres) {
      await pool.query(
        "UPDATE settings SET company_name = ?, logo = ?, balances = ?, netlify_build_hook = ?, netlify_preview_hook = ?, netlify_deploy_key = ?, cloudflare_token = ?, cloudflare_api = ? WHERE id = 1",
        [companyName, logo, balancesStr, netlifyBuildHook, netlifyPreviewHook, netlifyDeployKey, cloudflareToken, cloudflareApi]
      );
    } else {
      await pool.query(
        "UPDATE settings SET companyName = ?, logo = ?, balances = ?, netlifyBuildHook = ?, netlifyPreviewHook = ?, netlifyDeployKey = ?, cloudflareToken = ?, cloudflareApi = ? LIMIT 1",
        [companyName, logo, balancesStr, netlifyBuildHook, netlifyPreviewHook, netlifyDeployKey, cloudflareToken, cloudflareApi]
      );
    }
    res.json({ companyName, logo, balances, netlifyBuildHook, netlifyPreviewHook, netlifyDeployKey, cloudflareToken, cloudflareApi });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.post("/api/netlify/trigger", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin" && req.user.role !== "Manager") return res.status(403).json({ error: "Forbidden" });
  try {
    const { type } = req.body; // 'build' or 'preview'
    const isPostgres = pool.isPostgres;

    let buildHookUrl = "";
    let previewHookUrl = "";

    if (useFallback) {
      buildHookUrl = fallbackData.settings.netlifyBuildHook || "";
      previewHookUrl = fallbackData.settings.netlifyPreviewHook || "";
    } else {
      const [settings]: any = await pool.query("SELECT * FROM settings LIMIT 1");
      const setting = settings[0];
      if (setting) {
        buildHookUrl = isPostgres ? setting.netlify_build_hook : setting.netlifyBuildHook;
        previewHookUrl = isPostgres ? setting.netlify_preview_hook : setting.netlifyPreviewHook;
      }
    }

    const targetUrl = type === "build" ? buildHookUrl : previewHookUrl;

    if (!targetUrl) {
      return res.status(400).json({ error: "Deploy hook URL has not been configured in settings." });
    }

    console.log(`[Netlify Webhook] Triggering POST request to: ${targetUrl}`);
    const hookRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const statusText = hookRes.statusText;
    const statusCode = hookRes.status;
    let textResponse = "";
    try {
      textResponse = await hookRes.text();
    } catch (_) {}

    if (hookRes.ok) {
      res.json({
        success: true,
        statusCode,
        statusText,
        message: `Successfully triggered Netlify ${type} hook!`,
        response: textResponse || "Webhook call accepted (Empty body response)."
      });
    } else {
      res.status(400).json({
        success: false,
        statusCode,
        statusText,
        error: `Netlify trigger failed: ${statusCode} ${statusText}. Response: ${textResponse}`
      });
    }
  } catch (error: any) {
    console.error("Netlify trigger exception:", error);
    res.status(500).json({ error: `Connection failed: ${error.message}` });
  }
});

app.post("/api/admin/reset", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const isPostgres = pool.isPostgres;
    if (useFallback) {
      fallbackData.income = [];
      fallbackData.expenses = [];
      fallbackData.notifications = [];
      fallbackData.requisitions = [];
      fallbackData.stock_items = [];
      fallbackData.purchases = [];
      fallbackData.due_payments = [];
      fallbackData.stock_out = [];
      fallbackData.users = fallbackData.users.filter((u: any) => u.username === "admin");
      fallbackData.settings = { 
        companyName: "Abirlink ERP", 
        balances: { cash: 0, bkash: 0, nagad: 0, dbbl: 0 },
        logo: null
      };
      await saveFallback();
      return res.json({ success: true });
    }
    
    // Reset All Tables
    await pool.query("DELETE FROM income");
    await pool.query("DELETE FROM expenses");
    await pool.query("DELETE FROM notifications");
    await pool.query("DELETE FROM requisitions");
    await pool.query("DELETE FROM stock_items");
    await pool.query("DELETE FROM purchases");
    await pool.query("DELETE FROM due_payments");
    await pool.query("DELETE FROM stock_out");
    await pool.query("DELETE FROM users WHERE username != 'admin'");
    
    // Reset settings to default
    const defaultBalances = JSON.stringify({ cash: 0, bkash: 0, nagad: 0, dbbl: 0 });
    if (isPostgres) {
      await pool.query("UPDATE settings SET company_name = ?, logo = ?, balances = ? WHERE id = 1", ["Abirlink ERP", null, defaultBalances]);
    } else {
      await pool.query("UPDATE settings SET companyName = ?, logo = ?, balances = ?", ["Abirlink ERP", null, defaultBalances]);
    }
    
    // Clear uploads directory
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file !== ".gitkeep") { // Keep .gitkeep if it exists
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch (err) {
      console.error("Failed to clear uploads:", err);
      // Don't fail the whole reset if uploads fail to clear
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ error: "Failed to reset data" });
  }
});

app.get("/api/notifications", authenticate, async (req: any, res) => {
  try {
    const isPostgres = pool.isPostgres;
    if (useFallback) {
      const notifications = fallbackData.notifications.filter((n: any) => n.userId.toString() === req.user.id.toString());
      return res.json(notifications);
    }
    const queryStr = isPostgres 
      ? "SELECT * FROM notifications WHERE user_id = ? ORDER BY date DESC" 
      : "SELECT * FROM notifications WHERE userId = ? ORDER BY date DESC";
    const [notifications]: any = await pool.query(queryStr, [req.user.id]);
    
    if (isPostgres) {
      const normalized = notifications.map((n: any) => ({
        ...n,
        userId: n.user_id,
        is_read: n.is_read
      }));
      return res.json(normalized);
    }
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.put("/api/notifications/read-all", authenticate, async (req: any, res) => {
  try {
    const isPostgres = pool.isPostgres;
    if (useFallback) {
      fallbackData.notifications.forEach((n: any) => {
        if (n.userId.toString() === req.user.id.toString()) n.is_read = true;
      });
      await saveFallback();
      return res.json({ success: true });
    }
    const queryStr = isPostgres 
      ? "UPDATE notifications SET is_read = TRUE WHERE user_id = ?" 
      : "UPDATE notifications SET is_read = TRUE WHERE userId = ?";
    await pool.query(queryStr, [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

// Stock Management Endpoints
app.get("/api/stock", authenticate, async (req, res) => {
  try {
    const [stock]: any = await pool.query("SELECT * FROM stock_items ORDER BY name ASC");
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stock" });
  }
});

app.post("/api/stock", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin" && req.user.role !== "Manager") return res.status(403).json({ error: "Forbidden" });
  try {
    const { name, description, unit, min_stock_level } = req.body;
    const isPostgres = pool.isPostgres;
    
    const [result]: any = await pool.query(
      `INSERT INTO stock_items (name, description, unit, min_stock_level) VALUES (?, ?, ?, ?) ${isPostgres ? 'RETURNING id' : ''}`,
      [name, description, unit, min_stock_level || 0]
    );
    res.json({ id: isPostgres ? result.id : result.insertId, name, description, unit, min_stock_level, quantity: 0, last_purchase_price: 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to add stock item" });
  }
});

app.put("/api/stock/:id", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin" && req.user.role !== "Manager") return res.status(403).json({ error: "Forbidden" });
  try {
    const { name, description, unit, min_stock_level } = req.body;
    await pool.query(
      "UPDATE stock_items SET name = ?, description = ?, unit = ?, min_stock_level = ? WHERE id = ?",
      [name, description, unit, min_stock_level, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update stock item" });
  }
});

// Purchase Endpoints
app.get("/api/purchases", authenticate, async (req: any, res: any) => {
  try {
    const isPostgres = pool.isPostgres;
    const isAdminOrManager = req.user.role === "Admin" || req.user.role === "Manager";
    
    let queryStr;
    let params: any[] = [];
    
    if (isPostgres) {
      if (isAdminOrManager) {
        queryStr = `
          SELECT p.*, s.name as "itemName", u.name as "userName" 
          FROM purchases p 
          JOIN stock_items s ON p.item_id = s.id 
          JOIN users u ON p.user_id = u.id 
          ORDER BY p.date DESC
        `;
      } else {
        queryStr = `
          SELECT p.*, s.name as "itemName", u.name as "userName" 
          FROM purchases p 
          JOIN stock_items s ON p.item_id = s.id 
          JOIN users u ON p.user_id = u.id 
          WHERE p.user_id = ?
          ORDER BY p.date DESC
        `;
        params = [req.user.id];
      }
    } else {
      if (isAdminOrManager) {
        queryStr = `
          SELECT p.*, s.name as itemName, u.name as userName 
          FROM purchases p 
          JOIN stock_items s ON p.itemId = s.id 
          JOIN users u ON p.userId = u.id 
          ORDER BY p.date DESC
        `;
      } else {
        queryStr = `
          SELECT p.*, s.name as itemName, u.name as userName 
          FROM purchases p 
          JOIN stock_items s ON p.itemId = s.id 
          JOIN users u ON p.userId = u.id 
          WHERE p.userId = ?
          ORDER BY p.date DESC
        `;
        params = [req.user.id];
      }
    }
    
    const [purchases]: any = await pool.query(queryStr, params);
    
    if (isPostgres) {
      const normalized = purchases.map((p: any) => ({
        ...p,
        itemId: p.item_id,
        userId: p.user_id,
        userName: p.userName, // Already aliased
        itemName: p.itemName, // Already aliased
        pricePerUnit: p.price_per_unit,
        totalAmount: p.total_amount,
        paidAmount: p.paid_amount,
        dueAmount: p.due_amount
      }));
      return res.json(normalized);
    }
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

app.post("/api/purchases", authenticate, async (req: any, res) => {
  try {
    const { itemId, quantity, pricePerUnit, supplier, source, date, paidAmount } = req.body;
    const totalAmount = quantity * pricePerUnit;
    const purchaseDate = date ? new Date(date) : new Date();
    const paid = Number(paidAmount || 0);
    const due = totalAmount - paid;
    const isPostgres = pool.isPostgres;

    // 1. Record Purchase
    let query = "INSERT INTO purchases (itemId, quantity, pricePerUnit, totalAmount, paidAmount, dueAmount, supplier, source, date, userId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";
    if (isPostgres) {
      query = "INSERT INTO purchases (item_id, quantity, price_per_unit, total_amount, paid_amount, due_amount, supplier, source, date, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending') RETURNING id";
    }

    const [result]: any = await pool.query(query, [itemId, quantity, pricePerUnit, totalAmount, paid, due, supplier, source, purchaseDate, req.user.id]);

    const purchaseId = isPostgres ? result.id : result.insertId;

    // 2. Update Stock
    await pool.query(
      "UPDATE stock_items SET quantity = quantity + ?, last_purchase_price = ? WHERE id = ?",
      [quantity, pricePerUnit, itemId]
    );

    // 3. Adjust Balance (Add as Approved Expense for the paid amount)
    if (paid > 0) {
      const [item]: any = await pool.query("SELECT name FROM stock_items WHERE id = ?", [itemId]);
      const itemName = item[0]?.name || "Stock Item";
      
      let expenseQuery = "INSERT INTO expenses (userId, amount, category, subcategory, source, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved')";
      if (isPostgres) {
        expenseQuery = "INSERT INTO expenses (user_id, amount, category, subcategory, source, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved')";
      }
      await pool.query(
        expenseQuery,
        [req.user.id, paid, "Stock Purchase", itemName, source, `Purchase of ${quantity} ${itemName} from ${supplier || 'Unknown'} (Paid: ${paid})`, purchaseDate]
      );
    }

    res.json({ id: purchaseId, success: true });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({ error: "Failed to record purchase" });
  }
});

app.put("/api/purchases/:id/status", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin" && req.user.role !== "Manager") return res.status(403).json({ error: "Forbidden" });
  try {
    const { status } = req.body;
    const { id } = req.params;
    const isPostgres = pool.isPostgres;

    if (useFallback) {
      const index = fallbackData.purchases.findIndex((p: any) => p.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "Purchase not found" });
      
      const oldStatus = fallbackData.purchases[index].status || 'Pending';
      fallbackData.purchases[index].status = status;

      // When marked as 'Approved', decrement stock levels if linked to inventory items
      if (status === "Approved" && oldStatus !== "Approved") {
        const itemId = fallbackData.purchases[index].itemId || fallbackData.purchases[index].item_id;
        const quantity = fallbackData.purchases[index].quantity;
        if (itemId) {
          const itemIndex = fallbackData.stock_items.findIndex((item: any) => item.id.toString() === itemId.toString());
          if (itemIndex !== -1) {
            fallbackData.stock_items[itemIndex].quantity = Number(fallbackData.stock_items[itemIndex].quantity || 0) - Number(quantity);
          }
        }
      }
      await saveFallback();
      return res.json({ id, status, success: true });
    }

    // SQL flow
    const [purchases]: any = await pool.query("SELECT * FROM purchases WHERE id = ?", [id]);
    if (purchases.length === 0) return res.status(404).json({ error: "Purchase not found" });
    const purchase = purchases[0];

    const oldStatus = purchase.status || 'Pending';
    
    // Update purchase status
    await pool.query("UPDATE purchases SET status = ? WHERE id = ?", [status, id]);

    // Server-side function: Decrement stock levels when purchase is marked as 'Approved'
    // This is run server-side to guarantee correct inventory adjustment
    if (status === "Approved" && oldStatus !== "Approved") {
      const itemId = isPostgres ? purchase.item_id : purchase.itemId;
      const quantity = Number(purchase.quantity);
      if (itemId) {
        await pool.query(
          "UPDATE stock_items SET quantity = quantity - ? WHERE id = ?",
          [quantity, itemId]
        );
      }
    }

    res.json({ id, status, success: true });
  } catch (error) {
    console.error("Failed to update purchase status:", error);
    res.status(500).json({ error: "Failed to update purchase status" });
  }
});

// Due Purchase Endpoints
app.get("/api/due-purchases", authenticate, async (req: any, res: any) => {
  try {
    const isPostgres = pool.isPostgres;
    const isAdminOrManager = req.user.role === "Admin" || req.user.role === "Manager";
    
    let queryStr;
    let params: any[] = [];
    
    if (isPostgres) {
      if (isAdminOrManager) {
        queryStr = `
          SELECT p.*, s.name as "itemName", u.name as "userName" 
          FROM purchases p 
          JOIN stock_items s ON p.item_id = s.id 
          JOIN users u ON p.user_id = u.id 
          WHERE p.due_amount > 0
          ORDER BY p.date DESC
        `;
      } else {
        queryStr = `
          SELECT p.*, s.name as "itemName", u.name as "userName" 
          FROM purchases p 
          JOIN stock_items s ON p.item_id = s.id 
          JOIN users u ON p.user_id = u.id 
          WHERE p.due_amount > 0 AND p.user_id = ?
          ORDER BY p.date DESC
        `;
        params = [req.user.id];
      }
    } else {
      if (isAdminOrManager) {
        queryStr = `
          SELECT p.*, s.name as itemName, u.name as userName 
          FROM purchases p 
          JOIN stock_items s ON p.itemId = s.id 
          JOIN users u ON p.userId = u.id 
          WHERE p.dueAmount > 0
          ORDER BY p.date DESC
        `;
      } else {
        queryStr = `
          SELECT p.*, s.name as itemName, u.name as userName 
          FROM purchases p 
          JOIN stock_items s ON p.itemId = s.id 
          JOIN users u ON p.userId = u.id 
          WHERE p.dueAmount > 0 AND p.userId = ?
          ORDER BY p.date DESC
        `;
        params = [req.user.id];
      }
    }
    
    const [dues]: any = await pool.query(queryStr, params);
    
    if (isPostgres) {
      const normalized = dues.map((p: any) => ({
        ...p,
        itemId: p.item_id,
        userId: p.user_id,
        userName: p.userName,
        itemName: p.itemName,
        pricePerUnit: p.price_per_unit,
        totalAmount: p.total_amount,
        paidAmount: p.paid_amount,
        dueAmount: p.due_amount
      }));
      return res.json(normalized);
    }
    res.json(dues);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch due purchases" });
  }
});

app.post("/api/due-payments", authenticate, async (req: any, res) => {
  try {
    const { purchaseId, amount, source, date } = req.body;
    const paymentDate = date ? new Date(date) : new Date();
    const payAmount = Number(amount);
    const isPostgres = pool.isPostgres;

    // 1. Get purchase details
    const [purchases]: any = await pool.query("SELECT * FROM purchases WHERE id = ?", [purchaseId]);
    if (purchases.length === 0) return res.status(404).json({ error: "Purchase not found" });
    
    const purchase = purchases[0];
    const dueAmount = isPostgres ? purchase.due_amount : purchase.dueAmount;
    if (payAmount > dueAmount) {
      return res.status(400).json({ error: "Payment amount exceeds due amount" });
    }

    // 2. Record Payment
    let paymentQuery = "INSERT INTO due_payments (purchaseId, amount, source, date, userId) VALUES (?, ?, ?, ?, ?)";
    if (isPostgres) {
      paymentQuery = "INSERT INTO due_payments (purchase_id, amount, source, date, user_id) VALUES (?, ?, ?, ?, ?)";
    }
    await pool.query(paymentQuery, [purchaseId, payAmount, source, paymentDate, req.user.id]);

    // 3. Update Purchase
    let updatePurchaseQuery = "UPDATE purchases SET paidAmount = paidAmount + ?, dueAmount = dueAmount - ? WHERE id = ?";
    if (isPostgres) {
      updatePurchaseQuery = "UPDATE purchases SET paid_amount = paid_amount + ?, due_amount = due_amount - ? WHERE id = ?";
    }
    await pool.query(updatePurchaseQuery, [payAmount, payAmount, purchaseId]);

    // 4. Create Expense
    let expenseQuery = "INSERT INTO expenses (userId, amount, category, subcategory, source, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved')";
    if (isPostgres) {
      expenseQuery = "INSERT INTO expenses (user_id, amount, category, subcategory, source, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved')";
    }
    await pool.query(
      expenseQuery,
      [req.user.id, payAmount, "Due Payment", "Inventory", source, `Due Payment for Purchase ID: ${purchaseId}`, paymentDate]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Due payment error:", error);
    res.status(500).json({ error: "Failed to record due payment" });
  }
});

// Stock Out Endpoints
app.get("/api/stock-out", authenticate, async (req: any, res: any) => {
  try {
    const isPostgres = pool.isPostgres;
    const isAdminOrManager = req.user.role === "Admin" || req.user.role === "Manager";
    
    let queryStr;
    let params: any[] = [];
    
    if (isPostgres) {
      if (isAdminOrManager) {
        queryStr = `
          SELECT so.*, s.name as "itemName", u.name as "userName" 
          FROM stock_out so 
          JOIN stock_items s ON so.item_id = s.id 
          JOIN users u ON so.user_id = u.id 
          ORDER BY so.date DESC
        `;
      } else {
        queryStr = `
          SELECT so.*, s.name as "itemName", u.name as "userName" 
          FROM stock_out so 
          JOIN stock_items s ON so.item_id = s.id 
          JOIN users u ON so.user_id = u.id 
          WHERE so.user_id = ?
          ORDER BY so.date DESC
        `;
        params = [req.user.id];
      }
    } else {
      if (isAdminOrManager) {
        queryStr = `
          SELECT so.*, s.name as itemName, u.name as userName 
          FROM stock_out so 
          JOIN stock_items s ON so.itemId = s.id 
          JOIN users u ON so.userId = u.id 
          ORDER BY so.date DESC
        `;
      } else {
        queryStr = `
          SELECT so.*, s.name as itemName, u.name as userName 
          FROM stock_out so 
          JOIN stock_items s ON so.itemId = s.id 
          JOIN users u ON so.userId = u.id 
          WHERE so.userId = ?
          ORDER BY so.date DESC
        `;
        params = [req.user.id];
      }
    }
    
    const [stockOut]: any = await pool.query(queryStr, params);
    
    if (isPostgres) {
      const normalized = stockOut.map((so: any) => ({
        ...so,
        itemId: so.item_id,
        userId: so.user_id,
        itemName: so.itemName,
        userName: so.userName
      }));
      return res.json(normalized);
    }
    res.json(stockOut);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stock out history" });
  }
});

app.post("/api/stock-out", authenticate, async (req: any, res) => {
  try {
    const { itemId, quantity, destination, date } = req.body;
    const stockOutDate = date ? new Date(date) : new Date();
    const isPostgres = pool.isPostgres;

    // 1. Check stock availability
    const [stock]: any = await pool.query("SELECT quantity, name FROM stock_items WHERE id = ?", [itemId]);
    if (stock.length === 0) return res.status(404).json({ error: "Item not found" });
    
    if (stock[0].quantity < quantity) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${stock[0].quantity}` });
    }

    // 2. Record Stock Out
    let stockOutQuery = "INSERT INTO stock_out (itemId, quantity, destination, date, userId) VALUES (?, ?, ?, ?, ?)";
    if (isPostgres) {
      stockOutQuery = "INSERT INTO stock_out (item_id, quantity, destination, date, user_id) VALUES (?, ?, ?, ?, ?) RETURNING id";
    }
    const [result]: any = await pool.query(stockOutQuery, [itemId, quantity, destination, stockOutDate, req.user.id]);

    // 3. Update Stock
    await pool.query(
      "UPDATE stock_items SET quantity = quantity - ? WHERE id = ?",
      [quantity, itemId]
    );

    res.json({ id: isPostgres ? result.id : result.insertId, success: true });
  } catch (error) {
    console.error("Stock out error:", error);
    res.status(500).json({ error: "Failed to record stock out" });
  }
});

app.put("/api/notifications/:id/read", authenticate, async (req: any, res) => {
  try {
    const id = req.params.id;
    const isPostgres = pool.isPostgres;
    if (useFallback) {
      const index = fallbackData.notifications.findIndex((n: any) => n.id.toString() === id.toString() && n.userId.toString() === req.user.id.toString());
      if (index !== -1) {
        fallbackData.notifications[index].is_read = true;
        await saveFallback();
      }
      return res.json({ success: true });
    }
    const queryStr = isPostgres 
      ? "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?" 
      : "UPDATE notifications SET is_read = TRUE WHERE id = ? AND userId = ?";
    await pool.query(queryStr, [id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Requisition Routes
app.get("/api/requisitions", authenticate, async (req: any, res) => {
  try {
    const isPostgres = !!pool.isPostgres;
    console.log(`[Diagnostic] Fetching requisitions. isPostgres: ${isPostgres}, useFallback: ${useFallback}`);
    
    if (useFallback) {
      console.log("[Diagnostic] Using fallback data store");
      let requisitions = fallbackData.requisitions || [];
      if (req.user.role !== "Admin" && req.user.role !== "Manager") {
        requisitions = requisitions.filter((r: any) => r.userId && r.userId.toString() === req.user.id.toString());
      }
      return res.json(requisitions);
    }
    
    let query = isPostgres 
      ? `SELECT r.*, u.name as "userName" FROM requisitions r JOIN users u ON r.user_id = u.id`
      : `SELECT r.*, u.name as userName FROM requisitions r JOIN users u ON r.userId = u.id`;
    let params: any[] = [];
    
    if (req.user.role !== "Admin" && req.user.role !== "Manager") {
      query = isPostgres 
        ? `SELECT r.*, u.name as "userName" FROM requisitions r JOIN users u ON r.user_id = u.id WHERE r.user_id = ?`
        : `SELECT r.*, u.name as userName FROM requisitions r JOIN users u ON r.userId = u.id WHERE r.userId = ?`;
      params = [req.user.id];
    }
    
    console.log(`[Diagnostic] Executing query: ${query} with params: ${JSON.stringify(params)}`);
    
    const queryResult = await pool.query(query, params);
    if (!queryResult || !Array.isArray(queryResult[0])) {
      console.error("[Diagnostic] queryResult is not in expected format:", queryResult);
      throw new Error("Invalid query result format from database");
    }
    
    const rows = queryResult[0];
    console.log(`[Diagnostic] Successfully fetched ${rows.length} rows`);
    
    if (isPostgres) {
      const normalized = rows.map((r: any) => ({
        ...r,
        id: r.id,
        userId: r.user_id,
        totalAmount: parseFloat(r.total_amount) || 0,
        adminNote: r.admin_note,
        userName: r.userName || "Unknown"
      }));
      return res.json(normalized);
    }
    
    res.json(rows);
  } catch (error: any) {
    console.error("[Diagnostic] Fatal Error in GET /api/requisitions:", error);
    res.status(500).json({ 
      error: "Failed to fetch requisitions", 
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

app.post("/api/requisitions", authenticate, async (req: any, res) => {
  try {
    const { title, items, totalAmount, reason } = req.body;
    const itemsStr = JSON.stringify(items);
    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      const newReq = { 
        id: Date.now().toString(), 
        userId: req.user.id, 
        title, 
        items: itemsStr, 
        totalAmount, 
        reason, 
        date: new Date(), 
        status: "Pending",
        adminNote: ""
      };
      fallbackData.requisitions.push(newReq);
      await saveFallback();
      
      // Notify Admins
      const admins = fallbackData.users.filter((u: any) => u.role === "Admin" || u.role === "Manager");
      for (const user of admins) {
        await addNotification(user.id, "New Requisition", `${req.user.username} submitted a requisition for ${title}`, "info");
      }
      return res.json(newReq);
    }
    
    let query = "INSERT INTO requisitions (userId, title, items, totalAmount, reason, status) VALUES (?, ?, ?, ?, ?, 'Pending')";
    if (isPostgres) {
      query = "INSERT INTO requisitions (user_id, title, items, total_amount, reason, status) VALUES (?, ?, ?, ?, ?, 'Pending') RETURNING id";
    }

    const [result]: any = await pool.query(query, [req.user.id, title, itemsStr, totalAmount, reason]);
    
    // Notify Admins
    const adminQuery = isPostgres ? "SELECT id FROM users WHERE role IN ('Admin', 'Manager')" : "SELECT id FROM users WHERE role IN ('Admin', 'Manager')";
    const [admins]: any = await pool.query(adminQuery);
    for (const user of admins) {
      await addNotification(user.id, "New Requisition", `${req.user.username} submitted a requisition for ${title}`, "info");
    }

    res.json({ id: isPostgres ? result.id : result.insertId, userId: req.user.id, title, items: itemsStr, totalAmount, reason, status: "Pending" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add requisition" });
  }
});

app.put("/api/requisitions/:id/status", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin" && req.user.role !== "Manager") return res.status(403).json({ error: "Forbidden" });
  try {
    const { status, adminNote } = req.body;
    const id = req.params.id;
    const isPostgres = pool.isPostgres;
    
    if (useFallback) {
      const index = fallbackData.requisitions.findIndex((r: any) => r.id.toString() === id.toString());
      if (index === -1) return res.status(404).json({ error: "Requisition not found" });
      
      fallbackData.requisitions[index].status = status;
      fallbackData.requisitions[index].adminNote = adminNote;
      await saveFallback();
      
      const reqDoc = fallbackData.requisitions[index];
      await addNotification(reqDoc.userId, "Requisition Updated", `Your requisition for ${reqDoc.title} has been ${status.toLowerCase()}.`, status === "Approved" ? "success" : "warning");
      return res.json(reqDoc);
    }
    
    let query = "UPDATE requisitions SET status = ?, adminNote = ? WHERE id = ?";
    if (isPostgres) {
      query = "UPDATE requisitions SET status = ?, admin_note = ? WHERE id = ?";
    }
    await pool.query(query, [status, adminNote, id]);
    
    const [requisitions]: any = await pool.query("SELECT * FROM requisitions WHERE id = ?", [id]);
    const reqDoc = requisitions[0];
    if (isPostgres && reqDoc) {
      reqDoc.userId = reqDoc.user_id;
      reqDoc.totalAmount = reqDoc.total_amount;
      reqDoc.adminNote = reqDoc.admin_note;
    }
    await addNotification(isPostgres ? reqDoc.user_id : reqDoc.userId, "Requisition Updated", `Your requisition for ${reqDoc.title} has been ${status.toLowerCase()}.`, status === "Approved" ? "success" : "warning");

    res.json(reqDoc);
  } catch (error) {
    res.status(500).json({ error: "Failed to update requisition status" });
  }
});

// Health check endpoint for keep-alive
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/test-public", (req, res) => {
  res.json({ message: "Server is alive and reachable" });
});

// MySQL Database Status & Query Test
app.get("/api/db-status", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  
  const isPostgres = pool.isPostgres;
  const isMysql = pool.isMysql;
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (isPostgres) {
        const [rows]: any = await pool.query("SELECT 1 as connection_test");
        const [tables]: any = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        
        return res.json({
          status: "Connected",
          type: "PostgreSQL (Supabase)",
          database: "Supabase Remote",
          tables: tables.map((t: any) => t.table_name),
          attempts: attempt + 1
        });
      } else if (isMysql) {
        const [rows]: any = await pool.query("SELECT 1 as connection_test");
        const [tables]: any = await pool.query("SHOW TABLES");
        
        return res.json({
          status: "Connected",
          type: "MySQL/MongoDB SQL Interface",
          database: "MongoDB Atlas SQL",
          tables: tables.map((t: any) => Object.values(t)[0]),
          attempts: attempt + 1
        });
      } else {
        const [rows]: any = await pool.query("SELECT 1 as connection_test");
        const [tables]: any = await pool.query("SELECT name FROM sqlite_master WHERE type='table'");
        
        return res.json({
          status: "Connected",
          type: "SQLite (Local)",
          database: "database.sqlite",
          tables: tables.map((t: any) => t.name),
          attempts: attempt + 1
        });
      }
    } catch (error: any) {
      lastError = error;
      console.error(`Database Connection Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      }
    }
  }

  res.status(500).json({
    status: "Error",
    message: lastError?.message || "Connection failed after retries",
    code: lastError?.code
  });
});

app.post("/api/sql-diagnostic", authenticate, async (req: any, res) => {
  if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
  
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    // Restrict potentially dangerous queries in diagnostic mode
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith("SELECT")) {
      return res.status(400).json({ error: "Only SELECT statements are allowed in diagnostic mode" });
    }

    const [rows]: any = await pool.query(query);
    res.json({
      success: true,
      rows: rows || [],
      rowCount: (rows || []).length,
      source: pool.isMysql ? "MongoDB SQL Interface" : (pool.isPostgres ? "PostgreSQL" : "SQLite"),
      serverFingerprint: process.env.SERVER_CONNECTION_KEY || "SHA256:4atScLXSNGC/StCeIODsfy+pQZmIESWAb82FTPUsKm8"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
