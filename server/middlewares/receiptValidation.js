/**
 * @fileoverview Receipt Validation Middleware
 * @description Express-validator rules for receipt endpoints
 * @version 1.0.0
 */

import { body, query, param } from 'express-validator';
import { handleValidationErrors } from './validationMiddleware.js';

/**
 * Valid sort fields for receipt listing
 */
const VALID_SORT_FIELDS = ['date', 'amount', 'vendor', 'createdAt', 'updatedAt'];

/**
 * Valid sort orders
 */
const VALID_SORT_ORDERS = ['asc', 'desc'];

/**
 * Validation for creating a receipt
 * All fields are optional except userId (from auth)
 */
export const validateReceiptCreate = [
  body('vendor')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Vendor name must be less than 200 characters')
    .trim(),
  
  body('amount')
    .optional()
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error('Amount must be a valid number');
      return true;
    }),
  
  body('date')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) {
        throw new Error('Date is not valid');
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
    .trim(),
  
  body('companyId')
    .optional()
    .isString()
    .trim(),
  
  body('transactionId')
    .optional()
    .isString()
    .trim(),
  
  handleValidationErrors
];

/**
 * Validation for updating a receipt
 * Same as create - all fields optional
 */
export const validateReceiptUpdate = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Receipt ID is required'),
  
  body('vendor')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Vendor name must be less than 200 characters')
    .trim(),
  
  body('amount')
    .optional()
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error('Amount must be a valid number');
      return true;
    }),
  
  body('date')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) {
        throw new Error('Date is not valid');
      }
      return true;
    }),
  
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
    .trim(),
  
  body('companyId')
    .optional()
    .isString()
    .trim(),
  
  handleValidationErrors
];

/**
 * Validation for receipt list filters
 */
export const validateReceiptFilters = [
  query('startDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error('startDate must be in YYYY-MM-DD format');
      }
      return true;
    }),
  
  query('endDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error('endDate must be in YYYY-MM-DD format');
      }
      return true;
    }),
  
  query('vendor')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .trim(),
  
  query('companyId')
    .optional()
    .isString()
    .trim(),
  
  query('hasImage')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('hasImage must be true or false'),
  
  query('hasTransaction')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('hasTransaction must be true or false'),
  
  query('sortBy')
    .optional()
    .isIn(VALID_SORT_FIELDS)
    .withMessage(`sortBy must be one of: ${VALID_SORT_FIELDS.join(', ')}`),
  
  query('sortOrder')
    .optional()
    .isIn(VALID_SORT_ORDERS)
    .withMessage('sortOrder must be asc or desc'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be 0 or greater')
    .toInt(),
  
  handleValidationErrors
];

/**
 * Validation for batch update
 */
export const validateBatchUpdate = [
  body('receiptIds')
    .isArray({ min: 1 })
    .withMessage('receiptIds must be a non-empty array'),
  
  body('receiptIds.*')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Each receiptId must be a non-empty string'),
  
  body('updates')
    .isObject()
    .withMessage('updates must be an object'),
  
  body('updates.vendor')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .trim(),
  
  body('updates.date')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  
  body('updates.companyId')
    .optional()
    .isString()
    .trim(),
  
  body('updates.notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .trim(),
  
  handleValidationErrors
];

/**
 * Validation for batch delete
 */
export const validateBatchDelete = [
  body('receiptIds')
    .isArray({ min: 1 })
    .withMessage('receiptIds must be a non-empty array'),
  
  body('receiptIds.*')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Each receiptId must be a non-empty string'),
  
  handleValidationErrors
];

/**
 * Validation for attaching receipt to transaction
 */
export const validateAttachment = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Receipt ID is required'),
  
  body('transactionId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Transaction ID is required'),
  
  handleValidationErrors
];

/**
 * Validation for receipt ID parameter
 */
export const validateReceiptId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Receipt ID is required'),
  
  handleValidationErrors
];

export default {
  validateReceiptCreate,
  validateReceiptUpdate,
  validateReceiptFilters,
  validateBatchUpdate,
  validateBatchDelete,
  validateAttachment,
  validateReceiptId
};
