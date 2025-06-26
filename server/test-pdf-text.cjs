const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
  try {
    const dataBuffer = fs.readFileSync('../chasepdf.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    // Test the exact regex used in the parser
    const debugRegex = /ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT/i;
    console.log('Debug regex test:', debugRegex.test(text));
    
    // Test individual transaction parsing
    const cardSection = text.match(/ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT[\s\S]*?Total ATM\s*&\s*DEBIT CARD WITHDRAWALS/i);
    
    if (cardSection) {
      console.log('Card section found, testing transaction parsing...');
      const lines = cardSection[0].split('\n');
      
      lines.forEach((line, i) => {
        if (line.includes('Card Purchase')) {
          console.log(`\nLine ${i}: "${line}"`);
          
          // Test the corrected regex pattern
          const match = line.match(/^(\d{2}\/\d{2})Card Purchase.*?Card\s*1819\$?([\d,]+\.\d{2})$/);
          if (match) {
            console.log(`  ✅ CORRECTED MATCH: Date=${match[1]}, Amount=${match[2]}`);
            
            // Test merchant extraction
            const merchantMatch = line.match(/Card Purchase\s*(?:\d{2}\/\d{2}\s+)?(.+?)\s+Card\s*1819/);
            if (merchantMatch) {
              console.log(`  🏪 Merchant: "${merchantMatch[1]}"`);
            }
          } else {
            console.log(`  ❌ NO MATCH with corrected pattern`);
          }
        }
      });
    } else {
      console.log('Card section not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
