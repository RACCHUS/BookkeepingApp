import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

async function debugCardTransactions() {
  try {
    console.log('Debugging card transaction extraction...');
    
    const dataBuffer = await fs.readFile('../chasepdf.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    // Look for the card section
    const cardSectionRegex = /ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT[\s\S]*?Total ATM\s*&\s*DEBIT CARD WITHDRAWALS/i;
    const cardSection = text.match(cardSectionRegex);
    
    console.log('Card section found:', cardSection ? 'YES' : 'NO');
    
    if (cardSection) {
      console.log('\n==== CARD SECTION TEXT ====');
      console.log(cardSection[0]);
      console.log('\n==== SPLITTING INTO LINES ====');
      
      const lines = cardSection[0].split('\n');
      lines.forEach((line, i) => {
        console.log(`${i}: "${line}"`);
      });
      
      console.log('\n==== TESTING REGEX ON EACH LINE ====');
      
      // Current regex pattern from the parser
      const currentRegex = /^(\d{2}\/\d{2})Card Purchase.*?Card\s*1819\$?([\d,]+\.\d{2})$/;
      
      lines.forEach((line, i) => {
        if (line.includes('Card Purchase')) {
          console.log(`\nLine ${i}: "${line}"`);
          console.log('Contains "Card Purchase": YES');
          
          const match = line.match(currentRegex);
          console.log('Matches current regex:', match ? 'YES' : 'NO');
          
          if (match) {
            console.log('Match details:', match);
          } else {
            // Let's try some variations
            console.log('Trying variations...');
            
            // More flexible patterns
            const patterns = [
              /(\d{2}\/\d{2}).*Card Purchase.*Card\s*1819\$?([\d,]+\.\d{2})/,
              /(\d{2}\/\d{2}).*Card Purchase.*1819.*?([\d,]+\.\d{2})/,
              /(\d{2}\/\d{2}).*Card Purchase.*?([\d,]+\.\d{2})$/,
              /(\d{2}\/\d{2})Card Purchase.*?([\d,]+\.\d{2})/
            ];
            
            patterns.forEach((pattern, j) => {
              const testMatch = line.match(pattern);
              console.log(`  Pattern ${j+1}: ${testMatch ? 'MATCH' : 'NO MATCH'}`);
              if (testMatch) {
                console.log(`    Date: ${testMatch[1]}, Amount: ${testMatch[2]}`);
              }
            });
          }
        }
      });
    }
    
    // Also check if there are any lines that contain "Card Purchase" at all
    console.log('\n==== SEARCHING FOR "Card Purchase" LINES ====');
    const textLines = text.split('\n');
    let cardPurchaseLines = [];
    
    textLines.forEach((line, i) => {
      if (line.includes('Card Purchase')) {
        cardPurchaseLines.push({index: i, line: line});
      }
    });
    
    console.log(`Found ${cardPurchaseLines.length} lines containing "Card Purchase"`);
    cardPurchaseLines.slice(0, 10).forEach(item => {
      console.log(`Line ${item.index}: "${item.line}"`);
    });
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugCardTransactions();
