/**
 * @fileoverview Extract Chase statement sections from raw PDF text
 * @module services/parsers/ChaseSectionExtractor
 * @version 2.0.0
 */

import { SECTION_PATTERNS } from './parserConstants.js';

/**
 * Extracts Chase statement sections (deposits, checks, cards, electronic withdrawals) from raw PDF text.
 * Keeps all regex and section boundary logic centralized.
 */
class ChaseSectionExtractor {
  /**
   * Extract deposits and additions section from Chase statement
   * Tries primary pattern first, falls back to looser pattern if needed
   * 
   * @param {string} text - Raw PDF text content
   * @returns {string|null} Deposits section text or null if not found
   * 
   * @example
   * // Returns deposits section including header and total
   * const text = 'DEPOSITS AND ADDITIONS\n3/15 Customer Payment 1000.00\nTotal Deposits and Additions $1,000.00';
   * ChaseSectionExtractor.extractDepositsSection(text);
   * 
   * @example
   * // Returns null if section not found
   * ChaseSectionExtractor.extractDepositsSection('No deposits section here');
   */
  static extractDepositsSection(text) {
    // Try primary pattern with total line
    const match = text.match(SECTION_PATTERNS.DEPOSITS.PRIMARY);
    if (match) {
      return match[0];
    }

    // Fallback: try to find just the deposits section without total
    const fallbackMatch = text.match(SECTION_PATTERNS.DEPOSITS.FALLBACK);
    if (fallbackMatch) {
      return fallbackMatch[0];
    }

    return null;
  }

  /**
   * Extract checks paid section from Chase statement
   * 
   * @param {string} text - Raw PDF text content
   * @returns {string|null} Checks section text or null if not found
   * 
   * @example
   * // Returns checks section
   * const text = 'CHECKS PAID\n3/15 Check #1001 250.00\nTotal Checks Paid';
   * ChaseSectionExtractor.extractChecksSection(text);
   */
  static extractChecksSection(text) {
    const match = text.match(SECTION_PATTERNS.CHECKS.PRIMARY);
    return match ? match[0] : null;
  }

  /**
   * Extract ATM & debit card withdrawals section from Chase statement
   * 
   * @param {string} text - Raw PDF text content
   * @returns {string|null} Card section text or null if not found
   * 
   * @example
   * // Returns ATM & debit card section
   * const text = 'ATM & DEBIT CARD WITHDRAWALS\nDATE DESCRIPTION AMOUNT\n3/15 ATM Withdrawal 100.00\nTotal ATM & DEBIT CARD WITHDRAWALS';
   * ChaseSectionExtractor.extractCardSection(text);
   */
  static extractCardSection(text) {
    const match = text.match(SECTION_PATTERNS.CARDS.PRIMARY);
    return match ? match[0] : null;
  }

  /**
   * Extract electronic withdrawals section from Chase statement
   * 
   * @param {string} text - Raw PDF text content
   * @returns {string|null} Electronic section text or null if not found
   * 
   * @example
   * // Returns electronic withdrawals section
   * const text = 'ELECTRONIC WITHDRAWALS\n3/15 ACH Payment 500.00\nTotal Electronic Withdrawals';
   * ChaseSectionExtractor.extractElectronicSection(text);
   */
  static extractElectronicSection(text) {
    const match = text.match(SECTION_PATTERNS.ELECTRONIC.PRIMARY);
    return match ? match[0] : null;
  }
}

export default ChaseSectionExtractor;
