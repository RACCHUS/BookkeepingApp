-- Migration: Add receipts and checks tables
-- These tables are required for the receipt and check tracking features

-- =========================================
-- RECEIPTS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    vendor TEXT,
    vendor_id UUID REFERENCES public.payees(id) ON DELETE SET NULL,
    category TEXT,
    description TEXT,
    notes TEXT,
    image_url TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    is_reconciled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for receipts
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_company_id ON public.receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor_id ON public.receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON public.receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_is_reconciled ON public.receipts(is_reconciled);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receipts
CREATE POLICY "Users can view their own receipts"
    ON public.receipts FOR SELECT
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create their own receipts"
    ON public.receipts FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own receipts"
    ON public.receipts FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own receipts"
    ON public.receipts FOR DELETE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

-- =========================================
-- CHECKS TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS public.checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    check_number TEXT,
    date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payee TEXT,
    payee_id UUID REFERENCES public.payees(id) ON DELETE SET NULL,
    memo TEXT,
    category TEXT,
    check_type TEXT DEFAULT 'expense' CHECK (check_type IN ('income', 'expense')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'void', 'bounced')),
    image_url TEXT,
    bank_account TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    cleared_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for checks
CREATE INDEX IF NOT EXISTS idx_checks_user_id ON public.checks(user_id);
CREATE INDEX IF NOT EXISTS idx_checks_date ON public.checks(date DESC);
CREATE INDEX IF NOT EXISTS idx_checks_check_number ON public.checks(check_number);
CREATE INDEX IF NOT EXISTS idx_checks_company_id ON public.checks(company_id);
CREATE INDEX IF NOT EXISTS idx_checks_payee_id ON public.checks(payee_id);
CREATE INDEX IF NOT EXISTS idx_checks_transaction_id ON public.checks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_checks_status ON public.checks(status);
CREATE INDEX IF NOT EXISTS idx_checks_check_type ON public.checks(check_type);

-- Enable RLS
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checks
CREATE POLICY "Users can view their own checks"
    ON public.checks FOR SELECT
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create their own checks"
    ON public.checks FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own checks"
    ON public.checks FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own checks"
    ON public.checks FOR DELETE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

-- =========================================
-- UPDATED_AT TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for receipts
DROP TRIGGER IF EXISTS update_receipts_updated_at ON public.receipts;
CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for checks
DROP TRIGGER IF EXISTS update_checks_updated_at ON public.checks;
CREATE TRIGGER update_checks_updated_at
    BEFORE UPDATE ON public.checks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
