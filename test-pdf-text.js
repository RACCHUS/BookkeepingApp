const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
  try {
    const dataBuffer = fs.readFileSync('chasepdf.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    console.log('Looking for ATM section...');
    if (text.includes('ATM')) {
      const atmIndex = text.indexOf('ATM');
      console.log('Found ATM at position:', atmIndex);
      console.log('Context around ATM:');
      console.log(JSON.stringify(text.slice(atmIndex, atmIndex + 100)));
    }
    
    if (text.includes('DEBIT CARD')) {
      const debitIndex = text.indexOf('DEBIT CARD');
      console.log('Found DEBIT CARD at position:', debitIndex);
      console.log('Context around DEBIT CARD:');
      console.log(JSON.stringify(text.slice(debitIndex - 20, debitIndex + 80)));
    }
    
    // Look for all variations
    const variations = ['ATM & DEBIT', 'ATM &DEBIT', 'ATM& DEBIT', 'ATM&DEBIT'];
    for (const variant of variations) {
      if (text.includes(variant)) {
        console.log(`Found variant: "${variant}"`);
        const index = text.indexOf(variant);
        console.log('Context:', JSON.stringify(text.slice(index, index + 50)));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
