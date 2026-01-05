/**
 * @fileoverview Receipt Routes
 * @description API routes for receipt management
 * @version 1.0.0
 */

import express from 'express';
import multer from 'multer';
import authMiddleware from '../middlewares/authMiddleware.js';
import { apiRateLimit, uploadRateLimit } from '../middlewares/index.js';
import {
  validateReceiptCreate,
  validateReceiptUpdate,
  validateReceiptFilters,
  validateBatchUpdate,
  validateBatchDelete,
  validateAttachment,
  validateReceiptId
} from '../middlewares/receiptValidation.js';
import {
  createReceipt,
  listReceipts,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  batchUpdateReceipts,
  batchDeleteReceipts,
  attachToTransaction,
  detachFromTransaction,
  uploadReceiptImage,
  deleteReceiptImage,
  getReceiptStats,
  cleanupExpiredReceipts,
  bulkCreateFromTransactions,
  bulkCreate,
  bulkLinkToTransaction,
  bulkUnlinkFromTransactions,
  linkToMultipleTransactions,
  addTransactionLink,
  removeTransactionLink
} from '../controllers/receiptController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, PDF'), false);
    }
  }
});

// Apply rate limiting to all receipt routes
router.use(apiRateLimit);

// ============================================
// RECEIPT CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/receipts
 * @desc    Create a new receipt (with optional image upload)
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  upload.single('image'),
  validateReceiptCreate,
  createReceipt
);

/**
 * @route   GET /api/receipts
 * @desc    List all receipts with filters, sorting, pagination
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  validateReceiptFilters,
  listReceipts
);

/**
 * @route   GET /api/receipts/stats
 * @desc    Get receipt statistics for user
 * @access  Private
 */
router.get(
  '/stats',
  authMiddleware,
  getReceiptStats
);

/**
 * @route   POST /api/receipts/bulk-from-transactions
 * @desc    Bulk create receipts from transactions
 * @access  Private
 */
router.post(
  '/bulk-from-transactions',
  authMiddleware,
  bulkCreateFromTransactions
);

/**
 * @route   POST /api/receipts/bulk
 * @desc    Bulk create receipts with automatic transaction creation (PRIMARY use case)
 * @access  Private
 */
router.post(
  '/bulk',
  authMiddleware,
  bulkCreate
);

/**
 * @route   GET /api/receipts/:id
 * @desc    Get receipt by ID
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  validateReceiptId,
  getReceiptById
);

/**
 * @route   PUT /api/receipts/:id
 * @desc    Update receipt
 * @access  Private
 */
router.put(
  '/:id',
  authMiddleware,
  validateReceiptUpdate,
  updateReceipt
);

/**
 * @route   DELETE /api/receipts/:id
 * @desc    Delete receipt (and associated image)
 * @access  Private
 */
router.delete(
  '/:id',
  authMiddleware,
  validateReceiptId,
  deleteReceipt
);

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * @route   PUT /api/receipts/batch
 * @desc    Batch update multiple receipts
 * @access  Private
 */
router.put(
  '/batch',
  authMiddleware,
  validateBatchUpdate,
  batchUpdateReceipts
);

/**
 * @route   DELETE /api/receipts/batch
 * @desc    Batch delete multiple receipts
 * @access  Private
 */
router.delete(
  '/batch',
  authMiddleware,
  validateBatchDelete,
  batchDeleteReceipts
);

// ============================================
// TRANSACTION LINKING
// ============================================

/**
 * @route   POST /api/receipts/:id/attach
 * @desc    Attach receipt to a transaction
 * @access  Private
 */
router.post(
  '/:id/attach',
  authMiddleware,
  validateAttachment,
  attachToTransaction
);

/**
 * @route   POST /api/receipts/:id/detach
 * @desc    Detach receipt from transaction
 * @access  Private
 */
router.post(
  '/:id/detach',
  authMiddleware,
  validateReceiptId,
  detachFromTransaction
);

/**
 * @route   POST /api/receipts/bulk-link
 * @desc    Bulk link multiple receipts to a single transaction
 * @access  Private
 */
router.post(
  '/bulk-link',
  authMiddleware,
  bulkLinkToTransaction
);

/**
 * @route   POST /api/receipts/bulk-unlink
 * @desc    Bulk unlink multiple receipts from their transactions
 * @access  Private
 */
router.post(
  '/bulk-unlink',
  authMiddleware,
  bulkUnlinkFromTransactions
);

/**
 * @route   POST /api/receipts/:id/link-multiple
 * @desc    Link a single receipt to multiple transactions
 * @access  Private
 */
router.post(
  '/:id/link-multiple',
  authMiddleware,
  validateReceiptId,
  linkToMultipleTransactions
);

/**
 * @route   POST /api/receipts/:id/add-link/:transactionId
 * @desc    Add a transaction link to receipt (multi-transaction support)
 * @access  Private
 */
router.post(
  '/:id/add-link/:transactionId',
  authMiddleware,
  validateReceiptId,
  addTransactionLink
);

/**
 * @route   DELETE /api/receipts/:id/remove-link/:transactionId
 * @desc    Remove a transaction link from receipt
 * @access  Private
 */
router.delete(
  '/:id/remove-link/:transactionId',
  authMiddleware,
  validateReceiptId,
  removeTransactionLink
);

// ============================================
// IMAGE MANAGEMENT
// ============================================

/**
 * @route   POST /api/receipts/:id/upload
 * @desc    Upload or replace image for existing receipt
 * @access  Private
 */
router.post(
  '/:id/upload',
  authMiddleware,
  uploadRateLimit,
  upload.single('image'),
  validateReceiptId,
  uploadReceiptImage
);

/**
 * @route   DELETE /api/receipts/:id/image
 * @desc    Delete image from receipt (keep receipt record)
 * @access  Private
 */
router.delete(
  '/:id/image',
  authMiddleware,
  validateReceiptId,
  deleteReceiptImage
);

// ============================================
// ADMIN/MAINTENANCE
// ============================================

/**
 * @route   POST /api/receipts/cleanup
 * @desc    Trigger cleanup of expired receipts (2+ years old)
 * @access  Private (should be admin-only in production)
 */
router.post(
  '/cleanup',
  authMiddleware,
  cleanupExpiredReceipts
);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 5MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: error.message
    });
  }
  
  if (error.message?.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_TYPE',
      message: 'Allowed file types: JPG, PNG, GIF, PDF'
    });
  }
  
  next(error);
});

export default router;
