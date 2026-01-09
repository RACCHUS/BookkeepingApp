-- =========================================
-- Fix CSV Imports user_id type
-- =========================================
-- Change user_id from UUID to TEXT to support Firebase Auth IDs
-- =========================================

-- Drop existing policies first
DROP POLICY IF EXISTS csv_imports_select_policy ON public.csv_imports;
DROP POLICY IF EXISTS csv_imports_insert_policy ON public.csv_imports;
DROP POLICY IF EXISTS csv_imports_update_policy ON public.csv_imports;
DROP POLICY IF EXISTS csv_imports_delete_policy ON public.csv_imports;

-- Drop the foreign key constraint and change column type
ALTER TABLE public.csv_imports 
  DROP CONSTRAINT IF EXISTS csv_imports_user_id_fkey;

ALTER TABLE public.csv_imports 
  ALTER COLUMN user_id TYPE TEXT;

-- Recreate RLS policies (without auth.uid() since we use Firebase Auth)
-- Note: RLS with Firebase requires custom claims or service role access
-- For now, we'll use the service role key which bypasses RLS
