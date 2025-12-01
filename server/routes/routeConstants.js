/**
 * Route Constants
 * 
 * Centralized constants for API routes, including:
 * - Route paths and path parameters
 * - Validation constraints (limits, lengths, formats)
 * - Allowed values for enums
 * - Rate limiting and size configurations
 * 
 * @module routeConstants
 */

/**
 * Base API paths
 */
export const API_PATHS = {
  TRANSACTIONS: '/api/transactions',
  COMPANIES: '/api/companies',
  REPORTS: '/api/reports',
  PDF: '/api/pdf',
  CLASSIFICATION: '/api/classification',
  PAYEES: '/api/payees'
};

/**
 * Transaction-related constants
 */
export const TRANSACTION_CONSTANTS = {
  /** Valid transaction types */
  TYPES: ['income', 'expense', 'transfer'],
  
  /** Valid section codes */
  SECTION_CODES: ['deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized'],
  
  /** Valid fields for ordering */
  ORDER_BY_FIELDS: ['date', 'amount', 'description', 'category', 'type', 'payee', 'sectionCode', 'createdAt', 'updatedAt'],
  
  /** Valid sort orders */
  SORT_ORDERS: ['asc', 'desc'],
  
  /** Validation limits */
  LIMITS: {
    DESCRIPTION_MIN: 1,
    DESCRIPTION_MAX: 500,
    CATEGORY_MIN: 1,
    QUERY_LIMIT_MIN: 1,
    QUERY_LIMIT_MAX: 1000,
    QUERY_OFFSET_MIN: 0,
    BULK_ARRAY_MIN: 1
  }
};

/**
 * Company-related constants
 */
export const COMPANY_CONSTANTS = {
  /** Valid business types */
  BUSINESS_TYPES: ['LLC', 'Corp', 'Partnership', 'Sole Proprietorship', 'S-Corp', 'Non-Profit', 'Other'],
  
  /** Valid accounting methods */
  ACCOUNTING_METHODS: ['Cash', 'Accrual'],
  
  /** Validation limits */
  LIMITS: {
    NAME_MIN: 1,
    NAME_MAX: 200,
    LEGAL_NAME_MAX: 200,
    STREET_MAX: 200,
    CITY_MAX: 100,
    STATE_LENGTH: 2,
    INDUSTRY_MAX: 100
  },
  
  /** Regex patterns */
  PATTERNS: {
    /** EIN format XX-XXXXXXX or SSN format XXX-XX-XXXX */
    TAX_ID: /^\d{2}-\d{7}$|^\d{3}-\d{2}-\d{4}$/,
    /** Zip code XXXXX or XXXXX-XXXX */
    ZIP_CODE: /^\d{5}(-\d{4})?$/,
    /** Phone number with optional country code and formatting */
    PHONE: /^\+?[\d\s\-\(\)\.]+$/,
    /** Fiscal year end MM/DD */
    FISCAL_YEAR_END: /^\d{2}\/\d{2}$/
  }
};

/**
 * Report-related constants
 */
export const REPORT_CONSTANTS = {
  /** Valid report formats */
  FORMATS: ['json', 'pdf', 'csv'],
  
  /** Valid report types */
  TYPES: {
    PROFIT_LOSS: 'profit-loss',
    EXPENSE_SUMMARY: 'expense-summary',
    EMPLOYEE_SUMMARY: 'employee-summary',
    TAX_SUMMARY: 'tax-summary',
    CATEGORY_BREAKDOWN: 'category-breakdown',
    CHECKS_PAID: 'checks-paid'
  },
  
  /** Request size limits */
  SIZE_LIMITS: {
    STANDARD: '2mb',
    PDF_GENERATION: '2mb'
  }
};

/**
 * PDF upload and processing constants
 */
export const PDF_CONSTANTS = {
  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: ['application/pdf'],
  
  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: ['.pdf'],
  
  /** File size limits */
  SIZE_LIMITS: {
    DEFAULT: 10 * 1024 * 1024, // 10MB in bytes
    STRING: '10mb' // For middleware
  },
  
  /** Upload constraints */
  UPLOAD: {
    MAX_FILES: 1
  }
};

/**
 * Classification-related constants
 */
export const CLASSIFICATION_CONSTANTS = {
  /** Validation limits */
  LIMITS: {
    RULE_NAME_MIN: 1,
    RULE_NAME_MAX: 100,
    KEYWORDS_ARRAY_MIN: 1,
    CATEGORY_MIN: 1,
    PRIORITY_MIN: 1,
    PRIORITY_MAX: 100,
    TRANSACTIONS_ARRAY_MIN: 1,
    DESCRIPTION_MIN: 1
  },
  
  /** Request size limits */
  SIZE_LIMITS: {
    CLASSIFY: '500kb'
  }
};

/**
 * Payee-related constants
 */
export const PAYEE_CONSTANTS = {
  /** Valid payee types */
  TYPES: ['employee', 'vendor', 'other'],
  
  /** Valid payment methods */
  PAYMENT_METHODS: ['check', 'ach', 'wire', 'cash', 'card', 'other'],
  
  /** Validation limits */
  LIMITS: {
    NAME_MIN: 1,
    NAME_MAX: 200,
    CONTACT_NAME_MAX: 100,
    EMAIL_MAX: 100,
    PHONE_MAX: 20,
    STREET_MAX: 200,
    CITY_MAX: 100,
    STATE_LENGTH: 2,
    NOTES_MAX: 1000,
    QUERY_LIMIT_MIN: 1,
    QUERY_LIMIT_MAX: 500,
    QUERY_OFFSET_MIN: 0
  },
  
  /** Regex patterns */
  PATTERNS: {
    /** Zip code XXXXX or XXXXX-XXXX */
    ZIP_CODE: /^\d{5}(-\d{4})?$/,
    /** Phone number */
    PHONE: /^\+?[\d\s\-\(\)\.]+$/,
    /** EIN format XX-XXXXXXX or SSN format XXX-XX-XXXX */
    TAX_ID: /^\d{2}-\d{7}$|^\d{3}-\d{2}-\d{4}$/
  }
};

/**
 * Common validation constraints used across routes
 */
export const COMMON_VALIDATION = {
  /** ISO 8601 date format requirement message */
  DATE_MESSAGE: 'must be a valid ISO 8601 date',
  
  /** Numeric field requirement message */
  NUMERIC_MESSAGE: 'must be a number',
  
  /** Object ID requirement message */
  OBJECT_ID_MESSAGE: 'ID is required',
  
  /** Array requirement message */
  ARRAY_MESSAGE: 'must be a non-empty array'
};

/**
 * Rate limiting and request size defaults
 */
export const REQUEST_LIMITS = {
  /** Default request size limits */
  SIZE: {
    SMALL: '500kb',
    MEDIUM: '1mb',
    LARGE: '2mb',
    XLARGE: '10mb'
  }
};
