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
import { 
  CLASSIFICATION_CONSTANTS, 
  COMMON_VALIDATION, 
  REQUEST_LIMITS 
} from './routeConstants.js';

const router = express.Router();

// Apply rate limiting to all classification routes
router.use(apiRateLimit);

// Validation schemas
const classifyTransactionValidation = [
  body('transactions')
    .isArray({ min: CLASSIFICATION_CONSTANTS.LIMITS.TRANSACTIONS_ARRAY_MIN })
    .withMessage(`Transactions ${COMMON_VALIDATION.ARRAY_MESSAGE}`),
  body('transactions.*.description')
    .isLength({ min: CLASSIFICATION_CONSTANTS.LIMITS.DESCRIPTION_MIN })
    .withMessage('Transaction description is required'),
  body('transactions.*.amount')
    .optional()
    .isNumeric()
    .withMessage(`Amount ${COMMON_VALIDATION.NUMERIC_MESSAGE}`),
  requestSizeLimit(CLASSIFICATION_CONSTANTS.SIZE_LIMITS.CLASSIFY),
  handleValidationErrors
];

const createRuleValidation = [
  body('name')
    .isLength({ 
      min: CLASSIFICATION_CONSTANTS.LIMITS.RULE_NAME_MIN, 
      max: CLASSIFICATION_CONSTANTS.LIMITS.RULE_NAME_MAX 
    })
    .withMessage(`Rule name is required and must be less than ${CLASSIFICATION_CONSTANTS.LIMITS.RULE_NAME_MAX} characters`),
  body('keywords')
    .isArray({ min: CLASSIFICATION_CONSTANTS.LIMITS.KEYWORDS_ARRAY_MIN })
    .withMessage(`Keywords ${COMMON_VALIDATION.ARRAY_MESSAGE}`),
  body('category')
    .isLength({ min: CLASSIFICATION_CONSTANTS.LIMITS.CATEGORY_MIN })
    .withMessage('Category is required'),
  body('subcategory')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Subcategory cannot be empty'),
  body('priority')
    .optional()
    .isInt({ 
      min: CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MIN, 
      max: CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MAX 
    })
    .withMessage(`Priority must be between ${CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MIN} and ${CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MAX}`),
  handleValidationErrors
];

const updateRuleValidation = [
  param('id').isLength({ min: 1 }).withMessage(`Rule ${COMMON_VALIDATION.OBJECT_ID_MESSAGE}`),
  body('name')
    .optional()
    .isLength({ 
      min: CLASSIFICATION_CONSTANTS.LIMITS.RULE_NAME_MIN, 
      max: CLASSIFICATION_CONSTANTS.LIMITS.RULE_NAME_MAX 
    })
    .withMessage(`Rule name must be less than ${CLASSIFICATION_CONSTANTS.LIMITS.RULE_NAME_MAX} characters`),
  body('keywords')
    .optional()
    .isArray({ min: CLASSIFICATION_CONSTANTS.LIMITS.KEYWORDS_ARRAY_MIN })
    .withMessage(`Keywords ${COMMON_VALIDATION.ARRAY_MESSAGE}`),
  body('category')
    .optional()
    .isLength({ min: CLASSIFICATION_CONSTANTS.LIMITS.CATEGORY_MIN })
    .withMessage('Category cannot be empty'),
  body('subcategory')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Subcategory cannot be empty'),
  body('priority')
    .optional()
    .isInt({ 
      min: CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MIN, 
      max: CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MAX 
    })
    .withMessage(`Priority must be between ${CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MIN} and ${CLASSIFICATION_CONSTANTS.LIMITS.PRIORITY_MAX}`),
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
