import { createClient } from '@supabase/supabase-js';

// Use the service role key to run migrations (bypasses RLS)
const supabase = createClient(
  'https://jjkcrknddmehqcscfceo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa2Nya25kZG1laHFjc2NmY2VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU3NjcxMiwiZXhwIjoyMDgzMTUyNzEyfQ.aL0qdsu44ARJr27XAdjGvlu2PN5bBpSmtf1vrQRxYWM'
);

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
    const projectRef = 'jjkcrknddmehqcscfceo';
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
      const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa2Nya25kZG1laHFjc2NmY2VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU3NjcxMiwiZXhwIjoyMDgzMTUyNzEyfQ.aL0qdsu44ARJr27XAdjGvlu2PN5bBpSmtf1vrQRxYWM',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa2Nya25kZG1laHFjc2NmY2VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU3NjcxMiwiZXhwIjoyMDgzMTUyNzEyfQ.aL0qdsu44ARJr27XAdjGvlu2PN5bBpSmtf1vrQRxYWM'
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        console.log('\\n=== PLEASE RUN THIS SQL IN SUPABASE DASHBOARD ===\\n');
        console.log(sql);
        console.log('\\n=================================================\\n');
        console.log('Go to: https://supabase.com/dashboard/project/jjkcrknddmehqcscfceo/sql');
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
