-- Global Classification Rules Support
-- Adds ability to share rules across all users with user-specific opt-out

-- Add is_global column to classification_rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'is_global') THEN
    ALTER TABLE classification_rules ADD COLUMN is_global BOOLEAN DEFAULT false;
  END IF;
  
  -- global_vote_count - how many users have confirmed this rule
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'global_vote_count') THEN
    ALTER TABLE classification_rules ADD COLUMN global_vote_count INTEGER DEFAULT 0;
  END IF;
  
  -- name column for rule display name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'name') THEN
    ALTER TABLE classification_rules ADD COLUMN name TEXT;
  END IF;
END $$;

-- Create index for global rules
CREATE INDEX IF NOT EXISTS idx_classification_rules_global ON classification_rules(is_global) WHERE is_global = true;

-- User preferences for global rules
CREATE TABLE IF NOT EXISTS user_global_rule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  use_global_rules BOOLEAN DEFAULT true,  -- Master toggle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Track which global rules each user has disabled
CREATE TABLE IF NOT EXISTS user_disabled_global_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  rule_id UUID NOT NULL REFERENCES classification_rules(id) ON DELETE CASCADE,
  disabled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, rule_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_global_rule_settings_user ON user_global_rule_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_disabled_global_rules_user ON user_disabled_global_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_disabled_global_rules_rule ON user_disabled_global_rules(rule_id);

-- Disable RLS for Firebase Auth compatibility
ALTER TABLE user_global_rule_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_disabled_global_rules DISABLE ROW LEVEL SECURITY;

-- Insert some common global rules (fast food = Meals, etc.)
INSERT INTO classification_rules (user_id, name, pattern, pattern_type, category, subcategory, is_global, global_vote_count, source, confidence)
VALUES 
  ('GLOBAL', 'McDonald''s', 'MCDONALD', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Burger King', 'BURGER KING', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Wendy''s', 'WENDY', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Taco Bell', 'TACO BELL', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Chick-fil-A', 'CHICK-FIL-A', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Chipotle', 'CHIPOTLE', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Subway', 'SUBWAY', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'KFC', 'KFC', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Popeyes', 'POPEYE', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'Dunkin', 'DUNKIN', 'contains', 'Meals', 'Coffee/Snacks', true, 100, 'system', 0.95),
  ('GLOBAL', 'Starbucks', 'STARBUCKS', 'contains', 'Meals', 'Coffee/Snacks', true, 100, 'system', 0.95),
  ('GLOBAL', 'Panera', 'PANERA', 'contains', 'Meals', 'Fast Food', true, 100, 'system', 0.95),
  ('GLOBAL', 'AutoZone', 'AUTOZONE', 'contains', 'Car and Truck Expenses', 'Parts/Maintenance', true, 100, 'system', 0.95),
  ('GLOBAL', 'O''Reilly Auto', 'O''REILLY', 'contains', 'Car and Truck Expenses', 'Parts/Maintenance', true, 100, 'system', 0.95),
  ('GLOBAL', 'Advance Auto', 'ADVANCE AUTO', 'contains', 'Car and Truck Expenses', 'Parts/Maintenance', true, 100, 'system', 0.95),
  ('GLOBAL', 'NAPA Auto', 'NAPA', 'contains', 'Car and Truck Expenses', 'Parts/Maintenance', true, 100, 'system', 0.95),
  ('GLOBAL', 'Home Depot', 'HOME DEPOT', 'contains', 'Materials and Supplies', null, true, 100, 'system', 0.85),
  ('GLOBAL', 'Lowe''s', 'LOWE''S', 'contains', 'Materials and Supplies', null, true, 100, 'system', 0.85),
  ('GLOBAL', 'Menards', 'MENARDS', 'contains', 'Materials and Supplies', null, true, 100, 'system', 0.85),
  ('GLOBAL', 'Office Depot', 'OFFICE DEPOT', 'contains', 'Office Expenses', null, true, 100, 'system', 0.90),
  ('GLOBAL', 'Staples', 'STAPLES', 'contains', 'Office Expenses', null, true, 100, 'system', 0.90),
  ('GLOBAL', 'ATM Withdrawal', 'ATM WITHDRAWAL', 'contains', 'Owner Draws/Distributions', null, true, 100, 'system', 0.95),
  ('GLOBAL', 'ATM Cash Deposit', 'ATM CASH DEPOSIT', 'contains', 'Owner Contribution/Capital', null, true, 100, 'system', 0.95)
ON CONFLICT DO NOTHING;
