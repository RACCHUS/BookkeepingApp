-- Fix: ATM Cash Deposit should be positive (income), not negative
-- Owner Contribution/Capital is money coming IN to the business

UPDATE classification_rules
SET amount_direction = 'positive'
WHERE pattern = 'ATM CASH DEPOSIT'
  AND is_global = true;

-- Also fix any other Owner Contribution/Capital rules - these are always money IN
UPDATE classification_rules
SET amount_direction = 'positive'
WHERE category = 'Owner Contribution/Capital'
  AND is_global = true;
