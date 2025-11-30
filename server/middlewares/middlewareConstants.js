/**
 * Middleware Configuration Constants
 * 
 * Centralized constants for security, rate limiting, validation,
 * and error handling middleware configurations.
 * 
 * @module middlewares/middlewareConstants
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// ============================================================================
// TIME CONSTANTS (in milliseconds)
// ============================================================================

export const TIME = {
  ONE_MINUTE: 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  THIRTY_SECONDS: 30 * 1000
};

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

export const RATE_LIMITS = {
  // API rate limiting
  API: {
    WINDOW_MS: TIME.FIFTEEN_MINUTES,
    MAX_REQUESTS: 100,
    RETRY_AFTER_SECONDS: 900 // 15 minutes
  },
  
  // Authentication rate limiting
  AUTH: {
    WINDOW_MS: TIME.FIFTEEN_MINUTES,
    MAX_REQUESTS: 10,
    RETRY_AFTER_SECONDS: 900
  },
  
  // File upload rate limiting
  UPLOAD: {
    WINDOW_MS: TIME.ONE_HOUR,
    MAX_REQUESTS: 50,
    RETRY_AFTER_SECONDS: 3600 // 1 hour
  },
  
  // Expensive operations (reports, exports)
  EXPENSIVE: {
    WINDOW_MS: TIME.ONE_HOUR,
    MAX_REQUESTS: 20,
    RETRY_AFTER_SECONDS: 3600
  }
};

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

export const FILE_LIMITS = {
  DEFAULT_MAX_SIZE: '10mb',
  DEFAULT_MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB in bytes
  BYTES_PER_KB: 1024,
  BYTES_PER_MB: 1024 * 1024
};

// ============================================================================
// HTTP STATUS CODES (subset specific to middlewares)
// ============================================================================

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// ============================================================================
// VALIDATION CONSTRAINTS
// ============================================================================

export const VALIDATION = {
  TRANSACTION: {
    MIN_AMOUNT: -999999.99,
    MAX_AMOUNT: 999999.99,
    MIN_DESCRIPTION_LENGTH: 1,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_CATEGORY_LENGTH: 100,
    MAX_COMPANY_ID_LENGTH: 50,
    MIN_COMPANY_ID_LENGTH: 1
  },
  
  PAGINATION: {
    MIN_LIMIT: 1,
    MAX_LIMIT: 1000,
    DEFAULT_LIMIT: 50,
    MIN_OFFSET: 0,
    DEFAULT_OFFSET: 0
  },
  
  DATE: {
    MIN_YEAR: 1900,
    MAX_YEAR: 2100
  }
};

// ============================================================================
// TIMEOUT CONFIGURATIONS
// ============================================================================

export const TIMEOUTS = {
  DEFAULT_REQUEST: 30000, // 30 seconds
  UPLOAD_REQUEST: 120000, // 2 minutes
  REPORT_GENERATION: 60000 // 1 minute
};

// ============================================================================
// CORS ALLOWED ORIGINS
// ============================================================================

export const CORS = {
  LOCALHOST_PORTS: [3000, 5173],
  LOCALHOST_URLS: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173'
  ],
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  ALLOWED_HEADERS: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Request-ID'
  ],
  EXPOSED_HEADERS: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  MAX_AGE_SECONDS: 86400 // 24 hours
};

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const SECURITY = {
  HSTS: {
    MAX_AGE_SECONDS: 31536000, // 1 year
    INCLUDE_SUBDOMAINS: true,
    PRELOAD: true
  },
  
  CSP_DIRECTIVES: {
    DEFAULT_SRC: ["'self'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    SCRIPT_SRC: ["'self'"],
    IMG_SRC: ["'self'", "data:", "https:"],
    CONNECT_SRC: ["'self'", "https://api.firebase.com", "https://*.firebaseio.com"],
    FONT_SRC: ["'self'"],
    OBJECT_SRC: ["'none'"],
    MEDIA_SRC: ["'self'"],
    FRAME_SRC: ["'none'"]
  },
  
  BLOCKED_USER_AGENT_PATTERNS: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ]
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  RATE_LIMIT: {
    GENERAL: 'Rate limit exceeded. Please try again later.',
    API: 'API rate limit exceeded. Please try again later.',
    AUTH: 'Too many authentication attempts. Please try again later.',
    UPLOAD: 'Too many file uploads. Please try again later.',
    EXPENSIVE: 'Too many resource-intensive operations. Please try again later.'
  },
  
  VALIDATION: {
    INVALID_DATA: 'The request contains invalid data',
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format'
  },
  
  SECURITY: {
    CORS_BLOCKED: 'Not allowed by CORS',
    IP_FORBIDDEN: 'Your IP address is not authorized to access this resource',
    USER_AGENT_REQUIRED: 'User-Agent header is required',
    AUTOMATED_REQUEST_BLOCKED: 'Automated requests are not allowed',
    REQUEST_TOO_LARGE: 'Request size exceeds the limit'
  },
  
  FILE: {
    UPLOAD_FAILED: 'File upload failed',
    SIZE_EXCEEDED: 'File size exceeds the maximum allowed limit',
    TOO_MANY_FILES: 'Too many files uploaded',
    UNEXPECTED_FIELD: 'Unexpected file field',
    NOT_FOUND: 'The requested file could not be found',
    TOO_LARGE: 'The uploaded file exceeds the size limit'
  },
  
  AUTH: {
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    REFRESH_TOKEN: 'Refresh your authentication token'
  },
  
  TIMEOUT: {
    REQUEST: 'The request took too long to process'
  },
  
  GENERIC: {
    INTERNAL_ERROR: 'Internal Server Error',
    UNEXPECTED_ERROR: 'An unexpected error occurred',
    TRY_AGAIN_LATER: 'An unexpected error occurred. Please try again later.',
    BAD_REQUEST: 'Bad Request'
  }
};

// ============================================================================
// ERROR TYPES/NAMES
// ============================================================================

export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  AUTH_INVALID_TOKEN: 'auth/invalid-user-token',
  MULTER: 'MulterError',
  FILE_NOT_FOUND: 'ENOENT',
  FILE_SIZE_LIMIT: 'LIMIT_FILE_SIZE',
  FILE_COUNT_LIMIT: 'LIMIT_FILE_COUNT',
  UNEXPECTED_FILE: 'LIMIT_UNEXPECTED_FILE'
};

// ============================================================================
// LOGGING LEVELS
// ============================================================================

export const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

// ============================================================================
// AVAILABLE API ROUTES (for 404 help)
// ============================================================================

export const AVAILABLE_ROUTES = [
  'GET /api/health',
  'POST /api/auth/login',
  'GET /api/transactions',
  'POST /api/pdf/upload',
  'GET /api/reports/*'
];
