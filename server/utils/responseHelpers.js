/**
 * Response Utilities
 * 
 * Standardized response formatting for API endpoints.
 * Provides consistent response structure, error handling,
 * and success formatting across all controllers.
 * 
 * @module utils/responseHelpers
 * @requires utils/httpStatusCodes
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

import { 
  HTTP_STATUS, 
  ERROR_TYPES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from './httpStatusCodes.js';

/**
 * Standard success response
 * @param {object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200 OK)
 * @returns {object} Response object
 */
export function sendSuccess(res, data = null, message = SUCCESS_MESSAGES.DEFAULT, statusCode = HTTP_STATUS.OK) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Standard error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400 Bad Request)
 * @param {any} details - Additional error details
 * @returns {object} Response object
 */
export function sendError(res, message = ERROR_MESSAGES.BAD_REQUEST, statusCode = HTTP_STATUS.BAD_REQUEST, details = null) {
  const response = {
    success: false,
    message,
    error: {
      code: statusCode,
      details: details || null
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 * @param {object} res - Express response object
 * @param {array} errors - Array of validation errors
 * @returns {object} Response object
 */
export function sendValidationError(res, errors) {
  const response = {
    success: false,
    message: ERROR_MESSAGES.VALIDATION_FAILED,
    error: {
      code: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      type: ERROR_TYPES.VALIDATION_ERROR,
      details: errors
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(response);
}

/**
 * Authentication error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Response object
 */
export function sendAuthError(res, message = ERROR_MESSAGES.AUTH_REQUIRED) {
  return sendError(res, message, HTTP_STATUS.UNAUTHORIZED, {
    type: ERROR_TYPES.AUTHENTICATION_ERROR
  });
}

/**
 * Authorization error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Response object
 */
export function sendForbiddenError(res, message = ERROR_MESSAGES.ACCESS_FORBIDDEN) {
  return sendError(res, message, HTTP_STATUS.FORBIDDEN, {
    type: ERROR_TYPES.AUTHORIZATION_ERROR
  });
}

/**
 * Not found error response
 * @param {object} res - Express response object
 * @param {string} resource - Resource type that was not found
 * @returns {object} Response object
 */
export function sendNotFoundError(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, HTTP_STATUS.NOT_FOUND, {
    type: ERROR_TYPES.NOT_FOUND_ERROR
  });
}

/**
 * Server error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {Error} error - Original error object
 * @returns {object} Response object
 */
export function sendServerError(res, message = ERROR_MESSAGES.INTERNAL_ERROR, error = null) {
  const response = {
    success: false,
    message,
    error: {
      code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      type: ERROR_TYPES.SERVER_ERROR,
      details: process.env.NODE_ENV === 'development' && error ? {
        stack: error.stack,
        name: error.name
      } : null
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
}

/**
 * Rate limit error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Response object
 */
export function sendRateLimitError(res, message = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED) {
  return sendError(res, message, HTTP_STATUS.TOO_MANY_REQUESTS, {
    type: ERROR_TYPES.RATE_LIMIT_ERROR
  });
}

/**
 * Paginated success response
 * @param {object} res - Express response object
 * @param {array} data - Array of items
 * @param {object} pagination - Pagination info
 * @param {string} message - Success message
 * @returns {object} Response object
 */
export function sendPaginatedSuccess(res, data, pagination, message = SUCCESS_MESSAGES.DEFAULT) {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      currentPage: Math.floor(pagination.offset / pagination.limit) + 1,
      pageSize: pagination.limit,
      totalItems: pagination.total || data.length,
      totalPages: pagination.total ? Math.ceil(pagination.total / pagination.limit) : 1,
      hasNextPage: pagination.total ? (pagination.offset + pagination.limit) < pagination.total : false,
      hasPreviousPage: pagination.offset > 0
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(HTTP_STATUS.OK).json(response);
}

/**
 * Created resource response
 * @param {object} res - Express response object
 * @param {any} data - Created resource data
 * @param {string} message - Success message
 * @returns {object} Response object
 */
export function sendCreatedResponse(res, data, message = SUCCESS_MESSAGES.CREATED) {
  return sendSuccess(res, data, message, HTTP_STATUS.CREATED);
}

/**
 * No content response (for successful operations with no return data)
 * @param {object} res - Express response object
 * @returns {object} Response object
 */
export function sendNoContentResponse(res) {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * File download response
 * @param {object} res - Express response object
 * @param {string} filePath - Path to file
 * @param {string} fileName - Download filename
 * @param {string} contentType - MIME type
 * @returns {object} Response object
 */
export function sendFileResponse(res, filePath, fileName, contentType = 'application/octet-stream') {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.sendFile(filePath);
}

/**
 * Stream response for large data
 * @param {object} res - Express response object
 * @param {Stream} stream - Data stream
 * @param {string} contentType - MIME type
 * @returns {void}
 */
export function sendStreamResponse(res, stream, contentType = 'application/json') {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Transfer-Encoding', 'chunked');
  stream.pipe(res);
}

/**
 * Cache headers for static resources
 * @param {object} res - Express response object
 * @param {number} maxAge - Cache max age in seconds
 * @returns {void}
 */
export function setCacheHeaders(res, maxAge = 3600) {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('ETag', `"${Date.now()}"`);
}

/**
 * No cache headers for dynamic content
 * @param {object} res - Express response object
 * @returns {void}
 */
export function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

/**
 * Health check response
 * @param {object} res - Express response object
 * @param {object} healthData - Health check data
 * @returns {object} Response object
 */
export function sendHealthResponse(res, healthData) {
  const isHealthy = healthData.status === 'healthy';
  const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
  
  const response = {
    status: healthData.status,
    timestamp: new Date().toISOString(),
    version: healthData.version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: healthData.checks || {},
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  return res.status(statusCode).json(response);
}
