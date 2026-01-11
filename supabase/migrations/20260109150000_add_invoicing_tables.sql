-- Migration: Add invoices and quotes tables for invoicing system
-- These tables are required for the invoicing feature

-- =========================================
-- QUOTES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    quote_number TEXT,
    client_id UUID,
    client_name TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    issue_date DATE,
    expiry_date DATE,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    terms TEXT,
    line_items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Users can view their own quotes"
    ON public.quotes FOR SELECT
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create their own quotes"
    ON public.quotes FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own quotes"
    ON public.quotes FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own quotes"
    ON public.quotes FOR DELETE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

-- =========================================
-- INVOICES TABLE
-- =========================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    invoice_number TEXT,
    client_id UUID,
    client_name TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
    issue_date DATE,
    due_date DATE,
    payment_terms TEXT DEFAULT 'net_30',
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    amount_due DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    terms TEXT,
    line_items JSONB DEFAULT '[]',
    payments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
    ON public.invoices FOR SELECT
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create their own invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own invoices"
    ON public.invoices FOR UPDATE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own invoices"
    ON public.invoices FOR DELETE
    USING (user_id = auth.uid()::TEXT OR user_id = current_setting('app.current_user_id', true));

-- =========================================
-- UPDATED_AT TRIGGERS
-- =========================================

-- Trigger for quotes
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
