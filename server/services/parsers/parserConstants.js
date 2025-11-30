/**
 * @fileoverview Constants for Chase PDF parsing
 * @module services/parsers/parserConstants
 * @version 1.0.0
 * 
 * Centralized constants for parsing Chase bank statements including:
 * - Date and time formats
 * - Regular expression patterns for transaction parsing
 * - Company information extraction patterns
 * - Section boundary patterns
 * - Classification keywords
 * - Configuration values
 */

/**
 * Date and time formats
 */
export const DATE_FORMATS = {
  /** Date separator characters */
  SEPARATORS: {
    SLASH: '/',
    DASH: '-'
  },
  
  /** ISO 8601 time for transaction dates (noon) */
  DEFAULT_TIME: 'T12:00:00',
  
  /** Padding configuration */
  PADDING: {
    CHAR: '0',
    LENGTH: 2
  }
};

/**
 * Regular expression patterns for transaction parsing
 */
export const TRANSACTION_PATTERNS = {
  /** Main transaction line pattern: MM/DD DESCRIPTION AMOUNT */
  LINE: /^([0-9]{1,2}[\/\-][0-9]{1,2})\s+(.+?)\s+([-$]?[\d,]+\.?\d{2})\s*$/,
  
  /** Date pattern for validation */
  DATE: /^[0-9]{1,2}[\/\-][0-9]{1,2}$/,
  
  /** Amount pattern with optional dollar sign and commas */
  AMOUNT: /[-$]?[\d,]+\.?\d{2}/,
  
  /** Characters to remove from amount strings */
  AMOUNT_CLEANUP: /[$,]/g,
  
  /** Negative amount indicators */
  NEGATIVE_INDICATORS: {
    DASH: '-',
    PARENTHESES: /^\(.*\)$/
  }
};

/**
 * Company information extraction patterns
 */
export const COMPANY_PATTERNS = {
  /** Business entity suffixes and types */
  BUSINESS_ENTITIES: [
    /^([A-Z\s]+(?:INC|LLC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|CONSTRUCTION|ENTERPRISES|SERVICES|GROUP)\.?),?\s*$/i,
    /^([A-Z\s]+(?:&|AND)\s+[A-Z\s]+(?:INC|LLC|CORP|CONSTRUCTION)\.?),?\s*$/i,
    /^([A-Z][A-Za-z\s]+(?:CONSTRUCTION|CONTRACTING|BUILDER|BUILDERS|COMPANY)\.?),?\s*$/i,
    /^([A-Z][A-Za-z\s]{10,50})\s*$/
  ],
  
  /** Address patterns */
  ADDRESS: [
    /^\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Way|Place|Pl)\.?\s*$/i,
    /^[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/
  ],
  
  /** Lines to skip when searching for company info */
  SKIP_KEYWORDS: [
    'Chase',
    'Statement',
    'Account',
    'Period',
    'Balance',
    'Page'
  ],
  
  /** Maximum number of lines to scan in PDF header */
  HEADER_SCAN_LINES: 20,
  
  /** Minimum company name length for long name pattern */
  MIN_LONG_NAME_LENGTH: 10,
  MAX_LONG_NAME_LENGTH: 50
};

/**
 * Chase statement section patterns
 */
export const SECTION_PATTERNS = {
  /** Deposits and additions section */
  DEPOSITS: {
    PRIMARY: /DEPOSITS AND ADDITIONS[\s\S]*?(?:Total Deposits and Additions|TOTAL DEPOSITS)[\s\S]*?\$?[\d,]+\.?\d{2}/i,
    FALLBACK: /DEPOSITS AND ADDITIONS([\s\S]*?)(?=CHECKS PAID|ATM|ELECTRONIC|$)/i,
    HEADER: 'DEPOSITS AND ADDITIONS',
    TOTAL_KEYWORDS: ['Total Deposits and Additions', 'TOTAL DEPOSITS']
  },
  
  /** Checks paid section */
  CHECKS: {
    PRIMARY: /CHECKS PAID[\s\S]*?Total Checks Paid/i,
    HEADER: 'CHECKS PAID',
    TOTAL_KEYWORD: 'Total Checks Paid'
  },
  
  /** ATM & debit card section */
  CARDS: {
    PRIMARY: /ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT[\s\S]*?Total ATM\s*&\s*DEBIT CARD WITHDRAWALS/i,
    HEADER: 'ATM & DEBIT CARD WITHDRAWALS',
    TOTAL_KEYWORD: 'Total ATM & DEBIT CARD WITHDRAWALS'
  },
  
  /** Electronic withdrawals section */
  ELECTRONIC: {
    PRIMARY: /ELECTRONIC WITHDRAWALS[\s\S]*?Total Electronic Withdrawals/i,
    HEADER: 'ELECTRONIC WITHDRAWALS',
    TOTAL_KEYWORD: 'Total Electronic Withdrawals'
  }
};

/**
 * Transaction classification keywords and rules
 */
export const CLASSIFICATION = {
  /** Income keywords */
  INCOME_KEYWORDS: {
    DEPOSIT: 'DEPOSIT'
  },
  
  /** Expense keywords */
  EXPENSE_KEYWORDS: {
    FEE: 'FEE'
  },
  
  /** Category mappings */
  CATEGORIES: {
    BUSINESS_INCOME: 'Business Income',
    BANK_SERVICE_CHARGES: 'Bank Service Charges',
    UNCATEGORIZED: 'Uncategorized'
  },
  
  /** Confidence levels */
  CONFIDENCE: {
    HIGH: 0.8,
    LOW: 0.3
  },
  
  /** Check transaction patterns */
  CHECK_PATTERN: /^check\s*#?\d+$/i
};

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
};

/**
 * Summary field defaults
 */
export const SUMMARY_DEFAULTS = {
  TOTAL_TRANSACTIONS: 0,
  TOTAL_INCOME: 0,
  TOTAL_EXPENSES: 0,
  NET_INCOME: 0,
  NEEDS_REVIEW: 0
};

/**
 * Numeric patterns and validation
 */
export const NUMERIC = {
  /** Decimal places for amounts */
  DECIMAL_PLACES: 2,
  
  /** Zero value */
  ZERO: 0,
  
  /** Regex for numbers only */
  NUMBERS_ONLY: /^\d+$/
};

export default {
  DATE_FORMATS,
  TRANSACTION_PATTERNS,
  COMPANY_PATTERNS,
  SECTION_PATTERNS,
  CLASSIFICATION,
  TRANSACTION_TYPES,
  SUMMARY_DEFAULTS,
  NUMERIC
};
