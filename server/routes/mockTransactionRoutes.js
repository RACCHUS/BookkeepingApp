import express from 'express';
import { body, query, param } from 'express-validator';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
  bulkUpdateTransactions,
  getTransactionSummary,
  testTransactionStructure,
  debugGetAllTransactions
} from '../controllers/mockTransactionController.js';
import { 
  TRANSACTION_CONSTANTS, 
  COMMON_VALIDATION 
} from './routeConstants.js';

const router = express.Router();

/**
 * Mock Transaction Routes
 * 
 * These routes use a simplified in-memory data store for testing
 * and development purposes. Validation mirrors production routes
 * but operates on mock data.
 */

// Validation middleware
const createTransactionValidation = [
  body('date').isISO8601().withMessage(`Date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  body('amount').isNumeric().withMessage(`Amount ${COMMON_VALIDATION.NUMERIC_MESSAGE}`),
  body('description')
    .isLength({ 
      min: TRANSACTION_CONSTANTS.LIMITS.DESCRIPTION_MIN, 
      max: TRANSACTION_CONSTANTS.LIMITS.DESCRIPTION_MAX 
    })
    .withMessage(`Description is required and must be less than ${TRANSACTION_CONSTANTS.LIMITS.DESCRIPTION_MAX} characters`),
  body('category')
    .isLength({ min: TRANSACTION_CONSTANTS.LIMITS.CATEGORY_MIN })
    .withMessage('Category is required'),
  body('type')
    .isIn(TRANSACTION_CONSTANTS.TYPES)
    .withMessage(`Type must be one of: ${TRANSACTION_CONSTANTS.TYPES.join(', ')}`)
];

const updateTransactionValidation = [
  param('id').isLength({ min: 1 }).withMessage(`Transaction ${COMMON_VALIDATION.OBJECT_ID_MESSAGE}`),
  body('date').optional().isISO8601().withMessage(`Date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  body('amount').optional().isNumeric().withMessage(`Amount ${COMMON_VALIDATION.NUMERIC_MESSAGE}`),
  body('description')
    .optional()
    .isLength({ 
      min: TRANSACTION_CONSTANTS.LIMITS.DESCRIPTION_MIN, 
      max: TRANSACTION_CONSTANTS.LIMITS.DESCRIPTION_MAX 
    })
    .withMessage(`Description must be less than ${TRANSACTION_CONSTANTS.LIMITS.DESCRIPTION_MAX} characters`),
  body('category')
    .optional()
    .isLength({ min: TRANSACTION_CONSTANTS.LIMITS.CATEGORY_MIN })
    .withMessage('Category cannot be empty'),
  body('type')
    .optional()
    .isIn(TRANSACTION_CONSTANTS.TYPES)
    .withMessage(`Type must be one of: ${TRANSACTION_CONSTANTS.TYPES.join(', ')}`)
];

const queryValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: TRANSACTION_CONSTANTS.LIMITS.QUERY_OFFSET_MIN })
    .withMessage(`Offset must be ${TRANSACTION_CONSTANTS.LIMITS.QUERY_OFFSET_MIN} or greater`),
  query('startDate').optional().isISO8601().withMessage(`Start date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  query('endDate').optional().isISO8601().withMessage(`End date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  query('orderBy')
    .optional()
    .isIn(['date', 'amount', 'description', 'category'])
    .withMessage('OrderBy must be date, amount, description, or category'),
  query('order')
    .optional()
    .isIn(TRANSACTION_CONSTANTS.SORT_ORDERS)
    .withMessage(`Order must be one of: ${TRANSACTION_CONSTANTS.SORT_ORDERS.join(', ')}`)
];

// Routes
// GET /api/transactions/debug - Debug endpoint for comparing transactions
router.get('/debug', debugGetAllTransactions);

// GET /api/transactions/test - Test endpoint for debugging
router.get('/test', testTransactionStructure);

// GET /api/transactions - Get all transactions for user
router.get('/', queryValidation, getTransactions);

// GET /api/transactions/summary - Get transaction summary
router.get('/summary', getTransactionSummary);

// GET /api/transactions/:id - Get specific transaction
router.get('/:id', param('id').isLength({ min: 1 }).withMessage('Transaction ID is required'), getTransactionById);

// POST /api/transactions - Create new transaction
router.post('/', createTransactionValidation, createTransaction);

// PUT /api/transactions/:id - Update existing transaction
router.put('/:id', updateTransactionValidation, updateTransaction);

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', param('id').isLength({ min: 1 }).withMessage('Transaction ID is required'), deleteTransaction);

// POST /api/transactions/bulk-update - Bulk update transactions
router.post('/bulk-update', bulkUpdateTransactions);

export default router;
