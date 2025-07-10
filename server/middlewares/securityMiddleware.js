import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from '../config/index.js';

/**
 * Rate limiting configuration for different types of requests
 */
export const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
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
      
      res.status(429).json(options.message || defaultOptions.message);
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * General API rate limiting
 */
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'API rate limit exceeded. Please try again later.',
    retryAfter: 900
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: {
    error: 'Authentication Rate Limit Exceeded',
    message: 'Too many authentication attempts. Please try again later.',
    retryAfter: 900
  }
});

/**
 * Rate limiting for file uploads
 */
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    error: 'Upload Rate Limit Exceeded',
    message: 'Too many file uploads. Please try again later.',
    retryAfter: 3600
  }
});

/**
 * Rate limiting for expensive operations (reports, data exports)
 */
export const expensiveOperationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 expensive operations per hour
  message: {
    error: 'Operation Rate Limit Exceeded',
    message: 'Too many resource-intensive operations. Please try again later.',
    retryAfter: 3600
  }
});

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:5173',
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
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};

/**
 * Security headers configuration using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.firebase.com", "https://*.firebaseio.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for Firebase compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize.replace('mb', ''));
      
      if (sizeInMB > maxSizeInMB) {
        logger.warn('Request size limit exceeded', {
          contentLength,
          maxSize,
          ip: req.ip,
          path: req.path
        });
        
        return res.status(413).json({
          error: 'Request Too Large',
          message: `Request size exceeds the ${maxSize} limit`,
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
 * IP whitelist middleware (for admin operations)
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
    
    res.status(403).json({
      error: 'Access Forbidden',
      message: 'Your IP address is not authorized to access this resource'
    });
  };
};

/**
 * User agent validation middleware
 */
export const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    logger.warn('Request without User-Agent header', {
      ip: req.ip,
      path: req.path
    });
    
    return res.status(400).json({
      error: 'Bad Request',
      message: 'User-Agent header is required'
    });
  }
  
  // Block known malicious user agents
  const blockedPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];
  
  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const isBlocked = blockedPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBlocked) {
    logger.warn('Blocked user agent detected', {
      userAgent,
      ip: req.ip,
      path: req.path
    });
    
    return res.status(403).json({
      error: 'Access Forbidden',
      message: 'Automated requests are not allowed'
    });
  }
  
  next();
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
          ip: req.ip
        });
        
        res.status(408).json({
          error: 'Request Timeout',
          message: 'The request took too long to process',
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
