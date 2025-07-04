import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

// Mock the chasePDFParser class to test the enhanced electronic parsing logic
class TestElectronicParser {
  extractElectronicTransactions(text, year) {
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
        
        // Look for date + company line (handle both single-line and multi-line formats)
        const dateCompanyMatch = line.match(/^(\d{2}\/\d{2}).*?Orig CO Name:([^O\n]+?)(?:Orig|$)/);
        if (dateCompanyMatch) {
          const dateStr = dateCompanyMatch[1];
          let companyName = dateCompanyMatch[2].trim();
          
          // Clean up company name (remove extra info)
          companyName = companyName.replace(/\s+ID:.*$/, '').trim();
          
          console.log(`🔌 Found transaction start: ${dateStr} - ${companyName}`);
          
          // Try to find amount on the same line first
          let amount = null;
          const sameLineAmountMatch = line.match(/\$?([\d,]+\.\d{2})/);
          if (sameLineAmountMatch) {
            amount = parseFloat(sameLineAmountMatch[1].replace(/,/g, ''));
            console.log(`🔌 Found amount on same line: $${amount}`);
          } else {
            // Look ahead for the amount in the next few lines (multi-line format)
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
                console.log(`🔌 Found amount on next line: $${amount} from line: "${nextLine}"`);
                break;
              }
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
    const dateParts = dateStr.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
  }
}

console.log('🧪 Testing Enhanced Electronic Withdrawals Parsing');
console.log('==================================================');

// Test 1: Real PDF format (single-line with amount on same line)
const realPDFFormat = `ELECTRONIC WITHDRAWALS
DATEDESCRIPTIONAMOUNT
01/11Orig CO Name:Home Depot Orig ID:Citictp Desc Date:240110 CO Entry
Descr:Online Pmtsec:Web Trace#:091409686796442 Eed:240111 Ind
ID:611273035887559 Ind Name:Shamdatconstruction Trn: 0116796442Tc
$389.20
01/12Orig CO Name:Geico Orig ID:3530075853 Desc Date:240111 CO Entry Descr:Prem
Coll Sec:PPD Trace#:021000028946089 Eed:240112 Ind ID: Ind
Name:Shailendra Shamdat Trn: 0128946089Tc
416.25
Total Electronic Withdrawals`;

console.log('\n📄 TEST 1: Real PDF Format');
console.log('==========================');
const parser = new TestElectronicParser();
const realTransactions = parser.extractElectronicTransactions(realPDFFormat, 2024);

console.log(`\n🎯 Real PDF Results: ${realTransactions.length} transactions`);
realTransactions.forEach((tx, idx) => {
  console.log(`${idx + 1}. ${tx.date} | ${tx.description} | $${tx.amount}`);
});

// Test 2: Multi-line format (from your original example)
const multiLineFormat = `ELECTRONIC WITHDRAWALS
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

console.log('\n\n📄 TEST 2: Multi-line Format');
console.log('=============================');
const multiTransactions = parser.extractElectronicTransactions(multiLineFormat, 2024);

console.log(`\n🎯 Multi-line Results: ${multiTransactions.length} transactions`);
multiTransactions.forEach((tx, idx) => {
  console.log(`${idx + 1}. ${tx.date} | ${tx.description} | $${tx.amount}`);
});

console.log('\n\n🏁 SUMMARY');
console.log('==========');
console.log(`Real PDF format: ${realTransactions.length} transactions`);
console.log(`Multi-line format: ${multiTransactions.length} transactions`);
console.log('Expected: 2 transactions each (Home Depot $389.20, Geico $416.25)');
