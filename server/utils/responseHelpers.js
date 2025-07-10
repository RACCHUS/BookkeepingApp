/**
 * Response Utilities
 * 
 * Standardized response formatting for API endpoints.
 * Provides consistent response structure, error handling,
 * and success formatting across all controllers.
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

/**
 * Standard success response
 * @param {object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {object} Response object
 */
export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
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
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {any} details - Additional error details
 * @returns {object} Response object
 */
export function sendError(res, message = 'An error occurred', statusCode = 400, details = null) {
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
    message: 'Validation failed',
    error: {
      code: 422,
      type: 'VALIDATION_ERROR',
      details: errors
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(422).json(response);
}

/**
 * Authentication error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Response object
 */
export function sendAuthError(res, message = 'Authentication required') {
  return sendError(res, message, 401, {
    type: 'AUTHENTICATION_ERROR'
  });
}

/**
 * Authorization error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Response object
 */
export function sendForbiddenError(res, message = 'Access forbidden') {
  return sendError(res, message, 403, {
    type: 'AUTHORIZATION_ERROR'
  });
}

/**
 * Not found error response
 * @param {object} res - Express response object
 * @param {string} resource - Resource type that was not found
 * @returns {object} Response object
 */
export function sendNotFoundError(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, 404, {
    type: 'NOT_FOUND_ERROR'
  });
}

/**
 * Server error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {Error} error - Original error object
 * @returns {object} Response object
 */
export function sendServerError(res, message = 'Internal server error', error = null) {
  const response = {
    success: false,
    message,
    error: {
      code: 500,
      type: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' && error ? {
        stack: error.stack,
        name: error.name
      } : null
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || null
  };
  
  return res.status(500).json(response);
}

/**
 * Rate limit error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Response object
 */
export function sendRateLimitError(res, message = 'Too many requests') {
  return sendError(res, message, 429, {
    type: 'RATE_LIMIT_ERROR'
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
export function sendPaginatedSuccess(res, data, pagination, message = 'Success') {
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
  
  return res.status(200).json(response);
}

/**
 * Created resource response
 * @param {object} res - Express response object
 * @param {any} data - Created resource data
 * @param {string} message - Success message
 * @returns {object} Response object
 */
export function sendCreatedResponse(res, data, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * No content response (for successful operations with no return data)
 * @param {object} res - Express response object
 * @returns {object} Response object
 */
export function sendNoContentResponse(res) {
  return res.status(204).send();
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
  const statusCode = isHealthy ? 200 : 503;
  
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
