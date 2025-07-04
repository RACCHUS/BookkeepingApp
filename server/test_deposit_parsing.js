import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

// Test deposit lines from the actual Chase PDF
const testLines = [
  '01/08 Remote Online Deposit 1 $3,640.00',
  '01/19 Remote Online Deposit 1 2,500.00',
  '01/31 Remote Online Deposit 1 2,910.00',
  '01/31 Remote Online Deposit 1 1,790.00',
  '01/31 Remote Online Deposit 1 1,550.00',
  '01/31 Remote Online Deposit 1 450.00',
  '01/31 Remote Online Deposit 1 450.00',
  // Edge cases
  'DATE DESCRIPTION AMOUNT',
  'Total Deposits and Additions $19,260.00',
  '',
  '  ',
  'DEPOSITS AND ADDITIONS'
];

console.log('🧪 Testing Chase Deposit Line Parsing');
console.log('=====================================');

let successCount = 0;
testLines.forEach((line, index) => {
  console.log(`\nTest ${index + 1}: "${line}"`);
  const result = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (result) {
    console.log(`✅ Parsed: ${result.date} | ${result.description} | $${result.amount}`);
    successCount++;
  } else {
    console.log(`❌ Failed to parse`);
  }
});

console.log(`\n🔍 Summary: Parsed ${successCount} out of ${testLines.length} lines`);
console.log('Expected: 7 valid transactions');

// Test section extraction with the actual PDF deposits section
const mockDepositsSection = `DEPOSITS AND ADDITIONS
DATE DESCRIPTION AMOUNT
01/08 Remote Online Deposit 1 $3,640.00
01/19 Remote Online Deposit 1 2,500.00
01/31 Remote Online Deposit 1 2,910.00
01/31 Remote Online Deposit 1 1,790.00
01/31 Remote Online Deposit 1 1,550.00
01/31 Remote Online Deposit 1 450.00
01/31 Remote Online Deposit 1 450.00
Total Deposits and Additions $13,290.00`;

console.log('\n🧪 Testing Section Processing');
console.log('==============================');

const lines = mockDepositsSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
console.log(`Split into ${lines.length} lines`);

let parsedTransactions = 0;
lines.forEach((line, idx) => {
  console.log(`\nLine ${idx}: "${line}"`);
  
  // Apply the same filtering logic as the main parser
  if (line.includes('DATE') && line.includes('DESCRIPTION')) {
    console.log(`Skipped: Header line`);
    return;
  }
  if (line.includes('Total Deposits') || line.includes('TOTAL DEPOSITS')) {
    console.log(`Skipped: Total line`);
    return;
  }
  if (line.trim() === 'DEPOSITS AND ADDITIONS') {
    console.log(`Skipped: Section header`);
    return;
  }
  
  const tx = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (tx) {
    console.log(`✅ Parsed transaction: ${tx.description} - $${tx.amount}`);
    parsedTransactions++;
  } else {
    console.log(`❌ Failed to parse`);
  }
});

console.log(`\n🎯 Final Result: Parsed ${parsedTransactions} transactions from mock section`);

// Test with potentially messy PDF extraction text (what might actually be happening)
console.log('\n🧪 Testing Messy PDF Text');
console.log('==========================');

const messyLines = [
  // These might simulate how PDF extraction could add extra characters
  '01/31 Remote Online Deposit 1 2,910.00',
  '01/31 Remote Online Deposit 1 1,790.00',  
  '01/31 Remote Online Deposit 1 1,550.00',
  // Potential issues - extra text or formatting
  '01/31 Remote Online Deposit 1 2,910.00 some extra text',
  '01/31 Remote Online Deposit 1 1,790.00\t',
  '01/31 Remote Online Deposit 1 1,550.00 \n',
  '  01/31 Remote Online Deposit 1 450.00  ',
  '01/31Remote Online Deposit 1 450.00',  // missing space
  '01/31 Remote Online Deposit 12,910.00', // missing space before amount
];

messyLines.forEach((line, idx) => {
  console.log(`\nMessy test ${idx + 1}: "${line}"`);
  const result = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (result) {
    console.log(`✅ Parsed: ${result.description} - $${result.amount}`);
  } else {
    console.log(`❌ Failed to parse`);
  }
});

// Test the specific concatenation issue that's causing wrong amounts
console.log('\n🧪 Testing Concatenation Fix');
console.log('============================');

const concatenatedLines = [
  '01/31 Remote Online Deposit 12,910.00',  // Should become 2,910.00
  '01/31 Remote Online Deposit 11,790.00',  // Should become 1,790.00  
  '01/31 Remote Online Deposit 11,550.00',  // Should become 1,550.00
  '01/19 Remote Online Deposit 12,500.00',  // Should become 2,500.00
  '01/08 Remote Online Deposit 1 $3,640.00', // Should stay as is (proper spacing)
  '01/31 Remote Online Deposit 1450.00',    // Should become 450.00
];

concatenatedLines.forEach((line, idx) => {
  console.log(`\nConcatenation test ${idx + 1}: "${line}"`);
  const result = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (result) {
    console.log(`✅ Parsed: ${result.description} - $${result.amount}`);
  } else {
    console.log(`❌ Failed to parse`);
  }
});

// Test electronic withdrawals parsing
console.log('\n🧪 Testing Electronic Withdrawals Parsing');
console.log('==========================================');

// Real PDF format electronic section
const electronicSection = `ELECTRONIC WITHDRAWALS
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

const electronicSectionText = ChaseSectionExtractor.extractElectronicSection(electronicSection);
let electronicTransactionCount = 0;

if (electronicSectionText) {
  console.log('✅ Electronic section extracted successfully');
  
  const lines = electronicSectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip headers and totals
    if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('AMOUNT') || line.includes('Total')) {
      continue;
    }
    
    // Look for electronic transaction pattern
    const dateCompanyMatch = line.match(/^(\d{2}\/\d{2}).*?Orig CO Name:([^O\n]+?)(?:Orig|$)/);
    if (dateCompanyMatch) {
      const dateStr = dateCompanyMatch[1];
      let companyName = dateCompanyMatch[2].trim();
      companyName = companyName.replace(/\s+ID:.*$/, '').trim();
      
      // Find amount on same line or next lines
      let amount = null;
      const sameLineAmountMatch = line.match(/\$?([\d,]+\.\d{2})/);
      if (sameLineAmountMatch) {
        amount = parseFloat(sameLineAmountMatch[1].replace(/,/g, ''));
      } else {
        // Look ahead for amount
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.match(/^\d{2}\/\d{2}/) || nextLine.includes('Total')) break;
          
          const amountMatch = nextLine.match(/^\$?([\d,]+\.\d{2})$/);
          if (amountMatch) {
            amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            break;
          }
        }
      }
      
      if (amount && amount > 0) {
        electronicTransactionCount++;
        console.log(`✅ Electronic transaction: ${dateStr} | ${companyName} | $${amount}`);
      }
    }
  }
  
  console.log(`\n🎯 Electronic Results: Parsed ${electronicTransactionCount} electronic transactions`);
  console.log('Expected: 2 electronic transactions (Home Depot $389.20, Geico $416.25)');
  
} else {
  console.log('❌ Failed to extract electronic section');
}

console.log('\n🏁 COMPREHENSIVE TEST SUMMARY');
console.log('==============================');
console.log(`✅ Deposit transactions: ${parsedTransactions}/7 expected`);
console.log(`✅ Electronic transactions: ${electronicTransactionCount || 0}/2 expected`);
console.log(`🎯 Total transactions parsed: ${(parsedTransactions || 0) + (electronicTransactionCount || 0)}/9 expected`);
