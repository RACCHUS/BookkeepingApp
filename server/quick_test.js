import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

// Test the specific line that's missing
const testLine = '01/08 Remote Online Deposit 1 $3,640.00';
console.log(`Testing missing line: "${testLine}"`);
const result = ChaseTransactionParser.parseDepositLine(testLine, 2024);
if (result) {
  console.log(`✅ Parsed: ${result.description} - $${result.amount}`);
} else {
  console.log(`❌ Failed to parse`);
}

// Test all the lines we expect
const allLines = [
  '01/08 Remote Online Deposit 1 $3,640.00',
  '01/19 Remote Online Deposit 1 2,500.00',
  '01/31 Remote Online Deposit 1 2,910.00',
  '01/31 Remote Online Deposit 1 1,790.00',
  '01/31 Remote Online Deposit 1 1,550.00',
  '01/31 Remote Online Deposit 1 450.00',
  '01/31 Remote Online Deposit 1 450.00'
];

console.log('\n=== Testing All Expected Lines ===');
allLines.forEach((line, idx) => {
  console.log(`\nLine ${idx + 1}: "${line}"`);
  const result = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (result) {
    console.log(`✅ SUCCESS: ${result.date} | ${result.description} | $${result.amount}`);
  } else {
    console.log(`❌ FAILED`);
  }
});
