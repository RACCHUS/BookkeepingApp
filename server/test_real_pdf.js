import ChasePDFParser from './services/chasePDFParser.js';
import path from 'path';

// Test with the actual PDF file
const pdfPath = path.join(process.cwd(), '..', 'uploads', '63dd2bdc-60c3-4220-9168-74ad251553b7-20240131-statements-5697-.pdf.pdf');

console.log('🔍 TESTING REAL PDF PROCESSING');
console.log('==============================');
console.log(`PDF Path: ${pdfPath}`);

const parser = new ChasePDFParser();

try {
  const result = await parser.parsePDF(pdfPath);
  
  console.log('\n📋 PARSING RESULTS:');
  console.log('==================');
  console.log(`Success: ${result.success}`);
  console.log(`Total transactions: ${result.transactions ? result.transactions.length : 0}`);
  
  if (result.transactions) {
    console.log('\n💰 DEPOSIT TRANSACTIONS FOUND:');
    console.log('==============================');
    
    const deposits = result.transactions.filter(tx => tx.type === 'income' && tx.description.includes('Remote Online Deposit'));
    console.log(`Found ${deposits.length} deposit transactions:`);
    
    deposits.forEach((tx, idx) => {
      console.log(`${idx + 1}. ${tx.date} | ${tx.description} | $${tx.amount}`);
    });
    
    console.log('\n🔍 EXPECTED DEPOSITS (from your data):');
    console.log('====================================');
    const expectedDeposits = [
      { date: '01/08', amount: 3640.00, description: 'Remote Online Deposit' },
      { date: '01/19', amount: 2500.00, description: 'Remote Online Deposit' },
      { date: '01/31', amount: 2910.00, description: 'Remote Online Deposit' },
      { date: '01/31', amount: 1790.00, description: 'Remote Online Deposit' },
      { date: '01/31', amount: 1550.00, description: 'Remote Online Deposit' },
      { date: '01/31', amount: 450.00, description: 'Remote Online Deposit' },
      { date: '01/31', amount: 450.00, description: 'Remote Online Deposit' }
    ];
    
    expectedDeposits.forEach((expected, idx) => {
      console.log(`${idx + 1}. ${expected.date} | ${expected.description} | $${expected.amount}`);
    });
    
    console.log('\n❓ MISSING TRANSACTIONS:');
    console.log('========================');
    
    expectedDeposits.forEach((expected, idx) => {
      const found = deposits.find(tx => 
        Math.abs(tx.amount - expected.amount) < 0.01 && 
        tx.date.includes(expected.date.replace('/', '-'))
      );
      
      if (!found) {
        console.log(`❌ MISSING: ${expected.date} | $${expected.amount}`);
      } else {
        console.log(`✅ FOUND: ${expected.date} | $${expected.amount}`);
      }
    });
  }
  
  if (result.debug) {
    console.log('\n🔧 DEBUG INFORMATION:');
    console.log('=====================');
    console.log(`PDF text length: ${result.debug.textLength}`);
    console.log(`Deposits section found: ${result.debug.depositsFound}`);
    console.log(`Checks section found: ${result.debug.checksFound}`);
    console.log(`Card transactions found: ${result.debug.cardTransactionsFound}`);
    console.log(`Electronic transactions found: ${result.debug.electronicFound}`);
    
    if (result.debug.extractionLog) {
      console.log('\n📝 Extraction Log:');
      result.debug.extractionLog.forEach(log => console.log(`  ${log}`));
    }
  }
  
} catch (error) {
  console.error('❌ Error processing PDF:', error);
}
