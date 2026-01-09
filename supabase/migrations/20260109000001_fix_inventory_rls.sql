-- Fix missing RLS policies for inventory_transactions
-- Migration: 20260109000001_fix_inventory_rls.sql
-- Description: Add missing UPDATE and DELETE policies for inventory_transactions

-- =========================================
-- ADD MISSING POLICIES
-- =========================================

-- Add UPDATE policy for inventory_transactions
DROP POLICY IF EXISTS "Users can update own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can update own inventory transactions"
  ON public.inventory_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Add DELETE policy for inventory_transactions
DROP POLICY IF EXISTS "Users can delete own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can delete own inventory transactions"
  ON public.inventory_transactions FOR DELETE
  USING (auth.uid() = user_id);
