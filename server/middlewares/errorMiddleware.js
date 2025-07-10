import { logger } from '../config/index.js';
import { 
  isFirestoreIndexError, 
  getIndexErrorMessage, 
  extractIndexCreationUrl 
} from '../utils/errorHandler.js';

/**
 * Global error handling middleware
 * Handles different types of errors and provides appropriate responses
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

  if (error.name === 'ValidationError') {
    return handleValidationError(error, req, res);
  }

  if (error.code === 'auth/invalid-user-token') {
    return handleAuthError(error, req, res);
  }

  if (error.name === 'MulterError') {
    return handleFileUploadError(error, req, res);
  }

  if (error.code === 'ENOENT') {
    return handleFileNotFoundError(error, req, res);
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return handleFileSizeError(error, req, res);
  }

  // Handle rate limiting errors
  if (error.status === 429) {
    return handleRateLimitError(error, req, res);
  }

  // Default error response
  return handleGenericError(error, req, res);
};

/**
 * Handle Firestore index errors gracefully
 */
const handleFirestoreIndexError = (error, req, res) => {
  const indexUrl = extractIndexCreationUrl(error);
  
  logger.warn('Firestore index error encountered', {
    path: req.path,
    indexUrl,
    fallbackUsed: true
  });

  return res.status(400).json({
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
 */
const handleValidationError = (error, req, res) => {
  const validationErrors = error.details || error.errors || [];
  
  return res.status(400).json({
    error: 'Validation Error',
    message: 'The request contains invalid data',
    details: validationErrors.map(err => ({
      field: err.path || err.param,
      message: err.message,
      value: err.value
    }))
  });
};

/**
 * Handle authentication errors
 */
const handleAuthError = (error, req, res) => {
  return res.status(401).json({
    error: 'Authentication Error',
    message: 'Your session has expired. Please log in again.',
    details: {
      code: error.code,
      recommendation: 'Refresh your authentication token'
    }
  });
};

/**
 * Handle file upload errors
 */
const handleFileUploadError = (error, req, res) => {
  let message = 'File upload failed';
  
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size exceeds the maximum allowed limit';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files uploaded';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      break;
    default:
      message = error.message || 'File upload error';
  }

  return res.status(400).json({
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
 */
const handleFileNotFoundError = (error, req, res) => {
  return res.status(404).json({
    error: 'File Not Found',
    message: 'The requested file could not be found',
    details: {
      path: error.path
    }
  });
};

/**
 * Handle file size limit errors
 */
const handleFileSizeError = (error, req, res) => {
  return res.status(413).json({
    error: 'File Too Large',
    message: 'The uploaded file exceeds the size limit',
    details: {
      maxSize: '10MB',
      recommendation: 'Please upload a smaller file'
    }
  });
};

/**
 * Handle rate limiting errors
 */
const handleRateLimitError = (error, req, res) => {
  return res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    details: {
      retryAfter: error.retryAfter || 60,
      limit: error.limit,
      remaining: 0
    }
  });
};

/**
 * Handle generic/unknown errors
 */
const handleGenericError = (error, req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // In development, provide detailed error information
  if (isDevelopment) {
    return res.status(error.status || 500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
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
  return res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.',
    details: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  });
};

/**
 * Handle 404 errors for unmatched routes
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    details: {
      availableRoutes: [
        'GET /api/health',
        'POST /api/auth/login',
        'GET /api/transactions',
        'POST /api/pdf/upload',
        'GET /api/reports/*'
      ]
    }
  });
};

/**
 * Async error wrapper to catch promise rejections
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
