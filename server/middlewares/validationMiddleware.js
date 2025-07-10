import { validationResult, body, param, query } from 'express-validator';
import { logger } from '../config/index.js';

/**
 * Validation result handler middleware
 * Checks for validation errors and returns formatted response
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    logger.warn('Validation errors in request', {
      requestId: req.id,
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      user: req.user ? req.user.email : null
    });

    return res.status(400).json({
      error: 'Validation Error',
      message: 'The request contains invalid data',
      details: formattedErrors
    });
  }

  next();
};

/**
 * Common validation rules for transactions
 */
export const validateTransaction = [
  body('amount')
    .isFloat({ min: -999999.99, max: 999999.99 })
    .withMessage('Amount must be a valid number between -999,999.99 and 999,999.99'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be a string with maximum 100 characters'),
  
  body('companyId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Company ID must be a non-empty string with maximum 50 characters'),

  body('statementId')
    .optional()
    .isString()
    .trim()
    .withMessage('Statement ID must be a string'),

  handleValidationErrors
];

/**
 * Validation rules for updating transactions
 */
export const validateTransactionUpdate = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Transaction ID is required'),

  body('amount')
    .optional()
    .isFloat({ min: -999999.99, max: 999999.99 })
    .withMessage('Amount must be a valid number between -999,999.99 and 999,999.99'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be a string with maximum 100 characters'),

  handleValidationErrors
];

/**
 * Validation rules for company operations
 */
export const validateCompany = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be maximum 500 characters'),

  handleValidationErrors
];

/**
 * Validation rules for PDF upload
 */
export const validatePdfUpload = [
  body('companyId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Company ID must be a non-empty string with maximum 50 characters'),

  handleValidationErrors
];

/**
 * Validation rules for date range queries
 */
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format (YYYY-MM-DD)'),

  query('companyId')
    .optional()
    .isString()
    .trim()
    .withMessage('Company ID must be a string'),

  handleValidationErrors
];

/**
 * Validation rules for pagination
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors
];

/**
 * Validation rules for transaction filtering
 */
export const validateTransactionFilters = [
  query('category')
    .optional()
    .isString()
    .trim()
    .withMessage('Category must be a string'),
  
  query('companyId')
    .optional()
    .isString()
    .trim()
    .withMessage('Company ID must be a string'),
  
  query('statementId')
    .optional()
    .isString()
    .trim()
    .withMessage('Statement ID must be a string'),
  
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be maximum 100 characters'),

  handleValidationErrors
];

/**
 * Validation for MongoDB ObjectId parameters
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isString()
    .isLength({ min: 1 })
    .withMessage(`${paramName} is required and must be a valid identifier`),

  handleValidationErrors
];

/**
 * Validation for report parameters
 */
export const validateReportParams = [
  query('year')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Year must be between 2000 and 2100'),
  
  query('quarter')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Quarter must be between 1 and 4'),
  
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  handleValidationErrors
];

/**
 * Sanitization middleware to clean input data
 */
export const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  // Sanitize body, query, and params
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};
