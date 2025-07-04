/**
 * Test merchant name extraction logic
 */

const testMerchants = [
  "Chevron 0202648 Plantation",
  "Chevron/Sunshine 39 Plantation", 
  "Lowe's #1681 Pembroke Pnes",
  "Sunshine #379 Plantation",
  "Sunshine 63 Plantation",
  "Exxon Sunshine 63 Plantation"
];

console.log('Testing merchant name extraction:');
console.log('=================================');

testMerchants.forEach((merchantPart, index) => {
  console.log(`\nTest ${index + 1}: "${merchantPart}"`);
  
  // Apply current logic
  let merchantName = merchantPart
    .replace(/\s+\d{7,}\s+/g, ' ') // Remove long transaction IDs (7+ digits)
    .replace(/\s+[A-Z]{2}\s*$/, '') // Remove state abbreviations at the end
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
    
  console.log(`After initial cleanup: "${merchantName}"`);
  
  // Handle special cases
  if (merchantName.includes('Chevron')) {
    if (merchantName.includes('Chevron/Sunshine')) {
      merchantName = 'Chevron/Sunshine';
    } else {
      merchantName = merchantName.replace(/\s+\d{4,}\s+/, ' ').replace(/Chevron.*?(\d+)/, 'Chevron').trim();
    }
  } else if (merchantName.includes('Exxon')) {
    merchantName = merchantName.replace(/\s+\d{4,}\s+/, ' ').trim();
    if (merchantName.includes('Sunshine')) {
      merchantName = 'Exxon Sunshine';
    }
  } else if (merchantName.includes('Sunshine')) {
    const sunshineMatch = merchantName.match(/Sunshine\s*(?:#\s*)?(\d+)/);
    if (sunshineMatch) {
      merchantName = `Sunshine #${sunshineMatch[1]}`;
    } else {
      merchantName = 'Sunshine';
    }
  } else if (merchantName.includes('Lowe\'s')) {
    const lowesMatch = merchantName.match(/Lowe's\s*#(\d+)/);
    if (lowesMatch) {
      merchantName = `Lowe's #${lowesMatch[1]}`;
    } else {
      merchantName = 'Lowe\'s';
    }
  } else if (merchantName.includes('Westar')) {
    const westarMatch = merchantName.match(/Westar\s+(\d+)/);
    if (westarMatch) {
      merchantName = `Westar ${westarMatch[1]}`;
    } else {
      merchantName = 'Westar';
    }
  }
  
  // Remove other 4-6 digit IDs
  merchantName = merchantName.replace(/\s+\d{4,6}\s+/g, ' ');
  
  // Final cleanup
  merchantName = merchantName.trim();
  if (!merchantName || merchantName.length < 2) {
    merchantName = 'Card Purchase';
  }
  
  console.log(`Final result: "${merchantName}"`);
});
