/**
 * Test the sorting functionality
 */

import { SORT_OPTIONS, SORT_DIRECTIONS, SORT_PRESETS } from './shared/constants/sorting.js';

console.log('🧪 Testing Sorting Constants...\n');

console.log('✅ SORT_OPTIONS count:', SORT_OPTIONS.length);
console.log('✅ SORT_DIRECTIONS count:', SORT_DIRECTIONS.length);
console.log('✅ SORT_PRESETS count:', SORT_PRESETS.length);

// Test all sort options
console.log('\n📋 Sort Options:');
SORT_OPTIONS.forEach(option => {
  console.log(`  ${option.icon} ${option.label} (${option.value}) - ${option.description}`);
});

// Test sort directions
console.log('\n🔄 Sort Directions:');
SORT_DIRECTIONS.forEach(direction => {
  console.log(`  ${direction.icon} ${direction.label} (${direction.value}) - ${direction.description}`);
});

// Test sort presets
console.log('\n⚡ Sort Presets:');
SORT_PRESETS.forEach(preset => {
  console.log(`  ${preset.icon} ${preset.label} - ${preset.orderBy} ${preset.order}`);
});

console.log('\n✨ All sorting tests complete!');
