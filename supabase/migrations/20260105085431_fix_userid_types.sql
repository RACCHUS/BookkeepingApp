-- =========================================
-- Migration: Fix user_id columns for Firebase Auth
-- =========================================
-- Firebase Auth uses alphanumeric IDs (e.g., "KAqbZ0AIowcTSd6cjqjSfGfjC2M2")
-- which are NOT valid UUIDs. We need to change user_id columns to TEXT.
-- =========================================

-- First, drop all RLS policies that reference user_id columns

-- PROFILES policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- COMPANIES policies
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;

-- PAYEES policies
DROP POLICY IF EXISTS "Users can view their own payees" ON public.payees;
DROP POLICY IF EXISTS "Users can create their own payees" ON public.payees;
DROP POLICY IF EXISTS "Users can update their own payees" ON public.payees;
DROP POLICY IF EXISTS "Users can delete their own payees" ON public.payees;

-- UPLOADS policies
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can create their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON public.uploads;

-- TRANSACTIONS policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

-- INCOME_SOURCES policies
DROP POLICY IF EXISTS "Users can view their own income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can create their own income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can update their own income sources" ON public.income_sources;
DROP POLICY IF EXISTS "Users can delete their own income sources" ON public.income_sources;

-- CLASSIFICATION_RULES policies (note: different naming convention in schema)
DROP POLICY IF EXISTS "Users can view their own classification rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can create their own classification rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can update their own classification rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can delete their own classification rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can view their own rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can create their own rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can update their own rules" ON public.classification_rules;
DROP POLICY IF EXISTS "Users can delete their own rules" ON public.classification_rules;

-- DELETED_UPLOADS policies
DROP POLICY IF EXISTS "Users can view their own deleted uploads" ON public.deleted_uploads;
DROP POLICY IF EXISTS "Users can create their own deleted upload records" ON public.deleted_uploads;

-- Drop profiles table first (not needed with Firebase Auth, and has FK to auth.users)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Now drop foreign key constraints for user_id columns referencing auth.users
-- COMPANIES
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_created_by_fkey;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_last_modified_by_fkey;

-- PAYEES
ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_user_id_fkey;
ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_created_by_fkey;
ALTER TABLE public.payees DROP CONSTRAINT IF EXISTS payees_last_modified_by_fkey;

-- UPLOADS (only has user_id)
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_user_id_fkey;

-- TRANSACTIONS
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_last_modified_by_fkey;

-- INCOME_SOURCES (only has user_id)
ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_user_id_fkey;

-- CLASSIFICATION_RULES
ALTER TABLE public.classification_rules DROP CONSTRAINT IF EXISTS classification_rules_user_id_fkey;

-- DELETED_UPLOADS
ALTER TABLE public.deleted_uploads DROP CONSTRAINT IF EXISTS deleted_uploads_user_id_fkey;
ALTER TABLE public.deleted_uploads DROP CONSTRAINT IF EXISTS deleted_uploads_deleted_by_fkey;

-- Now alter column types to TEXT (only columns that exist in schema)

-- COMPANIES: has user_id, created_by, last_modified_by
ALTER TABLE public.companies ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.companies ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.companies ALTER COLUMN last_modified_by TYPE TEXT;

-- PAYEES: has user_id, created_by, last_modified_by
ALTER TABLE public.payees ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.payees ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.payees ALTER COLUMN last_modified_by TYPE TEXT;

-- UPLOADS: only has user_id (no created_by/last_modified_by)
ALTER TABLE public.uploads ALTER COLUMN user_id TYPE TEXT;

-- TRANSACTIONS: has user_id, created_by, last_modified_by
ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN last_modified_by TYPE TEXT;

-- INCOME_SOURCES: only has user_id (no created_by/last_modified_by)
ALTER TABLE public.income_sources ALTER COLUMN user_id TYPE TEXT;

-- CLASSIFICATION_RULES: only has user_id
ALTER TABLE public.classification_rules ALTER COLUMN user_id TYPE TEXT;

-- DELETED_UPLOADS: has user_id, deleted_by
ALTER TABLE public.deleted_uploads ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.deleted_uploads ALTER COLUMN deleted_by TYPE TEXT;

-- Disable RLS since server handles auth with Firebase
-- The service role key bypasses RLS anyway, but this makes it explicit
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_uploads DISABLE ROW LEVEL SECURITY;
