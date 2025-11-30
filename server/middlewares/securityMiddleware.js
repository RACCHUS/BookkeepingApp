/**
 * Security Middleware Module
 * 
 * Provides comprehensive security controls including rate limiting,
 * CORS configuration, security headers, IP whitelisting, and request validation.
 * 
 * @module middlewares/securityMiddleware
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from '../config/index.js';
import {
  RATE_LIMITS,
  FILE_LIMITS,
  HTTP_STATUS,
  TIMEOUTS,
  CORS as CORS_CONFIG,
  SECURITY,
  ERROR_MESSAGES
} from './middlewareConstants.js';

/**
 * Create rate limiting middleware with custom options
 * @param {object} options - Rate limit configuration options
 * @returns {Function} Express rate limiting middleware
 * @example
 * const customLimit = createRateLimit({
 *   windowMs: 60000,
 *   max: 50,
 *   message: { error: 'Custom error' }
 * });
 */
export const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: RATE_LIMITS.API.WINDOW_MS,
    max: RATE_LIMITS.API.MAX_REQUESTS,
    message: {
      error: 'Too Many Requests',
      message: ERROR_MESSAGES.RATE_LIMIT.GENERAL,
      retryAfter: Math.ceil(options.windowMs / 1000) || RATE_LIMITS.API.RETRY_AFTER_SECONDS
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        user: req.user ? req.user.email : null
      });
      
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(options.message || defaultOptions.message);
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * General API rate limiting middleware
 * @example
 * app.use('/api/', apiRateLimit);
 */
export const apiRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.API.WINDOW_MS,
  max: RATE_LIMITS.API.MAX_REQUESTS,
  message: {
    error: 'Too Many Requests',
    message: ERROR_MESSAGES.RATE_LIMIT.API,
    retryAfter: RATE_LIMITS.API.RETRY_AFTER_SECONDS
  }
});

/**
 * Strict rate limiting for authentication endpoints
 * @example
 * app.post('/api/auth/login', authRateLimit, loginController);
 */
export const authRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
  max: RATE_LIMITS.AUTH.MAX_REQUESTS,
  message: {
    error: 'Authentication Rate Limit Exceeded',
    message: ERROR_MESSAGES.RATE_LIMIT.AUTH,
    retryAfter: RATE_LIMITS.AUTH.RETRY_AFTER_SECONDS
  }
});

/**
 * Rate limiting for file uploads
 * @example
 * app.post('/api/pdf/upload', uploadRateLimit, uploadController);
 */
export const uploadRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.UPLOAD.WINDOW_MS,
  max: RATE_LIMITS.UPLOAD.MAX_REQUESTS,
  message: {
    error: 'Upload Rate Limit Exceeded',
    message: ERROR_MESSAGES.RATE_LIMIT.UPLOAD,
    retryAfter: RATE_LIMITS.UPLOAD.RETRY_AFTER_SECONDS
  }
});

/**
 * Rate limiting for expensive operations (reports, data exports)
 * @example
 * app.get('/api/reports/profit-loss', expensiveOperationRateLimit, reportController);
 */
export const expensiveOperationRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.EXPENSIVE.WINDOW_MS,
  max: RATE_LIMITS.EXPENSIVE.MAX_REQUESTS,
  message: {
    error: 'Operation Rate Limit Exceeded',
    message: ERROR_MESSAGES.RATE_LIMIT.EXPENSIVE,
    retryAfter: RATE_LIMITS.EXPENSIVE.RETRY_AFTER_SECONDS
  }
});

/**
 * CORS configuration for cross-origin requests
 * @example
 * app.use(cors(corsOptions));
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      ...CORS_CONFIG.LOCALHOST_URLS,
      process.env.CORS_ORIGIN,
      process.env.CLIENT_URL
    ].filter(Boolean);

    // In development, allow any localhost origin
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', {
        origin,
        allowedOrigins
      });
      callback(new Error(ERROR_MESSAGES.SECURITY.CORS_BLOCKED));
    }
  },
  credentials: true,
  methods: CORS_CONFIG.ALLOWED_METHODS,
  allowedHeaders: CORS_CONFIG.ALLOWED_HEADERS,
  exposedHeaders: CORS_CONFIG.EXPOSED_HEADERS,
  maxAge: CORS_CONFIG.MAX_AGE_SECONDS
};

/**
 * Security headers configuration using Helmet
 * @example
 * app.use(securityHeaders);
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: SECURITY.CSP_DIRECTIVES.DEFAULT_SRC,
      styleSrc: SECURITY.CSP_DIRECTIVES.STYLE_SRC,
      scriptSrc: SECURITY.CSP_DIRECTIVES.SCRIPT_SRC,
      imgSrc: SECURITY.CSP_DIRECTIVES.IMG_SRC,
      connectSrc: SECURITY.CSP_DIRECTIVES.CONNECT_SRC,
      fontSrc: SECURITY.CSP_DIRECTIVES.FONT_SRC,
      objectSrc: SECURITY.CSP_DIRECTIVES.OBJECT_SRC,
      mediaSrc: SECURITY.CSP_DIRECTIVES.MEDIA_SRC,
      frameSrc: SECURITY.CSP_DIRECTIVES.FRAME_SRC
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for Firebase compatibility
  hsts: {
    maxAge: SECURITY.HSTS.MAX_AGE_SECONDS,
    includeSubDomains: SECURITY.HSTS.INCLUDE_SUBDOMAINS,
    preload: SECURITY.HSTS.PRELOAD
  }
});

/**
 * Request size limiting middleware
 * @param {string} maxSize - Maximum request size (e.g., '10mb')
 * @returns {Function} Express middleware
 * @example
 * app.use(requestSizeLimit('5mb'));
 */
export const requestSizeLimit = (maxSize = FILE_LIMITS.DEFAULT_MAX_SIZE) => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / FILE_LIMITS.BYTES_PER_MB;
      const maxSizeInMB = parseInt(maxSize.replace('mb', ''));
      
      if (sizeInMB > maxSizeInMB) {
        logger.warn('Request size limit exceeded', {
          contentLength,
          maxSize,
          ip: req.ip,
          path: req.path
        });
        
        return res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({
          error: 'Request Too Large',
          message: ERROR_MESSAGES.SECURITY.REQUEST_TOO_LARGE.replace('limit', `${maxSize} limit`),
          details: {
            maxSize,
            receivedSize: `${sizeInMB.toFixed(2)}MB`
          }
        });
      }
    }
    
    next();
  };
};

/**
 * IP whitelist middleware for admin operations
 * @param {string[]} allowedIPs - Array of allowed IP addresses
 * @returns {Function} Express middleware
 * @example
 * app.use('/api/admin', ipWhitelist(['192.168.1.1', '10.0.0.1']));
 */
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // In development, allow all IPs
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }
    
    logger.warn('IP not in whitelist', {
      clientIP,
      allowedIPs,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Access Forbidden',
      message: ERROR_MESSAGES.SECURITY.IP_FORBIDDEN
    });
  };
};

/**
 * User agent validation middleware to block bots and scrapers
 * @example
 * app.use(validateUserAgent);
 */
export const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    logger.warn('Request without User-Agent header', {
      ip: req.ip,
      path: req.path
    });
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES.GENERIC.BAD_REQUEST,
      message: ERROR_MESSAGES.SECURITY.USER_AGENT_REQUIRED
    });
  }
  
  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const isBlocked = SECURITY.BLOCKED_USER_AGENT_PATTERNS.some(pattern => pattern.test(userAgent));
  
  if (isBlocked) {
    logger.warn('Blocked user agent detected', {
      userAgent,
      ip: req.ip,
      path: req.path
    });
    
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Access Forbidden',
      message: ERROR_MESSAGES.SECURITY.AUTOMATED_REQUEST_BLOCKED
    });
  }
  
  next();
};

/**
 * Request timeout middleware to prevent long-running requests
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} Express middleware
 * @example
 * app.use(requestTimeout(60000)); // 60 second timeout
 */
export const requestTimeout = (timeoutMs = TIMEOUTS.DEFAULT_REQUEST) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
          ip: req.ip
        });
        
        res.status(HTTP_STATUS.REQUEST_TIMEOUT).json({
          error: 'Request Timeout',
          message: ERROR_MESSAGES.TIMEOUT.REQUEST,
          details: {
            timeout: `${timeoutMs / 1000}s`
          }
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};
