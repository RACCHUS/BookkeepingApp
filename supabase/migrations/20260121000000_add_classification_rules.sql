-- Classification Rules Table Migration (Safe for existing tables)
-- Stores vendor patterns mapped to IRS categories for auto-classification

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pattern)
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- pattern_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'pattern_type') THEN
    ALTER TABLE classification_rules ADD COLUMN pattern_type TEXT DEFAULT 'contains';
  END IF;
  
  -- vendor_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'vendor_name') THEN
    ALTER TABLE classification_rules ADD COLUMN vendor_name TEXT;
  END IF;
  
  -- subcategory
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'subcategory') THEN
    ALTER TABLE classification_rules ADD COLUMN subcategory TEXT;
  END IF;
  
  -- confidence
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'confidence') THEN
    ALTER TABLE classification_rules ADD COLUMN confidence NUMERIC DEFAULT 1.0;
  END IF;
  
  -- source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'source') THEN
    ALTER TABLE classification_rules ADD COLUMN source TEXT DEFAULT 'user';
  END IF;
  
  -- match_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'match_count') THEN
    ALTER TABLE classification_rules ADD COLUMN match_count INTEGER DEFAULT 0;
  END IF;
  
  -- is_active
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'is_active') THEN
    ALTER TABLE classification_rules ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classification_rules_user_id ON classification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_rules_pattern ON classification_rules(user_id, pattern);

-- Create vendor index after column is added
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_classification_rules_vendor ON classification_rules(user_id, vendor_name);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_classification_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_classification_rules_updated_at ON classification_rules;
CREATE TRIGGER trigger_classification_rules_updated_at
  BEFORE UPDATE ON classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_classification_rules_updated_at();

-- RLS disabled (using Firebase Auth via user_id TEXT field)
ALTER TABLE classification_rules DISABLE ROW LEVEL SECURITY;
