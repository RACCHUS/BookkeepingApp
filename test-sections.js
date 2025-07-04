/**
 * Test file to validate section functionality
 * Run: node test-sections.js
 */

import { STATEMENT_SECTIONS, SECTION_OPTIONS, getSectionDisplayName } from './shared/constants/sections.js';

console.log('🧪 Testing Section Constants...\n');

console.log('✅ STATEMENT_SECTIONS:', Object.keys(STATEMENT_SECTIONS));
console.log('✅ SECTION_OPTIONS count:', SECTION_OPTIONS.length);

// Test all section codes
const testCodes = ['deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized', 'invalid'];

console.log('\n📋 Section Display Names:');
testCodes.forEach(code => {
  const displayName = getSectionDisplayName(code);
  console.log(`  ${code} → "${displayName}"`);
});

// Test section lookup
console.log('\n🔍 Section Lookup Tests:');
SECTION_OPTIONS.forEach(section => {
  console.log(`  ${section.code} → ${section.label} (${section.name})`);
});

console.log('\n✨ All tests complete!');
