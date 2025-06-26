const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

async function debugCardTransactions() {
  try {
    const dataBuffer = await fs.readFile('../chasepdf.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    const lines = text.split('\n');
    
    console.log('🔍 Looking for card transaction patterns...\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Look for lines that contain "Card Purchase"
      if (trimmed.includes('Card Purchase')) {
        console.log(`[${index}] ${trimmed}`);
        
        // Test our regex
        const cardMatch = trimmed.match(/^(\d{2}\/\d{2})Card Purchase(?: With Pin)?(?: \d{2}\/\d{2})?\s+(.+?)\s+Card \d+\$?([\d,]+\.?\d{2})$/);
        if (cardMatch) {
          console.log(`  ✅ MATCHED: Date=${cardMatch[1]}, Description=${cardMatch[3]}, Amount=${cardMatch[4]}`);
        } else {
          console.log(`  ❌ NO MATCH - let's analyze this line...`);
          
          // Try simpler patterns
          const simpleMatch = trimmed.match(/^(\d{2}\/\d{2})Card Purchase.*?([\d,]+\.?\d{2})$/);
          if (simpleMatch) {
            console.log(`  📝 Simple match: Date=${simpleMatch[1]}, Amount=${simpleMatch[2]}`);
            
            // Extract description between date and amount
            const descMatch = trimmed.match(/^(\d{2}\/\d{2})Card Purchase[^$]*?(.+?)([\d,]+\.?\d{2})$/);
            if (descMatch) {
              console.log(`  📝 Full desc: "${descMatch[2]}"`);
            }
          }
        }
        console.log('');
      }
    });
    
    console.log('\n🔍 Looking for electronic transaction patterns...\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.includes('Orig CO Name')) {
        console.log(`[${index}] ${trimmed}`);
        
        // Look for amount in next few lines
        for (let i = index; i < Math.min(index + 3, lines.length); i++) {
          const nextLine = lines[i].trim();
          if (nextLine && nextLine.match(/[\d,]+\.\d{2}/) && !nextLine.includes('CO Name')) {
            console.log(`  💰 Amount line [${i}]: ${nextLine}`);
          }
        }
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCardTransactions();
