import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

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

console.log('🧪 Testing Electronic Withdrawals Section');
console.log('=========================================');

// Test section extraction
console.log('\n1. Testing section extraction...');
const sectionText = ChaseSectionExtractor.extractElectronicSection(electronicSection);

if (sectionText) {
  console.log('✅ Electronic section found!');
  console.log('--- START SECTION ---');
  console.log(sectionText);
  console.log('--- END SECTION ---');
  
  // Split into lines for analysis
  console.log('\n2. Analyzing line structure...');
  const lines = sectionText.split('\n');
  console.log(`Found ${lines.length} total lines:`);
  
  lines.forEach((line, idx) => {
    console.log(`Line ${idx}: "${line}"`);
  });
  
  // Try to identify patterns
  console.log('\n3. Looking for date patterns...');
  const datePattern = /(\d{2}\/\d{2})/;
  const amountPattern = /\$?([\d,]+\.\d{2})/;
  const companyPattern = /Orig CO Name:([^O\n]+)/;
  
  lines.forEach((line, idx) => {
    const hasDate = datePattern.test(line);
    const hasAmount = amountPattern.test(line);
    const hasCompany = companyPattern.test(line);
    
    if (hasDate || hasAmount || hasCompany) {
      console.log(`Line ${idx}: ${hasDate ? '📅' : ''} ${hasCompany ? '🏢' : ''} ${hasAmount ? '💰' : ''} "${line}"`);
      
      if (hasDate) {
        const dateMatch = line.match(datePattern);
        console.log(`   Date: ${dateMatch[1]}`);
      }
      if (hasCompany) {
        const companyMatch = line.match(companyPattern);
        console.log(`   Company: ${companyMatch[1].trim()}`);
      }
      if (hasAmount) {
        const amountMatch = line.match(amountPattern);
        console.log(`   Amount: ${amountMatch[1]}`);
      }
    }
  });
  
} else {
  console.log('❌ Electronic section not found');
}

// Test the current parser method
console.log('\n4. Testing current parser method...');
const testLines = [
  '01/11 Orig CO Name:Home Depot',
  '01/11 Orig CO Name:Home Depot $389.20',
  '01/12 Orig CO Name:Geico',
  '01/12 Orig CO Name:Geico 416.25',
];

testLines.forEach((line, idx) => {
  console.log(`\nTest line ${idx + 1}: "${line}"`);
  const result = ChaseTransactionParser.parseElectronicLine(line, 2024);
  if (result) {
    console.log(`✅ Parsed: ${result.description} - $${result.amount}`);
  } else {
    console.log(`❌ Failed to parse`);
  }
});
