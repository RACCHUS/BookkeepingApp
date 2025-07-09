import { validationResult } from 'express-validator';
import firebaseService from '../services/cleanFirebaseService.js';
import transactionClassifierService from '../services/transactionClassifierService.js';
import { TransactionSchema } from '../../shared/schemas/transactionSchema.js';

export const getTransactions = async (req, res) => {
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
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      category,
      type,
      payee,
      sectionCode,
      uploadId,
      companyId,
      orderBy = 'date',
      order = 'desc'
    } = req.query;

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

    if (sectionCode) {
      filters.sectionCode = sectionCode;
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
      const result = await firebaseService.getTransactions(userId, filters);
      transactions = result.transactions || result || [];
    } catch (error) {
      console.warn('Firestore query failed:', error.message);
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

    if (sectionCode) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.sectionCode === sectionCode
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

    res.json({
      success: true,
      data: {
        transactions: filteredTransactions,
        total: filteredTransactions.length,
        hasMore: filteredTransactions.length === parseInt(limit),
        usingMockData, // Indicate if we're using fallback data
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: filteredTransactions.length,
          hasMore: filteredTransactions.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to get transactions',
      message: error.message
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid: userId } = req.user;

    // Get single transaction by ID
    const transactions = await firebaseService.getTransactions(userId);
    const transaction = transactions.find(t => t.id === id);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'The specified transaction was not found'
      });
    }

    res.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
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

    const transactionId = await firebaseService.createTransaction(userId, transaction);

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
    console.error('Create transaction error:', error);
    res.status(500).json({
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
    const originalTransaction = await firebaseService.getTransactionById(id, userId);

    // Convert date string to Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
      updateData.taxYear = updateData.date.getFullYear();
      updateData.quarterlyPeriod = getQuarterFromDate(updateData.date);
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

      // Learn from the user's correction
      await transactionClassifierService.learnFromUserCorrection(
        originalTransaction,
        updateData.category,
        userId
      );
    }

    // Mark as manually reviewed if user is updating classification
    if (updateData.category || updateData.type) {
      updateData.isManuallyReviewed = true;
      updateData.isTrainingData = true; // Use for future ML training
    }

    updateData.lastModifiedBy = userId;
    updateData.lastModified = new Date();

    await firebaseService.updateTransaction(id, userId, updateData);

    res.json({
      success: true,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: error.message
      });
    }

    res.status(500).json({
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
    console.log('[DEBUG] Attempting to delete transaction', { userId, transactionId: id });

    await firebaseService.deleteTransaction(userId, id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: error.message
      });
    }

    res.status(500).json({
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
        await firebaseService.updateTransaction(userId, id, updateData);
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
    console.error('Bulk update transactions error:', error);
    res.status(500).json({
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
      
      summary = await firebaseService.getTransactionSummary(userId, filters);
    } catch (error) {
      console.warn('Firestore summary query failed:', error.message);
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
    console.error('Get transaction summary error:', error);
    res.status(500).json({
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
        const transaction = await firebaseService.getTransactionById(id, userId);
        transactions.push({ id, ...transaction });
      } catch (error) {
        console.warn(`Transaction ${id} not found or not accessible`);
      }
    }

    // Get classification suggestions
    const suggestions = await transactionClassifierService.getBulkClassificationSuggestions(transactions, userId);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Get classification suggestions error:', error);
    res.status(500).json({
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
        const originalTransaction = await firebaseService.getTransactionById(transactionId, userId);
        
        // Update the transaction
        await firebaseService.updateTransaction(transactionId, userId, {
          category,
          manuallySet: true,
          lastModifiedBy: userId,
          lastModified: new Date(),
          isManuallyReviewed: true
        });

        // Learn from the correction if category changed
        if (originalTransaction.category !== category) {
          await transactionClassifierService.learnFromUserCorrection(
            originalTransaction,
            category,
            userId
          );
        }

        results.push({
          transactionId,
          success: true
        });

      } catch (error) {
        console.error(`Failed to update transaction ${update.transactionId}:`, error);
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
    console.error('Bulk update categories error:', error);
    res.status(500).json({
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

    let dateRange = null;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const filters = {};
    if (companyId && companyId !== 'all') {
      filters.companyId = companyId;
    }
    
    if (uploadId) {
      filters.uploadId = uploadId;
    }

    const stats = await transactionClassifierService.getCategoryStats(userId, dateRange, filters);

    res.json({
      success: true,
      stats,
      companyFilter: companyId || 'all'
    });

  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
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

    const result = await firebaseService.assignPayeeToTransaction(userId, transactionId, payeeId, payeeName);

    res.json({
      success: true,
      message: 'Payee assigned to transaction successfully',
      ...result
    });

  } catch (error) {
    console.error('Assign payee to transaction error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
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

    const result = await firebaseService.bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName);

    res.json({
      success: true,
      message: `Payee assigned to ${result.updatedCount} transactions`,
      ...result
    });

  } catch (error) {
    console.error('Bulk assign payee error:', error);
    res.status(500).json({
      error: 'Failed to bulk assign payee',
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
