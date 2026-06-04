import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "../../db/schema";

// Initialize the Netlify Database with Drizzle
// In production on Netlify, this will use the auto-provisioned connection.
// For local development, we can provide the URL via environment variables.
const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DB_URL;

export const db = connectionString 
  ? drizzle(connectionString, { schema }) 
  : drizzle({ schema }); 

export default db;
