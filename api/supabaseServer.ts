import dotenv from "dotenv";
dotenv.config();

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { createClient as createBaseClient } from "@supabase/supabase-js"
import type { Request, Response } from "express"

export const isValidSupabaseKey = (key: string) => {
  if (!key) return false;
  // A valid Supabase key is a JWT, consisting of 3 parts separated by dots, starting with 'eyJ'
  return typeof key === 'string' && key.startsWith('eyJ') && key.split('.').length === 3;
};

// Intelligently select aligned key and URL sets to prevent project mismatch
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraHNrb3R6aWNnaHBtZmJtdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTg1MzgsImV4cCI6MjA4OTE3NDUzOH0.UDZo1VCNlXMMMEKlZy0ByV5sIfICWBRF_zS5QRiabEw';
let rawUrl = 'qkhskotzicghpmfbmuhd.supabase.co';

const candidates = [
  { key: process.env.VITE_SUPABASE_ANON_KEY, url: process.env.VITE_SUPABASE_URL },
  { key: process.env.SUPABASE_ANON_KEY, url: process.env.SUPABASE_URL },
  { key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, url: process.env.NEXT_PUBLIC_SUPABASE_URL }
];

for (const candidate of candidates) {
  if (candidate.key && isValidSupabaseKey(candidate.key)) {
    supabaseKey = candidate.key;
    if (candidate.url) {
      rawUrl = candidate.url;
    }
    break;
  }
}

const supabaseUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;

console.log(`[Supabase Config] Resolved URL: ${supabaseUrl}`);
console.log(`[Supabase Config] Resolved Key Present: ${!!supabaseKey}`);
console.log(`[Supabase Config] Resolved Key Valid JWT format: ${isValidSupabaseKey(supabaseKey)}`);
console.log(`[Supabase Config] Service Key Present: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);

export const createClient = (req: Request, res: Response) => {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables (checked SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL, etc.)');
    return null;
  }
  
  if (!isValidSupabaseKey(supabaseKey)) {
    console.warn(`[Supabase Config Warning] The configured Supabase API key is not in a valid JWT format (should be a long string starting with 'eyJ'). Standard publishable API keys like 'sb_publishable_...' are not compatible with direct SDK auth. Falling back.`);
    return null;
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      db: { schema: process.env.SUPABASE_SCHEMA || 'public' },
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({
            name,
            value: req.cookies[name],
          }))
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookie(name, value, options as any)
            )
          } catch (error) {
            // Error when attempting to set cookies
          }
        },
      },
    }
  )
};

// Admin client using service role (uses standard supabase-js client)
export const createAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase environment variables for Admin client');
    return null;
  }
  
  if (!isValidSupabaseKey(serviceKey)) {
    console.warn(`[Supabase Config Warning] Service role / Anon API key is not in a valid JWT format. Skipping SDK Admin Client creation.`);
    return null;
  }
  
  return createBaseClient(supabaseUrl, serviceKey, { db: { schema: process.env.SUPABASE_SCHEMA || 'public' } });
};
