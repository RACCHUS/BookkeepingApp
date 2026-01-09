-- =========================================
-- INVENTORY TRACKING TABLES
-- Migration: 20260108000000_add_inventory_tables.sql
-- Description: Add inventory items and inventory transactions tables
-- =========================================

-- =========================================
-- INVENTORY ITEMS
-- =========================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'each',
  supplier TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_sku_per_user UNIQUE (user_id, sku)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id ON public.inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON public.inventory_items(user_id, quantity, reorder_level) 
  WHERE is_active = TRUE;

-- =========================================
-- INVENTORY TRANSACTIONS (Stock Movement)
-- =========================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'damaged', 'correction')),
  quantity INTEGER NOT NULL,  -- Positive for stock in, negative for stock out
  unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,  -- Link to financial transaction
  notes TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inv_txn_user_id ON public.inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_item_id ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_date ON public.inventory_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_txn_type ON public.inventory_transactions(type);

-- =========================================
-- AUTO-UPDATE TRIGGERS
-- =========================================

-- Trigger to update inventory_items.updated_at
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_items_updated ON public.inventory_items;
CREATE TRIGGER trigger_inventory_items_updated
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_timestamp();

-- Trigger to auto-update stock quantity when inventory_transactions inserted
CREATE OR REPLACE FUNCTION update_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventory_items
  SET quantity = quantity + NEW.quantity
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON public.inventory_transactions;
CREATE TRIGGER trigger_update_stock
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_transaction();

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_items
DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
CREATE POLICY "Users can view own inventory items"
  ON public.inventory_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory items" ON public.inventory_items;
CREATE POLICY "Users can insert own inventory items"
  ON public.inventory_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
CREATE POLICY "Users can update own inventory items"
  ON public.inventory_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;
CREATE POLICY "Users can delete own inventory items"
  ON public.inventory_items FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for inventory_transactions
DROP POLICY IF EXISTS "Users can view own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can view own inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can insert own inventory transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
