/**
 * Error Handling Middleware Module
 * 
 * Provides centralized error handling for all application errors including
 * Firestore index errors, validation errors, authentication errors, file upload errors,
 * and generic server errors.
 * 
 * @module middlewares/errorMiddleware
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

import { logger } from '../config/index.js';
import { 
  isFirestoreIndexError, 
  getIndexErrorMessage, 
  extractIndexCreationUrl 
} from '../utils/errorHandler.js';
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  ERROR_TYPES,
  FILE_LIMITS,
  AVAILABLE_ROUTES
} from './middlewareConstants.js';

/**
 * Global error handling middleware
 * @param {Error} error - The error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next function
 * @example
 * app.use(errorHandler); // Mount as last middleware
 */
export const errorHandler = (error, req, res, next) => {
  // Log the error with context
  logger.error('Unhandled error in request', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? { uid: req.user.uid, email: req.user.email } : null
  });

  // Handle specific error types
  if (isFirestoreIndexError(error)) {
    return handleFirestoreIndexError(error, req, res);
  }

  if (error.name === ERROR_TYPES.VALIDATION) {
    return handleValidationError(error, req, res);
  }

  if (error.code === ERROR_TYPES.AUTH_INVALID_TOKEN) {
    return handleAuthError(error, req, res);
  }

  if (error.name === ERROR_TYPES.MULTER) {
    return handleFileUploadError(error, req, res);
  }

  if (error.code === ERROR_TYPES.FILE_NOT_FOUND) {
    return handleFileNotFoundError(error, req, res);
  }

  if (error.code === ERROR_TYPES.FILE_SIZE_LIMIT) {
    return handleFileSizeError(error, req, res);
  }

  // Handle rate limiting errors
  if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return handleRateLimitError(error, req, res);
  }

  // Default error response
  return handleGenericError(error, req, res);
};

/**
 * Handle Firestore index errors gracefully
 * @param {Error} error - Firestore error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleFirestoreIndexError = (error, req, res) => {
  const indexUrl = extractIndexCreationUrl(error);
  
  logger.warn('Firestore index error encountered', {
    path: req.path,
    indexUrl,
    fallbackUsed: true
  });

  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    error: 'Database Index Required',
    message: getIndexErrorMessage(error),
    details: {
      indexCreationUrl: indexUrl,
      fallbackAvailable: true,
      recommendation: 'Create the required database index for optimal performance'
    }
  });
};

/**
 * Handle validation errors from express-validator or Joi
 * @param {Error} error - Validation error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleValidationError = (error, req, res) => {
  const validationErrors = error.details || error.errors || [];
  
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    error: 'Validation Error',
    message: ERROR_MESSAGES.VALIDATION.INVALID_DATA,
    details: validationErrors.map(err => ({
      field: err.path || err.param,
      message: err.message,
      value: err.value
    }))
  });
};

/**
 * Handle authentication errors
 * @param {Error} error - Authentication error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleAuthError = (error, req, res) => {
  return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    error: 'Authentication Error',
    message: ERROR_MESSAGES.AUTH.SESSION_EXPIRED,
    details: {
      code: error.code,
      recommendation: ERROR_MESSAGES.AUTH.REFRESH_TOKEN
    }
  });
};

/**
 * Handle file upload errors from Multer
 * @param {Error} error - Multer error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleFileUploadError = (error, req, res) => {
  let message = ERROR_MESSAGES.FILE.UPLOAD_FAILED;
  
  switch (error.code) {
    case ERROR_TYPES.FILE_SIZE_LIMIT:
      message = ERROR_MESSAGES.FILE.SIZE_EXCEEDED;
      break;
    case ERROR_TYPES.FILE_COUNT_LIMIT:
      message = ERROR_MESSAGES.FILE.TOO_MANY_FILES;
      break;
    case ERROR_TYPES.UNEXPECTED_FILE:
      message = ERROR_MESSAGES.FILE.UNEXPECTED_FIELD;
      break;
    default:
      message = error.message || ERROR_MESSAGES.FILE.UPLOAD_FAILED;
  }

  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    error: 'File Upload Error',
    message,
    details: {
      code: error.code,
      field: error.field
    }
  });
};

/**
 * Handle file not found errors
 * @param {Error} error - File system error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleFileNotFoundError = (error, req, res) => {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'File Not Found',
    message: ERROR_MESSAGES.FILE.NOT_FOUND,
    details: {
      path: error.path
    }
  });
};

/**
 * Handle file size limit errors
 * @param {Error} error - File size error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleFileSizeError = (error, req, res) => {
  return res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({
    error: 'File Too Large',
    message: ERROR_MESSAGES.FILE.TOO_LARGE,
    details: {
      maxSize: `${FILE_LIMITS.DEFAULT_MAX_SIZE_MB}MB`,
      recommendation: 'Please upload a smaller file'
    }
  });
};

/**
 * Handle rate limiting errors
 * @param {Error} error - Rate limit error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleRateLimitError = (error, req, res) => {
  return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    error: 'Too Many Requests',
    message: ERROR_MESSAGES.RATE_LIMIT.GENERAL,
    details: {
      retryAfter: error.retryAfter || 60,
      limit: error.limit,
      remaining: 0
    }
  });
};

/**
 * Handle generic/unknown errors
 * @param {Error} error - Any uncaught error
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 */
const handleGenericError = (error, req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // In development, provide detailed error information
  if (isDevelopment) {
    return res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.GENERIC.INTERNAL_ERROR,
      message: error.message || ERROR_MESSAGES.GENERIC.UNEXPECTED_ERROR,
      details: {
        name: error.name,
        stack: error.stack,
        code: error.code,
        path: req.path,
        method: req.method
      }
    });
  }

  // In production, provide minimal error information
  return res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: ERROR_MESSAGES.GENERIC.INTERNAL_ERROR,
    message: ERROR_MESSAGES.GENERIC.TRY_AGAIN_LATER,
    details: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  });
};

/**
 * Handle 404 errors for unmatched routes
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @returns {object} JSON error response
 * @example
 * app.use(notFoundHandler); // Mount after all routes
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    details: {
      availableRoutes: AVAILABLE_ROUTES
    }
  });
};

/**
 * Async error wrapper to catch promise rejections
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware that catches errors
 * @example
 * app.get('/api/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
