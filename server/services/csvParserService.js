/**
 * CSV Parser Service
 * Parses CSV files from various banks and normalizes to transaction format
 * 
 * Supports:
 * - Auto-detection of common bank formats (Chase, Bank of America, Wells Fargo, etc.)
 * - Custom column mapping for unsupported formats
 * - Amount parsing (negative, parentheses, CR/DR formats)
 * - Date parsing (multiple formats)
 */

import { parse } from 'csv-parse/sync';
import { parse as parseDate, isValid } from 'date-fns';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../../shared/constants/categories.js';

/**
 * Map bank transaction types to standardized payment methods
 * @param {string} bankType - Bank's transaction type (e.g., 'DEBIT_CARD', 'ACH_CREDIT')
 * @returns {string} Standardized payment method
 */
function mapBankTypeToPaymentMethod(bankType) {
  if (!bankType) return PAYMENT_METHODS.OTHER;
  
  const type = bankType.toUpperCase();
  
  // Check deposits (mobile/remote deposits) - must check BEFORE general CHECK and DEBIT
  // These are deposited checks (income), not payments made
  if (type === 'CHECK_DEPOSIT' || type === 'DSLIP') {
    return PAYMENT_METHODS.CHECK_DEPOSIT;
  }
  
  // Check transactions (actual checks written/paid) - CHECK_PAID, etc.
  if (type.includes('CHECK') || type.includes('CHK')) {
    return PAYMENT_METHODS.CHECK;
  }
  
  // Debit/ATM card transactions
  if (type.includes('DEBIT') || type.includes('POS') || type.includes('POINT_OF_SALE')) {
    return PAYMENT_METHODS.DEBIT_CARD;
  }
  
  // Credit card transactions
  if (type.includes('CREDIT_CARD') || type.includes('VISA') || type.includes('MASTERCARD')) {
    return PAYMENT_METHODS.CREDIT_CARD;
  }
  
  // ACH/Electronic transfers
  if (type.includes('ACH') || type.includes('TRANSFER') || type.includes('WIRE') || type.includes('EFT')) {
    return PAYMENT_METHODS.BANK_TRANSFER;
  }
  
  // ATM transactions (cash)
  if (type.includes('ATM')) {
    return PAYMENT_METHODS.CASH;
  }
  
  // Zelle
  if (type.includes('ZELLE')) {
    return PAYMENT_METHODS.ZELLE;
  }
  
  // PayPal
  if (type.includes('PAYPAL')) {
    return PAYMENT_METHODS.PAYPAL;
  }
  
  // Venmo
  if (type.includes('VENMO')) {
    return PAYMENT_METHODS.VENMO;
  }
  
  return PAYMENT_METHODS.OTHER;
}

/**
 * Bank format definitions for auto-detection
 * Each bank has possible column names for date, description, and amount
 */
export const BANK_FORMATS = {
  chase: {
    name: 'Chase Bank',
    detect: (headers) => headers.includes('Posting Date') && headers.includes('Description'),
    mapping: {
      date: ['Posting Date', 'Transaction Date'],
      description: ['Description'],
      amount: ['Amount'],
      checkNumber: ['Check or Slip #'],
      type: ['Type'],
    },
    dateFormats: ['MM/dd/yyyy', 'M/d/yyyy'],
    amountStyle: 'signed', // negative = debit
  },
  bankOfAmerica: {
    name: 'Bank of America',
    detect: (headers) => headers.includes('Date') && headers.includes('Description') && headers.includes('Amount'),
    mapping: {
      date: ['Date', 'Posted Date'],
      description: ['Description', 'Payee'],
      amount: ['Amount'],
      referenceNumber: ['Reference Number'],
    },
    dateFormats: ['MM/dd/yyyy', 'M/d/yyyy'],
    amountStyle: 'signed',
  },
  wellsFargo: {
    name: 'Wells Fargo',
    detect: (headers) => headers.some(h => h.includes('Wells Fargo')) || 
                         (headers.includes('Date') && headers.includes('Amount')),
    mapping: {
      date: ['Date'],
      description: ['Description'],
      amount: ['Amount'],
    },
    dateFormats: ['MM/dd/yyyy', 'M/d/yyyy'],
    amountStyle: 'signed',
  },
  capitalOne: {
    name: 'Capital One',
    detect: (headers) => headers.includes('Transaction Date') && headers.includes('Debit') && headers.includes('Credit'),
    mapping: {
      date: ['Transaction Date', 'Posted Date'],
      description: ['Description', 'Transaction Description'],
      debit: ['Debit'],
      credit: ['Credit'],
    },
    dateFormats: ['yyyy-MM-dd', 'MM/dd/yyyy'],
    amountStyle: 'split', // separate debit/credit columns
  },
  discover: {
    name: 'Discover',
    detect: (headers) => headers.includes('Trans. Date') && headers.includes('Amount'),
    mapping: {
      date: ['Trans. Date', 'Post Date'],
      description: ['Description'],
      amount: ['Amount'],
      category: ['Category'],
    },
    dateFormats: ['MM/dd/yyyy'],
    amountStyle: 'signed',
  },
  usBank: {
    name: 'US Bank',
    detect: (headers) => headers.includes('Date') && headers.includes('Name') && headers.includes('Amount'),
    mapping: {
      date: ['Date'],
      description: ['Name', 'Memo'],
      amount: ['Amount'],
    },
    dateFormats: ['MM/dd/yyyy', 'yyyy-MM-dd'],
    amountStyle: 'signed',
  },
  citi: {
    name: 'Citibank',
    detect: (headers) => headers.includes('Date') && headers.includes('Description') && 
                         (headers.includes('Debit') || headers.includes('Credit')),
    mapping: {
      date: ['Date'],
      description: ['Description'],
      debit: ['Debit'],
      credit: ['Credit'],
    },
    dateFormats: ['MM/dd/yyyy'],
    amountStyle: 'split',
  },
  pnc: {
    name: 'PNC Bank',
    detect: (headers) => headers.includes('Date') && headers.includes('Description') && headers.includes('Withdrawals'),
    mapping: {
      date: ['Date'],
      description: ['Description'],
      debit: ['Withdrawals'],
      credit: ['Deposits'],
    },
    dateFormats: ['MM/dd/yyyy', 'M/d/yyyy'],
    amountStyle: 'split',
  },
  amex: {
    name: 'American Express',
    detect: (headers) => headers.includes('Date') && headers.includes('Description') && headers.includes('Amount'),
    mapping: {
      date: ['Date'],
      description: ['Description'],
      amount: ['Amount'],
      referenceNumber: ['Reference'],
    },
    dateFormats: ['MM/dd/yyyy', 'MM/dd/yy'],
    amountStyle: 'signed',
  },
};

/**
 * Parse a CSV buffer and return normalized transactions
 * @param {Buffer|string} csvData - Raw CSV data
 * @param {Object} options - Parsing options
 * @param {string} options.bankFormat - Bank format key (e.g., 'chase') or 'auto' for detection
 * @param {Object} options.customMapping - Custom column mapping (if bankFormat is 'custom')
 * @param {string} options.dateFormat - Custom date format
 * @returns {Object} { success, transactions, detectedBank, headers, sampleRows, error }
 */
export function parseCSV(csvData, options = {}) {
  try {
    const { bankFormat = 'auto', customMapping = null, dateFormat = null } = options;

    // Parse CSV to array of objects
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle BOM characters
      relax_column_count: true,
    });

    if (!records || records.length === 0) {
      return { success: false, error: 'CSV file is empty or has no data rows' };
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);

    // Detect or use specified bank format
    let selectedFormat = null;
    let detectedBank = null;

    if (bankFormat === 'auto') {
      // Try to detect bank format
      for (const [bankKey, format] of Object.entries(BANK_FORMATS)) {
        if (format.detect(headers)) {
          selectedFormat = format;
          detectedBank = bankKey;
          break;
        }
      }
    } else if (bankFormat === 'custom' && customMapping) {
      // Use custom mapping
      selectedFormat = {
        name: 'Custom',
        mapping: customMapping,
        dateFormats: dateFormat ? [dateFormat] : ['MM/dd/yyyy', 'yyyy-MM-dd', 'M/d/yyyy'],
        amountStyle: customMapping.debit && customMapping.credit ? 'split' : 'signed',
      };
      detectedBank = 'custom';
    } else if (BANK_FORMATS[bankFormat]) {
      selectedFormat = BANK_FORMATS[bankFormat];
      detectedBank = bankFormat;
    }

    // Parse transactions
    const transactions = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const transaction = normalizeTransaction(row, selectedFormat, headers, i);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (err) {
        errors.push({ row: i + 2, error: err.message }); // +2 for header row and 0-index
      }
    }

    return {
      success: true,
      transactions,
      detectedBank,
      detectedBankName: selectedFormat?.name || 'Unknown',
      headers,
      sampleRows: records.slice(0, 5),
      totalRows: records.length,
      parsedCount: transactions.length,
      errors: errors.length > 0 ? errors : null,
      requiresMapping: !selectedFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error.message}`,
    };
  }
}

/**
 * Normalize a single row to transaction format
 * @param {Object} row - CSV row as object
 * @param {Object} format - Bank format definition
 * @param {Array} headers - Available headers
 * @param {number} index - Row index
 * @returns {Object|null} Normalized transaction or null if invalid
 */
function normalizeTransaction(row, format, headers, index) {
  if (!format) {
    // No format detected, return raw data for manual mapping
    return {
      _raw: row,
      _needsMapping: true,
      _rowIndex: index,
    };
  }

  const mapping = format.mapping;

  // Find date
  const dateValue = findColumnValue(row, mapping.date);
  const parsedDate = parseTransactionDate(dateValue, format.dateFormats);
  
  if (!parsedDate) {
    throw new Error(`Invalid date: ${dateValue}`);
  }

  // Find description
  const description = findColumnValue(row, mapping.description) || '';

  // Find amount
  let amount;
  if (format.amountStyle === 'split') {
    const debitValue = findColumnValue(row, mapping.debit);
    const creditValue = findColumnValue(row, mapping.credit);
    amount = parseAmount(debitValue, creditValue, 'split');
  } else {
    const amountValue = findColumnValue(row, mapping.amount);
    amount = parseAmount(amountValue, null, 'signed');
  }

  if (amount === null || isNaN(amount)) {
    throw new Error(`Invalid amount`);
  }

  // Optional fields
  const referenceNumber = findColumnValue(row, mapping.referenceNumber) || '';
  const category = findColumnValue(row, mapping.category) || '';
  const bankType = findColumnValue(row, mapping.type) || '';
  const paymentMethod = mapBankTypeToPaymentMethod(bankType);
  
  // Get check number - but NOT for deposit slips (DSLIP/CHECK_DEPOSIT)
  // The "slip #" for deposits is not a check number
  const rawCheckNumber = findColumnValue(row, mapping.checkNumber) || '';
  const isDepositSlip = bankType && (
    bankType.toUpperCase().includes('DEPOSIT') || 
    bankType.toUpperCase().includes('DSLIP')
  );
  const checkNumber = isDepositSlip ? '' : rawCheckNumber;

  return {
    date: parsedDate,
    description: description.trim(),
    amount: amount,
    type: amount >= 0 ? TRANSACTION_TYPES.INCOME : TRANSACTION_TYPES.EXPENSE,
    paymentMethod: paymentMethod,
    checkNumber: checkNumber,
    referenceNumber: referenceNumber,
    category: category,
    originalType: bankType,
    source: 'csv_import',
    _rowIndex: index,
  };
}

/**
 * Find a column value by trying multiple possible column names
 * @param {Object} row - CSV row
 * @param {Array|string} possibleColumns - Array of possible column names
 * @returns {string|null} Column value or null
 */
function findColumnValue(row, possibleColumns) {
  if (!possibleColumns) return null;
  
  const columns = Array.isArray(possibleColumns) ? possibleColumns : [possibleColumns];
  
  for (const col of columns) {
    if (row[col] !== undefined && row[col] !== '') {
      return row[col];
    }
  }
  
  return null;
}

/**
 * Parse a date string using multiple format attempts
 * @param {string} dateStr - Date string
 * @param {Array} formats - Array of date format strings
 * @returns {string|null} ISO date string or null
 */
function parseTransactionDate(dateStr, formats = []) {
  if (!dateStr) return null;

  const allFormats = [
    ...formats,
    'MM/dd/yyyy',
    'M/d/yyyy',
    'yyyy-MM-dd',
    'MM-dd-yyyy',
    'dd/MM/yyyy',
    'MM/dd/yy',
  ];

  for (const fmt of allFormats) {
    try {
      const parsed = parseDate(dateStr, fmt, new Date());
      if (isValid(parsed)) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      // Try next format
    }
  }

  // Try native Date parsing as fallback
  try {
    const parsed = new Date(dateStr);
    if (isValid(parsed)) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Invalid date
  }

  return null;
}

/**
 * Parse amount from various formats
 * @param {string} value - Primary amount value
 * @param {string} secondValue - Secondary value (for split debit/credit)
 * @param {string} style - 'signed' or 'split'
 * @returns {number|null} Parsed amount or null
 */
function parseAmount(value, secondValue, style) {
  if (style === 'split') {
    // Separate debit/credit columns
    const debit = cleanAmount(value);
    const credit = cleanAmount(secondValue);
    
    if (debit && !isNaN(debit) && debit !== 0) {
      return -Math.abs(debit); // Debits are negative
    }
    if (credit && !isNaN(credit) && credit !== 0) {
      return Math.abs(credit); // Credits are positive
    }
    return 0;
  }

  // Single amount column
  return cleanAmount(value);
}

/**
 * Clean and parse an amount string
 * Handles: $1,234.56, (1234.56), -1234.56, 1,234.56 CR/DR
 * @param {string} value - Amount string
 * @returns {number|null} Parsed number or null
 */
function cleanAmount(value) {
  if (!value || value === '') return null;
  
  let str = String(value).trim();
  
  // Check for credit/debit indicators
  const isCredit = /CR$/i.test(str);
  const isDebit = /DR$/i.test(str);
  
  // Check for parentheses (negative)
  const hasParens = str.startsWith('(') && str.endsWith(')');
  
  // Remove currency symbols, commas, spaces, CR/DR
  str = str
    .replace(/[()]/g, '')
    .replace(/[$£€¥,\s]/g, '')
    .replace(/CR$/i, '')
    .replace(/DR$/i, '');
  
  let num = parseFloat(str);
  
  if (isNaN(num)) return null;
  
  // Apply sign based on indicators
  if (hasParens || isDebit) {
    num = -Math.abs(num);
  } else if (isCredit) {
    num = Math.abs(num);
  }
  
  return num;
}

/**
 * Get list of supported banks for dropdown
 * @returns {Array} Array of { key, name } objects
 */
export function getSupportedBanks() {
  return Object.entries(BANK_FORMATS).map(([key, format]) => ({
    key,
    name: format.name,
  }));
}

/**
 * Get headers from CSV without full parsing
 * @param {Buffer|string} csvData - Raw CSV data
 * @returns {Object} { success, headers, sampleRows, error }
 */
export function getCSVHeaders(csvData) {
  try {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      to: 5, // Only parse first 5 rows
    });

    if (!records || records.length === 0) {
      return { success: false, error: 'CSV file is empty' };
    }

    return {
      success: true,
      headers: Object.keys(records[0]),
      sampleRows: records,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate a custom column mapping
 * @param {Object} mapping - Custom mapping object
 * @returns {Object} { valid, errors }
 */
export function validateMapping(mapping) {
  const errors = [];
  
  if (!mapping.date) {
    errors.push('Date column is required');
  }
  if (!mapping.description) {
    errors.push('Description column is required');
  }
  if (!mapping.amount && !(mapping.debit || mapping.credit)) {
    errors.push('Amount column (or Debit/Credit columns) is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  parseCSV,
  getSupportedBanks,
  getCSVHeaders,
  validateMapping,
  BANK_FORMATS,
};
