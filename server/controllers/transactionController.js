import { validationResult } from 'express-validator';

/**
 * Helper: Map transaction object to ensure date is always ISO string
 * @param {object} tx
 * @returns {object}
 */
function mapTransactionForClient(tx) {
  if (!tx) return tx;
  let date = tx.date;
  // Firestore Timestamp: has toDate()
  if (date && typeof date === 'object' && typeof date.toDate === 'function') {
    date = date.toDate();
  }
  // JS Date object
  if (date instanceof Date) {
    date = date.toISOString();
  }
  // If still not a string, fallback
  if (typeof date !== 'string') {
    date = '';
  }
  return { ...tx, date };
}
import { getDatabaseAdapter } from '../services/adapters/index.js';
import transactionClassifierService from '../services/transactionClassifierService.js';
import { TransactionSchema } from '../../shared/schemas/transactionSchema.js';
import { logger } from '../config/index.js';
import { asyncHandler } from '../middlewares/index.js';

// Get database adapter (Supabase or Firebase based on DB_PROVIDER)
const getDb = () => getDatabaseAdapter();

/**
 * Get transactions with filtering and pagination
 * @route GET /api/transactions
 * @access Private - Requires authentication
 */
export const getTransactions = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Transaction query validation failed', {
      errors: errors.array(),
      userId: req.user?.uid,
      requestId: req.id
    });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { uid: userId } = req.user;
  const {
    limit = 50,
    offset = 0,
    startDate,
    endDate,
    category,
    type,
    payee,
    paymentMethod,
    uploadId,
    companyId,
    orderBy = 'date',
    order = 'desc'
  } = req.query;

  logger.debug('Getting transactions', {
    userId,
    filters: { limit, offset, startDate, endDate, category, orderBy, order },
    requestId: req.id
  });

  // Build filters
  const filters = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    orderBy,
    order
  };

  if (startDate && endDate) {
    filters.startDate = new Date(startDate);
    filters.endDate = new Date(endDate);
  }

  if (category) {
    filters.category = category;
  }

  if (type) {
      filters.type = type;
    }

    if (paymentMethod) {
      filters.paymentMethod = paymentMethod;
    }

    if (uploadId) {
      filters.uploadId = uploadId;
    }

    if (companyId) {
      filters.companyId = companyId;
    }

    let transactions;
    let usingMockData = false;
    
    try {
      const result = await getDb().getTransactions(userId, filters);
      transactions = result.transactions || result || [];
    } catch (error) {
      logger.warn('Firestore query failed:', error.message);
      // Return empty transactions instead of mock data
      transactions = [];
      usingMockData = false; // Don't indicate mock data usage
    }

    // Apply additional client-side filters if needed
    let filteredTransactions = transactions;
    if (payee) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.payee && t.payee.toLowerCase().includes(payee.toLowerCase())
      );
    }

    if (paymentMethod) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.paymentMethod === paymentMethod
      );
    }

    if (uploadId) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.uploadId === uploadId
      );
    }

    if (companyId) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.companyId === companyId
      );
    }

    // Map all transactions to ensure date is ISO string
    const mappedTransactions = filteredTransactions.map(mapTransactionForClient);
    res.json({
      success: true,
      data: {
        transactions: mappedTransactions,
        total: mappedTransactions.length,
        hasMore: mappedTransactions.length === parseInt(limit),
        usingMockData, // Indicate if we're using fallback data
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: mappedTransactions.length,
          hasMore: mappedTransactions.length === parseInt(limit)
        }
      }
    });
});

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid: userId } = req.user;

    // Get single transaction by ID directly from database
    const transaction = await getDb().getTransactionById(userId, id);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'The specified transaction was not found'
      });
    }

    res.json({
      success: true,
      transaction: mapTransactionForClient(transaction)
    });

  } catch (error) {
    logger.error('Get transaction by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction',
      message: error.message
    });
  }
};

export const createTransaction = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const transactionData = req.body;

    // Rule-based: always ensure category is a string
    let category = typeof transactionData.category === 'string' ? transactionData.category : '';
    if (!category) {
      const classification = await transactionClassifierService.classifyTransaction(transactionData, userId);
      category = typeof classification.category === 'string' ? classification.category : '';
    }

    // Create transaction object based on schema
    const transaction = {
      ...TransactionSchema,
      ...transactionData,
      category,
      date: new Date(transactionData.date),
      userId,
      createdBy: userId,
      lastModifiedBy: userId,
      taxYear: new Date(transactionData.date).getFullYear(),
      quarterlyPeriod: getQuarterFromDate(new Date(transactionData.date))
    };

    const transactionId = await getDb().createTransaction(userId, transaction);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transactionId,
      transaction: {
        ...transaction,
        id: transactionId
      }
    });

  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      message: error.message
    });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { uid: userId } = req.user;
    const updateData = req.body;

    // Get the original transaction for learning purposes
    const originalTransaction = await getDb().getTransactionById(userId, id);

    // --- Date Handling: Always save as JS Date object ---
    if (updateData.date !== undefined) {
      let parsedDate = updateData.date;
      if (typeof parsedDate === 'string' || typeof parsedDate === 'number') {
        const tempDate = new Date(parsedDate);
        parsedDate = !isNaN(tempDate.getTime()) ? tempDate : originalTransaction.date;
      }
      if (!(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) {
        parsedDate = originalTransaction.date;
      }
      updateData.date = parsedDate;
      updateData.taxYear = parsedDate.getFullYear();
      updateData.quarterlyPeriod = getQuarterFromDate(parsedDate);
    } else {
      updateData.date = originalTransaction.date;
      updateData.taxYear = originalTransaction.taxYear;
      updateData.quarterlyPeriod = originalTransaction.quarterlyPeriod;
    }

    // --- Amount Handling: Save as provided, no sign enforcement ---
    if (updateData.amount !== undefined) {
      let newAmount = typeof updateData.amount === 'number' ? updateData.amount : parseFloat(updateData.amount);
      if (isNaN(newAmount)) newAmount = originalTransaction.amount;
      updateData.amount = newAmount;
    } else {
      updateData.amount = originalTransaction.amount;
    }

    // Handle category changes for learning
    if (updateData.category && originalTransaction.category !== updateData.category) {
      // Mark as manually set
      updateData.manuallySet = true;
      updateData.classificationInfo = {
        ...originalTransaction.classificationInfo,
        manuallyOverridden: true,
        originalCategory: originalTransaction.category,
        manualCategory: updateData.category,
        correctionTimestamp: new Date()
      };

      // Learn from the user's correction (user rules based)
      // Note: Learning functionality not implemented for user rules classifier
      logger.info(`User corrected category from "${originalTransaction.category}" to "${updateData.category}" for transaction: ${originalTransaction.description}`);
    }

    // Mark as manually reviewed if user is updating classification
    if (updateData.category || updateData.type) {
      updateData.isManuallyReviewed = true;
      updateData.isTrainingData = true; // Use for future ML training
    }

    updateData.lastModifiedBy = userId;
    updateData.lastModified = new Date();

    await getDb().updateTransaction(userId, id, updateData);

    res.json({
      success: true,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    logger.error('Update transaction error:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update transaction',
      message: error.message
    });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid: userId } = req.user;

    // Debug log for tracing delete issues
    logger.debug('Attempting to delete transaction', { userId, transactionId: id });

    await getDb().deleteTransaction(userId, id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    logger.error('Delete transaction error:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete transaction',
      message: error.message
    });
  }
};

export const bulkUpdateTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Transactions array is required and cannot be empty'
      });
    }

    // Update each transaction
    const results = [];
    for (const transactionUpdate of transactions) {
      try {
        const { id, ...updateData } = transactionUpdate;
        
        if (updateData.date) {
          updateData.date = new Date(updateData.date);
        }
        
        updateData.isManuallyReviewed = true;
        updateData.isTrainingData = true;

        // FIX: Correct parameter order: userId, transactionId, updateData
        await getDb().updateTransaction(userId, id, updateData);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id: transactionUpdate.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
      results
    });

  } catch (error) {
    logger.error('Bulk update transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk update failed',
      message: error.message
    });
  }
};

export const getTransactionSummary = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { startDate, endDate, groupBy = 'category', companyId, uploadId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Date range required',
        message: 'Both startDate and endDate are required'
      });
    }

    let summary;
    let usingMockData = false;
    
    try {
      const filters = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
      
      // Add company filter if specified
      if (companyId && companyId !== 'all') {
        filters.companyId = companyId;
      }
      
      // Add upload filter if specified
      if (uploadId) {
        filters.uploadId = uploadId;
      }
      
      summary = await getDb().getTransactionSummary(userId, filters);
    } catch (error) {
      logger.warn('Firestore summary query failed:', error.message);
      // Return empty summary instead of mock data
      summary = {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: 0,
        categoryBreakdown: {},
        typeBreakdown: {
          income: 0,
          expense: 0
        }
      };
      usingMockData = false; // Don't indicate mock data usage
    }

    res.json({
      success: true,
      summary,
      usingMockData,
      dateRange: {
        startDate,
        endDate
      },
      companyFilter: companyId || 'all'
    });

  } catch (error) {
    logger.error('Get transaction summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction summary',
      message: error.message
    });
  }
};

// Get classification suggestions for transactions
export const getClassificationSuggestions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transactionIds array is required'
      });
    }

    // Get transactions
    const transactions = [];
    for (const id of transactionIds) {
      try {
        const transaction = await getDb().getTransactionById(id, userId);
        transactions.push({ id, ...transaction });
      } catch (error) {
        logger.warn(`Transaction ${id} not found or not accessible`);
      }
    }

    // Get classification suggestions (simplified for user rules)
    const suggestions = [];
    for (const transaction of transactions) {
      try {
        const classification = await transactionClassifierService.classifyTransaction(transaction, userId);
        if (classification.category && classification.category !== transaction.category) {
          suggestions.push({
            transactionId: transaction.id,
            currentCategory: transaction.category,
            suggestedCategory: classification.category,
            confidence: classification.confidence || 0.8
          });
        }
      } catch (error) {
        logger.error(`Error classifying transaction ${transaction.id}:`, error);
      }
    }

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    logger.error('Get classification suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get classification suggestions',
      message: error.message
    });
  }
};

// Bulk update transaction categories
export const bulkUpdateCategories = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { updates } = req.body; // Array of { transactionId, category }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'updates array is required'
      });
    }

    const results = [];
    
    for (const update of updates) {
      try {
        const { transactionId, category } = update;
        
        // Get original transaction for learning
        const originalTransaction = await getDb().getTransactionById(transactionId, userId);
        
        // Update the transaction
        await getDb().updateTransaction(userId, transactionId, {
          category,
          manuallySet: true,
          lastModifiedBy: userId,
          lastModified: new Date(),
          isManuallyReviewed: true
        });

        // Learn from the correction if category changed (user rules based)
        if (originalTransaction.category !== category) {
          logger.info(`Bulk update: User corrected category from "${originalTransaction.category}" to "${category}" for transaction: ${originalTransaction.description}`);
        }

        results.push({
          transactionId,
          success: true
        });

      } catch (error) {
        logger.error(`Failed to update transaction ${update.transactionId}:`, error);
        results.push({
          transactionId: update.transactionId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `Updated ${successCount} transactions${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results
    });

  } catch (error) {
    logger.error('Bulk update categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update categories',
      message: error.message
    });
  }
};

// Get category statistics
export const getCategoryStats = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, uploadId } = req.query;

    logger.debug(`Getting category stats for user ${userId}`, { startDate, endDate, companyId, uploadId });

    let dateRange = null;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
      logger.debug(`Date range: ${dateRange.start} to ${dateRange.end}`);
    }

    const filters = {};
    if (companyId && companyId !== 'all') {
      filters.companyId = companyId;
    }
    
    if (uploadId) {
      filters.uploadId = uploadId;
    }

    logger.debug('Applying filters:', filters);

    // Get basic stats from transactions (simplified implementation)
    const result = await getDb().getTransactions(userId, { 
      limit: 10000, // Get all transactions for stats
      ...filters,
      startDate: dateRange?.start,
      endDate: dateRange?.end
    });
    
    // Extract transactions from the result object
    const transactions = result?.transactions || [];
    
    logger.debug(`Retrieved ${transactions.length} transactions for stats, total available: ${result?.total || 0}`);
    
    // Ensure transactions is an array
    if (!Array.isArray(transactions)) {
      logger.error('getTransactions returned non-array:', transactions);
      return res.status(500).json({
        error: 'Failed to retrieve transactions',
        details: 'getTransactions returned invalid data'
      });
    }
    
    const stats = {
      totalTransactions: transactions.length,
      categorized: transactions.filter(t => t.category && t.category !== '').length,
      uncategorized: transactions.filter(t => !t.category || t.category === '').length,
      categories: {}
    };
    
    transactions.forEach(t => {
      if (t.category && t.category !== '') {
        if (!stats.categories[t.category]) {
          stats.categories[t.category] = { count: 0, total: 0 };
        }
        stats.categories[t.category].count++;
        stats.categories[t.category].total += Math.abs(t.amount || 0);
      }
    });

    res.json({
      success: true,
      stats,
      companyFilter: companyId || 'all'
    });

  } catch (error) {
    logger.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get category statistics',
      message: error.message
    });
  }
};

/**
 * Assign payee to a transaction
 */
export const assignPayeeToTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id: transactionId } = req.params;
    const { payeeId, payeeName } = req.body;

    const result = await getDb().assignPayeeToTransaction(userId, transactionId, payeeId, payeeName);

    res.json({
      success: true,
      message: 'Payee assigned to transaction successfully',
      ...result
    });

  } catch (error) {
    logger.error('Assign payee to transaction error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      success: false,
      error: 'Failed to assign payee to transaction',
      message: error.message
    });
  }
};

/**
 * Bulk assign payee to multiple transactions
 */
export const bulkAssignPayeeToTransactions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { transactionIds, payeeId, payeeName } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transactionIds must be a non-empty array'
      });
    }

    const result = await getDb().bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName);

    res.json({
      success: true,
      message: `Payee assigned to ${result.updatedCount} transactions`,
      ...result
    });

  } catch (error) {
    logger.error('Bulk assign payee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign payee',
      message: error.message
    });
  }
};

/**
 * Bulk unassign payee from transactions
 */
export const bulkUnassignPayeeFromTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'transactionIds must be a non-empty array'
      });
    }

    const result = await getDb().bulkUnassignPayeeFromTransactions(userId, transactionIds);

    res.json({
      success: true,
      message: `Payee removed from ${result.updatedCount} transactions`,
      ...result
    });

  } catch (error) {
    logger.error('Bulk unassign payee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk unassign payee',
      message: error.message
    });
  }
};

/**
 * Bulk unassign company from transactions
 */
export const bulkUnassignCompanyFromTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'transactionIds must be a non-empty array'
      });
    }

    const result = await getDb().bulkUnassignCompanyFromTransactions(userId, transactionIds);

    res.json({
      success: true,
      message: `Company removed from ${result.updatedCount} transactions`,
      ...result
    });

  } catch (error) {
    logger.error('Bulk unassign company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk unassign company',
      message: error.message
    });
  }
};

/**
 * @deprecated Use bulkAssignPayeeToTransactions instead
 */
export const deprecated_bulkAssignPayeeToTransactions = async (req, res) => {
  return res.status(410).json({
    error: 'Deprecated',
    message: 'This endpoint is deprecated. Use /bulk-assign-payee instead.'
  });
};

/**
 * @deprecated Use assignPayeeToTransaction instead
 */
export const deprecated_assignPayeeToTransaction = async (req, res) => {
  return res.status(410).json({
    error: 'Deprecated',
    message: 'This endpoint is deprecated. Use /assign-payee instead.'
  });
};

/**
 * Helper function to determine quarter from date
 */
function getQuarterFromDate(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

/**
 * Bulk create multiple transactions
 * @route POST /api/transactions/bulk
 * @access Private
 */
export const bulkCreateTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactions } = req.body;

    // Validate input
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'transactions must be a non-empty array'
      });
    }

    if (transactions.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 transactions per bulk request'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < transactions.length; i++) {
      const txData = transactions[i];
      
      try {
        // Validate required fields
        if (!txData.description || !txData.amount || !txData.date) {
          errors.push({
            index: i,
            error: 'Missing required fields: description, amount, date',
            data: txData
          });
          continue;
        }

        // Apply classification if no category provided
        let category = typeof txData.category === 'string' ? txData.category : '';
        if (!category) {
          try {
            const classification = await transactionClassifierService.classifyTransaction(txData, userId);
            category = typeof classification.category === 'string' ? classification.category : '';
          } catch (classifyError) {
            logger.warn('Classification failed for bulk transaction', { index: i, error: classifyError.message });
          }
        }

        // Build transaction object
        const transaction = {
          ...TransactionSchema,
          ...txData,
          category,
          type: txData.type || (parseFloat(txData.amount) >= 0 ? 'expense' : 'income'),
          date: new Date(txData.date),
          userId,
          createdBy: userId,
          lastModifiedBy: userId,
          taxYear: new Date(txData.date).getFullYear(),
          quarterlyPeriod: getQuarterFromDate(new Date(txData.date)),
          sectionCode: txData.sectionCode || 'manual'
        };

        const result = await getDb().createTransaction(userId, transaction);
        
        results.push({
          index: i,
          success: true,
          transactionId: result.id || result,
          transaction: {
            ...transaction,
            id: result.id || result
          }
        });

      } catch (txError) {
        logger.error('Error creating bulk transaction', { index: i, error: txError.message });
        errors.push({
          index: i,
          error: txError.message,
          data: txData
        });
      }
    }

    const allSucceeded = errors.length === 0;
    const someSucceeded = results.length > 0 && errors.length > 0;

    logger.info(`Bulk created ${results.length} transactions, ${errors.length} failed`, { userId });

    res.status(allSucceeded ? 201 : someSucceeded ? 207 : 400).json({
      success: allSucceeded,
      allSucceeded,
      someSucceeded,
      successCount: results.length,
      failCount: errors.length,
      results,
      errors
    });

  } catch (error) {
    logger.error('Bulk create transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create transactions',
      message: error.message
    });
  }
};
