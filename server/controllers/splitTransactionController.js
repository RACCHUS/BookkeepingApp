/**
 * Split Transaction Controller
 * 
 * Handles HTTP requests for transaction splitting operations
 */

import { validationResult, body, param } from 'express-validator';
import splitTransactionService from '../services/splitTransactionService.js';
import { logger } from '../utils/index.js';

/**
 * Validation middleware for split transaction
 */
export const splitTransactionValidation = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
  body('splitParts').isArray({ min: 1 }).withMessage('At least one split part is required'),
  body('splitParts.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Each split part must have a positive amount'),
  body('splitParts.*.category')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Each split part must have a category'),
  body('splitParts.*.subcategory').optional().isString(),
  body('splitParts.*.description').optional().isString(),
  body('splitParts.*.vendorName').optional().isString(),
  body('splitParts.*.notes').optional().isString()
];

/**
 * Validation middleware for bulk split
 */
export const bulkSplitValidation = [
  body('splits').isArray({ min: 1 }).withMessage('At least one split operation is required'),
  body('splits.*.transactionId').isUUID().withMessage('Each split must have a valid transaction ID'),
  body('splits.*.splitParts').isArray({ min: 1 }).withMessage('Each split must have at least one split part'),
  body('splits.*.splitParts.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Each split part must have a positive amount'),
  body('splits.*.splitParts.*.category')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Each split part must have a category')
];

/**
 * Split a single transaction
 * POST /api/transactions/:id/split
 */
export const splitTransaction = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id: transactionId } = req.params;
    const { uid: userId } = req.user;
    const { splitParts } = req.body;

    logger.info(`Splitting transaction ${transactionId} into ${splitParts.length} parts`);

    const result = await splitTransactionService.splitTransaction(
      userId,
      transactionId,
      splitParts
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Transaction split into ${result.splitTransactions.length} parts`,
      originalTransaction: result.originalTransaction,
      splitTransactions: result.splitTransactions,
      summary: result.summary
    });

  } catch (error) {
    logger.error('Split transaction controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to split transaction',
      message: error.message
    });
  }
};

/**
 * Bulk split multiple transactions
 * POST /api/transactions/bulk-split
 */
export const bulkSplitTransactions = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { splits } = req.body;

    logger.info(`Bulk splitting ${splits.length} transactions`);

    const result = await splitTransactionService.bulkSplitTransactions(userId, splits);

    res.json({
      success: result.success,
      message: result.message,
      successCount: result.successCount,
      errorCount: result.errorCount,
      results: result.results
    });

  } catch (error) {
    logger.error('Bulk split controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk split transactions',
      message: error.message
    });
  }
};

/**
 * Unsplit a transaction (merge back)
 * POST /api/transactions/:id/unsplit
 */
export const unsplitTransaction = async (req, res) => {
  try {
    const { id: transactionId } = req.params;
    const { uid: userId } = req.user;

    // Validate transaction ID
    if (!transactionId || transactionId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
    }

    logger.info(`Unsplitting transaction ${transactionId}`);

    const result = await splitTransactionService.unsplitTransaction(userId, transactionId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Transaction unsplit, ${result.deletedCount} parts merged back`,
      transaction: result.transaction,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('Unsplit transaction controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsplit transaction',
      message: error.message
    });
  }
};

/**
 * Get split parts for a transaction
 * GET /api/transactions/:id/split-parts
 */
export const getSplitParts = async (req, res) => {
  try {
    const { id: transactionId } = req.params;
    const { uid: userId } = req.user;

    // Validate transaction ID
    if (!transactionId || transactionId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
    }

    const result = await splitTransactionService.getSplitParts(userId, transactionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      original: result.original,
      parts: result.parts,
      totalParts: result.totalParts
    });

  } catch (error) {
    logger.error('Get split parts controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get split parts',
      message: error.message
    });
  }
};

export default {
  splitTransaction,
  bulkSplitTransactions,
  unsplitTransaction,
  getSplitParts,
  splitTransactionValidation,
  bulkSplitValidation
};
