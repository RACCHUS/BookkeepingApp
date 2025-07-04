/**
 * Test all 14 card transactions from the user's PDF
 */
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

const testLines = [
  "01/02 Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819 $38.80",
  "01/02 Card Purchase 12/30 Goldenrod Petroleum Orlando FL Card 1819 30.00",
  "01/04 Card Purchase With Pin 01/04 Chevron/Sunshine 39 Plantation FL Card 1819 60.00",
  "01/08 Card Purchase With Pin 01/07 2185 N Universi Sunrise FL Card 1819 48.38",
  "01/09 Card Purchase With Pin 01/09 Lowe's #1681 Pembroke Pnes FL Card 1819 87.74",
  "01/11 Card Purchase With Pin 01/11 Port Everglades Fort Lauderda FL Card 1819 40.00",
  "01/12 Card Purchase With Pin 01/12 Sunshine # 379 Plantation FL Card 1819 30.00",
  "01/16 Card Purchase 01/12 Nic*-FL Sunbiz.Org Egov.Com FL Card 1819 158.75",
  "01/16 Card Purchase With Pin 01/13 2185 N Universi Sunrise FL Card 1819 30.00",
  "01/16 Card Purchase 01/15 Exxon Sunshine 63 Sunrise FL Card 1819 60.00",
  "01/19 Card Purchase With Pin 01/19 Lipton Toyota FT Lauderdale FL Card 1819 91.95",
  "01/22 Card Purchase With Pin 01/20 Westar 6000 Sunrise FL Card 1819 44.00",
  "01/22 Card Purchase With Pin 01/20 Sunshine 817 (3 Sunrise FL Card 1819 50.00",
  "01/26 Card Purchase With Pin 01/26 Sunshine # 379 Plantation FL Card 1819 60.00"
];

console.log('Testing all 14 card transactions from PDF:');
console.log('===========================================');

let totalParsed = 0;
let totalAmount = 0;
const expectedTotal = 829.62;

testLines.forEach((line, index) => {
  console.log(`\nTest ${index + 1}: ${line}`);
  
  const result = ChaseTransactionParser.parseCardLine(line, 2024);
  if (result) {
    totalParsed++;
    totalAmount += result.amount;
    console.log(`✓ Parsed: "${result.description}" - $${result.amount}`);
  } else {
    console.log(`✗ FAILED TO PARSE`);
  }
});

console.log('\n===========================================');
console.log(`Summary:`);
console.log(`Transactions parsed: ${totalParsed}/14`);
console.log(`Total amount parsed: $${totalAmount.toFixed(2)}`);
console.log(`Expected total: $${expectedTotal}`);
console.log(`Amount match: ${Math.abs(totalAmount - expectedTotal) < 0.01 ? '✓' : '✗'}`);

if (totalParsed < 14) {
  console.log('\n❌ Missing transactions - need to investigate parsing failures');
} else if (Math.abs(totalAmount - expectedTotal) < 0.01) {
  console.log('\n✅ All transactions parsed correctly with matching total!');
} else {
  console.log('\n⚠️ All transactions parsed but amounts don\'t match - check parsing logic');
}
