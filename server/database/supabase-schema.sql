-- =========================================
-- Bookkeeping App - Supabase Schema
-- =========================================
-- Run this in the Supabase SQL Editor to create all required tables
-- Version: 1.0.0
-- =========================================

-- Enable required extensions (in extensions schema for Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- =========================================
-- USERS (extends Supabase auth.users)
-- =========================================
-- Note: Supabase automatically creates auth.users
-- We'll create a profiles table for additional user data

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- COMPANIES
-- =========================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  business_type TEXT DEFAULT 'sole_proprietorship',
  industry TEXT,
  address JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  fiscal_year_start TEXT DEFAULT 'january',
  settings JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_is_active ON public.companies(is_active);

-- =========================================
-- PAYEES (Employees/Vendors)
-- =========================================
CREATE TABLE IF NOT EXISTS public.payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'vendor' CHECK (type IN ('employee', 'vendor', 'contractor', 'client')),
  business_name TEXT,
  email TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  tax_id TEXT,
  is_1099_required BOOLEAN DEFAULT FALSE,
  employee_id TEXT,
  position TEXT,
  department TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  preferred_payment_method TEXT DEFAULT 'check',
  vendor_id TEXT,
  category TEXT,
  default_expense_category TEXT,
  ytd_paid DECIMAL(12, 2) DEFAULT 0,
  address JSONB DEFAULT '{}',
  bank_account JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_payees_user_id ON public.payees(user_id);
CREATE INDEX idx_payees_type ON public.payees(type);
CREATE INDEX idx_payees_company_id ON public.payees(company_id);
CREATE INDEX idx_payees_is_active ON public.payees(is_active);

-- =========================================
-- UPLOADS (PDF Bank Statements)
-- =========================================
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  storage_path TEXT,
  storage_provider TEXT DEFAULT 'supabase',
  cloudinary_public_id TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  bank_name TEXT,
  account_last_four TEXT,
  statement_period_start DATE,
  statement_period_end DATE,
  transaction_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'deleted')),
  processing_errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX idx_uploads_company_id ON public.uploads(company_id);
CREATE INDEX idx_uploads_status ON public.uploads(status);
CREATE INDEX idx_uploads_created_at ON public.uploads(created_at DESC);

-- =========================================
-- TRANSACTIONS
-- =========================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category TEXT,
  subcategory TEXT,
  payee TEXT,
  payee_id UUID REFERENCES public.payees(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE SET NULL,
  income_source_id UUID,
  bank_name TEXT,
  account_last_four TEXT,
  check_number TEXT,
  reference_number TEXT,
  is_reconciled BOOLEAN DEFAULT FALSE,
  is_reviewed BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  original_description TEXT,
  raw_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  classification_confidence DECIMAL(3, 2),
  classification_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id)
);

-- Primary indexes for common queries
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX idx_transactions_upload_id ON public.transactions(upload_id);
CREATE INDEX idx_transactions_payee_id ON public.transactions(payee_id);

-- Composite indexes for common filter combinations
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_company ON public.transactions(user_id, company_id);
CREATE INDEX idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX idx_transactions_user_category ON public.transactions(user_id, category);

-- =========================================
-- INCOME SOURCES
-- =========================================
CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT DEFAULT 'client' CHECK (source_type IN ('client', 'service', 'product', 'investment', 'other')),
  description TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_info JSONB DEFAULT '{}',
  default_category TEXT DEFAULT 'Business Income',
  is_active BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_amount DECIMAL(12, 2),
  recurring_frequency TEXT,
  ytd_income DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_income_sources_user_id ON public.income_sources(user_id);
CREATE INDEX idx_income_sources_source_type ON public.income_sources(source_type);
CREATE INDEX idx_income_sources_is_active ON public.income_sources(is_active);

-- =========================================
-- CLASSIFICATION RULES
-- =========================================
CREATE TABLE IF NOT EXISTS public.classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'contains' CHECK (pattern_type IN ('contains', 'exact', 'startsWith', 'endsWith', 'regex')),
  category TEXT NOT NULL,
  subcategory TEXT,
  transaction_type TEXT CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  payee_id UUID REFERENCES public.payees(id) ON DELETE SET NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classification_rules_user_id ON public.classification_rules(user_id);
CREATE INDEX idx_classification_rules_is_active ON public.classification_rules(is_active);
CREATE INDEX idx_classification_rules_priority ON public.classification_rules(priority DESC);

-- =========================================
-- DELETED UPLOADS TRACKING
-- =========================================
CREATE TABLE IF NOT EXISTS public.deleted_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_upload_id UUID NOT NULL,
  file_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by UUID REFERENCES auth.users(id),
  reason TEXT
);

CREATE INDEX idx_deleted_uploads_user_id ON public.deleted_uploads(user_id);

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_uploads ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Companies: Users can only access their own companies
CREATE POLICY "Users can view their own companies" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON public.companies
  FOR DELETE USING (auth.uid() = user_id);

-- Payees: Users can only access their own payees
CREATE POLICY "Users can view their own payees" ON public.payees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payees" ON public.payees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payees" ON public.payees
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payees" ON public.payees
  FOR DELETE USING (auth.uid() = user_id);

-- Uploads: Users can only access their own uploads
CREATE POLICY "Users can view their own uploads" ON public.uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" ON public.uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" ON public.uploads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads" ON public.uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions: Users can only access their own transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Income Sources: Users can only access their own income sources
CREATE POLICY "Users can view their own income sources" ON public.income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income sources" ON public.income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income sources" ON public.income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income sources" ON public.income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Classification Rules: Users can only access their own rules
CREATE POLICY "Users can view their own rules" ON public.classification_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules" ON public.classification_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules" ON public.classification_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules" ON public.classification_rules
  FOR DELETE USING (auth.uid() = user_id);

-- Deleted Uploads: Users can only view their own deleted uploads
CREATE POLICY "Users can view their own deleted uploads" ON public.deleted_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deleted upload records" ON public.deleted_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payees_updated_at
  BEFORE UPDATE ON public.payees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_sources_updated_at
  BEFORE UPDATE ON public.income_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classification_rules_updated_at
  BEFORE UPDATE ON public.classification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- COMMENTS FOR DOCUMENTATION
-- =========================================
COMMENT ON TABLE public.profiles IS 'Extended user profile data, linked to auth.users';
COMMENT ON TABLE public.companies IS 'Business entities owned by users';
COMMENT ON TABLE public.payees IS 'Employees, vendors, and contractors for payments';
COMMENT ON TABLE public.uploads IS 'PDF bank statement uploads and their metadata';
COMMENT ON TABLE public.transactions IS 'Financial transactions (income/expense)';
COMMENT ON TABLE public.income_sources IS 'Sources of income (clients, products, etc.)';
COMMENT ON TABLE public.classification_rules IS 'Rules for auto-categorizing transactions';

-- =========================================
-- GRANT PERMISSIONS (for service role)
-- =========================================
-- The service role automatically has access, but explicit grants for clarity
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
