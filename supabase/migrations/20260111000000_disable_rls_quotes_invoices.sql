-- Migration: Disable RLS on quotes and invoices tables for Firebase Auth
-- Since we use Firebase Auth (not Supabase Auth), auth.uid() returns NULL
-- which causes RLS policies to fail

-- Disable RLS on quotes
ALTER TABLE IF EXISTS public.quotes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on invoices  
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that reference auth.uid()
DO $$
BEGIN
    -- quotes policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotes') THEN
        DROP POLICY IF EXISTS "Users can view own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can insert own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
        DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
    END IF;
    
    -- invoices policies
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
        DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
    END IF;
END $$;
