import express from 'express';
import { body, param } from 'express-validator';
import {
  classifyTransaction,
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  getUncategorizedTransactions
} from '../controllers/classificationController.js';
import { 
  handleValidationErrors,
  validateObjectId,
  requestSizeLimit,
  apiRateLimit
} from '../middlewares/index.js';

const router = express.Router();

// Apply rate limiting to all classification routes
router.use(apiRateLimit);

// Validation schemas
const classifyTransactionValidation = [
  body('transactions').isArray({ min: 1 }).withMessage('Transactions array is required'),
  body('transactions.*.description').isLength({ min: 1 }).withMessage('Transaction description is required'),
  body('transactions.*.amount').optional().isNumeric().withMessage('Amount must be numeric'),
  requestSizeLimit('500kb'),
  handleValidationErrors
];

const createRuleValidation = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Rule name is required and must be less than 100 characters'),
  body('keywords').isArray({ min: 1 }).withMessage('Keywords array is required'),
  body('category').isLength({ min: 1 }).withMessage('Category is required'),
  body('subcategory').optional().isLength({ min: 1 }).withMessage('Subcategory cannot be empty'),
  body('priority').optional().isInt({ min: 1, max: 100 }).withMessage('Priority must be between 1 and 100'),
  handleValidationErrors
];

const updateRuleValidation = [
  param('id').isLength({ min: 1 }).withMessage('Rule ID is required'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Rule name must be less than 100 characters'),
  body('keywords').optional().isArray({ min: 1 }).withMessage('Keywords must be a non-empty array'),
  body('category').optional().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('subcategory').optional().isLength({ min: 1 }).withMessage('Subcategory cannot be empty'),
  body('priority').optional().isInt({ min: 1, max: 100 }).withMessage('Priority must be between 1 and 100'),
  handleValidationErrors
];

// Enhanced Classification Routes with comprehensive validation

/**
 * @route POST /api/classification/classify
 * @desc Classify transactions using rules
 * @access Private
 */
router.post('/classify', classifyTransactionValidation, classifyTransaction);

/**
 * @route GET /api/classification/rules
 * @desc Get all classification rules
 * @access Private
 */
router.get('/rules', getClassificationRules);

/**
 * @route POST /api/classification/rules
 * @desc Create new classification rule
 * @access Private
 */
router.post('/rules', createRuleValidation, createClassificationRule);

/**
 * @route PUT /api/classification/rules/:id
 * @desc Update classification rule
 * @access Private
 */
router.put('/rules/:id', validateObjectId('id'), updateRuleValidation, updateClassificationRule);

/**
 * @route DELETE /api/classification/rules/:id
 * @desc Delete classification rule
 * @access Private
 */
router.delete('/rules/:id', validateObjectId('id'), deleteClassificationRule);

/**
 * @route GET /api/classification/uncategorized
 * @desc Get transactions that need classification
 * @access Private
 */
router.get('/uncategorized', getUncategorizedTransactions);

export default router;
