/**
 * @fileoverview Receipt Controller - API endpoints for receipt management
 * @description Handles HTTP requests for receipt CRUD, batch operations, and file uploads
 * @version 1.0.0
 */

import { validationResult } from 'express-validator';
import receiptService from '../services/receiptService.js';
import { logger } from '../config/index.js';

/**
 * Create a new receipt
 * POST /api/receipts
 */
export const createReceipt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const receiptData = req.body;
    const file = req.file || null;

    const receipt = await receiptService.createReceipt(userId, receiptData, file);

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'Receipt created successfully'
    });
  } catch (error) {
    logger.error('Error creating receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create receipt',
      message: error.message
    });
  }
};

/**
 * Get all receipts for user with filters
 * GET /api/receipts
 */
export const listReceipts = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    
    // Parse query parameters
    const filters = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      vendor: req.query.vendor || null,
      companyId: req.query.companyId || null,
      hasImage: req.query.hasImage !== undefined ? req.query.hasImage === 'true' : undefined,
      hasTransaction: req.query.hasTransaction !== undefined ? req.query.hasTransaction === 'true' : undefined
    };

    const sort = {
      field: req.query.sortBy || 'createdAt',
      order: req.query.sortOrder || 'desc'
    };

    const pagination = {
      limit: parseInt(req.query.limit) || 25,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await receiptService.getReceiptsForUser(userId, filters, sort, pagination);

    res.json({
      success: true,
      data: result.receipts,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    logger.error('Error listing receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list receipts',
      message: error.message
    });
  }
};

/**
 * Get receipt by ID
 * GET /api/receipts/:id
 */
export const getReceiptById = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;

    const receipt = await receiptService.getReceiptById(userId, id);

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    logger.error(`Error getting receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'RECEIPT_NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Update receipt
 * PUT /api/receipts/:id
 */
export const updateReceipt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const receipt = await receiptService.updateReceipt(userId, id, updates);

    res.json({
      success: true,
      data: receipt,
      message: 'Receipt updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : error.message.includes('Validation') ? 400 
      : 500;

    res.status(status).json({
      success: false,
      error: 'Failed to update receipt',
      message: error.message
    });
  }
};

/**
 * Delete receipt
 * DELETE /api/receipts/:id
 */
export const deleteReceipt = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;

    await receiptService.deleteReceipt(userId, id);

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'RECEIPT_NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Batch update receipts
 * PUT /api/receipts/batch
 */
export const batchUpdateReceipts = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { receiptIds, updates } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'receiptIds must be a non-empty array'
      });
    }

    const result = await receiptService.batchUpdateReceipts(userId, receiptIds, updates);

    // Return 207 Multi-Status if some failed
    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Updated ${result.successful.length} receipts${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error batch updating receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch update receipts',
      message: error.message
    });
  }
};

/**
 * Batch delete receipts
 * DELETE /api/receipts/batch
 */
export const batchDeleteReceipts = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { receiptIds } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'receiptIds must be a non-empty array'
      });
    }

    const result = await receiptService.batchDeleteReceipts(userId, receiptIds);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Deleted ${result.successful.length} receipts${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error batch deleting receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch delete receipts',
      message: error.message
    });
  }
};

/**
 * Bulk create receipts from transactions
 * POST /api/receipts/bulk-from-transactions
 */
export const bulkCreateFromTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'transactions must be a non-empty array'
      });
    }

    // Limit bulk operations to prevent abuse
    if (transactions.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'LIMIT_EXCEEDED',
        message: 'Cannot create more than 100 receipts at once'
      });
    }

    const result = await receiptService.bulkCreateFromTransactions(userId, transactions);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: {
        successCount: result.successful.length,
        failCount: result.failed.length,
        receipts: result.receipts,
        failed: result.failed
      },
      message: `Created ${result.successful.length} receipts${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error bulk creating receipts from transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create receipts',
      message: error.message
    });
  }
};

/**
 * Bulk create receipts (with optional transaction creation for each)
 * PRIMARY use case: Quickly enter multiple cash/off-statement purchases
 * Each receipt can optionally create a corresponding expense transaction
 * POST /api/receipts/bulk
 */
export const bulkCreate = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { receipts } = req.body;

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'receipts must be a non-empty array'
      });
    }

    // Limit bulk operations to prevent abuse
    if (receipts.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'LIMIT_EXCEEDED',
        message: 'Cannot create more than 100 receipts at once'
      });
    }

    // Validate each receipt has required fields (vendor, amount, date)
    const invalidReceipts = receipts.filter((r, i) => {
      if (!r.vendor?.trim()) return true;
      if (!r.amount || parseFloat(r.amount) <= 0) return true;
      if (!r.date) return true;
      return false;
    });

    if (invalidReceipts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `${invalidReceipts.length} receipt(s) are missing required fields (vendor, amount, date)`
      });
    }

    const result = await receiptService.bulkCreate(userId, receipts);

    const status = result.someSucceeded ? 207 : (result.allSucceeded ? 200 : 400);

    res.status(status).json({
      success: result.allSucceeded,
      data: {
        successCount: result.successCount,
        failCount: result.failCount,
        total: result.total,
        results: result.results
      },
      allSucceeded: result.allSucceeded,
      someSucceeded: result.someSucceeded,
      message: `Created ${result.successCount} receipts${result.failCount > 0 ? `, ${result.failCount} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error bulk creating receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create receipts',
      message: error.message
    });
  }
};

/**
 * Attach receipt to transaction
 * POST /api/receipts/:id/attach
 */
export const attachToTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id: receiptId } = req.params;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'transactionId is required'
      });
    }

    const receipt = await receiptService.attachToTransaction(userId, receiptId, transactionId);

    res.json({
      success: true,
      data: receipt,
      message: 'Receipt attached to transaction successfully'
    });
  } catch (error) {
    logger.error(`Error attaching receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Detach receipt from transaction
 * POST /api/receipts/:id/detach
 */
export const detachFromTransaction = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: receiptId } = req.params;

    const receipt = await receiptService.detachFromTransaction(userId, receiptId);

    res.json({
      success: true,
      data: receipt,
      message: 'Receipt detached from transaction successfully'
    });
  } catch (error) {
    logger.error(`Error detaching receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'RECEIPT_NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Bulk link multiple receipts to a single transaction
 * POST /api/receipts/bulk-link
 */
export const bulkLinkToTransaction = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { receiptIds, transactionId } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'receiptIds must be a non-empty array'
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'transactionId is required'
      });
    }

    const result = await receiptService.bulkLinkToTransaction(userId, receiptIds, transactionId);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Linked ${result.successful.length} receipts to transaction${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error bulk linking receipts:', error);
    res.status(500).json({
      success: false,
      error: 'ERROR',
      message: error.message
    });
  }
};

/**
 * Bulk unlink multiple receipts from their transactions
 * POST /api/receipts/bulk-unlink
 */
export const bulkUnlinkFromTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { receiptIds } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'receiptIds must be a non-empty array'
      });
    }

    const result = await receiptService.bulkUnlinkFromTransactions(userId, receiptIds);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Unlinked ${result.successful.length} receipts${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error bulk unlinking receipts:', error);
    res.status(500).json({
      success: false,
      error: 'ERROR',
      message: error.message
    });
  }
};

/**
 * Link a receipt to multiple transactions
 * POST /api/receipts/:id/link-multiple
 */
export const linkToMultipleTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: receiptId } = req.params;
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'transactionIds must be a non-empty array'
      });
    }

    const result = await receiptService.linkToMultipleTransactions(userId, receiptId, transactionIds);

    res.json({
      success: result.results.failed.length === 0,
      data: result,
      message: `Linked receipt to ${result.results.successful.length} transactions${result.results.failed.length > 0 ? `, ${result.results.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error(`Error linking receipt ${req.params.id} to multiple transactions:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Add a single transaction link to receipt (multi-transaction support)
 * POST /api/receipts/:id/add-link/:transactionId
 */
export const addTransactionLink = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: receiptId, transactionId } = req.params;

    const receipt = await receiptService.addTransactionLink(userId, receiptId, transactionId);

    res.json({
      success: true,
      data: receipt,
      message: 'Transaction link added to receipt'
    });
  } catch (error) {
    logger.error(`Error adding transaction link to receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Remove a single transaction link from receipt
 * DELETE /api/receipts/:id/remove-link/:transactionId
 */
export const removeTransactionLink = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: receiptId, transactionId } = req.params;

    const receipt = await receiptService.removeTransactionLink(userId, receiptId, transactionId);

    res.json({
      success: true,
      data: receipt,
      message: 'Transaction link removed from receipt'
    });
  } catch (error) {
    logger.error(`Error removing transaction link from receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Upload image for existing receipt
 * POST /api/receipts/:id/upload
 */
export const uploadReceiptImage = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: receiptId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'Please select a file to upload'
      });
    }

    const receipt = await receiptService.uploadImage(userId, receiptId, file);

    res.json({
      success: true,
      data: receipt,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    logger.error(`Error uploading image for receipt ${req.params.id}:`, error);
    
    let status = 500;
    let errorCode = 'STORAGE_ERROR';

    if (error.message.includes('not found')) {
      status = 404;
      errorCode = 'RECEIPT_NOT_FOUND';
    } else if (error.message.includes('access')) {
      status = 403;
      errorCode = 'FORBIDDEN';
    } else if (error.message.includes('File too large')) {
      status = 413;
      errorCode = 'FILE_TOO_LARGE';
    } else if (error.message.includes('Invalid file type')) {
      status = 400;
      errorCode = 'INVALID_FILE_TYPE';
    }

    res.status(status).json({
      success: false,
      error: errorCode,
      message: error.message
    });
  }
};

/**
 * Delete image from receipt (keep receipt record)
 * DELETE /api/receipts/:id/image
 */
export const deleteReceiptImage = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: receiptId } = req.params;

    const receipt = await receiptService.deleteImage(userId, receiptId);

    res.json({
      success: true,
      data: receipt,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting image from receipt ${req.params.id}:`, error);
    
    const status = error.message.includes('not found') ? 404 
      : error.message.includes('access') ? 403 
      : 500;

    res.status(status).json({
      success: false,
      error: status === 404 ? 'RECEIPT_NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'ERROR',
      message: error.message
    });
  }
};

/**
 * Get receipt statistics
 * GET /api/receipts/stats
 */
export const getReceiptStats = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const stats = await receiptService.getReceiptStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting receipt stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get receipt statistics',
      message: error.message
    });
  }
};

/**
 * Trigger cleanup of expired receipts (admin only or scheduled job)
 * POST /api/receipts/cleanup
 */
export const cleanupExpiredReceipts = async (req, res) => {
  try {
    const result = await receiptService.cleanupExpiredReceipts();

    res.json({
      success: true,
      data: result,
      message: `Cleanup completed: ${result.deleted} receipts deleted`
    });
  } catch (error) {
    logger.error('Error during receipt cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
};
