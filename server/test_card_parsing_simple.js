/**
 * Test card transaction parsing with actual lines from the PDF
 */

const testLines = [
  "01/02 Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819 $38.80",
  "01/04 Card Purchase With Pin 01/04 Chevron/Sunshine 39 Plantation FL Card 1819 60.00",
  "01/09 Card Purchase With Pin 01/09 Lowe's #1681 Pembroke Pnes FL Card 1819 87.74",
  "01/16 Card Purchase With Pin 01/16 Sunshine #379 Plantation FL Card 1819 70.00",
  "01/26 Card Purchase With Pin 01/26 Sunshine 63 Plantation FL Card 1819 60.00",
  "01/29 Card Purchase 01/29 Exxon Sunshine 63 Plantation FL Card 1819 $50.00"
];

console.log('Testing card transaction parsing:');
console.log('=====================================');

testLines.forEach((line, index) => {
  console.log(`\nTest ${index + 1}: ${line}`);
  
  // Test current regex
  const match = line.match(/^(\d{2}\/\d{2})\s*Card Purchase(?:\s+With Pin)?\s*(?:\d{2}\/\d{2}\s+)?(.+?)\s+Card\s+1819\s*\$?([\d,]+\.\d{2})$/);
  console.log('Regex match:', match ? {
    date: match[1],
    merchantPart: match[2],
    amount: match[3]
  } : 'NO MATCH');
  
  // Test improved regex
  const improvedMatch = line.match(/^(\d{2}\/\d{2})\s*Card Purchase(?:\s+With Pin)?\s*(?:\d{2}\/\d{2}\s+)?(.+?)\s+[A-Z]{2}\s+Card\s+1819\s*\$?([\d,]+\.\d{2})$/);
  console.log('Improved regex match:', improvedMatch ? {
    date: improvedMatch[1],
    merchantPart: improvedMatch[2],
    amount: improvedMatch[3]
  } : 'NO MATCH');
});
