-- Fix invoicing tables user_id column type
-- Changes user_id from TEXT to UUID with proper foreign key reference
-- Created: 2026-01-09

-- Note: This migration assumes no existing data or data already uses valid UUIDs as text.
-- If data exists, the USING clause will convert text to UUID.

-- ============================================
-- PHASE 1: DROP EXISTING POLICIES
-- ============================================

-- Drop catalogue_items policies
DROP POLICY IF EXISTS "Users can view own catalogue items" ON catalogue_items;
DROP POLICY IF EXISTS "Users can insert own catalogue items" ON catalogue_items;
DROP POLICY IF EXISTS "Users can update own catalogue items" ON catalogue_items;
DROP POLICY IF EXISTS "Users can delete own catalogue items" ON catalogue_items;

-- Drop quotes policies
DROP POLICY IF EXISTS "Users can view own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can delete own quotes" ON quotes;

-- Drop invoices policies
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

-- Drop recurring_schedules policies
DROP POLICY IF EXISTS "Users can view own recurring schedules" ON recurring_schedules;
DROP POLICY IF EXISTS "Users can insert own recurring schedules" ON recurring_schedules;
DROP POLICY IF EXISTS "Users can update own recurring schedules" ON recurring_schedules;
DROP POLICY IF EXISTS "Users can delete own recurring schedules" ON recurring_schedules;

-- ============================================
-- PHASE 2: DROP INDEXES ON user_id
-- ============================================

DROP INDEX IF EXISTS idx_catalogue_items_user;
DROP INDEX IF EXISTS idx_quotes_user;
DROP INDEX IF EXISTS idx_invoices_user;
DROP INDEX IF EXISTS idx_recurring_schedules_user;

-- ============================================
-- PHASE 3: ALTER COLUMN TYPES
-- ============================================

-- Alter catalogue_items
ALTER TABLE catalogue_items 
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE catalogue_items 
  ADD CONSTRAINT fk_catalogue_items_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE catalogue_items 
  ALTER COLUMN user_id SET NOT NULL;

-- Alter quotes
ALTER TABLE quotes 
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE quotes 
  ADD CONSTRAINT fk_quotes_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE quotes 
  ALTER COLUMN user_id SET NOT NULL;

-- Alter invoices
ALTER TABLE invoices 
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE invoices 
  ADD CONSTRAINT fk_invoices_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE invoices 
  ALTER COLUMN user_id SET NOT NULL;

-- Alter recurring_schedules
ALTER TABLE recurring_schedules 
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE recurring_schedules 
  ADD CONSTRAINT fk_recurring_schedules_user 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE recurring_schedules 
  ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- PHASE 4: RECREATE INDEXES
-- ============================================

CREATE INDEX idx_catalogue_items_user ON catalogue_items(user_id);
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_recurring_schedules_user ON recurring_schedules(user_id);

-- ============================================
-- PHASE 5: RECREATE RLS POLICIES (using UUID comparison)
-- ============================================

-- Policies for catalogue_items
CREATE POLICY "Users can view own catalogue items" ON catalogue_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own catalogue items" ON catalogue_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own catalogue items" ON catalogue_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own catalogue items" ON catalogue_items
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for quotes
CREATE POLICY "Users can view own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for invoices
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for recurring_schedules
CREATE POLICY "Users can view own recurring schedules" ON recurring_schedules
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring schedules" ON recurring_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring schedules" ON recurring_schedules
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring schedules" ON recurring_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Update quote_line_items and invoice_line_items policies to use UUID comparison
DROP POLICY IF EXISTS "Users can manage quote line items" ON quote_line_items;
CREATE POLICY "Users can manage quote line items" ON quote_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage invoice line items" ON invoice_line_items;
CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage invoice payments" ON invoice_payments;
CREATE POLICY "Users can manage invoice payments" ON invoice_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_payments.invoice_id AND invoices.user_id = auth.uid())
  );
