/**
 * Transaction Section Filtering Utilities
 * 
 * This module provides utilities for filtering and organizing bank statement
 * transactions by their section types (deposits, checks, card, electronic, etc.).
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// Utility function for filtering transactions by section
export function filterTransactionsBySection(transactions, sectionCode) {
  if (!Array.isArray(transactions)) {
    throw new Error('Transactions must be an array');
  }
  
  if (!sectionCode) {
    return transactions;
  }
  
  return transactions.filter(transaction => 
    transaction.sectionCode === sectionCode
  );
}

// Utility function to get section summary
export function getTransactionSectionSummary(transactions) {
  if (!Array.isArray(transactions)) {
    throw new Error('Transactions must be an array');
  }
  
  const sectionCounts = {};
  const sectionAmounts = {};
  
  transactions.forEach(transaction => {
    const section = transaction.sectionCode || 'uncategorized';
    sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    sectionAmounts[section] = (sectionAmounts[section] || 0) + Math.abs(transaction.amount || 0);
  });
  
  return {
    sections: Object.keys(sectionCounts),
    counts: sectionCounts,
    amounts: sectionAmounts,
    totalTransactions: transactions.length
  };
}

// Get available section codes with descriptions
export function getAvailableSectionCodes() {
  return {
    deposits: 'DEPOSITS AND ADDITIONS',
    checks: 'CHECKS PAID', 
    card: 'ATM & DEBIT CARD WITHDRAWALS',
    electronic: 'ELECTRONIC WITHDRAWALS',
    manual: 'MANUALLY ENTERED TRANSACTIONS',
    uncategorized: 'UNCATEGORIZED TRANSACTIONS'
  };
}

// Validate section code
export function isValidSectionCode(sectionCode) {
  const validCodes = Object.keys(getAvailableSectionCodes());
  return validCodes.includes(sectionCode);
}

// Get section statistics
export function getSectionStatistics(transactions) {
  const summary = getTransactionSectionSummary(transactions);
  const descriptions = getAvailableSectionCodes();
  
  return Object.keys(summary.counts).map(sectionCode => ({
    code: sectionCode,
    description: descriptions[sectionCode] || 'Unknown Section',
    count: summary.counts[sectionCode],
    totalAmount: summary.amounts[sectionCode],
    averageAmount: summary.amounts[sectionCode] / summary.counts[sectionCode],
    percentage: (summary.counts[sectionCode] / summary.totalTransactions) * 100
  }));
}
