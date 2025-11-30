/**
 * @fileoverview Parse Chase bank statement transaction lines
 * @module services/parsers/parseTransactionLine
 * @version 2.0.0
 */

import { 
  DATE_FORMATS, 
  TRANSACTION_PATTERNS, 
  TRANSACTION_TYPES 
} from './parserConstants.js';

/**
 * Parse a Chase transaction line in format: MM/DD DESCRIPTION AMOUNT
 * Accepts both MM/DD and MM-DD date separators
 * 
 * @param {string} line - Raw transaction line from PDF
 * @param {number} year - Four-digit year for the transaction
 * @returns {object|null} Parsed transaction object with sanitized fields, or null if invalid
 * @property {string} date - ISO 8601 date string
 * @property {number} amount - Absolute transaction amount
 * @property {string} description - Transaction description (trimmed)
 * @property {string} type - 'income' or 'expense'
 * 
 * @example
 * // Returns {date: '2024-03-15T12:00:00', amount: 150.00, description: 'DEPOSIT', type: 'income'}
 * parseTransactionLine('3/15 DEPOSIT 150.00', 2024);
 * 
 * @example
 * // Returns {date: '2024-03-16T12:00:00', amount: 50.25, description: 'GROCERY STORE', type: 'expense'}
 * parseTransactionLine('3/16 GROCERY STORE -50.25', 2024);
 * 
 * @example
 * // Returns null for invalid format
 * parseTransactionLine('INVALID LINE', 2024);
 */
export default function parseTransactionLine(line, year) {
  const match = line.match(TRANSACTION_PATTERNS.LINE);
  if (!match) return null;
  const [, dateStrRaw, description, amountStr] = match;

  // Normalize dateStr to MM/DD
  const dateStr = (dateStrRaw || '').replace(
    new RegExp(DATE_FORMATS.SEPARATORS.DASH, 'g'),
    DATE_FORMATS.SEPARATORS.SLASH
  );

  // Parse date
  let fullDate = '';
  try {
    const dateParts = dateStr.split(DATE_FORMATS.SEPARATORS.SLASH);
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    fullDate = `${year}-${month.toString().padStart(DATE_FORMATS.PADDING.LENGTH, DATE_FORMATS.PADDING.CHAR)}-${day.toString().padStart(DATE_FORMATS.PADDING.LENGTH, DATE_FORMATS.PADDING.CHAR)}${DATE_FORMATS.DEFAULT_TIME}`;
    if (isNaN(Date.parse(fullDate))) fullDate = '';
  } catch {
    fullDate = '';
  }

  // Parse amount
  let amount = parseFloat(amountStr.replace(TRANSACTION_PATTERNS.AMOUNT_CLEANUP, ''));
  const isNegative = amountStr.includes(TRANSACTION_PATTERNS.NEGATIVE_INDICATORS.DASH) || amount < 0;
  amount = Math.abs(amount);

  // Clean up description
  let cleanDescription = (description || '').trim();
  if (!cleanDescription) cleanDescription = '';

  // Determine transaction type
  const type = isNegative ? TRANSACTION_TYPES.EXPENSE : TRANSACTION_TYPES.INCOME;

  return {
    date: fullDate,
    amount,
    description: cleanDescription,
    type
  };
}
