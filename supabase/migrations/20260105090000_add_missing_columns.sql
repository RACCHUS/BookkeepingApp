-- =========================================
-- Migration: Add missing columns to tables
-- =========================================
-- The original schema was missing several columns that the app uses
-- =========================================

-- Add missing columns to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS section_code TEXT,
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.payees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS is_1099_payment BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS statement_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL;

-- Create index for section_code since it's used in filtering
CREATE INDEX IF NOT EXISTS idx_transactions_section_code ON public.transactions(section_code);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement_id ON public.transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_1099 ON public.transactions(is_1099_payment);

-- Add composite index for user + section_code (common query pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_user_section ON public.transactions(user_id, section_code);
