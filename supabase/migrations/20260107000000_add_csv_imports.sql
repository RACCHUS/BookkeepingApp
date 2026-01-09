-- =========================================
-- CSV Imports Table
-- =========================================
-- Tracks CSV file imports for transaction linking and management
-- Version: 1.0.0
-- =========================================

-- =========================================
-- CSV_IMPORTS Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.csv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT,
  file_size INTEGER,
  bank_name TEXT,
  bank_format TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT,
  transaction_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_csv_imports_user_id ON public.csv_imports(user_id);
CREATE INDEX idx_csv_imports_company_id ON public.csv_imports(company_id);
CREATE INDEX idx_csv_imports_status ON public.csv_imports(status);
CREATE INDEX idx_csv_imports_created_at ON public.csv_imports(created_at DESC);
CREATE INDEX idx_csv_imports_bank_name ON public.csv_imports(bank_name);

-- =========================================
-- Add csv_import_id to transactions
-- =========================================
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS csv_import_id UUID REFERENCES public.csv_imports(id) ON DELETE SET NULL;

-- Add index for csv_import_id lookups
CREATE INDEX IF NOT EXISTS idx_transactions_csv_import_id ON public.transactions(csv_import_id);

-- =========================================
-- RLS Policies for csv_imports
-- =========================================
ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;

-- Users can view their own CSV imports
CREATE POLICY csv_imports_select_policy ON public.csv_imports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own CSV imports
CREATE POLICY csv_imports_insert_policy ON public.csv_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own CSV imports
CREATE POLICY csv_imports_update_policy ON public.csv_imports
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own CSV imports
CREATE POLICY csv_imports_delete_policy ON public.csv_imports
  FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- Update source_file to be more useful
-- =========================================
-- Add source field if missing (for tracking csv_import vs pdf_import vs manual)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add source_file if missing
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS source_file TEXT;

-- Add payment_method if missing
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT;
