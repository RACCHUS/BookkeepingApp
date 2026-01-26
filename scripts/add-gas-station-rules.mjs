/**
 * Add Gas Station Amount-Based Rules
 * 
 * Adds classification rules for gas stations with amount-based logic:
 * - Under $15: MEALS (snacks/drinks)
 * - $15 and over: CAR_TRUCK_EXPENSES (fuel)
 * 
 * Usage: node scripts/add-gas-station-rules.mjs
 */

import { createClient } from '@supabase/supabase-js';

// Hardcoded for this one-time script
const supabaseUrl = 'https://jjkcrknddmehqcscfceo.supabase.co';
const supabaseServiceKey = 'sb_secret_xz5su7ZphGZDzG0NcbLxVg_h_wAM2qq';
const KNOWN_USER_ID = 'aXjyMKnZ1HdKdNISWTgvzq2GXOt1';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GAS_STATIONS = [
  { pattern: 'SHELL', vendor: 'Shell' },
  { pattern: 'CHEVRON', vendor: 'Chevron' },
  { pattern: 'EXXON', vendor: 'Exxon' },
  { pattern: 'BP', vendor: 'BP' },
  { pattern: 'MOBIL', vendor: 'Mobil' },
  { pattern: 'CIRCLE K', vendor: 'Circle K' },
  { pattern: '7-ELEVEN', vendor: '7-Eleven' },
  { pattern: '7 ELEVEN', vendor: '7-Eleven' },
  { pattern: 'SPEEDWAY', vendor: 'Speedway' },
  { pattern: 'WAWA', vendor: 'Wawa' },
  { pattern: 'RACETRAC', vendor: 'RaceTrac' },
  { pattern: 'QUIKTRIP', vendor: 'QuikTrip' },
  { pattern: 'SHEETZ', vendor: 'Sheetz' },
  { pattern: 'MURPHY', vendor: 'Murphy USA' },
  { pattern: 'ARCO', vendor: 'ARCO' },
  { pattern: 'SUNOCO', vendor: 'Sunoco' },
  { pattern: 'VALERO', vendor: 'Valero' },
  { pattern: 'CITGO', vendor: 'Citgo' },
  { pattern: 'CONOCO', vendor: 'Conoco' },
  { pattern: 'PHILLIPS 66', vendor: 'Phillips 66' },
];

async function addGasStationRules() {
  console.log('🚗 Adding gas station classification rules...\n');
  
  // Use the known user_id
  const userId = KNOWN_USER_ID;
  console.log(`📝 Using user_id: ${userId}\n`);
  
  const rules = [];
  
  for (const station of GAS_STATIONS) {
    // Rule 1: Under $15 = Meals (snacks/drinks)
    rules.push({
      user_id: userId,
      name: `${station.vendor} (< $15)`,  // Required field
      pattern: station.pattern,
      pattern_type: 'contains',
      category: 'MEALS',
      subcategory: 'Gas Station Snacks',
      vendor_name: station.vendor,
      amount_direction: 'negative',
      amount_min: null,
      amount_max: 15,
      source: 'manual',
      is_active: true
    });
    
    // Rule 2: $15 and over = Car & Truck Expenses (fuel)
    rules.push({
      user_id: userId,
      name: `${station.vendor} (>= $15)`,  // Required field
      pattern: station.pattern,
      pattern_type: 'contains',
      category: 'CAR_TRUCK_EXPENSES',
      subcategory: 'Fuel/Gas',
      vendor_name: station.vendor,
      amount_direction: 'negative',
      amount_min: 15,
      amount_max: null,
      source: 'manual',
      is_active: true
    });
  }
  
  console.log(`📦 Inserting ${rules.length} rules for ${GAS_STATIONS.length} gas station brands...\n`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const rule of rules) {
    // Check if rule already exists
    const { data: existing } = await supabase
      .from('classification_rules')
      .select('id')
      .eq('user_id', userId)
      .eq('pattern', rule.pattern)
      .eq('category', rule.category)
      .eq('amount_min', rule.amount_min)
      .eq('amount_max', rule.amount_max)
      .single();
    
    if (existing) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase
      .from('classification_rules')
      .insert(rule);
    
    if (error) {
      console.error(`❌ Failed to insert ${rule.pattern} (${rule.category}):`, error.message);
    } else {
      inserted++;
      console.log(`  ✓ ${rule.pattern} → ${rule.category} (${rule.amount_max ? '< $' + rule.amount_max : '>= $' + rule.amount_min})`);
    }
  }
  
  console.log(`\n✅ Done! Inserted: ${inserted}, Skipped (existing): ${skipped}`);
  
  // Show sample rules
  const { data: sample } = await supabase
    .from('classification_rules')
    .select('pattern, category, amount_min, amount_max, vendor_name')
    .in('pattern', ['SHELL', 'CHEVRON', '7-ELEVEN'])
    .order('pattern')
    .order('amount_min', { nullsFirst: true });
  
  if (sample?.length) {
    console.log('\n📋 Sample rules created:');
    console.table(sample);
  }
}

addGasStationRules().catch(console.error);
