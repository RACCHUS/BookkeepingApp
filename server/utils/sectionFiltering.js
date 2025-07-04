/**
 * Example usage of section filtering with real PDF parsing
 */
import chasePDFParser from './services/chasePDFParser.js';

// Utility function for filtering transactions by section
export function filterTransactionsBySection(transactions, sectionCode) {
  return chasePDFParser.filterTransactionsBySection(transactions, sectionCode);
}

// Utility function to get section summary
export function getTransactionSectionSummary(transactions) {
  return chasePDFParser.getAvailableSections(transactions);
}

// Example API-style usage
export async function getTransactionsWithSectionFilter(filePath, sectionFilter = null) {
  try {
    // Parse the PDF
    const parseResult = await chasePDFParser.parsePDF(filePath);
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error
      };
    }

    // Apply section filter if provided
    const filteredTransactions = sectionFilter 
      ? chasePDFParser.filterTransactionsBySection(parseResult.transactions, sectionFilter)
      : parseResult.transactions;

    // Get section breakdown
    const sectionSummary = chasePDFParser.getAvailableSections(parseResult.transactions);

    return {
      success: true,
      transactions: filteredTransactions,
      totalTransactions: filteredTransactions.length,
      allTransactionsCount: parseResult.transactions.length,
      appliedFilter: sectionFilter,
      availableSections: sectionSummary,
      accountInfo: parseResult.accountInfo,
      summary: parseResult.summary
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Example usage scenarios
if (import.meta.url === new URL('', import.meta.url).href) {
  console.log('🚀 Example section filtering usage:');
  console.log('===================================');
  
  console.log('\n📋 Available section codes:');
  console.log('   - "deposits" for DEPOSITS AND ADDITIONS');
  console.log('   - "checks" for CHECKS PAID');
  console.log('   - "card" for ATM & DEBIT CARD WITHDRAWALS');
  console.log('   - "electronic" for ELECTRONIC WITHDRAWALS');
  console.log('   - null or undefined for all transactions');
  
  console.log('\n💡 Usage examples:');
  console.log('   // Get all transactions');
  console.log('   const allTx = await getTransactionsWithSectionFilter("path/to/pdf");');
  console.log('');
  console.log('   // Get only card transactions');
  console.log('   const cardTx = await getTransactionsWithSectionFilter("path/to/pdf", "card");');
  console.log('');
  console.log('   // Get only deposits');
  console.log('   const deposits = await getTransactionsWithSectionFilter("path/to/pdf", "deposits");');
  console.log('');
  console.log('   // Filter existing transactions');
  console.log('   const cardOnly = filterTransactionsBySection(transactions, "card");');
}
