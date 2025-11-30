/**
 * Validation Middleware Module
 * 
 * Provides express-validator based validation rules for all API endpoints
 * including transactions, companies, reports, and query parameters.
 * 
 * @module middlewares/validationMiddleware
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

import { validationResult, body, param, query } from 'express-validator';
import { logger } from '../config/index.js';
import { HTTP_STATUS, VALIDATION, ERROR_MESSAGES } from './middlewareConstants.js';

/**
 * Validation result handler middleware
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 * @returns {object|void} Error response or calls next()
 * @example
 * const validateUser = [
 *   body('email').isEmail(),
 *   handleValidationErrors
 * ];
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

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation Error',
      message: ERROR_MESSAGES.VALIDATION.INVALID_DATA,
      details: formattedErrors
    });
  }

  next();
};

/**
 * Common validation rules for transaction creation
 * @example
 * app.post('/api/transactions', validateTransaction, createTransaction);
 */
export const validateTransaction = [
  body('amount')
    .isFloat({ min: VALIDATION.TRANSACTION.MIN_AMOUNT, max: VALIDATION.TRANSACTION.MAX_AMOUNT })
    .withMessage(`Amount must be a valid number between ${VALIDATION.TRANSACTION.MIN_AMOUNT} and ${VALIDATION.TRANSACTION.MAX_AMOUNT}`),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  body('description')
    .trim()
    .isLength({ min: VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH, max: VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description must be between ${VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH} and ${VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH} characters`),
  
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH })
    .withMessage(`Category must be a string with maximum ${VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH} characters`),
  
  body('companyId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: VALIDATION.TRANSACTION.MIN_COMPANY_ID_LENGTH, max: VALIDATION.TRANSACTION.MAX_COMPANY_ID_LENGTH })
    .withMessage(`Company ID must be a non-empty string with maximum ${VALIDATION.TRANSACTION.MAX_COMPANY_ID_LENGTH} characters`),

  body('statementId')
    .optional()
    .isString()
    .trim()
    .withMessage('Statement ID must be a string'),

  handleValidationErrors
];

/**
 * Validation rules for transaction updates
 * @example
 * app.put('/api/transactions/:id', validateTransactionUpdate, updateTransaction);
 */
export const validateTransactionUpdate = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Transaction ID is required'),

  body('amount')
    .optional()
    .isFloat({ min: VALIDATION.TRANSACTION.MIN_AMOUNT, max: VALIDATION.TRANSACTION.MAX_AMOUNT })
    .withMessage(`Amount must be a valid number between ${VALIDATION.TRANSACTION.MIN_AMOUNT} and ${VALIDATION.TRANSACTION.MAX_AMOUNT}`),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH, max: VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description must be between ${VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH} and ${VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH} characters`),
  
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH })
    .withMessage(`Category must be a string with maximum ${VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH} characters`),

  handleValidationErrors
];

/**
 * Validation rules for company operations
 * @example
 * app.post('/api/companies', validateCompany, createCompany);
 */
export const validateCompany = [
  body('name')
    .trim()
    .isLength({ min: VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH, max: VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH })
    .withMessage(`Company name must be between ${VALIDATION.TRANSACTION.MIN_DESCRIPTION_LENGTH} and ${VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH} characters`),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description must be maximum ${VALIDATION.TRANSACTION.MAX_DESCRIPTION_LENGTH} characters`),

  handleValidationErrors
];

/**
 * Validation rules for PDF upload
 * @example
 * app.post('/api/pdf/upload', validatePdfUpload, uploadHandler);
 */
export const validatePdfUpload = [
  body('companyId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: VALIDATION.TRANSACTION.MIN_COMPANY_ID_LENGTH, max: VALIDATION.TRANSACTION.MAX_COMPANY_ID_LENGTH })
    .withMessage(`Company ID must be a non-empty string with maximum ${VALIDATION.TRANSACTION.MAX_COMPANY_ID_LENGTH} characters`),

  handleValidationErrors
];

/**
 * Validation rules for date range queries
 * @example
 * app.get('/api/reports', validateDateRange, generateReport);
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
 * Validation rules for pagination parameters
 * @example
 * app.get('/api/transactions', validatePagination, getTransactions);
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: VALIDATION.PAGINATION.MIN_LIMIT })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: VALIDATION.PAGINATION.MIN_LIMIT, max: VALIDATION.PAGINATION.MAX_LIMIT })
    .withMessage(`Limit must be between ${VALIDATION.PAGINATION.MIN_LIMIT} and ${VALIDATION.PAGINATION.MAX_LIMIT}`),

  handleValidationErrors
];

/**
 * Validation rules for transaction filtering
 * @example
 * app.get('/api/transactions', validateTransactionFilters, getTransactions);
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
    .isLength({ max: VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH })
    .withMessage(`Search term must be maximum ${VALIDATION.TRANSACTION.MAX_CATEGORY_LENGTH} characters`),

  handleValidationErrors
];

/**
 * Validation for ID parameters (Firestore document IDs)
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Array} Validation chain
 * @example
 * app.get('/api/transactions/:id', validateObjectId('id'), getTransaction);
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isString()
    .isLength({ min: 1 })
    .withMessage(`${paramName} is required and must be a valid identifier`),

  handleValidationErrors
];

/**
 * Validation for report parameters (year, quarter, month)
 * @example
 * app.get('/api/reports/annual', validateReportParams, generateAnnualReport);
 */
export const validateReportParams = [
  query('year')
    .optional()
    .isInt({ min: VALIDATION.DATE.MIN_YEAR, max: VALIDATION.DATE.MAX_YEAR })
    .withMessage(`Year must be between ${VALIDATION.DATE.MIN_YEAR} and ${VALIDATION.DATE.MAX_YEAR}`),
  
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
 * Sanitization middleware to clean input data and prevent XSS
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 * @example
 * app.use(sanitizeInput); // Sanitize all requests
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
