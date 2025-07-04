import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

// This test uses the exact text from the real PDF deposits section
const mockDepositSection = `DEPOSITS AND ADDITIONS
DATE DESCRIPTION AMOUNT
01/08 Remote Online Deposit 1 $3,640.00
01/09 Remote Online Deposit 1 2,520.00
01/10 Remote Online Deposit 1 2,330.00
01/11 Remote Online Deposit 1 3,100.00
01/14 Remote Online Deposit 1 2,710.00
01/15 Remote Online Deposit 1 2,910.00
01/19 Remote Online Deposit 1 2,500.00
Total Deposits and Additions $20,010.00`;

console.log('🔍 DEBUGGING MISSING FIRST DEPOSIT LINE');
console.log('==========================================');

// Test section extraction
console.log('\n1. Testing section extraction...');
const sectionText = ChaseSectionExtractor.extractDepositsSection(mockDepositSection);
console.log('Extracted section:');
console.log('--- START ---');
console.log(sectionText);
console.log('--- END ---');

// Test line splitting
console.log('\n2. Testing line splitting...');
const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
console.log(`Found ${lines.length} non-empty lines:`);
lines.forEach((line, idx) => {
  console.log(`Line ${idx}: "${line}"`);
});

// Test individual line parsing
console.log('\n3. Testing individual line parsing...');
const year = 2025;
let transactionCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  console.log(`\nProcessing line ${i}: "${line}"`);
  
  // Check if this line should be skipped
  if (line.includes('DATE') && line.includes('DESCRIPTION')) {
    console.log('  → SKIPPED: Header line');
    continue;
  }
  if (line.includes('Total Deposits') || line.includes('TOTAL DEPOSITS')) {
    console.log('  → SKIPPED: Total line');
    continue;
  }
  if (line.trim() === 'DEPOSITS AND ADDITIONS') {
    console.log('  → SKIPPED: Section header');
    continue;
  }
  
  // Try to parse as deposit
  const tx = ChaseTransactionParser.parseDepositLine(line, year);
  if (tx) {
    transactionCount++;
    console.log(`  → ✅ SUCCESS: ${tx.description} - $${tx.amount}`);
    console.log(`     Date: ${tx.date}`);
    console.log(`     Category: ${tx.category}`);
  } else {
    console.log(`  → ❌ FAILED to parse`);
  }
}

console.log(`\n4. SUMMARY: Parsed ${transactionCount} transactions`);
console.log('Expected: 7 transactions');

// Test the specific first line that's missing
console.log('\n5. SPECIFIC TEST: First deposit line');
const firstLine = '01/08 Remote Online Deposit 1 $3,640.00';
console.log(`Testing line: "${firstLine}"`);
const firstTx = ChaseTransactionParser.parseDepositLine(firstLine, year);
if (firstTx) {
  console.log(`✅ SUCCESS: ${firstTx.description} - $${firstTx.amount}`);
} else {
  console.log('❌ FAILED to parse first line');
}
