-- Migration: Fix RLS policies for csv_imports and pdf_uploads
-- Allow access when user_id matches the request parameter or app setting

-- Drop existing policies for csv_imports
DROP POLICY IF EXISTS "Users can view their own CSV imports" ON csv_imports;
DROP POLICY IF EXISTS "Users can create their own CSV imports" ON csv_imports;
DROP POLICY IF EXISTS "Users can update their own CSV imports" ON csv_imports;
DROP POLICY IF EXISTS "Users can delete their own CSV imports" ON csv_imports;

-- Create new policies that work with Firebase Auth
CREATE POLICY "Users can view their own CSV imports"
    ON csv_imports FOR SELECT
    USING (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can create their own CSV imports"
    ON csv_imports FOR INSERT
    WITH CHECK (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can update their own CSV imports"
    ON csv_imports FOR UPDATE
    USING (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can delete their own CSV imports"
    ON csv_imports FOR DELETE
    USING (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

-- Drop existing policies for pdf_uploads
DROP POLICY IF EXISTS "Users can view their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can create their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can update their own PDF uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Users can delete their own PDF uploads" ON pdf_uploads;

-- Create new policies that work with Firebase Auth
CREATE POLICY "Users can view their own PDF uploads"
    ON pdf_uploads FOR SELECT
    USING (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can create their own PDF uploads"
    ON pdf_uploads FOR INSERT
    WITH CHECK (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can update their own PDF uploads"
    ON pdf_uploads FOR UPDATE
    USING (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );

CREATE POLICY "Users can delete their own PDF uploads"
    ON pdf_uploads FOR DELETE
    USING (
        user_id = auth.uid()::TEXT 
        OR user_id = current_setting('app.current_user_id', true)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );
