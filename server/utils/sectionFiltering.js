/**
 * Transaction Section Filtering Utilities
 * 
 * This module provides utilities for filtering and organizing bank statement
 * transactions by their section types (deposits, checks, card, electronic, etc.).
 * 
 * @module utils/sectionFiltering
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

/**
 * Filter transactions by section code
 * @param {Array} transactions - Array of transaction objects
 * @param {string} sectionCode - Section code to filter by ('deposits', 'checks', etc.)
 * @returns {Array} Filtered transactions
 * @throws {Error} If transactions is not an array
 * @example
 * const transactions = [
 *   { amount: 100, sectionCode: 'deposits' },
 *   { amount: -50, sectionCode: 'checks' }
 * ];
 * filterTransactionsBySection(transactions, 'deposits')
 * // Returns: [{ amount: 100, sectionCode: 'deposits' }]
 * 
 * @example
 * // Returns all transactions if no section code provided
 * filterTransactionsBySection(transactions, null) // Returns all transactions
 */
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

/**
 * Get summary of transactions by section
 * @param {Array} transactions - Array of transaction objects
 * @returns {object} Summary with sections, counts, amounts, and total
 * @throws {Error} If transactions is not an array
 * @example
 * const transactions = [
 *   { amount: 100, sectionCode: 'deposits' },
 *   { amount: 150, sectionCode: 'deposits' },
 *   { amount: -50, sectionCode: 'checks' }
 * ];
 * getTransactionSectionSummary(transactions)
 * // Returns:
 * // {
 * //   sections: ['deposits', 'checks'],
 * //   counts: { deposits: 2, checks: 1 },
 * //   amounts: { deposits: 250, checks: 50 },
 * //   totalTransactions: 3
 * // }
 */
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

/**
 * Get available section codes with descriptions
 * @returns {object} Map of section codes to descriptions
 * @example
 * getAvailableSectionCodes()
 * // Returns:
 * // {
 * //   deposits: 'DEPOSITS AND ADDITIONS',
 * //   checks: 'CHECKS PAID',
 * //   card: 'ATM & DEBIT CARD WITHDRAWALS',
 * //   electronic: 'ELECTRONIC WITHDRAWALS',
 * //   manual: 'MANUALLY ENTERED TRANSACTIONS',
 * //   uncategorized: 'UNCATEGORIZED TRANSACTIONS'
 * // }
 */
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

/**
 * Validate if section code is recognized
 * @param {string} sectionCode - Section code to validate
 * @returns {boolean} True if valid section code
 * @example
 * isValidSectionCode('deposits') // true
 * isValidSectionCode('checks') // true
 * isValidSectionCode('invalid') // false
 */
export function isValidSectionCode(sectionCode) {
  const validCodes = Object.keys(getAvailableSectionCodes());
  return validCodes.includes(sectionCode);
}

/**
 * Get detailed statistics for each section
 * @param {Array} transactions - Array of transaction objects
 * @returns {Array} Array of section statistics objects
 * @example
 * const transactions = [
 *   { amount: 100, sectionCode: 'deposits' },
 *   { amount: 200, sectionCode: 'deposits' }
 * ];
 * getSectionStatistics(transactions)
 * // Returns:
 * // [{
 * //   code: 'deposits',
 * //   description: 'DEPOSITS AND ADDITIONS',
 * //   count: 2,
 * //   totalAmount: 300,
 * //   averageAmount: 150,
 * //   percentage: 100
 * // }]
 */
export function getSectionStatistics(transactions) {
  const summary = getTransactionSectionSummary(transactions);
  const descriptions = getAvailableSectionCodes();
  
  return Object.keys(summary.counts).map(sectionCode => {
    const count = summary.counts[sectionCode] || 0;
    const totalAmount = summary.amounts[sectionCode] || 0;
    const totalTransactions = summary.totalTransactions || 0;
    
    return {
      code: sectionCode,
      description: descriptions[sectionCode] || 'Unknown Section',
      count: count,
      totalAmount: totalAmount,
      // Prevent division by zero
      averageAmount: count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0,
      percentage: totalTransactions > 0 ? Math.round((count / totalTransactions) * 10000) / 100 : 0
    };
  });
}
