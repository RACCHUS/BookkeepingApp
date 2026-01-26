-- Migration: Convert category keys (like GROSS_RECEIPTS) to values (like 'Gross Receipts or Sales')
-- This fixes data inconsistency where some transactions stored category keys instead of values

-- Fix transactions table
UPDATE public.transactions 
SET category = CASE category
    -- Income categories
    WHEN 'GROSS_RECEIPTS' THEN 'Gross Receipts or Sales'
    WHEN 'RETURNS_ALLOWANCES' THEN 'Returns and Allowances'
    WHEN 'OTHER_INCOME' THEN 'Other Income'
    
    -- Cost of goods sold
    WHEN 'COST_OF_GOODS_SOLD' THEN 'Cost of Goods Sold'
    WHEN 'INVENTORY_BEGINNING' THEN 'Beginning Inventory'
    WHEN 'INVENTORY_PURCHASES' THEN 'Inventory Purchases'
    WHEN 'COST_OF_LABOR' THEN 'Cost of Labor (not wages)'
    WHEN 'MATERIALS_SUPPLIES' THEN 'Materials and Supplies'
    WHEN 'OTHER_COSTS' THEN 'Other Costs (shipping, packaging)'
    WHEN 'INVENTORY_ENDING' THEN 'Ending Inventory'
    
    -- Schedule C expenses
    WHEN 'ADVERTISING' THEN 'Advertising'
    WHEN 'CAR_TRUCK_EXPENSES' THEN 'Car and Truck Expenses'
    WHEN 'COMMISSIONS_FEES' THEN 'Commissions and Fees'
    WHEN 'CONTRACT_LABOR' THEN 'Contract Labor'
    WHEN 'DEPLETION' THEN 'Depletion'
    WHEN 'DEPRECIATION' THEN 'Depreciation and Section 179'
    WHEN 'EMPLOYEE_BENEFIT_PROGRAMS' THEN 'Employee Benefit Programs'
    WHEN 'INSURANCE_OTHER' THEN 'Insurance (Other than Health)'
    WHEN 'INTEREST_MORTGAGE' THEN 'Interest (Mortgage)'
    WHEN 'INTEREST_OTHER' THEN 'Interest (Other)'
    WHEN 'LEGAL_PROFESSIONAL' THEN 'Legal and Professional Services'
    WHEN 'OFFICE_EXPENSES' THEN 'Office Expenses'
    WHEN 'PENSION_PROFIT_SHARING' THEN 'Pension and Profit-Sharing Plans'
    WHEN 'RENT_LEASE_VEHICLES' THEN 'Rent or Lease (Vehicles, Machinery, Equipment)'
    WHEN 'RENT_LEASE_OTHER' THEN 'Rent or Lease (Other Business Property)'
    WHEN 'REPAIRS_MAINTENANCE' THEN 'Repairs and Maintenance'
    WHEN 'SUPPLIES' THEN 'Supplies (Not Inventory)'
    WHEN 'TAXES_LICENSES' THEN 'Taxes and Licenses'
    WHEN 'TRAVEL' THEN 'Travel'
    WHEN 'MEALS' THEN 'Meals'
    WHEN 'UTILITIES' THEN 'Utilities'
    WHEN 'WAGES' THEN 'Wages (Less Employment Credits)'
    
    -- Other Line 27 expenses
    WHEN 'OTHER_EXPENSES' THEN 'Other Expenses'
    WHEN 'SOFTWARE_SUBSCRIPTIONS' THEN 'Software Subscriptions'
    WHEN 'WEB_HOSTING' THEN 'Web Hosting & Domains'
    WHEN 'BANK_FEES' THEN 'Bank Fees'
    WHEN 'BAD_DEBTS' THEN 'Bad Debts'
    WHEN 'DUES_MEMBERSHIPS' THEN 'Dues & Memberships'
    WHEN 'TRAINING_EDUCATION' THEN 'Training & Education'
    WHEN 'TRADE_PUBLICATIONS' THEN 'Trade Publications'
    WHEN 'SECURITY_SERVICES' THEN 'Security Services'
    WHEN 'BUSINESS_GIFTS' THEN 'Business Gifts'
    WHEN 'UNIFORMS_SAFETY' THEN 'Uniforms & Safety Gear'
    WHEN 'TOOLS_EQUIPMENT' THEN 'Tools (Under $2,500)'
    
    -- Special categories
    WHEN 'BUSINESS_USE_HOME' THEN 'Business Use of Home'
    WHEN 'DEPRECIATION_DETAIL' THEN 'Depreciation Detail'
    WHEN 'VEHICLE_DETAIL' THEN 'Vehicle Detail'
    WHEN 'PERSONAL_EXPENSE' THEN 'Personal Expense'
    WHEN 'PERSONAL_TRANSFER' THEN 'Personal Transfer'
    WHEN 'OWNER_DRAWS' THEN 'Owner Draws/Distributions'
    WHEN 'OWNER_CONTRIBUTION' THEN 'Owner Contribution/Capital'
    WHEN 'UNCATEGORIZED' THEN 'Uncategorized'
    WHEN 'SPLIT_TRANSACTION' THEN 'Split Transaction'
    
    -- Neutral categories
    WHEN 'TRANSFER_BETWEEN_ACCOUNTS' THEN 'Transfer Between Accounts'
    WHEN 'LOAN_RECEIVED' THEN 'Loan Received'
    WHEN 'LOAN_PAYMENT' THEN 'Loan Payment (Principal)'
    WHEN 'REFUND_RECEIVED' THEN 'Refund Received'
    WHEN 'REFUND_ISSUED' THEN 'Refund Issued'
    WHEN 'CREDIT_CARD_PAYMENT' THEN 'Credit Card Payment'
    WHEN 'SALES_TAX_COLLECTED' THEN 'Sales Tax Collected'
    WHEN 'SALES_TAX_PAYMENT' THEN 'Sales Tax Payment'
    WHEN 'PAYROLL_TAX_DEPOSIT' THEN 'Payroll Tax Deposit'
    WHEN 'REIMBURSEMENT_RECEIVED' THEN 'Reimbursement Received'
    WHEN 'REIMBURSEMENT_PAID' THEN 'Reimbursement Paid'
    WHEN 'PERSONAL_FUNDS_ADDED' THEN 'Personal Funds Added'
    WHEN 'PERSONAL_FUNDS_WITHDRAWN' THEN 'Personal Funds Withdrawn'
    WHEN 'OPENING_BALANCE' THEN 'Opening Balance'
    WHEN 'BALANCE_ADJUSTMENT' THEN 'Balance Adjustment'
    WHEN 'SECURITY_DEPOSIT' THEN 'Security Deposit'
    WHEN 'SECURITY_DEPOSIT_RETURN' THEN 'Security Deposit Return'
    WHEN 'ESCROW_DEPOSIT' THEN 'Escrow Deposit'
    WHEN 'ESCROW_RELEASE' THEN 'Escrow Release'
    
    ELSE category -- Keep unchanged if not a key
END
WHERE category LIKE '%\_%' -- Only update rows with underscores (likely keys)
  AND category IS NOT NULL;

-- Fix classification_rules table
UPDATE public.classification_rules
SET category = CASE category
    -- Income categories
    WHEN 'GROSS_RECEIPTS' THEN 'Gross Receipts or Sales'
    WHEN 'RETURNS_ALLOWANCES' THEN 'Returns and Allowances'
    WHEN 'OTHER_INCOME' THEN 'Other Income'
    
    -- Cost of goods sold
    WHEN 'COST_OF_GOODS_SOLD' THEN 'Cost of Goods Sold'
    WHEN 'INVENTORY_BEGINNING' THEN 'Beginning Inventory'
    WHEN 'INVENTORY_PURCHASES' THEN 'Inventory Purchases'
    WHEN 'COST_OF_LABOR' THEN 'Cost of Labor (not wages)'
    WHEN 'MATERIALS_SUPPLIES' THEN 'Materials and Supplies'
    WHEN 'OTHER_COSTS' THEN 'Other Costs (shipping, packaging)'
    WHEN 'INVENTORY_ENDING' THEN 'Ending Inventory'
    
    -- Schedule C expenses
    WHEN 'ADVERTISING' THEN 'Advertising'
    WHEN 'CAR_TRUCK_EXPENSES' THEN 'Car and Truck Expenses'
    WHEN 'COMMISSIONS_FEES' THEN 'Commissions and Fees'
    WHEN 'CONTRACT_LABOR' THEN 'Contract Labor'
    WHEN 'DEPLETION' THEN 'Depletion'
    WHEN 'DEPRECIATION' THEN 'Depreciation and Section 179'
    WHEN 'EMPLOYEE_BENEFIT_PROGRAMS' THEN 'Employee Benefit Programs'
    WHEN 'INSURANCE_OTHER' THEN 'Insurance (Other than Health)'
    WHEN 'INTEREST_MORTGAGE' THEN 'Interest (Mortgage)'
    WHEN 'INTEREST_OTHER' THEN 'Interest (Other)'
    WHEN 'LEGAL_PROFESSIONAL' THEN 'Legal and Professional Services'
    WHEN 'OFFICE_EXPENSES' THEN 'Office Expenses'
    WHEN 'PENSION_PROFIT_SHARING' THEN 'Pension and Profit-Sharing Plans'
    WHEN 'RENT_LEASE_VEHICLES' THEN 'Rent or Lease (Vehicles, Machinery, Equipment)'
    WHEN 'RENT_LEASE_OTHER' THEN 'Rent or Lease (Other Business Property)'
    WHEN 'REPAIRS_MAINTENANCE' THEN 'Repairs and Maintenance'
    WHEN 'SUPPLIES' THEN 'Supplies (Not Inventory)'
    WHEN 'TAXES_LICENSES' THEN 'Taxes and Licenses'
    WHEN 'TRAVEL' THEN 'Travel'
    WHEN 'MEALS' THEN 'Meals'
    WHEN 'UTILITIES' THEN 'Utilities'
    WHEN 'WAGES' THEN 'Wages (Less Employment Credits)'
    
    -- Other Line 27 expenses
    WHEN 'OTHER_EXPENSES' THEN 'Other Expenses'
    WHEN 'SOFTWARE_SUBSCRIPTIONS' THEN 'Software Subscriptions'
    WHEN 'WEB_HOSTING' THEN 'Web Hosting & Domains'
    WHEN 'BANK_FEES' THEN 'Bank Fees'
    WHEN 'BAD_DEBTS' THEN 'Bad Debts'
    WHEN 'DUES_MEMBERSHIPS' THEN 'Dues & Memberships'
    WHEN 'TRAINING_EDUCATION' THEN 'Training & Education'
    WHEN 'TRADE_PUBLICATIONS' THEN 'Trade Publications'
    WHEN 'SECURITY_SERVICES' THEN 'Security Services'
    WHEN 'BUSINESS_GIFTS' THEN 'Business Gifts'
    WHEN 'UNIFORMS_SAFETY' THEN 'Uniforms & Safety Gear'
    WHEN 'TOOLS_EQUIPMENT' THEN 'Tools (Under $2,500)'
    
    -- Special categories
    WHEN 'BUSINESS_USE_HOME' THEN 'Business Use of Home'
    WHEN 'DEPRECIATION_DETAIL' THEN 'Depreciation Detail'
    WHEN 'VEHICLE_DETAIL' THEN 'Vehicle Detail'
    WHEN 'PERSONAL_EXPENSE' THEN 'Personal Expense'
    WHEN 'PERSONAL_TRANSFER' THEN 'Personal Transfer'
    WHEN 'OWNER_DRAWS' THEN 'Owner Draws/Distributions'
    WHEN 'OWNER_CONTRIBUTION' THEN 'Owner Contribution/Capital'
    WHEN 'UNCATEGORIZED' THEN 'Uncategorized'
    WHEN 'SPLIT_TRANSACTION' THEN 'Split Transaction'
    
    -- Neutral categories
    WHEN 'TRANSFER_BETWEEN_ACCOUNTS' THEN 'Transfer Between Accounts'
    WHEN 'LOAN_RECEIVED' THEN 'Loan Received'
    WHEN 'LOAN_PAYMENT' THEN 'Loan Payment (Principal)'
    WHEN 'REFUND_RECEIVED' THEN 'Refund Received'
    WHEN 'REFUND_ISSUED' THEN 'Refund Issued'
    WHEN 'CREDIT_CARD_PAYMENT' THEN 'Credit Card Payment'
    WHEN 'SALES_TAX_COLLECTED' THEN 'Sales Tax Collected'
    WHEN 'SALES_TAX_PAYMENT' THEN 'Sales Tax Payment'
    WHEN 'PAYROLL_TAX_DEPOSIT' THEN 'Payroll Tax Deposit'
    WHEN 'REIMBURSEMENT_RECEIVED' THEN 'Reimbursement Received'
    WHEN 'REIMBURSEMENT_PAID' THEN 'Reimbursement Paid'
    WHEN 'PERSONAL_FUNDS_ADDED' THEN 'Personal Funds Added'
    WHEN 'PERSONAL_FUNDS_WITHDRAWN' THEN 'Personal Funds Withdrawn'
    WHEN 'OPENING_BALANCE' THEN 'Opening Balance'
    WHEN 'BALANCE_ADJUSTMENT' THEN 'Balance Adjustment'
    WHEN 'SECURITY_DEPOSIT' THEN 'Security Deposit'
    WHEN 'SECURITY_DEPOSIT_RETURN' THEN 'Security Deposit Return'
    WHEN 'ESCROW_DEPOSIT' THEN 'Escrow Deposit'
    WHEN 'ESCROW_RELEASE' THEN 'Escrow Release'
    
    ELSE category -- Keep unchanged if not a key
END
WHERE category LIKE '%\_%' -- Only update rows with underscores (likely keys)
  AND category IS NOT NULL;

-- Fix payees table default_category
UPDATE public.payees
SET default_category = CASE default_category
    WHEN 'GROSS_RECEIPTS' THEN 'Gross Receipts or Sales'
    WHEN 'RETURNS_ALLOWANCES' THEN 'Returns and Allowances'
    WHEN 'OTHER_INCOME' THEN 'Other Income'
    WHEN 'COST_OF_GOODS_SOLD' THEN 'Cost of Goods Sold'
    WHEN 'MATERIALS_SUPPLIES' THEN 'Materials and Supplies'
    WHEN 'ADVERTISING' THEN 'Advertising'
    WHEN 'CAR_TRUCK_EXPENSES' THEN 'Car and Truck Expenses'
    WHEN 'COMMISSIONS_FEES' THEN 'Commissions and Fees'
    WHEN 'CONTRACT_LABOR' THEN 'Contract Labor'
    WHEN 'INSURANCE_OTHER' THEN 'Insurance (Other than Health)'
    WHEN 'INTEREST_OTHER' THEN 'Interest (Other)'
    WHEN 'LEGAL_PROFESSIONAL' THEN 'Legal and Professional Services'
    WHEN 'OFFICE_EXPENSES' THEN 'Office Expenses'
    WHEN 'RENT_LEASE_VEHICLES' THEN 'Rent or Lease (Vehicles, Machinery, Equipment)'
    WHEN 'RENT_LEASE_OTHER' THEN 'Rent or Lease (Other Business Property)'
    WHEN 'REPAIRS_MAINTENANCE' THEN 'Repairs and Maintenance'
    WHEN 'SUPPLIES' THEN 'Supplies (Not Inventory)'
    WHEN 'TAXES_LICENSES' THEN 'Taxes and Licenses'
    WHEN 'TRAVEL' THEN 'Travel'
    WHEN 'MEALS' THEN 'Meals'
    WHEN 'UTILITIES' THEN 'Utilities'
    WHEN 'WAGES' THEN 'Wages (Less Employment Credits)'
    WHEN 'OTHER_EXPENSES' THEN 'Other Expenses'
    WHEN 'SOFTWARE_SUBSCRIPTIONS' THEN 'Software Subscriptions'
    WHEN 'WEB_HOSTING' THEN 'Web Hosting & Domains'
    WHEN 'BANK_FEES' THEN 'Bank Fees'
    WHEN 'OWNER_DRAWS' THEN 'Owner Draws/Distributions'
    WHEN 'OWNER_CONTRIBUTION' THEN 'Owner Contribution/Capital'
    ELSE default_category
END
WHERE default_category LIKE '%\_%'
  AND default_category IS NOT NULL;

-- Log migration
DO $$
DECLARE
    txn_count INTEGER;
    rule_count INTEGER;
    payee_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO txn_count FROM public.transactions WHERE category NOT LIKE '%\_%' AND category IS NOT NULL;
    SELECT COUNT(*) INTO rule_count FROM public.classification_rules WHERE category NOT LIKE '%\_%' AND category IS NOT NULL;
    SELECT COUNT(*) INTO payee_count FROM public.payees WHERE default_category NOT LIKE '%\_%' AND default_category IS NOT NULL;
    RAISE NOTICE 'Migration complete: % transactions, % rules, % payees now use category values', txn_count, rule_count, payee_count;
END $$;
