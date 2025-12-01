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
  getClassificationSuggestions,
  bulkUpdateCategories,
  getCategoryStats,
  assignPayeeToTransaction,
  bulkAssignPayeeToTransactions
} from '../controllers/transactionController.js';
import { 
  handleValidationErrors,
  validateObjectId,
  requestSizeLimit,
  apiRateLimit
} from '../middlewares/index.js';
import { 
  TRANSACTION_CONSTANTS, 
  COMMON_VALIDATION, 
  REQUEST_LIMITS 
} from './routeConstants.js';

const router = express.Router();

// Apply rate limiting to all transaction routes
router.use(apiRateLimit);

// Validation schemas
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
    .withMessage(`Type must be one of: ${TRANSACTION_CONSTANTS.TYPES.join(', ')}`),
  body('sectionCode')
    .optional()
    .isIn(TRANSACTION_CONSTANTS.SECTION_CODES)
    .withMessage(`Section code must be one of: ${TRANSACTION_CONSTANTS.SECTION_CODES.join(', ')}`),
  handleValidationErrors
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
    .withMessage(`Type must be one of: ${TRANSACTION_CONSTANTS.TYPES.join(', ')}`),
  body('sectionCode')
    .optional()
    .isIn(TRANSACTION_CONSTANTS.SECTION_CODES)
    .withMessage(`Section code must be one of: ${TRANSACTION_CONSTANTS.SECTION_CODES.join(', ')}`),
  handleValidationErrors
];

const getTransactionsValidation = [
  query('limit')
    .optional()
    .isInt({ 
      min: TRANSACTION_CONSTANTS.LIMITS.QUERY_LIMIT_MIN, 
      max: TRANSACTION_CONSTANTS.LIMITS.QUERY_LIMIT_MAX 
    })
    .withMessage(`Limit must be between ${TRANSACTION_CONSTANTS.LIMITS.QUERY_LIMIT_MIN} and ${TRANSACTION_CONSTANTS.LIMITS.QUERY_LIMIT_MAX}`),
  query('offset')
    .optional()
    .isInt({ min: TRANSACTION_CONSTANTS.LIMITS.QUERY_OFFSET_MIN })
    .withMessage(`Offset must be ${TRANSACTION_CONSTANTS.LIMITS.QUERY_OFFSET_MIN} or greater`),
  query('startDate').optional().isISO8601().withMessage(`Start date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  query('endDate').optional().isISO8601().withMessage(`End date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  query('orderBy')
    .optional()
    .isIn(TRANSACTION_CONSTANTS.ORDER_BY_FIELDS)
    .withMessage(`OrderBy must be one of: ${TRANSACTION_CONSTANTS.ORDER_BY_FIELDS.join(', ')}`),
  query('order')
    .optional()
    .isIn(TRANSACTION_CONSTANTS.SORT_ORDERS)
    .withMessage(`Order must be one of: ${TRANSACTION_CONSTANTS.SORT_ORDERS.join(', ')}`),
  handleValidationErrors
];

const bulkOperationValidation = [
  body('transactions')
    .isArray({ min: TRANSACTION_CONSTANTS.LIMITS.BULK_ARRAY_MIN })
    .withMessage(`Transactions ${COMMON_VALIDATION.ARRAY_MESSAGE}`),
  body('transactions.*.id')
    .isLength({ min: 1 })
    .withMessage('Each transaction must have an ID'),
  requestSizeLimit(REQUEST_LIMITS.SIZE.MEDIUM),
  handleValidationErrors
];

// Enhanced Transaction Routes with comprehensive validation

/**
 * @route GET /api/transactions
 * @desc Get transactions with filtering and pagination
 * @access Private
 */
router.get('/', getTransactionsValidation, getTransactions);

/**
 * @route GET /api/transactions/summary
 * @desc Get transaction summary statistics
 * @access Private
 */
router.get('/summary', getTransactionSummary);

/**
 * @route GET /api/transactions/stats
 * @desc Get category statistics
 * @access Private
 */
router.get('/stats', getCategoryStats);

/**
 * @route GET /api/transactions/:id
 * @desc Get specific transaction by ID
 * @access Private
 */
router.get('/:id', validateObjectId('id'), getTransactionById);

/**
 * @route POST /api/transactions
 * @desc Create new transaction
 * @access Private
 */
router.post('/', createTransactionValidation, createTransaction);

/**
 * @route POST /api/transactions/classify
 * @desc Get classification suggestions for transactions
 * @access Private
 */
router.post('/classify', 
  requestSizeLimit(REQUEST_LIMITS.SIZE.SMALL),
  getClassificationSuggestions
);

/**
 * @route POST /api/transactions/bulk-categorize
 * @desc Bulk update transaction categories
 * @access Private
 */
router.post('/bulk-categorize', 
  bulkOperationValidation,
  bulkUpdateCategories
);

/**
 * @route PUT /api/transactions/:id
 * @desc Update specific transaction
 * @access Private
 */
router.put('/:id', updateTransactionValidation, updateTransaction);

/**
 * @route DELETE /api/transactions/:id
 * @desc Delete specific transaction
 * @access Private
 */
router.delete('/:id', validateObjectId('id'), deleteTransaction);

/**
 * @route PATCH /api/transactions/bulk
 * @desc Bulk update transactions
 * @access Private
 */
router.patch('/bulk', bulkOperationValidation, bulkUpdateTransactions);

/**
 * @route PATCH /api/transactions/:id/assign-payee
 * @desc Assign payee to transaction
 * @access Private
 */
router.patch('/:id/assign-payee', 
  validateObjectId('id'),
  body('payeeId').isLength({ min: 1 }).withMessage('Payee ID is required'),
  handleValidationErrors,
  assignPayeeToTransaction
);

/**
 * @route PATCH /api/transactions/bulk-assign-payee
 * @desc Bulk assign payee to transactions
 * @access Private
 */
router.patch('/bulk-assign-payee', 
  body('transactionIds').isArray({ min: 1 }).withMessage('transactionIds must be a non-empty array'),
  body('payeeId').isString().notEmpty().withMessage('payeeId is required and must be a string'),
  body('payeeName').optional({ checkFalsy: true }).isString().withMessage('payeeName must be a string'),
  handleValidationErrors,
  bulkAssignPayeeToTransactions
);

export default router;
