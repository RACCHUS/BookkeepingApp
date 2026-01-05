-- =========================================
-- Migration: Fix user_id columns for Firebase Auth
-- =========================================
-- Firebase Auth uses alphanumeric IDs (e.g., "KAqbZ0AIowcTSd6cjqjSfGfjC2M2")
-- which are NOT valid UUIDs. We need to change user_id columns to TEXT.
-- =========================================

-- Drop existing foreign key constraints and change user_id to TEXT

-- COMPANIES
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_created_by_fkey;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_last_modified_by_fkey;
ALTER TABLE public.companies ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.companies ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.companies ALTER COLUMN last_modified_by TYPE TEXT;

-- PAYEES
ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_user_id_fkey;
ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_created_by_fkey;
ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_last_modified_by_fkey;
ALTER TABLE public.payees ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.payees ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.payees ALTER COLUMN last_modified_by TYPE TEXT;

-- UPLOADS
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_user_id_fkey;
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_created_by_fkey;
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_last_modified_by_fkey;
ALTER TABLE public.uploads ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.uploads ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.uploads ALTER COLUMN last_modified_by TYPE TEXT;

-- TRANSACTIONS
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_last_modified_by_fkey;
ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN last_modified_by TYPE TEXT;

-- INCOME_SOURCES
ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_user_id_fkey;
ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_created_by_fkey;
ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_last_modified_by_fkey;
ALTER TABLE public.income_sources ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.income_sources ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.income_sources ALTER COLUMN last_modified_by TYPE TEXT;

-- CLASSIFICATION_RULES
ALTER TABLE public.classification_rules DROP CONSTRAINT IF EXISTS classification_rules_user_id_fkey;
ALTER TABLE public.classification_rules ALTER COLUMN user_id TYPE TEXT;

-- DELETED_UPLOADS (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deleted_uploads') THEN
    ALTER TABLE public.deleted_uploads DROP CONSTRAINT IF EXISTS deleted_uploads_user_id_fkey;
    ALTER TABLE public.deleted_uploads DROP CONSTRAINT IF EXISTS deleted_uploads_deleted_by_fkey;
    ALTER TABLE public.deleted_uploads ALTER COLUMN user_id TYPE TEXT;
    ALTER TABLE public.deleted_uploads ALTER COLUMN deleted_by TYPE TEXT;
  END IF;
END $$;

-- PROFILES - This table is no longer needed since we use Firebase Auth
-- We can drop it or keep it without the auth.users reference
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Update RLS policies to work with TEXT user_id
-- The policies should still work since they compare auth.uid()::text or the user_id from JWT

-- Verify the changes
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;
