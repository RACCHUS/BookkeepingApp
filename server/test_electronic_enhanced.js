import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

// Mock the chasePDFParser class to test the new electronic parsing logic
class TestElectronicParser {
  extractElectronicTransactions(text, year) {
    // Use new section extractor and transaction parser
    const sectionText = ChaseSectionExtractor.extractElectronicSection(text);
    const electronicTransactions = [];
    if (sectionText) {
      console.log('🔌 DEBUG: ELECTRONIC SECTION EXTRACTED:');
      console.log('--- START SECTION ---');
      console.log(sectionText);
      console.log('--- END SECTION ---');
      
      const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log(`🔌 DEBUG: Split into ${lines.length} non-empty lines`);
      
      // Parse multi-line electronic transactions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip headers and totals
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('AMOUNT') || line.includes('Total')) {
          console.log(`🔌 Skipped header/total: "${line}"`);
          continue;
        }
        
        // Look for date + company line
        const dateCompanyMatch = line.match(/^(\d{2}\/\d{2})\s+Orig CO Name:([^O\n]+?)(?:\s*$)/);
        if (dateCompanyMatch) {
          const dateStr = dateCompanyMatch[1];
          const companyName = dateCompanyMatch[2].trim();
          
          console.log(`🔌 Found transaction start: ${dateStr} - ${companyName}`);
          
          // Look ahead for the amount in the next few lines
          let amount = null;
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const nextLine = lines[j].trim();
            
            // Stop if we hit another date line or total
            if (nextLine.match(/^\d{2}\/\d{2}/) || nextLine.includes('Total')) {
              break;
            }
            
            // Look for amount pattern
            const amountMatch = nextLine.match(/^\$?([\d,]+\.\d{2})$/);
            if (amountMatch) {
              amount = parseFloat(amountMatch[1].replace(/,/g, ''));
              console.log(`🔌 Found amount: $${amount} on line: "${nextLine}"`);
              break;
            }
          }
          
          if (amount && amount > 0 && amount <= 50000) {
            const date = this.parseDateToISO(dateStr, year);
            const transaction = {
              date,
              amount,
              description: `Electronic Payment: ${companyName}`,
              type: 'expense',
              category: 'Business Expenses',
              subCategory: 'Electronic Payments',
              source: 'chase_pdf',
            };
            electronicTransactions.push(transaction);
            console.log(`🔌 ✅ Created transaction: ${transaction.description} - $${transaction.amount}`);
          } else {
            console.log(`🔌 ❌ No valid amount found for ${companyName}`);
          }
        }
      }
    }
    return electronicTransactions;
  }

  parseDateToISO(dateStr, year) {
    // Helper method to parse MM/DD format to ISO date
    const dateParts = dateStr.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
  }
}

// Test electronic withdrawals section from the actual Chase PDF
const electronicSection = `ELECTRONIC WITHDRAWALS
DATE
DESCRIPTION
01/11 Orig CO Name:Home Depot 
Orig ID:Citictp Desc Date:240110 CO Entry 
Descr:Online Pmtsec:Web Trace#:091409686796442 Eed:240111 Ind 
ID:611273035887559 
AMOUNT
$389.20
01/12 Orig CO Name:Geico 
Ind Name:Shamdatconstruction Trn: 0116796442Tc
Orig ID:3530075853 Desc Date:240111 CO Entry Descr:Prem 
Coll Sec:PPD Trace#:021000028946089 Eed:240112 Ind ID: 
Ind 
Name:Shailendra Shamdat Trn: 0128946089Tc
416.25
Total Electronic Withdrawals`;

console.log('🧪 Testing Enhanced Electronic Withdrawals Parsing');
console.log('==================================================');

const parser = new TestElectronicParser();
const transactions = parser.extractElectronicTransactions(electronicSection, 2024);

console.log(`\n🎯 FINAL RESULTS:`);
console.log(`================`);
console.log(`Extracted ${transactions.length} electronic transactions:`);

transactions.forEach((tx, idx) => {
  console.log(`${idx + 1}. ${tx.date} | ${tx.description} | $${tx.amount}`);
});

console.log('\nExpected: 2 transactions (Home Depot $389.20, Geico $416.25)');
