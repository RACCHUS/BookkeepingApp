-- =========================================
-- Migration: Make SKU optional in inventory_items
-- =========================================
-- SKU was previously required but should be optional for flexibility
-- =========================================

-- Make SKU nullable
ALTER TABLE public.inventory_items 
  ALTER COLUMN sku DROP NOT NULL;

-- Drop the unique constraint on (user_id, sku) since SKU can be null
-- We'll recreate it as a partial unique index that only applies when SKU is not null
ALTER TABLE public.inventory_items 
  DROP CONSTRAINT IF EXISTS unique_sku_per_user;

-- Create a partial unique index for non-null SKUs
CREATE UNIQUE INDEX IF NOT EXISTS unique_sku_per_user_partial 
  ON public.inventory_items (user_id, sku) 
  WHERE sku IS NOT NULL;

-- Set default empty string for existing nulls if needed (optional)
-- UPDATE public.inventory_items SET sku = '' WHERE sku IS NULL;

COMMENT ON COLUMN public.inventory_items.sku IS 'Optional product SKU - must be unique per user when provided';
