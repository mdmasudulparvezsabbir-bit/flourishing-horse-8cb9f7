
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qkhskotzicghpmfbmuhd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraHNrb3R6aWNnaHBtZmJtdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTg1MzgsImV4cCI6MjA4OTE3NDUzOH0.UDZo1VCNlXMMMEKlZy0ByV5sIfICWBRF_zS5QRiabEw';
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'api' } });

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success! Data:', data);
  }
}

check();
