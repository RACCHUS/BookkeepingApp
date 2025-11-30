/**
 * Logging Middleware Module
 * 
 * Provides comprehensive request/response logging, API-specific logging,
 * and performance monitoring capabilities.
 * 
 * @module middlewares/loggingMiddleware
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

import { logger } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';
import { HTTP_STATUS, FILE_LIMITS } from './middlewareConstants.js';

// Logging thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST_MS: 1000,
  MEMORY_WARNING_BYTES: 50 * FILE_LIMITS.BYTES_PER_MB, // 50MB
  CONVERSION_MS: 1000000, // nanoseconds to milliseconds
  CONVERSION_MB: 1024 * 1024 // bytes to megabytes
};

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'firebase_token',
  'auth_token'
];

/**
 * Request logging middleware with timing and response status
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 * @example
 * app.use(requestLogger); // Log all requests
 */
export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Extract useful request information
  const requestInfo = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    url: req.url,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  };

  // Log request start (with user info if available)
  logger.info('Request started', requestInfo);

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(data) {
    res.responseData = data;
    return originalJson.call(this, data);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const responseInfo = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: res.get('Content-Length'),
      user: req.user ? {
        uid: req.user.uid,
        email: req.user.email
      } : null,
      timestamp: new Date().toISOString()
    };

    // Different log levels based on status code
    if (res.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      logger.error('Request completed with server error', {
        ...responseInfo,
        responseData: process.env.NODE_ENV === 'development' ? res.responseData : undefined
      });
    } else if (res.statusCode >= HTTP_STATUS.BAD_REQUEST) {
      logger.warn('Request completed with client error', {
        ...responseInfo,
        responseData: process.env.NODE_ENV === 'development' ? res.responseData : undefined
      });
    } else {
      logger.info('Request completed successfully', responseInfo);
    }
  });

  // Log if request is aborted
  req.on('aborted', () => {
    const duration = Date.now() - req.startTime;
    logger.warn('Request aborted', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

/**
 * API-specific logging middleware with additional details
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 * @example
 * app.use(apiLogger); // Log detailed API request info
 */
export const apiLogger = (req, res, next) => {
  // Only log API routes in detail
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const apiInfo = {
    requestId: req.id,
    apiRoute: req.path,
    method: req.method,
    body: req.method !== 'GET' && req.body ? sanitizeBody(req.body) : undefined,
    params: req.params,
    query: req.query,
    user: req.user ? {
      uid: req.user.uid,
      email: req.user.email,
      provider: req.user.provider
    } : null,
    timestamp: new Date().toISOString()
  };

  logger.debug('API request details', apiInfo);

  next();
};

/**
 * Sanitize request body for logging (remove sensitive data)
 * @param {object} body - Request body to sanitize
 * @returns {object} Sanitized body with sensitive fields redacted
 * @example
 * const safe = sanitizeBody({ password: '123', name: 'John' });
 * // Returns: { password: '[REDACTED]', name: 'John' }
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };

  SENSITIVE_FIELDS.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Performance monitoring middleware to detect slow and memory-intensive requests
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 * @example
 * app.use(performanceMonitor); // Monitor all requests
 */
export const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime(startTime);
    const endMemory = process.memoryUsage();
    
    const duration = (endTime[0] * 1000) + (endTime[1] / PERFORMANCE_THRESHOLDS.CONVERSION_MS);
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal
    };

    // Log slow requests (over 1 second)
    if (duration > PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      logger.warn('Slow request detected', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta,
        user: req.user ? req.user.email : null
      });
    }

    // Log memory-intensive requests (over 50MB)
    if (Math.abs(memoryDelta.heapUsed) > PERFORMANCE_THRESHOLDS.MEMORY_WARNING_BYTES) {
      logger.warn('Memory-intensive request', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        memoryDelta: {
          heapUsed: `${(memoryDelta.heapUsed / PERFORMANCE_THRESHOLDS.CONVERSION_MB).toFixed(2)}MB`,
          heapTotal: `${(memoryDelta.heapTotal / PERFORMANCE_THRESHOLDS.CONVERSION_MB).toFixed(2)}MB`
        }
      });
    }
  });

  next();
};
