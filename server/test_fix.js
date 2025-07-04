import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

console.log('🧪 Testing the problematic first deposit line');
console.log('=============================================');

const problematicLine = '01/08Remote Online Deposit 1$3,640.00';
console.log(`Testing: "${problematicLine}"`);

const result = ChaseTransactionParser.parseDepositLine(problematicLine, 2024);

if (result) {
  console.log(`✅ SUCCESS: ${result.description} - $${result.amount} on ${result.date}`);
} else {
  console.log('❌ Still failed to parse');
}

// Test the other lines too to make sure we didn't break anything
const testLines = [
  '01/08Remote Online Deposit 1$3,640.00',    // No space before $
  '01/19Remote Online Deposit 12,500.00',     // No space before amount
  '01/31Remote Online Deposit 12,910.00',
  '01/31Remote Online Deposit 11,790.00',  
  '01/31Remote Online Deposit 11,550.00',
  '01/31Remote Online Deposit 1450.00',
  '01/31Remote Online Deposit 1450.00',
  // Test with spaces (original format)
  '01/08 Remote Online Deposit 1 $3,640.00',
  '01/19 Remote Online Deposit 1 2,500.00',
];

console.log('\n🧪 Testing all lines to ensure no regressions');
console.log('==============================================');

testLines.forEach((line, idx) => {
  console.log(`\nTest ${idx + 1}: "${line}"`);
  const result = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (result) {
    console.log(`✅ Parsed: ${result.description} - $${result.amount}`);
  } else {
    console.log(`❌ Failed to parse`);
  }
});
