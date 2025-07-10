/**
 * API Constants
 * Shared API-related constants and configurations
 */

/**
 * API Base URLs
 */
export const API_BASE_URLS = {
  DEVELOPMENT: 'http://localhost:3000',
  PRODUCTION: 'https://your-app.firebaseapp.com',
  STAGING: 'https://staging-your-app.firebaseapp.com'
};

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    VERIFY: '/api/auth/verify'
  },

  // PDF Processing
  PDF: {
    UPLOAD: '/api/pdf/upload',
    STATUS: '/api/pdf/status',
    DOWNLOAD: '/api/pdf/download'
  },

  // Uploads
  UPLOADS: {
    LIST: '/api/uploads',
    GET: '/api/uploads/:id',
    UPDATE: '/api/uploads/:id',
    DELETE: '/api/uploads/:id'
  },

  // Transactions
  TRANSACTIONS: {
    LIST: '/api/transactions',
    GET: '/api/transactions/:id',
    CREATE: '/api/transactions',
    UPDATE: '/api/transactions/:id',
    DELETE: '/api/transactions/:id',
    BULK_CREATE: '/api/transactions/bulk',
    BULK_UPDATE: '/api/transactions/bulk',
    BULK_DELETE: '/api/transactions/bulk'
  },

  // Companies
  COMPANIES: {
    LIST: '/api/companies',
    GET: '/api/companies/:id',
    CREATE: '/api/companies',
    UPDATE: '/api/companies/:id',
    DELETE: '/api/companies/:id'
  },

  // Payees
  PAYEES: {
    LIST: '/api/payees',
    GET: '/api/payees/:id',
    CREATE: '/api/payees',
    UPDATE: '/api/payees/:id',
    DELETE: '/api/payees/:id'
  },

  // Reports
  REPORTS: {
    PROFIT_LOSS: '/api/reports/profit-loss',
    EXPENSE_SUMMARY: '/api/reports/expense-summary',
    TAX_SUMMARY: '/api/reports/tax-summary',
    CASH_FLOW: '/api/reports/cash-flow',
    EXPORT_PDF: '/api/reports/export/pdf',
    EXPORT_CSV: '/api/reports/export/csv'
  },

  // Classification
  CLASSIFICATION: {
    RULES: '/api/classification/rules',
    CLASSIFY: '/api/classification/classify',
    BATCH_CLASSIFY: '/api/classification/batch'
  }
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * HTTP Status Messages
 */
export const HTTP_STATUS_MESSAGES = {
  [HTTP_STATUS.OK]: 'OK',
  [HTTP_STATUS.CREATED]: 'Created',
  [HTTP_STATUS.ACCEPTED]: 'Accepted',
  [HTTP_STATUS.NO_CONTENT]: 'No Content',
  [HTTP_STATUS.BAD_REQUEST]: 'Bad Request',
  [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized',
  [HTTP_STATUS.FORBIDDEN]: 'Forbidden',
  [HTTP_STATUS.NOT_FOUND]: 'Not Found',
  [HTTP_STATUS.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
  [HTTP_STATUS.CONFLICT]: 'Conflict',
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HTTP_STATUS.BAD_GATEWAY]: 'Bad Gateway',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  [HTTP_STATUS.GATEWAY_TIMEOUT]: 'Gateway Timeout'
};

/**
 * Request Methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

/**
 * Content Types
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html',
  PDF: 'application/pdf',
  CSV: 'text/csv'
};

/**
 * API Response Status
 */
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Request Timeout (milliseconds)
 */
export const REQUEST_TIMEOUT = {
  DEFAULT: 30000,     // 30 seconds
  UPLOAD: 300000,     // 5 minutes for file uploads
  REPORT: 120000,     // 2 minutes for report generation
  QUICK: 10000        // 10 seconds for quick operations
};

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0
};

/**
 * File Upload Limits
 */
export const UPLOAD_LIMITS = {
  PDF: {
    MAX_SIZE: 10 * 1024 * 1024,  // 10MB
    ALLOWED_TYPES: ['application/pdf'],
    ALLOWED_EXTENSIONS: ['pdf']
  },
  CSV: {
    MAX_SIZE: 5 * 1024 * 1024,   // 5MB
    ALLOWED_TYPES: ['text/csv', 'application/csv'],
    ALLOWED_EXTENSIONS: ['csv']
  },
  IMAGE: {
    MAX_SIZE: 2 * 1024 * 1024,   // 2MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif']
  }
};

/**
 * Cache Keys
 */
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  COMPANIES: 'companies',
  CATEGORIES: 'categories',
  PAYEES: 'payees',
  TRANSACTIONS: 'transactions',
  REPORTS: 'reports'
};

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SHORT: 300,         // 5 minutes
  MEDIUM: 1800,       // 30 minutes
  LONG: 3600,         // 1 hour
  VERY_LONG: 86400    // 24 hours
};

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // File Processing
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_PROCESSING_ERROR: 'FILE_PROCESSING_ERROR',

  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

  // System
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  UPLOADED: 'File uploaded successfully',
  PROCESSED: 'Processing completed successfully'
};

/**
 * Rate Limiting
 */
export const RATE_LIMITS = {
  DEFAULT: {
    WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
    MAX_REQUESTS: 100
  },
  UPLOAD: {
    WINDOW_MS: 60 * 60 * 1000,  // 1 hour
    MAX_REQUESTS: 10
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
    MAX_REQUESTS: 5
  }
};
