/**
 * Test complete card parsing with actual transaction lines
 */
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

const testLines = [
  "01/02 Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819 $38.80",
  "01/04 Card Purchase With Pin 01/04 Chevron/Sunshine 39 Plantation FL Card 1819 60.00",
  "01/09 Card Purchase With Pin 01/09 Lowe's #1681 Pembroke Pnes FL Card 1819 87.74",
  "01/16 Card Purchase With Pin 01/16 Sunshine #379 Plantation FL Card 1819 70.00", 
  "01/26 Card Purchase With Pin 01/26 Sunshine 63 Plantation FL Card 1819 60.00",
  "01/29 Card Purchase 01/29 Exxon Sunshine 63 Plantation FL Card 1819 $50.00"
];

console.log('Testing complete card transaction parsing:');
console.log('==========================================');

testLines.forEach((line, index) => {
  console.log(`\nTest ${index + 1}: ${line}`);
  
  const result = ChaseTransactionParser.parseCardLine(line, 2024);
  if (result) {
    console.log(`✓ Parsed successfully:`);
    console.log(`  Date: ${result.date}`);
    console.log(`  Description: "${result.description}"`);
    console.log(`  Amount: $${result.amount}`);
    console.log(`  Category: ${result.category}`);
  } else {
    console.log(`✗ Failed to parse`);
  }
});
