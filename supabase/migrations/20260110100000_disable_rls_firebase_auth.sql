-- Migration: Disable RLS on tables that use Firebase Auth
-- 
-- Since we use Firebase Authentication (not Supabase Auth), RLS policies
-- that rely on auth.uid() do not work correctly. The client code already
-- filters by user_id, and the server uses Firebase tokens for auth.
--
-- This migration disables RLS on tables that were created after the
-- initial fix_userid_types migration that disabled RLS on core tables.

-- Disable RLS on csv_imports (created in 20260107000000)
ALTER TABLE IF EXISTS public.csv_imports DISABLE ROW LEVEL SECURITY;

-- Disable RLS on pdf_uploads (created in 20260109200000)
ALTER TABLE IF EXISTS public.pdf_uploads DISABLE ROW LEVEL SECURITY;

-- Disable RLS on receipts (created in 20260109100000)
ALTER TABLE IF EXISTS public.receipts DISABLE ROW LEVEL SECURITY;

-- Disable RLS on checks (created in 20260109100000)
ALTER TABLE IF EXISTS public.checks DISABLE ROW LEVEL SECURITY;

-- Disable RLS on inventory tables (created in 20260108000000)
ALTER TABLE IF EXISTS public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_transactions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on invoicing tables (created in 20260108200000, 20260109150000)
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalogue_items DISABLE ROW LEVEL SECURITY;

-- Drop RLS policies using DO block to handle tables that may not exist
DO $$
BEGIN
    -- csv_imports policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'csv_imports') THEN
        DROP POLICY IF EXISTS "Users can view their own CSV imports" ON public.csv_imports;
        DROP POLICY IF EXISTS "Users can create their own CSV imports" ON public.csv_imports;
        DROP POLICY IF EXISTS "Users can update their own CSV imports" ON public.csv_imports;
        DROP POLICY IF EXISTS "Users can delete their own CSV imports" ON public.csv_imports;
        DROP POLICY IF EXISTS "Service role can manage all CSV imports" ON public.csv_imports;
    END IF;

    -- pdf_uploads policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pdf_uploads') THEN
        DROP POLICY IF EXISTS "Users can view their own PDF uploads" ON public.pdf_uploads;
        DROP POLICY IF EXISTS "Users can create their own PDF uploads" ON public.pdf_uploads;
        DROP POLICY IF EXISTS "Users can update their own PDF uploads" ON public.pdf_uploads;
        DROP POLICY IF EXISTS "Users can delete their own PDF uploads" ON public.pdf_uploads;
        DROP POLICY IF EXISTS "Service role can manage all PDF uploads" ON public.pdf_uploads;
    END IF;

    -- receipts policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'receipts') THEN
        DROP POLICY IF EXISTS "Users can view own receipts" ON public.receipts;
        DROP POLICY IF EXISTS "Users can insert own receipts" ON public.receipts;
        DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
        DROP POLICY IF EXISTS "Users can delete own receipts" ON public.receipts;
    END IF;

    -- checks policies  
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checks') THEN
        DROP POLICY IF EXISTS "Users can view own checks" ON public.checks;
        DROP POLICY IF EXISTS "Users can insert own checks" ON public.checks;
        DROP POLICY IF EXISTS "Users can update own checks" ON public.checks;
        DROP POLICY IF EXISTS "Users can delete own checks" ON public.checks;
    END IF;

    -- inventory_items policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
        DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
        DROP POLICY IF EXISTS "Users can insert own inventory items" ON public.inventory_items;
        DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
        DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;
    END IF;

    -- inventory_transactions policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
        DROP POLICY IF EXISTS "Users can view own inventory transactions" ON public.inventory_transactions;
        DROP POLICY IF EXISTS "Users can insert own inventory transactions" ON public.inventory_transactions;
        DROP POLICY IF EXISTS "Users can update own inventory transactions" ON public.inventory_transactions;
        DROP POLICY IF EXISTS "Users can delete own inventory transactions" ON public.inventory_transactions;
    END IF;

    -- invoices policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
    END IF;

    -- quotes policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotes') THEN
        DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
    END IF;

    -- catalogue_items policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'catalogue_items') THEN
        DROP POLICY IF EXISTS "Users can view their own catalogue items" ON public.catalogue_items;
        DROP POLICY IF EXISTS "Users can create their own catalogue items" ON public.catalogue_items;
        DROP POLICY IF EXISTS "Users can update their own catalogue items" ON public.catalogue_items;
        DROP POLICY IF EXISTS "Users can delete their own catalogue items" ON public.catalogue_items;
    END IF;
END $$;
