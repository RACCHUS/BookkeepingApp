import dotenv from 'dotenv';
import pg from 'pg';
const { Client } = pg;

dotenv.config({ path: '../.env' });

// Supabase database connection - need to get the password from dashboard
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

async function runMigration() {
  // Try direct connection with service role key as password
  const connectionString = `postgresql://postgres.jjkcrknddmehqcscfceo:${process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');
    
    const migrations = [
      // COMPANIES
      'ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey',
      'ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_created_by_fkey',
      'ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_last_modified_by_fkey',
      'ALTER TABLE public.companies ALTER COLUMN user_id TYPE TEXT',
      'ALTER TABLE public.companies ALTER COLUMN created_by TYPE TEXT',
      'ALTER TABLE public.companies ALTER COLUMN last_modified_by TYPE TEXT',
      // PAYEES
      'ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_user_id_fkey',
      'ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_created_by_fkey', 
      'ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_last_modified_by_fkey',
      'ALTER TABLE public.payees ALTER COLUMN user_id TYPE TEXT',
      'ALTER TABLE public.payees ALTER COLUMN created_by TYPE TEXT',
      'ALTER TABLE public.payees ALTER COLUMN last_modified_by TYPE TEXT',
      // UPLOADS
      'ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_user_id_fkey',
      'ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_created_by_fkey',
      'ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_last_modified_by_fkey',
      'ALTER TABLE public.uploads ALTER COLUMN user_id TYPE TEXT',
      'ALTER TABLE public.uploads ALTER COLUMN created_by TYPE TEXT',
      'ALTER TABLE public.uploads ALTER COLUMN last_modified_by TYPE TEXT',
      // TRANSACTIONS
      'ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey',
      'ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey',
      'ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_last_modified_by_fkey',
      'ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT',
      'ALTER TABLE public.transactions ALTER COLUMN created_by TYPE TEXT',
      'ALTER TABLE public.transactions ALTER COLUMN last_modified_by TYPE TEXT',
      // INCOME_SOURCES
      'ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_user_id_fkey',
      'ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_created_by_fkey',
      'ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_last_modified_by_fkey',
      'ALTER TABLE public.income_sources ALTER COLUMN user_id TYPE TEXT',
      'ALTER TABLE public.income_sources ALTER COLUMN created_by TYPE TEXT',
      'ALTER TABLE public.income_sources ALTER COLUMN last_modified_by TYPE TEXT',
      // CLASSIFICATION_RULES
      'ALTER TABLE public.classification_rules DROP CONSTRAINT IF EXISTS classification_rules_user_id_fkey',
      'ALTER TABLE public.classification_rules ALTER COLUMN user_id TYPE TEXT',
      // DELETED_UPLOADS
      'ALTER TABLE public.deleted_uploads DROP CONSTRAINT IF EXISTS deleted_uploads_user_id_fkey',
      'ALTER TABLE public.deleted_uploads DROP CONSTRAINT IF EXISTS deleted_uploads_deleted_by_fkey',
      'ALTER TABLE public.deleted_uploads ALTER COLUMN user_id TYPE TEXT',
      'ALTER TABLE public.deleted_uploads ALTER COLUMN deleted_by TYPE TEXT',
      // Drop profiles
      'DROP TABLE IF EXISTS public.profiles CASCADE',
    ];

    console.log('Running migrations...\n');
    
    for (const sql of migrations) {
      try {
        await client.query(sql);
        console.log('✅', sql.substring(0, 70));
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log('⏭️  SKIP:', sql.substring(0, 50), '(already done)');
        } else {
          console.log('❌', err.message.substring(0, 60));
        }
      }
    }

    // Verify
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND column_name = 'user_id' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Verification - user_id column types:');
    result.rows.forEach(r => console.log(`   ${r.table_name}.${r.column_name} = ${r.data_type}`));
    
    await client.end();
    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.log('\nIf connection failed, you need to set SUPABASE_DB_PASSWORD in .env');
    console.log('Get it from: Supabase Dashboard > Project Settings > Database > Connection string');
  }
}

runMigration();
