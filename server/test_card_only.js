/**
 * Simple test for PDF parsing without Firebase dependencies
 */
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

// Import the parsing components directly
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

async function testCardTransactionParsing() {
  try {
    console.log('🧪 Testing card transaction parsing...');
    
    // Read and parse the PDF file
    const pdfPath = 'uploads/20240131-statements-5697-.pdf.pdf';
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    console.log(`📖 Extracted ${text.length} characters from PDF`);
    
    // Extract card transactions section
    const cardSectionText = ChaseSectionExtractor.extractCardSection(text);
    
    if (cardSectionText) {
      console.log('\n💳 Card transactions section found');
      console.log('=====================================');
      
      const lines = cardSectionText.split('\n');
      const cardTransactions = [];
      
      for (const line of lines) {
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        
        const tx = ChaseTransactionParser.parseCardLine(line, 2024);
        if (tx) {
          cardTransactions.push(tx);
        }
      }
      
      console.log(`\n✅ Parsed ${cardTransactions.length} card transactions:`);
      cardTransactions.forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.date.split('T')[0]} - "${tx.description}" - $${tx.amount}`);
      });
      
      // Verify we got the expected transactions
      const expectedMerchants = ['Chevron', 'Chevron/Sunshine', 'Lowe\'s #1681', 'Sunshine #379', 'Sunshine #63', 'Exxon Sunshine'];
      const foundMerchants = cardTransactions.map(tx => tx.description);
      
      console.log('\n🔍 Verification:');
      expectedMerchants.forEach(expected => {
        const found = foundMerchants.some(merchant => merchant.includes(expected.split(' ')[0]));
        console.log(`  ${expected}: ${found ? '✓' : '✗'}`);
      });
      
    } else {
      console.log('❌ No card transactions section found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCardTransactionParsing();
