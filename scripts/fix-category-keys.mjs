/**
 * Fix category keys to values in database
 * Run with: node fix-category-keys.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const categoryKeyToValue = {
  'GROSS_RECEIPTS': 'Gross Receipts or Sales',
  'CREDIT_CARD_PAYMENT': 'Credit Card Payment',
  'CAR_TRUCK_EXPENSES': 'Car and Truck Expenses',
  'MEALS': 'Meals',
  'OFFICE_EXPENSES': 'Office Expenses',
  'SUPPLIES': 'Supplies',
  'UTILITIES': 'Utilities',
  'OTHER_EXPENSES': 'Other Expenses',
  'TRANSFER': 'Transfer',
  'OWNER_DRAW': 'Owner Draw/Distribution',
  'ADVERTISING': 'Advertising',
  'INSURANCE_OTHER': 'Insurance (Other)',
  'LEGAL_PROFESSIONAL': 'Legal and Professional Services',
  'REPAIRS_MAINTENANCE': 'Repairs and Maintenance',
  'TAXES_LICENSES': 'Taxes and Licenses',
  'TRAVEL': 'Travel',
  'CONTRACT_LABOR': 'Contract Labor',
  'WAGES': 'Wages',
  'RENT_LEASE_OTHER': 'Rent or Lease (Other)',
  'COMMISSIONS_FEES': 'Commissions and Fees',
  'DEPRECIATION': 'Depreciation',
  'DEPLETION': 'Depletion',
  'EMPLOYEE_BENEFIT_PROGRAMS': 'Employee Benefit Programs',
  'INTEREST_MORTGAGE': 'Interest (Mortgage)',
  'INTEREST_OTHER': 'Interest (Other)',
  'PENSION_PROFIT_SHARING': 'Pension and Profit-Sharing Plans',
  'RENT_LEASE_VEHICLES': 'Rent or Lease (Vehicles)',
  'RETURNS_ALLOWANCES': 'Returns and Allowances',
  'OTHER_INCOME': 'Other Income',
  'COST_OF_GOODS_SOLD': 'Cost of Goods Sold',
  'INVENTORY_BEGINNING': 'Inventory at Beginning of Year',
  'INVENTORY_PURCHASES': 'Purchases',
  'COST_OF_LABOR': 'Cost of Labor',
  'MATERIALS_SUPPLIES': 'Materials and Supplies',
  'OTHER_COSTS': 'Other Costs',
  'INVENTORY_ENDING': 'Inventory at End of Year',
};

async function fixCategories() {
  console.log('Fixing category keys in classification_rules...');
  
  let rulesFixed = 0;
  let transactionsFixed = 0;

  for (const [key, value] of Object.entries(categoryKeyToValue)) {
    // Fix classification_rules
    const { data: rulesData, error: rulesError } = await supabase
      .from('classification_rules')
      .update({ category: value })
      .eq('category', key)
      .select('id');
    
    if (rulesError) {
      console.error(`Error fixing rules for ${key}:`, rulesError.message);
    } else if (rulesData?.length > 0) {
      rulesFixed += rulesData.length;
      console.log(`  Fixed ${rulesData.length} rules: ${key} -> ${value}`);
    }

    // Fix transactions
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .update({ category: value })
      .eq('category', key)
      .select('id');
    
    if (txError) {
      console.error(`Error fixing transactions for ${key}:`, txError.message);
    } else if (txData?.length > 0) {
      transactionsFixed += txData.length;
      console.log(`  Fixed ${txData.length} transactions: ${key} -> ${value}`);
    }
  }

  console.log(`\nDone! Fixed ${rulesFixed} rules and ${transactionsFixed} transactions.`);
}

fixCategories().catch(console.error);
