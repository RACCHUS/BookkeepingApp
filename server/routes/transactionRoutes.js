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

const router = express.Router();

// Apply rate limiting to all transaction routes
router.use(apiRateLimit);

// Validation schemas
const createTransactionValidation = [
  body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('description').isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
  body('category').isLength({ min: 1 }).withMessage('Category is required'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
  body('sectionCode').optional().isIn(['deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized']).withMessage('Section code must be valid'),
  handleValidationErrors
];

const updateTransactionValidation = [
  param('id').isLength({ min: 1 }).withMessage('Transaction ID is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('description').optional().isLength({ min: 1, max: 500 }).withMessage('Description must be less than 500 characters'),
  body('category').optional().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('type').optional().isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
  body('sectionCode').optional().isIn(['deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized']).withMessage('Section code must be valid'),
  handleValidationErrors
];

const getTransactionsValidation = [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('orderBy').optional().isIn(['date', 'amount', 'description', 'category', 'type', 'payee', 'sectionCode', 'createdAt', 'updatedAt']).withMessage('OrderBy must be a valid field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const bulkOperationValidation = [
  body('transactions').isArray({ min: 1 }).withMessage('Transactions must be a non-empty array'),
  body('transactions.*.id').isLength({ min: 1 }).withMessage('Each transaction must have an ID'),
  requestSizeLimit('1mb'),
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
  requestSizeLimit('500kb'),
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
  bulkOperationValidation,
  body('payeeId').isLength({ min: 1 }).withMessage('Payee ID is required'),
  handleValidationErrors,
  bulkAssignPayeeToTransactions
);

export default router;
