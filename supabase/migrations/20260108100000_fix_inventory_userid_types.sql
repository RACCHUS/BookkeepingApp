-- =========================================
-- Migration: Fix inventory user_id columns for Firebase Auth
-- =========================================
-- Firebase Auth uses alphanumeric IDs (e.g., "KAqbZ0AIowcTSd6cjqjSfGfjC2M2")
-- which are NOT valid UUIDs. We need to change user_id columns to TEXT.
-- =========================================

-- First, drop all RLS policies that reference user_id columns on inventory tables

-- INVENTORY_ITEMS policies (exact names from original migration)
DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can insert own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;

-- INVENTORY_TRANSACTIONS policies (exact names from original migration)
DROP POLICY IF EXISTS "Users can view own inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can insert own inventory transactions" ON public.inventory_transactions;

-- =========================================
-- Drop foreign key constraints that reference user_id
-- =========================================
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_user_id_fkey;
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_user_id_fkey;

-- =========================================
-- Change user_id columns from UUID to TEXT
-- =========================================

-- Inventory Items table
ALTER TABLE public.inventory_items 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Inventory Transactions table
ALTER TABLE public.inventory_transactions 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- =========================================
-- Recreate RLS policies with TEXT user_id
-- =========================================

-- INVENTORY_ITEMS policies
CREATE POLICY "Users can view own inventory items"
  ON public.inventory_items FOR SELECT
  USING (auth.uid()::TEXT = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own inventory items"
  ON public.inventory_items FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own inventory items"
  ON public.inventory_items FOR UPDATE
  USING (auth.uid()::TEXT = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own inventory items"
  ON public.inventory_items FOR DELETE
  USING (auth.uid()::TEXT = user_id OR user_id = current_setting('app.current_user_id', true));

-- INVENTORY_TRANSACTIONS policies
CREATE POLICY "Users can view own inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (auth.uid()::TEXT = user_id OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own inventory transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id OR user_id = current_setting('app.current_user_id', true));

-- =========================================
-- Update comments
-- =========================================
COMMENT ON COLUMN public.inventory_items.user_id IS 'Firebase Auth user ID (TEXT format)';
COMMENT ON COLUMN public.inventory_transactions.user_id IS 'Firebase Auth user ID (TEXT format)';
