/**
 * @fileoverview Generate summary statistics from Chase transaction lists
 * @module services/parsers/ChaseSummary
 * @version 2.0.0
 */

import { SUMMARY_DEFAULTS, TRANSACTION_TYPES } from './parserConstants.js';

/**
 * Generates summary statistics from a list of transactions.
 * Calculates totals, categorizes amounts, and identifies transactions needing review.
 */
class ChaseSummary {
  /**
   * Generate comprehensive summary statistics from transactions
   * 
   * @param {Array<object>} transactions - Array of transaction objects
   * @returns {object} Summary statistics
   * @property {number} totalTransactions - Total count of transactions
   * @property {number} totalIncome - Sum of all income transactions
   * @property {number} totalExpenses - Sum of all expense transactions
   * @property {number} netIncome - Income minus expenses
   * @property {object} categorySummary - Per-category totals and counts
   * @property {number} needsReview - Count of uncategorized transactions
   * 
   * @example
   * // Returns summary with income/expense breakdown by category
   * const transactions = [
   *   {type: 'income', amount: 1000, category: 'Business Income', needsReview: false},
   *   {type: 'expense', amount: 250, category: 'Office Supplies', needsReview: false}
   * ];
   * ChaseSummary.generate(transactions);
   * // {
   * //   totalTransactions: 2,
   * //   totalIncome: 1000,
   * //   totalExpenses: 250,
   * //   netIncome: 750,
   * //   categorySummary: {
   * //     'Business Income': {total: 1000, count: 1, type: 'income'},
   * //     'Office Supplies': {total: 250, count: 1, type: 'expense'}
   * //   },
   * //   needsReview: 0
   * // }
   * 
   * @example
   * // Returns empty summary for empty array
   * ChaseSummary.generate([]);
   * // {totalTransactions: 0, totalIncome: 0, totalExpenses: 0, netIncome: 0, categorySummary: {}, needsReview: 0}
   */
  static generate(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalIncome: SUMMARY_DEFAULTS.TOTAL_INCOME,
      totalExpenses: SUMMARY_DEFAULTS.TOTAL_EXPENSES,
      netIncome: SUMMARY_DEFAULTS.NET_INCOME,
      categorySummary: {},
      needsReview: SUMMARY_DEFAULTS.NEEDS_REVIEW
    };
    
    transactions.forEach(tx => {
      // Accumulate income and expenses
      if (tx.type === TRANSACTION_TYPES.INCOME) {
        summary.totalIncome += tx.amount;
      } else {
        summary.totalExpenses += tx.amount;
      }
      
      // Count transactions needing review
      if (tx.needsReview) {
        summary.needsReview++;
      }
      
      // Build category summary
      if (!summary.categorySummary[tx.category]) {
        summary.categorySummary[tx.category] = { 
          total: SUMMARY_DEFAULTS.TOTAL_INCOME, 
          count: SUMMARY_DEFAULTS.TOTAL_TRANSACTIONS, 
          type: tx.type 
        };
      }
      summary.categorySummary[tx.category].total += tx.amount;
      summary.categorySummary[tx.category].count++;
    });
    
    // Calculate net income
    summary.netIncome = summary.totalIncome - summary.totalExpenses;
    
    return summary;
  }
}

export default ChaseSummary;
