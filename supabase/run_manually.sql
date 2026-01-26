-- Simple migration to create import tracking tables
-- Run this directly in Supabase SQL editor

-- PDF Uploads table
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_id UUID,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    bank_detected TEXT,
    transaction_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSV Imports table (if not exists from earlier migration)
CREATE TABLE IF NOT EXISTS csv_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_id UUID,
    file_name TEXT NOT NULL,
    bank_format TEXT,
    total_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_imports_user_id ON csv_imports(user_id);

-- DISABLE RLS since we use Firebase Auth (not Supabase Auth)
-- RLS policies rely on auth.uid() which doesn't work with Firebase
ALTER TABLE pdf_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports DISABLE ROW LEVEL SECURITY;

-- Clean up any existing policies (no longer needed with RLS disabled)
DROP POLICY IF EXISTS service_role_pdf_uploads ON pdf_uploads;
DROP POLICY IF EXISTS service_role_csv_imports ON csv_imports;
DROP POLICY IF EXISTS "Users can view their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can create their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can update their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can delete their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can view their own CSV imports" ON csv_imports;
DROP POLICY IF EXISTS "Users can create their own CSV imports" ON csv_imports;
DROP POLICY IF EXISTS "Users can update their own CSV imports" ON csv_imports;
DROP POLICY IF EXISTS "Users can delete their own CSV imports" ON csv_imports;

-- Fix income vendor rules that have wrong direction
-- Run this query to find and fix rules for income vendors that have direction='negative'
-- These should be direction='positive' or 'any' for income categories

-- First, check which rules are wrong:
-- SELECT id, pattern, category, amount_direction 
-- FROM classification_rules 
-- WHERE category IN ('Gross Receipts or Sales', 'Other Income', 'Refund Received', 'Owner Contribution/Capital')
-- AND amount_direction = 'negative';

-- Then update them to 'any' so they match both directions:
UPDATE classification_rules 
SET amount_direction = 'any'
WHERE category IN ('Gross Receipts or Sales', 'Other Income', 'Refund Received', 'Owner Contribution/Capital', 'Loan Received')
AND amount_direction = 'negative';
