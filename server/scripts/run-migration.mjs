/**
 * Migration script to fix user_id column types for Firebase Auth
 * Run with: node server/scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrations = [
  // COMPANIES
  `ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey`,
  `ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_created_by_fkey`,
  `ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_last_modified_by_fkey`,
  `ALTER TABLE public.companies ALTER COLUMN user_id TYPE TEXT`,
  `ALTER TABLE public.companies ALTER COLUMN created_by TYPE TEXT`,
  `ALTER TABLE public.companies ALTER COLUMN last_modified_by TYPE TEXT`,

  // PAYEES
  `ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_user_id_fkey`,
  `ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_created_by_fkey`,
  `ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_last_modified_by_fkey`,
  `ALTER TABLE public.payees ALTER COLUMN user_id TYPE TEXT`,
  `ALTER TABLE public.payees ALTER COLUMN created_by TYPE TEXT`,
  `ALTER TABLE public.payees ALTER COLUMN last_modified_by TYPE TEXT`,

  // UPLOADS
  `ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_user_id_fkey`,
  `ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_created_by_fkey`,
  `ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_last_modified_by_fkey`,
  `ALTER TABLE public.uploads ALTER COLUMN user_id TYPE TEXT`,
  `ALTER TABLE public.uploads ALTER COLUMN created_by TYPE TEXT`,
  `ALTER TABLE public.uploads ALTER COLUMN last_modified_by TYPE TEXT`,

  // TRANSACTIONS
  `ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey`,
  `ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey`,
  `ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_last_modified_by_fkey`,
  `ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT`,
  `ALTER TABLE public.transactions ALTER COLUMN created_by TYPE TEXT`,
  `ALTER TABLE public.transactions ALTER COLUMN last_modified_by TYPE TEXT`,

  // INCOME_SOURCES
  `ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_user_id_fkey`,
  `ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_created_by_fkey`,
  `ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_last_modified_by_fkey`,
  `ALTER TABLE public.income_sources ALTER COLUMN user_id TYPE TEXT`,
  `ALTER TABLE public.income_sources ALTER COLUMN created_by TYPE TEXT`,
  `ALTER TABLE public.income_sources ALTER COLUMN last_modified_by TYPE TEXT`,

  // CLASSIFICATION_RULES
  `ALTER TABLE public.classification_rules DROP CONSTRAINT IF EXISTS classification_rules_user_id_fkey`,
  `ALTER TABLE public.classification_rules ALTER COLUMN user_id TYPE TEXT`,

  // Drop profiles table since we use Firebase Auth
  `DROP TABLE IF EXISTS public.profiles CASCADE`,
];

async function runMigrations() {
  console.log('🔧 Running migrations to fix user_id column types...\n');

  for (const sql of migrations) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error) {
        // Try alternative method
        console.log(`⚠️  RPC failed for: ${sql.substring(0, 60)}...`);
      } else {
        console.log(`✅ ${sql.substring(0, 60)}...`);
      }
    } catch (err) {
      console.log(`⚠️  Error: ${err.message} for: ${sql.substring(0, 50)}...`);
    }
  }

  console.log('\n✅ Migration script completed!');
  console.log('\n⚠️  NOTE: If migrations failed, you need to run the SQL manually in Supabase Dashboard:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Paste and run the contents of:');
  console.log('      server/database/migrations/001-fix-userid-type.sql');
}

runMigrations();
