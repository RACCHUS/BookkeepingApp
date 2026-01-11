-- =========================================
-- Migration: Add missing columns to companies table
-- =========================================

-- Add missing columns for company form fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add type column if not exists (alias for business_type)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS type TEXT;

-- Update type from business_type if type is null
UPDATE public.companies SET type = business_type WHERE type IS NULL AND business_type IS NOT NULL;
