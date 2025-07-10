/**
 * Middleware exports for the bookkeeping application
 * Organized by functionality for easy importing
 */

// Authentication middleware
export { default as authMiddleware } from './authMiddleware.js';
export { default as optionalAuthMiddleware } from './optionalAuthMiddleware.js';

// Error handling middleware
export {
  errorHandler,
  notFoundHandler,
  asyncHandler
} from './errorMiddleware.js';

// Request logging middleware
export {
  requestLogger,
  apiLogger,
  performanceMonitor
} from './loggingMiddleware.js';

// Validation middleware
export {
  handleValidationErrors,
  validateTransaction,
  validateTransactionUpdate,
  validateCompany,
  validatePdfUpload,
  validateDateRange,
  validatePagination,
  validateTransactionFilters,
  validateObjectId,
  validateReportParams,
  sanitizeInput
} from './validationMiddleware.js';

// Security middleware
export {
  createRateLimit,
  apiRateLimit,
  authRateLimit,
  uploadRateLimit,
  expensiveOperationRateLimit,
  corsOptions,
  securityHeaders,
  requestSizeLimit,
  ipWhitelist,
  validateUserAgent,
  requestTimeout
} from './securityMiddleware.js';

/**
 * Middleware groups for common use cases
 */

// Basic middleware stack for all routes
export const basicMiddleware = [
  'requestLogger',
  'securityHeaders',
  'cors',
  'express.json',
  'express.urlencoded',
  'sanitizeInput'
];

// API middleware stack
export const apiMiddleware = [
  'apiRateLimit',
  'apiLogger',
  'performanceMonitor'
];

// Authentication middleware stack
export const authStack = [
  'authRateLimit',
  'authMiddleware'
];

// Upload middleware stack
export const uploadStack = [
  'uploadRateLimit',
  'requestSizeLimit',
  'validateUserAgent'
];

// Admin middleware stack
export const adminStack = [
  'ipWhitelist',
  'authMiddleware',
  'validateUserAgent'
];

/**
 * Middleware configuration object for easy setup
 */
export const middlewareConfig = {
  // Development configuration
  development: {
    logging: {
      level: 'debug',
      enableApiLogger: true,
      enablePerformanceMonitor: true
    },
    security: {
      enableCors: true,
      enableRateLimit: false,
      enableUserAgentValidation: false
    },
    validation: {
      enableSanitization: true,
      strictValidation: false
    }
  },
  
  // Production configuration
  production: {
    logging: {
      level: 'info',
      enableApiLogger: false,
      enablePerformanceMonitor: true
    },
    security: {
      enableCors: true,
      enableRateLimit: true,
      enableUserAgentValidation: true
    },
    validation: {
      enableSanitization: true,
      strictValidation: true
    }
  }
};
