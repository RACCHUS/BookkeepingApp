const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

async function analyzePDF() {
  try {
    console.log('📄 Analyzing Chase PDF structure...');
    
    const dataBuffer = await fs.readFile('./chasepdf.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    console.log('📖 Total text length:', text.length);
    console.log('📋 First 2000 characters:');
    console.log('=' .repeat(80));
    console.log(text.substring(0, 2000));
    console.log('=' .repeat(80));
    
    // Look for section headers
    console.log('\n🔍 Section Analysis:');
    const sections = [
      'DEPOSITS AND ADDITIONS',
      'CHECKS PAID', 
      'ATM & DEBIT CARD WITHDRAWALS',
      'ELECTRONIC WITHDRAWALS',
      'BEGINNING BALANCE',
      'ENDING BALANCE',
      'Account Number',
      'Statement Period'
    ];
    
    sections.forEach(section => {
      const found = text.includes(section);
      const index = text.indexOf(section);
      console.log(`${found ? '✅' : '❌'} ${section}: ${found ? `found at position ${index}` : 'not found'}`);
    });
    
    // Look for transaction patterns
    console.log('\n💳 Transaction Pattern Analysis:');
    
    // Common date patterns in Chase statements
    const datePatterns = [
      /\d{2}\/\d{2}/g,  // MM/DD
      /\d{1,2}\/\d{1,2}/g, // M/D or MM/DD
      /\d{2}\/\d{2}\/\d{2,4}/g // MM/DD/YY or MM/DD/YYYY
    ];
    
    datePatterns.forEach((pattern, i) => {
      const matches = text.match(pattern);
      console.log(`Date pattern ${i + 1}: ${matches ? matches.length : 0} matches`);
      if (matches && matches.length > 0) {
        console.log(`Sample matches: ${matches.slice(0, 5).join(', ')}`);
      }
    });
    
    // Look for dollar amounts
    const amountPatterns = [
      /\$[\d,]+\.?\d{2}/g,  // $1,234.56
      /[\d,]+\.\d{2}/g,     // 1,234.56
      /-?\$?[\d,]+\.\d{2}/g // -$1,234.56 or -1,234.56
    ];
    
    amountPatterns.forEach((pattern, i) => {
      const matches = text.match(pattern);
      console.log(`Amount pattern ${i + 1}: ${matches ? matches.length : 0} matches`);
      if (matches && matches.length > 0) {
        console.log(`Sample matches: ${matches.slice(0, 10).join(', ')}`);
      }
    });
    
    // Extract sections for detailed analysis
    console.log('\n📊 Section Content Analysis:');
    
    const depositSection = text.match(/DEPOSITS AND ADDITIONS[\s\S]*?(?=CHECKS PAID|$)/i);
    if (depositSection) {
      console.log('\n💰 DEPOSITS SECTION (first 500 chars):');
      console.log(depositSection[0].substring(0, 500));
    }
    
    const checkSection = text.match(/CHECKS PAID[\s\S]*?(?=ATM & DEBIT CARD|ELECTRONIC|$)/i);
    if (checkSection) {
      console.log('\n📝 CHECKS SECTION (first 500 chars):');
      console.log(checkSection[0].substring(0, 500));
    }
    
    const cardSection = text.match(/ATM & DEBIT CARD WITHDRAWALS[\s\S]*?(?=ELECTRONIC|$)/i);
    if (cardSection) {
      console.log('\n💳 CARD TRANSACTIONS SECTION (first 500 chars):');
      console.log(cardSection[0].substring(0, 500));
    }
    
    const electronicSection = text.match(/ELECTRONIC WITHDRAWALS[\s\S]*?(?=SUMMARY|$)/i);
    if (electronicSection) {
      console.log('\n⚡ ELECTRONIC SECTION (first 500 chars):');
      console.log(electronicSection[0].substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error);
  }
}

analyzePDF();
