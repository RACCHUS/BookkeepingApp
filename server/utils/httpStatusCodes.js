/**
 * HTTP Status Code Constants
 * 
 * Standard HTTP status codes for consistent API responses.
 * Improves code readability and prevents magic numbers.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// Success codes (2xx)
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client errors (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Error type constants
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  BAD_REQUEST_ERROR: 'BAD_REQUEST_ERROR'
};

// Default error messages
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  AUTH_REQUIRED: 'Authentication required',
  ACCESS_FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests',
  BAD_REQUEST: 'Bad request'
};

// Success messages
export const SUCCESS_MESSAGES = {
  DEFAULT: 'Success',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully'
};
