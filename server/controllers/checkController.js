/**
 * Check Controller
 * Handles HTTP requests for check operations
 */

import checkService from '../services/checkService.js';
import { logger } from '../utils/index.js';

/**
 * Create a new check
 * POST /api/checks
 */
export const createCheck = async (req, res) => {
  try {
    const userId = req.user.uid;
    const checkData = req.body;
    const file = req.file || null;

    const check = await checkService.createCheck(userId, checkData, file);

    res.status(201).json({
      success: true,
      message: 'Check created successfully',
      data: check
    });
  } catch (error) {
    logger.error('Error in createCheck controller:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create check'
    });
  }
};

/**
 * Get check by ID
 * GET /api/checks/:id
 */
export const getCheck = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const check = await checkService.getCheck(userId, id);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'Check not found'
      });
    }

    res.json({
      success: true,
      data: check
    });
  } catch (error) {
    logger.error('Error in getCheck controller:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: error.message || 'Failed to get check'
    });
  }
};

/**
 * Get all checks with optional filters
 * GET /api/checks
 */
export const getChecks = async (req, res) => {
  try {
    const userId = req.user.uid;
    const filters = {
      type: req.query.type || null,
      status: req.query.status || null,
      companyId: req.query.companyId || null,
      payee: req.query.payee || null,
      checkNumber: req.query.checkNumber || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      minAmount: req.query.minAmount || null,
      maxAmount: req.query.maxAmount || null,
      hasImage: req.query.hasImage !== undefined ? req.query.hasImage === 'true' : undefined,
      limit: req.query.limit || 100
    };

    // Remove null filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === null) delete filters[key];
    });

    const result = await checkService.getChecks(userId, filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in getChecks controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get checks'
    });
  }
};

/**
 * Update a check
 * PUT /api/checks/:id
 */
export const updateCheck = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updates = req.body;

    const check = await checkService.updateCheck(userId, id, updates);

    res.json({
      success: true,
      message: 'Check updated successfully',
      data: check
    });
  } catch (error) {
    logger.error('Error in updateCheck controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 400;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update check'
    });
  }
};

/**
 * Delete a check
 * DELETE /api/checks/:id
 */
export const deleteCheck = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    await checkService.deleteCheck(userId, id);

    res.json({
      success: true,
      message: 'Check deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteCheck controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete check'
    });
  }
};

/**
 * Upload image to check
 * POST /api/checks/:id/image
 */
export const uploadImage = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const check = await checkService.uploadImage(userId, id, file);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: check
    });
  } catch (error) {
    logger.error('Error in uploadImage controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
};

/**
 * Delete image from check
 * DELETE /api/checks/:id/image
 */
export const deleteImage = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const check = await checkService.deleteImage(userId, id);

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: check
    });
  } catch (error) {
    logger.error('Error in deleteImage controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete image'
    });
  }
};

/**
 * Bulk create checks
 * POST /api/checks/bulk
 */
export const bulkCreate = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { checks } = req.body;

    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'checks array is required and must not be empty'
      });
    }

    if (checks.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 checks can be created at once'
      });
    }

    const result = await checkService.bulkCreate(userId, checks);

    res.status(result.allSucceeded ? 201 : 207).json({
      success: result.allSucceeded,
      message: result.allSucceeded 
        ? `${result.successCount} checks created successfully`
        : `${result.successCount} checks created, ${result.failCount} failed`,
      data: result
    });
  } catch (error) {
    logger.error('Error in bulkCreate controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk create checks'
    });
  }
};

/**
 * Create checks from existing transactions
 * POST /api/checks/from-transactions
 */
export const bulkCreateFromTransactions = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'transactions array is required and must not be empty'
      });
    }

    const result = await checkService.bulkCreateFromTransactions(userId, transactions);

    res.status(result.successful.length > 0 ? 201 : 400).json({
      success: result.successful.length > 0,
      message: `${result.successful.length} checks created from transactions`,
      data: {
        successCount: result.successful.length,
        failCount: result.failed.length,
        checks: result.checks,
        failed: result.failed
      }
    });
  } catch (error) {
    logger.error('Error in bulkCreateFromTransactions controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checks from transactions'
    });
  }
};

/**
 * Link check to existing transaction
 * POST /api/checks/:id/link/:transactionId
 */
export const linkToTransaction = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id, transactionId } = req.params;

    const check = await checkService.linkToTransaction(userId, id, transactionId);

    res.json({
      success: true,
      message: 'Check linked to transaction successfully',
      data: check
    });
  } catch (error) {
    logger.error('Error in linkToTransaction controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to link check to transaction'
    });
  }
};

/**
 * Get check statistics
 * GET /api/checks/stats
 */
export const getStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const options = {
      companyId: req.query.companyId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };

    // Remove null options
    Object.keys(options).forEach(key => {
      if (options[key] === null) delete options[key];
    });

    const stats = await checkService.getStats(userId, options);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in getStats controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get check statistics'
    });
  }
};

/**
 * Unlink check from transaction
 * POST /api/checks/:id/unlink
 */
export const unlinkFromTransaction = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const check = await checkService.unlinkFromTransaction(userId, id);

    res.json({
      success: true,
      message: 'Check unlinked from transaction successfully',
      data: check
    });
  } catch (error) {
    logger.error('Error in unlinkFromTransaction controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to unlink check from transaction'
    });
  }
};

/**
 * Bulk link multiple checks to a single transaction
 * POST /api/checks/bulk-link
 */
export const bulkLinkToTransaction = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { checkIds, transactionId } = req.body;

    if (!checkIds || !Array.isArray(checkIds) || checkIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'checkIds must be a non-empty array'
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'transactionId is required'
      });
    }

    const result = await checkService.bulkLinkToTransaction(userId, checkIds, transactionId);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Linked ${result.successful.length} checks to transaction${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error in bulkLinkToTransaction controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk link checks'
    });
  }
};

/**
 * Bulk unlink multiple checks from their transactions
 * POST /api/checks/bulk-unlink
 */
export const bulkUnlinkFromTransactions = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { checkIds } = req.body;

    if (!checkIds || !Array.isArray(checkIds) || checkIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'checkIds must be a non-empty array'
      });
    }

    const result = await checkService.bulkUnlinkFromTransactions(userId, checkIds);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Unlinked ${result.successful.length} checks${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error in bulkUnlinkFromTransactions controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk unlink checks'
    });
  }
};

/**
 * Link check to multiple transactions
 * POST /api/checks/:id/link-multiple
 */
export const linkToMultipleTransactions = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'transactionIds must be a non-empty array'
      });
    }

    const result = await checkService.linkToMultipleTransactions(userId, id, transactionIds);

    res.json({
      success: result.results.failed.length === 0,
      data: result,
      message: `Linked check to ${result.results.successful.length} transactions${result.results.failed.length > 0 ? `, ${result.results.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error in linkToMultipleTransactions controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to link check to multiple transactions'
    });
  }
};

/**
 * Add a single transaction link to check (multi-transaction support)
 * POST /api/checks/:id/add-link/:transactionId
 */
export const addTransactionLink = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id, transactionId } = req.params;

    const check = await checkService.addTransactionLink(userId, id, transactionId);

    res.json({
      success: true,
      data: check,
      message: 'Transaction link added to check'
    });
  } catch (error) {
    logger.error('Error in addTransactionLink controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to add transaction link'
    });
  }
};

/**
 * Remove a single transaction link from check
 * DELETE /api/checks/:id/remove-link/:transactionId
 */
export const removeTransactionLink = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id, transactionId } = req.params;

    const check = await checkService.removeTransactionLink(userId, id, transactionId);

    res.json({
      success: true,
      data: check,
      message: 'Transaction link removed from check'
    });
  } catch (error) {
    logger.error('Error in removeTransactionLink controller:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to remove transaction link'
    });
  }
};

/**
 * Batch update multiple checks
 * PUT /api/checks/batch
 */
export const batchUpdateChecks = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { checkIds, updates } = req.body;

    if (!checkIds || !Array.isArray(checkIds) || checkIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'checkIds must be a non-empty array'
      });
    }

    const result = await checkService.batchUpdateChecks(userId, checkIds, updates);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Updated ${result.successful.length} checks${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error in batchUpdateChecks controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to batch update checks'
    });
  }
};

/**
 * Batch delete multiple checks
 * DELETE /api/checks/batch
 */
export const batchDeleteChecks = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { checkIds } = req.body;

    if (!checkIds || !Array.isArray(checkIds) || checkIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'checkIds must be a non-empty array'
      });
    }

    const result = await checkService.batchDeleteChecks(userId, checkIds);

    const status = result.failed.length > 0 && result.successful.length > 0 ? 207 : 200;

    res.status(status).json({
      success: result.failed.length === 0,
      data: result,
      message: `Deleted ${result.successful.length} checks${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
    });
  } catch (error) {
    logger.error('Error in batchDeleteChecks controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to batch delete checks'
    });
  }
};

export default {
  createCheck,
  getCheck,
  getChecks,
  updateCheck,
  deleteCheck,
  uploadImage,
  deleteImage,
  bulkCreate,
  bulkCreateFromTransactions,
  linkToTransaction,
  unlinkFromTransaction,
  bulkLinkToTransaction,
  bulkUnlinkFromTransactions,
  linkToMultipleTransactions,
  addTransactionLink,
  removeTransactionLink,
  batchUpdateChecks,
  batchDeleteChecks,
  getStats
};
