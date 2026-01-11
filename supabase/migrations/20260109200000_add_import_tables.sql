-- Migration: Add tables for PDF uploads and CSV imports
-- Created for Supabase Edge Functions support

-- PDF Uploads table (tracks PDF bank statement imports)
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    bank_detected TEXT,
    transaction_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSV Imports table (tracks CSV file imports)
CREATE TABLE IF NOT EXISTS csv_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_company_id ON pdf_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created_at ON pdf_uploads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_csv_imports_user_id ON csv_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_imports_company_id ON csv_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_csv_imports_created_at ON csv_imports(created_at DESC);

-- Add reference columns to transactions table for imports
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS pdf_upload_id UUID REFERENCES pdf_uploads(id) ON DELETE SET NULL;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS csv_import_id UUID REFERENCES csv_imports(id) ON DELETE SET NULL;

-- Add indexes for import references
CREATE INDEX IF NOT EXISTS idx_transactions_pdf_upload_id ON transactions(pdf_upload_id);
CREATE INDEX IF NOT EXISTS idx_transactions_csv_import_id ON transactions(csv_import_id);

-- Enable RLS on new tables
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_uploads
CREATE POLICY "Users can view their own PDF uploads"
    ON pdf_uploads FOR SELECT
    USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own PDF uploads"
    ON pdf_uploads FOR INSERT
    WITH CHECK (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own PDF uploads"
    ON pdf_uploads FOR UPDATE
    USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own PDF uploads"
    ON pdf_uploads FOR DELETE
    USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role bypass for Edge Functions
CREATE POLICY "Service role can manage all PDF uploads"
    ON pdf_uploads FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for csv_imports
CREATE POLICY "Users can view their own CSV imports"
    ON csv_imports FOR SELECT
    USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own CSV imports"
    ON csv_imports FOR INSERT
    WITH CHECK (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own CSV imports"
    ON csv_imports FOR UPDATE
    USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own CSV imports"
    ON csv_imports FOR DELETE
    USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role bypass for Edge Functions
CREATE POLICY "Service role can manage all CSV imports"
    ON csv_imports FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pdf_uploads_updated_at
    BEFORE UPDATE ON pdf_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_csv_imports_updated_at
    BEFORE UPDATE ON csv_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
