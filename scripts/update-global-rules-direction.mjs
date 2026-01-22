/**
 * Update Global Rules with amount_direction
 * 
 * Most global rules are for expense vendors (restaurants, gas stations, etc.)
 * so they should have amount_direction = 'negative'
 * 
 * Run: node scripts/update-global-rules-direction.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Categories that are typically income (positive direction)
const INCOME_CATEGORIES = [
  'Income',
  'Gross Receipts',
  'Rental Income',
  'Interest Income',
  'Dividend Income',
  'Capital Gains',
  'Other Income',
];

async function updateGlobalRulesDirection() {
  console.log('Fetching global rules...\n');

  // Get all global rules
  const { data: rules, error } = await supabase
    .from('classification_rules')
    .select('id, name, pattern, category, subcategory, amount_direction')
    .eq('is_global', true)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching rules:', error);
    return;
  }

  console.log(`Found ${rules.length} global rules\n`);

  // Separate rules by their likely direction
  const updates = [];
  
  for (const rule of rules) {
    // Skip if already has a direction set
    if (rule.amount_direction && rule.amount_direction !== 'any') {
      console.log(`✓ ${rule.name || rule.pattern}: already has direction '${rule.amount_direction}'`);
      continue;
    }

    // Determine direction based on category
    const isIncome = INCOME_CATEGORIES.some(cat => 
      rule.category?.toLowerCase().includes(cat.toLowerCase())
    );

    const newDirection = isIncome ? 'positive' : 'negative';
    
    updates.push({
      id: rule.id,
      name: rule.name || rule.pattern,
      category: rule.category,
      oldDirection: rule.amount_direction || 'null',
      newDirection
    });
  }

  console.log(`\n${updates.length} rules to update:\n`);
  
  // Group by direction for display
  const incomeRules = updates.filter(u => u.newDirection === 'positive');
  const expenseRules = updates.filter(u => u.newDirection === 'negative');

  if (incomeRules.length > 0) {
    console.log('=== INCOME RULES (positive) ===');
    incomeRules.forEach(r => console.log(`  • ${r.name} [${r.category}]`));
  }

  console.log('\n=== EXPENSE RULES (negative) ===');
  expenseRules.slice(0, 20).forEach(r => console.log(`  • ${r.name} [${r.category}]`));
  if (expenseRules.length > 20) {
    console.log(`  ... and ${expenseRules.length - 20} more`);
  }

  // Perform updates
  console.log('\nUpdating rules...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('classification_rules')
      .update({ amount_direction: update.newDirection })
      .eq('id', update.id);

    if (updateError) {
      console.error(`✗ Failed to update ${update.name}:`, updateError.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✓ Successfully updated ${successCount} rules`);
  if (errorCount > 0) {
    console.log(`✗ Failed to update ${errorCount} rules`);
  }

  // Verify the update
  console.log('\n--- Verification ---');
  const { data: verifyData } = await supabase
    .from('classification_rules')
    .select('amount_direction')
    .eq('is_global', true)
    .eq('is_active', true);

  const directionCounts = verifyData.reduce((acc, r) => {
    const dir = r.amount_direction || 'null';
    acc[dir] = (acc[dir] || 0) + 1;
    return acc;
  }, {});

  console.log('Direction distribution:');
  Object.entries(directionCounts).forEach(([dir, count]) => {
    console.log(`  ${dir}: ${count}`);
  });
}

updateGlobalRulesDirection().catch(console.error);
