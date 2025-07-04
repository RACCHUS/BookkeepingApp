/**
 * Final comprehensive test for all transaction types
 */
import chasePDFParser from './services/chasePDFParser.js';
import fs from 'fs/promises';

async function testFullParsing() {
  try {
    console.log('🧪 Running comprehensive Chase PDF parsing test...');
    
    // Test with real PDF file 
    const pdfPath = 'uploads/20240131-statements-5697-.pdf.pdf';
    
    console.log(`\n📄 Parsing: ${pdfPath}`);
    const result = await chasePDFParser.parsePDF(pdfPath);
    
    if (result.success) {
      console.log(`\n✅ Parsing successful!`);
      console.log(`📊 Total transactions: ${result.transactions.length}`);
      
      // Group by type for analysis
      const byType = {
        deposits: result.transactions.filter(t => t.type === 'income'),
        card: result.transactions.filter(t => t.description && !t.description.includes('Electronic Payment') && !t.description.includes('CHECK')),
        electronic: result.transactions.filter(t => t.description && t.description.includes('Electronic Payment')),
        checks: result.transactions.filter(t => t.description && t.description.includes('CHECK'))
      };
      
      console.log(`\n📈 Transaction breakdown:`);
      console.log(`  Deposits: ${byType.deposits.length}`);
      console.log(`  Card transactions: ${byType.card.length}`);
      console.log(`  Electronic payments: ${byType.electronic.length}`);
      console.log(`  Checks: ${byType.checks.length}`);
      
      // Show sample card transactions to verify merchant names
      console.log(`\n💳 Sample card transactions:`);
      byType.card.slice(0, 10).forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.date.split('T')[0]} - "${tx.description}" - $${tx.amount}`);
      });
      
      // Show sample electronic transactions
      console.log(`\n🔌 Sample electronic transactions:`);
      byType.electronic.slice(0, 5).forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.date.split('T')[0]} - "${tx.description}" - $${tx.amount}`);
      });
      
      // Show summary
      console.log(`\n📋 Summary:`);
      console.log(`  Total Income: $${result.summary.totalIncome.toFixed(2)}`);
      console.log(`  Total Expenses: $${result.summary.totalExpenses.toFixed(2)}`);
      console.log(`  Net Income: $${result.summary.netIncome.toFixed(2)}`);
      
    } else {
      console.log(`❌ Parsing failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFullParsing();
