/**
 * Test updated card parsing logic
 */

const testMerchants = [
  "Chevron 0202648 Plantation",
  "Chevron/Sunshine 39 Plantation", 
  "Lowe's #1681 Pembroke Pnes",
  "Sunshine #379 Plantation",
  "Sunshine 63 Plantation",
  "Exxon Sunshine 63 Plantation"
];

console.log('Testing updated merchant name extraction:');
console.log('=========================================');

testMerchants.forEach((merchantPart, index) => {
  console.log(`\nTest ${index + 1}: "${merchantPart}"`);
  
  // Apply updated logic
  let merchantName = merchantPart
    .replace(/\s+\d{7,}\s+/g, ' ') // Remove long transaction IDs (7+ digits)
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
    
  console.log(`After initial cleanup: "${merchantName}"`);
  
  // Handle special cases
  if (merchantName.includes('Chevron')) {
    if (merchantName.includes('Chevron/Sunshine')) {
      merchantName = 'Chevron/Sunshine';
    } else {
      merchantName = merchantName.replace(/\s+\d{4,}\s+\w+$/, '').replace(/Chevron.*/, 'Chevron').trim();
    }
  } else if (merchantName.includes('Exxon')) {
    merchantName = merchantName.replace(/\s+\d{4,}\s+\w+$/, '').trim();
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
  
  // Remove location info at the end
  merchantName = merchantName.replace(/\s+\d{4,6}\s+\w+$/, ''); // Remove ID + location at end
  merchantName = merchantName.replace(/\s+\w+$/, ''); // Remove single word at end (likely city)
  
  // Final cleanup
  merchantName = merchantName.trim();
  if (!merchantName || merchantName.length < 2) {
    merchantName = 'Card Purchase';
  }
  
  console.log(`Final result: "${merchantName}"`);
});
