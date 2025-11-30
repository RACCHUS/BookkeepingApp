/**
 * @fileoverview Transaction classification and payee extraction for Chase statements
 * @module services/parsers/ChaseClassifier
 * @version 2.0.0
 */

import { CLASSIFICATION } from './parserConstants.js';

/**
 * Handles classification and payee extraction for Chase transactions.
 * Uses keyword-based rules to categorize transactions and extract payee information.
 */
class ChaseClassifier {
  /**
   * Classify a transaction based on description, amount, and type
   * Uses keyword matching to assign categories with confidence scores
   * 
   * @param {string} description - Transaction description
   * @param {number} amount - Transaction amount
   * @param {string} type - Transaction type ('income' or 'expense')
   * @returns {object} Classification result
   * @property {string} category - IRS category name
   * @property {string} type - Transaction type
   * @property {number} confidence - Confidence score (0.0 to 1.0)
   * @property {boolean} needsReview - True if uncategorized
   * @property {string|null} payee - Extracted payee name or null
   * 
   * @example
   * // Returns {category: 'Business Income', type: 'income', confidence: 0.8, needsReview: false, payee: 'CUSTOMER'}
   * ChaseClassifier.classify('CUSTOMER DEPOSIT', 500.00, 'income');
   * 
   * @example
   * // Returns {category: 'Bank Service Charges', type: 'expense', confidence: 0.8, needsReview: false, payee: 'MONTHLY'}
   * ChaseClassifier.classify('MONTHLY FEE', 15.00, 'expense');
   * 
   * @example
   * // Returns {category: 'Uncategorized', type: 'expense', confidence: 0.3, needsReview: true, payee: 'UNKNOWN'}
   * ChaseClassifier.classify('UNKNOWN TRANSACTION', 100.00, 'expense');
   */
  static classify(description, amount, type) {
    const upperDesc = description.toUpperCase();
    let category = CLASSIFICATION.CATEGORIES.UNCATEGORIZED;
    let confidence = CLASSIFICATION.CONFIDENCE.LOW;
    
    // Income classification rules
    if (type === 'income' && upperDesc.includes(CLASSIFICATION.INCOME_KEYWORDS.DEPOSIT)) {
      category = CLASSIFICATION.CATEGORIES.BUSINESS_INCOME;
      confidence = CLASSIFICATION.CONFIDENCE.HIGH;
    } 
    // Expense classification rules
    else if (type === 'expense' && upperDesc.includes(CLASSIFICATION.EXPENSE_KEYWORDS.FEE)) {
      category = CLASSIFICATION.CATEGORIES.BANK_SERVICE_CHARGES;
      confidence = CLASSIFICATION.CONFIDENCE.HIGH;
    }
    
    return {
      category,
      type,
      confidence,
      needsReview: category === CLASSIFICATION.CATEGORIES.UNCATEGORIZED,
      payee: this.extractPayee(description),
    };
  }

  /**
   * Extract payee name from transaction description
   * Returns null for check transactions (payee info not available in PDFs)
   * For other transactions, extracts the first word as payee
   * 
   * @param {string} description - Transaction description
   * @returns {string|null} Payee name or null if unavailable
   * 
   * @example
   * // Returns null (check transactions don't contain payee info)
   * ChaseClassifier.extractPayee('CHECK #1234');
   * 
   * @example
   * // Returns 'WALMART'
   * ChaseClassifier.extractPayee('WALMART PURCHASE');
   * 
   * @example
   * // Returns 'VENDOR'
   * ChaseClassifier.extractPayee('vendor payment for services');
   */
  static extractPayee(description) {
    // Check transactions from PDFs don't contain payee information
    // Bank statements only show check numbers, not who they were paid to
    if (CLASSIFICATION.CHECK_PATTERN.test(description.trim())) {
      return null; // No payee information available in PDF
    }
    
    // Simple payee extraction - first word of description
    return description.split(' ')[0];
  }
}

export default ChaseClassifier;
