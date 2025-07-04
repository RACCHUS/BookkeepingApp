import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

console.log('🎯 FINAL COMPREHENSIVE CHASE PDF PARSING TEST');
console.log('==============================================');

// Test 1: Deposit Transactions
console.log('\n1️⃣ TESTING DEPOSIT TRANSACTIONS');
console.log('=================================');

const depositLines = [
  '01/08 Remote Online Deposit 1 $3,640.00',
  '01/19 Remote Online Deposit 1 2,500.00',
  '01/31 Remote Online Deposit 1 2,910.00',
  '01/31 Remote Online Deposit 1 1,790.00',
  '01/31 Remote Online Deposit 1 1,550.00',
  '01/31 Remote Online Deposit 1 450.00',
  '01/31 Remote Online Deposit 1 450.00'
];

let depositSuccessCount = 0;
depositLines.forEach((line, idx) => {
  const result = ChaseTransactionParser.parseDepositLine(line, 2024);
  if (result) {
    console.log(`✅ ${idx + 1}. ${result.description} - $${result.amount}`);
    depositSuccessCount++;
  } else {
    console.log(`❌ ${idx + 1}. Failed: "${line}"`);
  }
});

console.log(`📊 Deposits: ${depositSuccessCount}/7 parsed successfully`);

// Test 2: Electronic Transactions
console.log('\n2️⃣ TESTING ELECTRONIC TRANSACTIONS');
console.log('====================================');

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

const sectionText = ChaseSectionExtractor.extractElectronicSection(electronicSection);
let electronicCount = 0;

if (sectionText) {
  const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('AMOUNT') || line.includes('Total')) continue;
    
    const dateCompanyMatch = line.match(/^(\d{2}\/\d{2}).*?Orig CO Name:([^O\n]+?)(?:Orig|$)/);
    if (dateCompanyMatch) {
      const dateStr = dateCompanyMatch[1];
      let companyName = dateCompanyMatch[2].trim().replace(/\s+ID:.*$/, '').trim();
      
      let amount = null;
      const sameLineAmountMatch = line.match(/\$?([\d,]+\.\d{2})/);
      if (sameLineAmountMatch) {
        amount = parseFloat(sameLineAmountMatch[1].replace(/,/g, ''));
      } else {
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
        electronicCount++;
        console.log(`✅ ${electronicCount}. Electronic Payment: ${companyName} - $${amount}`);
      }
    }
  }
}

console.log(`📊 Electronic: ${electronicCount}/2 parsed successfully`);

// Test 3: Card Transactions
console.log('\n3️⃣ TESTING CARD TRANSACTIONS');
console.log('==============================');

const cardLines = [
  '01/02 Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819 $38.80',
  '01/04 Card Purchase With Pin 01/04 Chevron/Sunshine 39 Plantation FL Card 1819 60.00',
  '01/09 Card Purchase With Pin 01/09 Lowe\'s #1681 Pembroke Pnes FL Card 1819 87.74',
  '01/12 Card Purchase With Pin 01/12 Sunshine # 379 Plantation FL Card 1819 30.00',
  '01/16 Card Purchase 01/12 Nic*-FL Sunbiz.Org Egov.Com FL Card 1819 158.75',
  '01/19 Card Purchase With Pin 01/19 Lipton Toyota FT Lauderdale FL Card 1819 91.95',
  '01/22 Card Purchase With Pin 01/20 Westar 6000 Sunrise FL Card 1819 44.00'
];

let cardSuccessCount = 0;
cardLines.forEach((line, idx) => {
  const result = ChaseTransactionParser.parseCardLine(line, 2024);
  if (result) {
    console.log(`✅ ${idx + 1}. ${result.description} - $${result.amount}`);
    cardSuccessCount++;
  } else {
    console.log(`❌ ${idx + 1}. Failed: "${line}"`);
  }
});

console.log(`📊 Card Transactions: ${cardSuccessCount}/7 parsed successfully`);

// Final Summary
console.log('\n🏁 FINAL SUMMARY');
console.log('================');
console.log(`✅ Deposit Transactions: ${depositSuccessCount}/7 (${Math.round(depositSuccessCount/7*100)}%)`);
console.log(`✅ Electronic Transactions: ${electronicCount}/2 (${Math.round(electronicCount/2*100)}%)`);
console.log(`✅ Card Transactions: ${cardSuccessCount}/7 (${Math.round(cardSuccessCount/7*100)}%)`);

const totalSuccess = depositSuccessCount + electronicCount + cardSuccessCount;
const totalExpected = 7 + 2 + 7;
console.log(`🎯 OVERALL: ${totalSuccess}/${totalExpected} transactions (${Math.round(totalSuccess/totalExpected*100)}%)`);

if (totalSuccess === totalExpected) {
  console.log('\n🎉 ALL TESTS PASSED! Chase PDF parsing is working perfectly! 🎉');
} else {
  console.log('\n⚠️ Some tests failed. Please review the results above.');
}
