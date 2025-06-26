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

const router = express.Router();

// Validation middleware
const createTransactionValidation = [
  body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('description').isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
  body('category').isLength({ min: 1 }).withMessage('Category is required'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer')
];

const updateTransactionValidation = [
  param('id').isLength({ min: 1 }).withMessage('Transaction ID is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('description').optional().isLength({ min: 1, max: 500 }).withMessage('Description must be less than 500 characters'),
  body('category').optional().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('type').optional().isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer')
];

const queryValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('orderBy').optional().isIn(['date', 'amount', 'description', 'category']).withMessage('OrderBy must be date, amount, description, or category'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
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
