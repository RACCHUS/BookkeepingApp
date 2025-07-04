import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

// Test section extraction with the exact PDF content
const mockPDFText = `
some other content...
DEPOSITS AND ADDITIONS
DATE DESCRIPTION AMOUNT
01/08 Remote Online Deposit 1 $3,640.00
01/19 Remote Online Deposit 1 2,500.00
01/31 Remote Online Deposit 1 2,910.00
01/31 Remote Online Deposit 1 1,790.00
01/31 Remote Online Deposit 1 1,550.00
01/31 Remote Online Deposit 1 450.00
01/31 Remote Online Deposit 1 450.00
Total Deposits and Additions $13,290.00
some other content after...
`;

console.log('🧪 Testing Section Extraction');
console.log('==============================');

const extractedSection = ChaseSectionExtractor.extractDepositsSection(mockPDFText);
if (extractedSection) {
  console.log('✅ Section extracted successfully:');
  console.log('--- START EXTRACTED SECTION ---');
  console.log(extractedSection);
  console.log('--- END EXTRACTED SECTION ---');
  
  // Now test line processing
  const lines = extractedSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log(`\n📋 Split into ${lines.length} lines:`);
  
  let transactionCount = 0;
  lines.forEach((line, idx) => {
    console.log(`\nLine ${idx}: "${line}"`);
    
    // Apply filtering
    if (line.includes('DATE') && line.includes('DESCRIPTION')) {
      console.log(`  ⏭️  Skipped: Header line`);
      return;
    }
    if (line.includes('Total Deposits') || line.includes('TOTAL DEPOSITS')) {
      console.log(`  ⏭️  Skipped: Total line`);
      return;
    }
    if (line.trim() === 'DEPOSITS AND ADDITIONS') {
      console.log(`  ⏭️  Skipped: Section header`);
      return;
    }
    
    // Try to parse
    const tx = ChaseTransactionParser.parseDepositLine(line, 2024);
    if (tx) {
      console.log(`  ✅ PARSED: ${tx.date} | ${tx.description} | $${tx.amount}`);
      transactionCount++;
    } else {
      console.log(`  ❌ FAILED to parse`);
    }
  });
  
  console.log(`\n🎯 Final count: ${transactionCount} transactions extracted`);
  console.log(`Expected: 7 transactions`);
  
} else {
  console.log('❌ Failed to extract deposits section');
}
