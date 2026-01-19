/**
 * Client-side CSV Parser Service
 * Parses CSV files from various banks and normalizes to transaction format
 * 
 * This runs entirely in the browser - no server required
 */

import Papa from 'papaparse';
import { parse as parseDate, isValid, format } from 'date-fns';

/**
 * Bank format definitions for auto-detection
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
    amountStyle: 'signed',
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
    amountStyle: 'split',
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
 * Map bank transaction types to standardized payment methods
 * @param {string} bankType - Bank's transaction type (e.g., 'DEBIT_CARD', 'ACH_CREDIT')
 * @returns {string} Standardized payment method
 */
function mapBankTypeToPaymentMethod(bankType) {
  if (!bankType) return 'other';
  
  const type = bankType.toUpperCase();
  
  // Check deposits (mobile/remote deposits) - must check BEFORE general CHECK
  // These are bank transfers, not check payments
  if (type.includes('CHECK_DEPOSIT') || type.includes('DEPOSIT') || type.includes('DSLIP')) {
    return 'bank_transfer';
  }
  
  // Check transactions (actual checks written/paid) - CHECK_PAID, etc.
  if (type.includes('CHECK') || type.includes('CHK')) {
    return 'check';
  }
  
  // Debit/ATM card transactions
  if (type.includes('DEBIT') || type.includes('POS') || type.includes('POINT_OF_SALE')) {
    return 'debit_card';
  }
  
  // Credit card transactions
  if (type.includes('CREDIT_CARD') || type.includes('VISA') || type.includes('MASTERCARD')) {
    return 'credit_card';
  }
  
  // ACH/Electronic transfers
  if (type.includes('ACH') || type.includes('TRANSFER') || type.includes('WIRE') || type.includes('EFT')) {
    return 'bank_transfer';
  }
  
  // ATM transactions (cash)
  if (type.includes('ATM')) {
    return 'cash';
  }
  
  // Zelle
  if (type.includes('ZELLE')) {
    return 'zelle';
  }
  
  // PayPal
  if (type.includes('PAYPAL')) {
    return 'paypal';
  }
  
  // Venmo
  if (type.includes('VENMO')) {
    return 'venmo';
  }
  
  return 'other';
}

/**
 * Find value from a row using possible column names
 */
function getFieldValue(row, possibleNames) {
  if (!possibleNames) return null;
  const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];
  
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') {
      return row[name];
    }
  }
  return null;
}

/**
 * Parse date string with multiple format attempts
 */
function parseTransactionDate(dateStr, formats = ['MM/dd/yyyy', 'yyyy-MM-dd', 'M/d/yyyy']) {
  if (!dateStr) return null;
  
  const cleanDate = dateStr.trim();
  
  for (const fmt of formats) {
    try {
      const parsed = parseDate(cleanDate, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch (e) {
      // Try next format
    }
  }
  
  // Try native Date parsing as fallback
  const nativeDate = new Date(cleanDate);
  if (!isNaN(nativeDate.getTime())) {
    return format(nativeDate, 'yyyy-MM-dd');
  }
  
  return null;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Clean the string
  let cleaned = String(amountStr).trim();
  
  // Check for parentheses (negative) format: ($100.00) or (100.00)
  const isParenNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isParenNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Remove currency symbols and commas
  cleaned = cleaned.replace(/[$,]/g, '');
  
  // Check for CR/DR suffix
  const isCredit = cleaned.toUpperCase().endsWith('CR');
  const isDebit = cleaned.toUpperCase().endsWith('DR');
  if (isCredit || isDebit) {
    cleaned = cleaned.slice(0, -2).trim();
  }
  
  // Parse the number
  let amount = parseFloat(cleaned);
  if (isNaN(amount)) return 0;
  
  // Apply sign
  if (isParenNegative || isDebit) {
    amount = -Math.abs(amount);
  } else if (isCredit) {
    amount = Math.abs(amount);
  }
  
  return amount;
}

/**
 * Detect bank format from headers
 */
export function detectBankFormat(headers) {
  for (const [bankKey, format] of Object.entries(BANK_FORMATS)) {
    if (format.detect(headers)) {
      return { bankKey, format };
    }
  }
  return null;
}

/**
 * Parse CSV file and return normalized transactions
 * @param {File} file - File object from input
 * @param {Object} options - Parsing options
 * @returns {Promise<Object>} { success, transactions, detectedBank, headers, error }
 */
export function parseCSVFile(file, options = {}) {
  return new Promise((resolve) => {
    const { bankFormat = 'auto', companyId = null, companyName = null } = options;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const { data, meta } = results;
          
          if (!data || data.length === 0) {
            resolve({ success: false, error: 'CSV file is empty or has no data rows' });
            return;
          }

          const headers = meta.fields || Object.keys(data[0]);
          
          // Detect or use specified bank format
          let selectedFormat = null;
          let detectedBank = null;

          if (bankFormat === 'auto') {
            const detected = detectBankFormat(headers);
            if (detected) {
              selectedFormat = detected.format;
              detectedBank = detected.bankKey;
            }
          } else if (BANK_FORMATS[bankFormat]) {
            selectedFormat = BANK_FORMATS[bankFormat];
            detectedBank = bankFormat;
          }

          // If no format detected, try generic parsing
          if (!selectedFormat) {
            selectedFormat = {
              name: 'Generic',
              mapping: {
                date: ['Date', 'Transaction Date', 'Posting Date', 'Trans. Date'],
                description: ['Description', 'Memo', 'Name', 'Payee'],
                amount: ['Amount', 'Debit', 'Credit'],
              },
              dateFormats: ['MM/dd/yyyy', 'yyyy-MM-dd', 'M/d/yyyy'],
              amountStyle: 'signed',
            };
            detectedBank = 'generic';
          }

          // Parse transactions
          const transactions = [];
          const errors = [];

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
              // Get date
              const dateValue = getFieldValue(row, selectedFormat.mapping.date);
              const date = parseTransactionDate(dateValue, selectedFormat.dateFormats);
              
              if (!date) {
                errors.push({ row: i + 2, error: 'Invalid or missing date' });
                continue;
              }

              // Get description
              const description = getFieldValue(row, selectedFormat.mapping.description) || '';

              // Get amount
              let amount = 0;
              if (selectedFormat.amountStyle === 'split') {
                // Separate debit/credit columns
                const debit = parseAmount(getFieldValue(row, selectedFormat.mapping.debit));
                const credit = parseAmount(getFieldValue(row, selectedFormat.mapping.credit));
                amount = credit - Math.abs(debit);
              } else {
                // Single amount column (signed)
                amount = parseAmount(getFieldValue(row, selectedFormat.mapping.amount));
              }

              // Determine transaction type
              const type = amount >= 0 ? 'income' : 'expense';

              // Get optional fields
              const referenceNumber = getFieldValue(row, selectedFormat.mapping.referenceNumber);
              const category = getFieldValue(row, selectedFormat.mapping.category);
              
              // Get bank type and map to payment method
              const bankType = getFieldValue(row, selectedFormat.mapping.type);
              const paymentMethod = mapBankTypeToPaymentMethod(bankType);
              
              // Get check number - but NOT for deposit slips (DSLIP/CHECK_DEPOSIT)
              // The "slip #" for deposits is not a check number
              const rawCheckNumber = getFieldValue(row, selectedFormat.mapping.checkNumber);
              const isDepositSlip = bankType && (
                bankType.toUpperCase().includes('DEPOSIT') || 
                bankType.toUpperCase().includes('DSLIP')
              );
              const checkNumber = isDepositSlip ? null : (rawCheckNumber || null);

              transactions.push({
                date,
                description: description.trim(),
                amount: Math.abs(amount),
                type,
                category: category || null,
                paymentMethod: paymentMethod,
                checkNumber: checkNumber,
                referenceNumber: referenceNumber || null,
                companyId: companyId || null,
                source: 'csv',
                sourceFile: file.name,
                bankName: selectedFormat.name,
                originalDescription: description.trim(),
              });
            } catch (err) {
              errors.push({ row: i + 2, error: err.message });
            }
          }

          resolve({
            success: true,
            transactions,
            detectedBank,
            detectedBankName: selectedFormat.name,
            headers,
            sampleRows: data.slice(0, 5),
            totalRows: data.length,
            parsedCount: transactions.length,
            errors: errors.length > 0 ? errors : null,
          });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      },
      error: (error) => {
        resolve({ success: false, error: error.message });
      },
    });
  });
}

/**
 * Get list of supported banks
 */
export function getSupportedBanks() {
  return Object.entries(BANK_FORMATS).map(([key, format]) => ({
    id: key,
    name: format.name,
  }));
}

export default {
  parseCSVFile,
  detectBankFormat,
  getSupportedBanks,
  BANK_FORMATS,
};
