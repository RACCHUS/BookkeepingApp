-- Add amount_direction column to classification_rules
-- Allows rules to match based on transaction direction (positive/negative)
-- Values: 'any' (default), 'positive' (income/credits), 'negative' (expenses/debits)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'amount_direction') THEN
    ALTER TABLE classification_rules ADD COLUMN amount_direction TEXT DEFAULT 'any';
  END IF;
END $$;

-- Update unique constraint to include amount_direction
-- This allows the same pattern to have different rules for positive vs negative amounts
-- First drop the old constraint if it exists
ALTER TABLE classification_rules DROP CONSTRAINT IF EXISTS classification_rules_user_id_pattern_key;

-- Create new unique constraint including amount_direction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'classification_rules_user_pattern_direction_key'
  ) THEN
    ALTER TABLE classification_rules 
    ADD CONSTRAINT classification_rules_user_pattern_direction_key 
    UNIQUE (user_id, pattern, amount_direction);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint may already exist or there may be duplicates
  RAISE NOTICE 'Could not create unique constraint: %', SQLERRM;
END $$;

-- Add comment
COMMENT ON COLUMN classification_rules.amount_direction IS 
  'Transaction direction filter: any (matches all), positive (credits/income), negative (debits/expenses)';
