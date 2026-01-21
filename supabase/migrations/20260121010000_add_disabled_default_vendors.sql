-- Migration: Add disabled_default_vendors table
-- Allows users to disable specific default vendor mappings
-- Created: 2026-01-21

-- Create disabled_default_vendors table
CREATE TABLE IF NOT EXISTS disabled_default_vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate disables
  UNIQUE(user_id, pattern)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_disabled_default_vendors_user_id 
  ON disabled_default_vendors(user_id);

-- Enable RLS
ALTER TABLE disabled_default_vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own disabled vendors
CREATE POLICY "Users can view own disabled defaults"
  ON disabled_default_vendors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disabled defaults"
  ON disabled_default_vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disabled defaults"
  ON disabled_default_vendors
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add classification_usage_logs table for tracking Gemini usage
CREATE TABLE IF NOT EXISTS classification_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_classification_usage_logs_user_id 
  ON classification_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_classification_usage_logs_timestamp 
  ON classification_usage_logs(timestamp);

-- Enable RLS
ALTER TABLE classification_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own usage logs
CREATE POLICY "Users can view own usage logs"
  ON classification_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert logs (from Edge Functions)
CREATE POLICY "Service role can insert usage logs"
  ON classification_usage_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add classification_confidence column to transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'classification_confidence'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN classification_confidence DECIMAL(3,2);
  END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE disabled_default_vendors IS 'Tracks which default vendor mappings users have disabled';
COMMENT ON TABLE classification_usage_logs IS 'Tracks Gemini API usage for monitoring and analytics';
