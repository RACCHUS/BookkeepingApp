-- Update unique constraint to allow multiple rules with same pattern but different amount ranges
-- Run in Supabase SQL Editor

-- Drop old constraint
ALTER TABLE classification_rules 
DROP CONSTRAINT IF EXISTS classification_rules_user_pattern_direction_key;

-- Create new constraint that includes amount ranges
-- This allows: SHELL (< $15) -> MEALS and SHELL (>= $15) -> CAR_TRUCK_EXPENSES
ALTER TABLE classification_rules 
ADD CONSTRAINT classification_rules_user_pattern_amount_key 
UNIQUE (user_id, pattern, amount_direction, amount_min, amount_max);
