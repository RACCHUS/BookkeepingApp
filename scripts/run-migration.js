import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../server/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('Please ensure these are set in server/.env');
  process.exit(1);
}

// Use the service role key to run migrations (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('Running company columns migration...');
  
  // Test if columns exist
  console.log('Testing if columns exist by querying...');
  
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, description, phone, email, website, status, type')
    .limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('Columns missing. Running migration via REST API...');
    
    // Use Supabase Management API to run SQL
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
    const sql = `
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS type TEXT;
      UPDATE public.companies SET type = business_type WHERE type IS NULL AND business_type IS NOT NULL;
    `;
    
    // Try using the rpc method if available
    const { error: rpcError } = await supabase.rpc('exec_sql', { query: sql });
    
    if (rpcError) {
      console.log('RPC not available. Trying direct HTTP to database...');
      
      // Use fetch to call the Supabase REST API for raw SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        console.log('\\n=== PLEASE RUN THIS SQL IN SUPABASE DASHBOARD ===\\n');
        console.log(sql);
        console.log('\\n=================================================\\n');
        console.log(`Go to: https://supabase.com/dashboard/project/${projectRef}/sql`);
      } else {
        console.log('Migration completed successfully!');
      }
    } else {
      console.log('Migration completed successfully via RPC!');
    }
  } else if (error) {
    console.error('Unexpected error:', error.message);
  } else {
    console.log('All required columns exist! Migration not needed.');
    console.log('Sample data:', data);
  }
}

runMigration().catch(console.error);
