/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

// Try both VITE_ and NEXT_PUBLIC_ prefixes to support user's local env and deployment
let rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || "qkhskotzicghpmfbmuhd.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraHNrb3R6aWNnaHBtZmJtdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTg1MzgsImV4cCI6MjA4OTE3NDUzOH0.UDZo1VCNlXMMMEKlZy0ByV5sIfICWBRF_zS5QRiabEw";

// Ensure URL has protocol
let supabaseUrl = rawUrl;
if (supabaseUrl && !supabaseUrl.startsWith("http")) {
  supabaseUrl = `https://${supabaseUrl}`;
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing. Please check your .env file or environment variables.");
}

// Export a safe instance - if missing credentials, this will likely fail during first use
// but we wrap it to avoid immediate crash if possible, although createClient might still throw
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : createClient("https://placeholder.supabase.co", "placeholder");
