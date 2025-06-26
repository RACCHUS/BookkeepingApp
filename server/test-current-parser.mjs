import chasePDFParser from './services/chasePDFParser.js';

async function testParser() {
  try {
    console.log('Testing Chase PDF Parser...');
    const result = await chasePDFParser.parsePDF('../chasepdf.pdf');
    
    console.log('\n==== PARSER TEST RESULTS ====');
    console.log('Success:', result.success);
    console.log('Account Info:', JSON.stringify(result.accountInfo, null, 2));
    console.log('Transaction Count:', result.transactions.length);
    console.log('\n==== DEBUG INFO ====');
    console.log('Debug Info:', JSON.stringify(result.debug, null, 2));
    
    if (result.transactions.length > 0) {
      console.log('\n==== SAMPLE TRANSACTIONS ====');
      result.transactions.slice(0, 10).forEach((t, i) => {
        console.log(`${i+1}. ${t.date} | ${t.type} | $${t.amount.toFixed(2)} | ${t.description}`);
      });
      
      // Show summary by type
      const byType = result.transactions.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {});
      console.log('\n==== TRANSACTIONS BY TYPE ====');
      console.log(byType);
      
      // Show card transactions specifically - check for known merchant names from the PDF
      const knownCardMerchants = ['Chevron', 'Goldenrod', 'Lowe', 'Exxon', 'Sunshine', 'Toyota', 'Westar'];
      const cardTransactions = result.transactions.filter(t => 
        knownCardMerchants.some(merchant => t.description.includes(merchant)) ||
        t.description.includes('Card Purchase') || 
        t.description.includes('CARD')
      );
      console.log('\n==== CARD TRANSACTIONS ====');
      console.log('Card transaction count:', cardTransactions.length);
      if (cardTransactions.length > 0) {
        cardTransactions.slice(0, 10).forEach((t, i) => {
          console.log(`${i+1}. ${t.date} | $${t.amount.toFixed(2)} | ${t.description}`);
        });
      }
      
      // Show ALL transactions to verify what's actually being extracted
      console.log('\n==== ALL TRANSACTIONS ====');
      result.transactions.forEach((t, i) => {
        console.log(`${i+1}. ${t.date} | ${t.type} | $${t.amount.toFixed(2)} | ${t.description} | ${t.payee}`);
      });
    }
    
    if (result.summary) {
      console.log('\n==== SUMMARY ====');
      console.log('Total Income: $' + result.summary.totalIncome.toFixed(2));
      console.log('Total Expenses: $' + result.summary.totalExpenses.toFixed(2));
      console.log('Net Income: $' + result.summary.netIncome.toFixed(2));
    }
    
    if (result.extractionLog) {
      console.log('\n==== EXTRACTION LOG ====');
      result.extractionLog.forEach(log => console.log('  ' + log));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testParser();
