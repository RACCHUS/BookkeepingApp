-- Invoicing System Tables Migration
-- Created: 2026-01-08
-- Phase 1: Catalogue Items
-- Phase 2: Quotes
-- Phase 3: Invoices
-- Phase 4: Recurring Schedules

-- ============================================
-- PHASE 1: CATALOGUE ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS catalogue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'each',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_catalogue_items_user ON catalogue_items(user_id);
CREATE INDEX idx_catalogue_items_company ON catalogue_items(company_id);
CREATE INDEX idx_catalogue_items_category ON catalogue_items(category);
CREATE INDEX idx_catalogue_items_active ON catalogue_items(is_active);

-- ============================================
-- PHASE 2: QUOTES
-- ============================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES payees(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_total DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  converted_to_invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  catalogue_item_id UUID REFERENCES catalogue_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_quote_line_items_quote ON quote_line_items(quote_id);

-- ============================================
-- PHASE 3: INVOICES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES payees(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_terms TEXT DEFAULT 'net_30',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_total DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  total DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  transaction_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  recurring_schedule_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  catalogue_item_id UUID REFERENCES catalogue_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  transaction_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- ============================================
-- PHASE 4: RECURRING SCHEDULES
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES payees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  day_of_month INTEGER,
  day_of_week INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  occurrences_generated INTEGER DEFAULT 0,
  next_run_date DATE,
  auto_send BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  template_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_schedules_user ON recurring_schedules(user_id);
CREATE INDEX idx_recurring_schedules_next_run ON recurring_schedules(next_run_date);
CREATE INDEX idx_recurring_schedules_active ON recurring_schedules(is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for catalogue_items
CREATE POLICY "Users can view own catalogue items" ON catalogue_items
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own catalogue items" ON catalogue_items
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own catalogue items" ON catalogue_items
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own catalogue items" ON catalogue_items
  FOR DELETE USING (auth.uid()::text = user_id);

-- Policies for quotes
CREATE POLICY "Users can view own quotes" ON quotes
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (auth.uid()::text = user_id);

-- Policies for quote_line_items (via quote ownership)
CREATE POLICY "Users can manage quote line items" ON quote_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()::text)
  );

-- Policies for invoices
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid()::text = user_id);

-- Policies for invoice_line_items (via invoice ownership)
CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()::text)
  );

-- Policies for invoice_payments (via invoice ownership)
CREATE POLICY "Users can manage invoice payments" ON invoice_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_payments.invoice_id AND invoices.user_id = auth.uid()::text)
  );

-- Policies for recurring_schedules
CREATE POLICY "Users can view own recurring schedules" ON recurring_schedules
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own recurring schedules" ON recurring_schedules
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own recurring schedules" ON recurring_schedules
  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own recurring schedules" ON recurring_schedules
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- ADD is_client FLAG TO PAYEES
-- ============================================

ALTER TABLE payees ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_payees_is_client ON payees(is_client);
