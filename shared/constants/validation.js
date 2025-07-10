/**
 * Validation Rules and Constraints
 * Shared validation constants and business rules
 */

/**
 * Field Length Constraints
 */
export const FIELD_LENGTHS = {
  // User fields
  NAME: { MIN: 2, MAX: 100 },
  EMAIL: { MIN: 5, MAX: 254 },
  PHONE: { MIN: 10, MAX: 20 },
  PASSWORD: { MIN: 8, MAX: 128 },

  // Transaction fields
  DESCRIPTION: { MIN: 1, MAX: 500 },
  PAYEE: { MIN: 1, MAX: 200 },
  REFERENCE_NUMBER: { MIN: 1, MAX: 50 },
  CHECK_NUMBER: { MIN: 1, MAX: 20 },

  // Company fields
  COMPANY_NAME: { MIN: 1, MAX: 200 },
  COMPANY_ADDRESS: { MIN: 5, MAX: 500 },
  TAX_ID: { MIN: 9, MAX: 20 },

  // File fields
  FILE_NAME: { MIN: 1, MAX: 255 },
  DISPLAY_NAME: { MIN: 1, MAX: 100 },

  // Classification rules
  RULE_NAME: { MIN: 1, MAX: 100 },
  RULE_PATTERN: { MIN: 1, MAX: 200 },

  // General fields
  NOTES: { MIN: 0, MAX: 1000 },
  TAGS: { MIN: 1, MAX: 50 }
};

/**
 * Numeric Constraints
 */
export const NUMERIC_CONSTRAINTS = {
  // Currency amounts
  CURRENCY: {
    MIN: -999999999.99,
    MAX: 999999999.99,
    DECIMAL_PLACES: 2
  },

  // Percentages
  PERCENTAGE: {
    MIN: 0,
    MAX: 100,
    DECIMAL_PLACES: 2
  },

  // Tax rates
  TAX_RATE: {
    MIN: 0,
    MAX: 50,
    DECIMAL_PLACES: 4
  },

  // Pagination
  PAGE_SIZE: {
    MIN: 1,
    MAX: 100
  },

  PAGE_NUMBER: {
    MIN: 1,
    MAX: 999999
  },

  // Priority/Order
  PRIORITY: {
    MIN: 1,
    MAX: 1000
  }
};

/**
 * Date Constraints
 */
export const DATE_CONSTRAINTS = {
  // Transaction dates
  TRANSACTION_DATE: {
    MIN_YEAR: 1900,
    MAX_YEAR: new Date().getFullYear() + 1,
    ALLOW_FUTURE: true,
    ALLOW_WEEKENDS: true
  },

  // Statement periods
  STATEMENT_PERIOD: {
    MIN_DAYS: 1,
    MAX_DAYS: 366,
    ALLOW_OVERLAPS: false
  },

  // Report periods
  REPORT_PERIOD: {
    MIN_DAYS: 1,
    MAX_DAYS: 1826, // 5 years
    ALLOW_FUTURE: false
  }
};

/**
 * Business Rules
 */
export const BUSINESS_RULES = {
  // Transaction rules
  TRANSACTIONS: {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 10000000,
    REQUIRE_CATEGORY_FOR_REPORTS: true,
    ALLOW_ZERO_AMOUNTS: false,
    AUTO_CLASSIFY_NEW: true
  },

  // Company rules
  COMPANIES: {
    MAX_COMPANIES_PER_USER: 10,
    REQUIRE_TAX_ID: false,
    ALLOW_DUPLICATE_NAMES: false
  },

  // Upload rules
  UPLOADS: {
    MAX_UPLOADS_PER_DAY: 50,
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_FILE_TYPES: ['application/pdf'],
    AUTO_DELETE_AFTER_DAYS: 90,
    REQUIRE_COMPANY_ASSIGNMENT: false
  },

  // Classification rules
  CLASSIFICATION: {
    MAX_RULES_PER_USER: 100,
    CASE_SENSITIVE_DEFAULT: false,
    REGEX_ENABLED: true,
    AUTO_APPLY_TO_EXISTING: true
  },

  // Reports
  REPORTS: {
    MAX_PERIOD_DAYS: 1826, // 5 years
    CACHE_DURATION_MINUTES: 30,
    REQUIRE_DATE_RANGE: true,
    ALLOW_EMPTY_CATEGORIES: false
  }
};

/**
 * Validation Patterns (RegExp)
 */
export const VALIDATION_PATTERNS = {
  // Email pattern (RFC 5322 compliant)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Phone patterns
  PHONE_US: /^[\+]?[1]?[\s\-\.]?[\(]?[0-9]{3}[\)]?[\s\-\.]?[0-9]{3}[\s\-\.]?[0-9]{4}$/,
  PHONE_INTERNATIONAL: /^\+?[1-9]\d{1,14}$/,

  // Tax ID patterns
  EIN: /^\d{2}-\d{7}$/, // US Employer Identification Number
  SSN: /^\d{3}-\d{2}-\d{4}$/, // US Social Security Number

  // Currency patterns
  CURRENCY_US: /^\$?-?\d{1,3}(,\d{3})*(\.\d{2})?$/,
  CURRENCY_DECIMAL: /^-?\d+(\.\d{1,2})?$/,

  // Password strength
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,

  // Check number
  CHECK_NUMBER: /^[0-9]{1,10}$/,

  // File names
  FILE_NAME_SAFE: /^[a-zA-Z0-9\-_\.\s]+$/,

  // Alphanumeric with spaces
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,

  // URL validation
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

/**
 * Required Fields by Entity
 */
export const REQUIRED_FIELDS = {
  TRANSACTION: ['date', 'amount', 'description', 'userId'],
  COMPANY: ['name', 'userId'],
  PAYEE: ['name', 'userId'],
  UPLOAD: ['fileName', 'userId'],
  CLASSIFICATION_RULE: ['name', 'pattern', 'category', 'userId'],
  USER: ['email', 'name']
};

/**
 * Enum Validations
 */
export const ENUM_VALUES = {
  TRANSACTION_TYPES: ['income', 'expense', 'transfer'],
  PAYMENT_METHODS: ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other'],
  STATEMENT_SECTIONS: ['deposits', 'checks', 'electronic', 'fees', 'manual'],
  UPLOAD_STATUS: ['pending', 'processing', 'completed', 'failed'],
  CLASSIFICATION_TYPES: ['exact', 'contains', 'starts_with', 'ends_with', 'regex'],
  REPORT_FORMATS: ['pdf', 'csv', 'excel'],
  REPORT_TYPES: ['profit_loss', 'expense_summary', 'tax_summary', 'cash_flow'],
  USER_ROLES: ['user', 'admin', 'demo'],
  ACCOUNT_TYPES: ['checking', 'savings', 'credit_card', 'investment']
};

/**
 * File Validation Rules
 */
export const FILE_VALIDATION = {
  PDF: {
    MAX_SIZE_MB: 10,
    ALLOWED_EXTENSIONS: ['pdf'],
    MIME_TYPES: ['application/pdf'],
    REQUIRE_TEXT_CONTENT: true
  },
  
  CSV: {
    MAX_SIZE_MB: 5,
    ALLOWED_EXTENSIONS: ['csv'],
    MIME_TYPES: ['text/csv', 'application/csv'],
    MAX_ROWS: 10000
  },
  
  IMAGE: {
    MAX_SIZE_MB: 2,
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif'],
    MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    MAX_DIMENSIONS: { width: 2048, height: 2048 }
  }
};

/**
 * Security Constraints
 */
export const SECURITY_CONSTRAINTS = {
  // Rate limiting
  API_RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    BURST_LIMIT: 10
  },

  // Session management
  SESSION: {
    MAX_DURATION_HOURS: 24,
    IDLE_TIMEOUT_MINUTES: 60,
    REQUIRE_2FA_FOR_ADMIN: false
  },

  // Password policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_AGE_DAYS: 90,
    PREVENT_REUSE_COUNT: 5
  },

  // File upload security
  UPLOAD_SECURITY: {
    SCAN_FOR_MALWARE: true,
    QUARANTINE_SUSPICIOUS: true,
    MAX_UPLOADS_PER_HOUR: 10
  }
};

/**
 * Accessibility Requirements
 */
export const ACCESSIBILITY = {
  // ARIA requirements
  REQUIRED_ARIA_LABELS: [
    'button',
    'input',
    'select',
    'textarea',
    'link'
  ],

  // Color contrast minimums
  COLOR_CONTRAST: {
    NORMAL_TEXT: 4.5,
    LARGE_TEXT: 3,
    UI_COMPONENTS: 3
  },

  // Keyboard navigation
  KEYBOARD_NAVIGATION: {
    TAB_ORDER_REQUIRED: true,
    FOCUS_INDICATORS_REQUIRED: true,
    SKIP_LINKS_REQUIRED: true
  }
};
