// Analyze the card number + amount pattern
const testLines = [
  '01/02Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819$38.80',
  '01/02Card Purchase 12/30 Goldenrod Petroleum Orlando FL Card 181930.00',
  '01/04Card Purchase With Pin 01/04 Chevron/Sunshine 39 Plantation FL Card 181960.00',
  '01/08Card Purchase With Pin 01/07 2185 N    Universi Sunrise FL Card 181948.38',
  '01/09Card Purchase With Pin 01/09 Lowe\'s #1681 Pembroke Pnes FL Card 181987.74',
  '01/11Card Purchase With Pin 01/11 Port Everglades Fort Lauderda FL Card 181940.00',
  '01/12Card Purchase With Pin 01/12 Sunshine #   379 Plantation FL Card 181930.00',
  '01/16Card Purchase 01/12 Nic*-FL Sunbiz.Org Egov.Com FL Card 1819158.75',
  '01/16Card Purchase With Pin 01/13 2185 N    Universi Sunrise FL Card 181930.00',
  '01/16Card Purchase 01/15 Exxon Sunshine 63 Sunrise FL Card 181960.00',
  '01/19Card Purchase With Pin 01/19 Lipton Toyota FT Lauderdale FL Card 181991.95',
  '01/22Card Purchase With Pin 01/20 Westar 6000 Sunrise FL Card 181944.00',
  '01/22Card Purchase With Pin 01/20 Sunshine 817 (3 Sunrise FL Card 181950.00',
  '01/26Card Purchase With Pin 01/26 Sunshine #   379 Plantation FL Card 181960.00'
];

console.log('🔍 Analyzing card number + amount patterns:\n');

testLines.forEach((line, i) => {
  console.log(`${i + 1}: ${line}`);
  
  // Extract the part after "Card "
  const cardMatch = line.match(/Card (\d+.*?)$/);
  if (cardMatch) {
    const cardPart = cardMatch[1];
    console.log(`  Card part: "${cardPart}"`);
    
    // Pattern: Card number (4 digits) followed by amount
    // Looking at the data, it seems like card 1819 is consistent
    // So amounts would be everything after 1819
    
    if (cardPart.startsWith('1819')) {
      const amountPart = cardPart.substring(4); // Remove "1819"
      console.log(`  Amount part: "${amountPart}"`);
      
      // Handle $38.80 vs 30.00 patterns
      const amountMatch = amountPart.match(/\$?([\d,]+\.?\d{2})$/);
      if (amountMatch) {
        console.log(`  ✅ Amount: $${amountMatch[1]}`);
      } else {
        console.log(`  ❌ No amount found`);
      }
    }
  }
  console.log('');
});

// Test the corrected pattern
console.log('🧪 Testing corrected pattern:\n');

testLines.forEach((line, i) => {
  const pattern = /^(\d{2}\/\d{2})Card Purchase(?: With Pin)?\s*(.*?)\s+Card 1819\$?([\d,]+\.?\d{2})$/;
  const match = line.match(pattern);
  if (match) {
    console.log(`✅ Line ${i + 1}: Date=${match[1]}, Desc='${match[2].trim()}', Amount=$${match[3]}`);
  } else {
    console.log(`❌ Line ${i + 1}: No match`);
  }
});

console.log('\n💰 Expected total from manual addition:');
const amounts = [38.80, 30.00, 60.00, 48.38, 87.74, 40.00, 30.00, 158.75, 30.00, 60.00, 91.95, 44.00, 50.00, 60.00];
const total = amounts.reduce((sum, amt) => sum + amt, 0);
console.log(`Total: $${total.toFixed(2)}`);
console.log('PDF shows total: $829.62');
