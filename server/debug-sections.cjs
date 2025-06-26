const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

async function analyzePDFSections() {
  try {
    console.log('📄 Analyzing Chase PDF sections in detail...');
    
    const dataBuffer = await fs.readFile('../chasepdf.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    // Split by common section dividers to see the structure
    console.log('\n📋 Full Text Breakdown:');
    console.log('Total length:', text.length);
    
    // Look for specific transaction sections with better patterns
    const lines = text.split('\n');
    console.log('Total lines:', lines.length);
    
    // Find section starts
    let inDeposits = false;
    let inChecks = false;
    let inATM = false;
    let inElectronic = false;
    
    console.log('\n🔍 Line-by-line analysis:');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.includes('DEPOSITS AND ADDITIONS')) {
        console.log(`\n💰 DEPOSITS SECTION starts at line ${index}:`);
        inDeposits = true;
        inChecks = false;
        inATM = false;
        inElectronic = false;
      } else if (trimmed.includes('CHECKS PAID')) {
        console.log(`\n📝 CHECKS SECTION starts at line ${index}:`);
        inDeposits = false;
        inChecks = true;
        inATM = false;
        inElectronic = false;
      } else if (trimmed.includes('ATM') && trimmed.includes('DEBIT CARD')) {
        console.log(`\n💳 ATM/DEBIT SECTION starts at line ${index}:`);
        inDeposits = false;
        inChecks = false;
        inATM = true;
        inElectronic = false;
      } else if (trimmed.includes('ELECTRONIC WITHDRAWALS')) {
        console.log(`\n⚡ ELECTRONIC SECTION starts at line ${index}:`);
        inDeposits = false;
        inChecks = false;
        inATM = false;
        inElectronic = true;
      } else if (trimmed.includes('ENDING BALANCE') || trimmed.includes('SUMMARY')) {
        inDeposits = false;
        inChecks = false;
        inATM = false;
        inElectronic = false;
      }
      
      // Show transaction lines in each section
      if ((inDeposits || inChecks || inATM || inElectronic) && trimmed) {
        // Look for date patterns at start of line
        if (trimmed.match(/^\d{2}\/\d{2}/)) {
          console.log(`[${index}] ${trimmed}`);
        }
      }
    });
    
    // Look for the actual transaction data patterns
    console.log('\n🎯 Transaction Pattern Recognition:');
    
    // Look for lines that start with MM/DD followed by description and amount
    const transactionLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.match(/^\d{2}\/\d{2}.*[\d,]+\.\d{2}$/);
    });
    
    console.log(`Found ${transactionLines.length} potential transaction lines:`);
    transactionLines.forEach((line, i) => {
      if (i < 10) { // Show first 10
        console.log(`${i + 1}: ${line.trim()}`);
      }
    });
    
    // Also look for lines with amounts that might be split
    console.log('\n💰 All lines with dollar amounts:');
    const amountLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.match(/[\d,]+\.\d{2}/) && trimmed.length > 5;
    });
    
    amountLines.forEach((line, i) => {
      if (i < 15) { // Show first 15
        console.log(`${i + 1}: ${line.trim()}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error);
  }
}

analyzePDFSections();
