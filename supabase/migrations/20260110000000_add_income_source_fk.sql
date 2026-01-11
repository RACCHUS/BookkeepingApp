-- =========================================
-- Add Foreign Key for income_source_id
-- =========================================
-- This migration adds a foreign key constraint to transactions.income_source_id
-- to enable joins with the income_sources table

-- Add foreign key constraint for income_source_id
ALTER TABLE public.transactions 
  ADD CONSTRAINT fk_transactions_income_source 
  FOREIGN KEY (income_source_id) 
  REFERENCES public.income_sources(id) 
  ON DELETE SET NULL;

-- Add index for the foreign key if not exists
CREATE INDEX IF NOT EXISTS idx_transactions_income_source_id 
  ON public.transactions(income_source_id);
