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
  getCategoryStats
} from '../controllers/transactionController.js';

const router = express.Router();

// Validation middleware
const createTransactionValidation = [
  body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('description').isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
  body('category').isLength({ min: 1 }).withMessage('Category is required'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
  body('sectionCode').optional().isIn(['deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized']).withMessage('Section code must be valid')
];

const updateTransactionValidation = [
  param('id').isLength({ min: 1 }).withMessage('Transaction ID is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('description').optional().isLength({ min: 1, max: 500 }).withMessage('Description must be less than 500 characters'),
  body('category').optional().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('type').optional().isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
  body('sectionCode').optional().isIn(['deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized']).withMessage('Section code must be valid')
];

const getTransactionsValidation = [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
];

// Routes
router.get('/', getTransactionsValidation, getTransactions);
router.get('/summary', getTransactionSummary);
router.get('/stats', getCategoryStats);
router.get('/:id', getTransactionById);
router.post('/', createTransactionValidation, createTransaction);
router.post('/classify', getClassificationSuggestions);
router.post('/bulk-categorize', bulkUpdateCategories);
router.put('/:id', updateTransactionValidation, updateTransaction);
router.delete('/:id', deleteTransaction);
router.patch('/bulk', bulkUpdateTransactions);

export default router;
