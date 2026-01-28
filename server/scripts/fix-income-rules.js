/**
 * Fix income rules that have wrong amount_direction
 * Income categories should have direction='any' or 'positive', not 'negative'
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load .env from root directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixIncomeRules() {
  const incomeCategories = [
    'Gross Receipts or Sales',
    'Other Income',
    'Refund Received',
    'Owner Contribution/Capital',
    'Loan Received'
  ];

  console.log('Fixing income rules with wrong direction...');
  
  // First, find the bad rules
  const { data: badRules, error: findError } = await supabase
    .from('classification_rules')
    .select('id, pattern, category, amount_direction')
    .in('category', incomeCategories)
    .eq('amount_direction', 'negative');

  if (findError) {
    console.error('Error finding rules:', findError);
    return;
  }

  console.log('Found', badRules?.length || 0, 'rules to fix:');
  badRules?.forEach(r => console.log(`  - ${r.pattern}: ${r.category} (was: ${r.amount_direction})`));

  if (!badRules || badRules.length === 0) {
    console.log('No rules need fixing!');
    return;
  }

  // Update them
  const { data: updated, error: updateError } = await supabase
    .from('classification_rules')
    .update({ amount_direction: 'any' })
    .in('category', incomeCategories)
    .eq('amount_direction', 'negative')
    .select();

  if (updateError) {
    console.error('Error updating rules:', updateError);
    return;
  }

  console.log('Successfully updated', updated?.length || 0, 'rules to direction="any"');
}

fixIncomeRules().catch(console.error);
