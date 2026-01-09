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

-- Enable RLS
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies - allow service role full access
DO $$ 
BEGIN
    -- PDF uploads policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_pdf_uploads') THEN
        CREATE POLICY service_role_pdf_uploads ON pdf_uploads FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- CSV imports policies  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_csv_imports') THEN
        CREATE POLICY service_role_csv_imports ON csv_imports FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
