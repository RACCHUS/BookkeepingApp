-- Add amount range columns to classification_rules
-- Allows rules to match based on transaction amount ranges
-- Use case: Gas stations - small amounts = food/drinks, large amounts = fuel

DO $$
BEGIN
  -- Add amount_min column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'amount_min') THEN
    ALTER TABLE classification_rules ADD COLUMN amount_min DECIMAL(12,2) DEFAULT NULL;
  END IF;

  -- Add amount_max column  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classification_rules' AND column_name = 'amount_max') THEN
    ALTER TABLE classification_rules ADD COLUMN amount_max DECIMAL(12,2) DEFAULT NULL;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN classification_rules.amount_min IS 
  'Minimum absolute amount for this rule to match. NULL means no minimum. Uses absolute value for comparison.';
COMMENT ON COLUMN classification_rules.amount_max IS 
  'Maximum absolute amount for this rule to match. NULL means no maximum. Uses absolute value for comparison.';

-- Example use cases:
-- Gas station under $15 -> Meals (snacks/drinks)
-- Gas station $15-$150 -> Car and Truck Expenses (fuel)
-- Gas station over $150 -> might need manual review (unusual)
