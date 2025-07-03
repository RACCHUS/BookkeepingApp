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
      filteredTransactions = transactions.filter(t => 
        t.payee.toLowerCase().includes(payee.toLowerCase())
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

    // Auto-classify if category is not provided
    let category = transactionData.category;
    let classificationInfo = null;
    
    if (!category) {
      const classification = await transactionClassifierService.classifyTransaction(transactionData, userId);
      category = classification.category;
      classificationInfo = {
        autoClassified: true,
        confidence: classification.confidence,
        source: classification.source
      };
    }

    // Create transaction object based on schema
    const transaction = {
      ...TransactionSchema,
      ...transactionData,
      category,
      classificationInfo,
      date: new Date(transactionData.date),
      userId,
      createdBy: userId,
      lastModifiedBy: userId,
      taxYear: new Date(transactionData.date).getFullYear(),
      quarterlyPeriod: getQuarterFromDate(new Date(transactionData.date))

    };
    // Business purpose is now optional for business expenses

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

        await firebaseService.updateTransaction(id, userId, updateData);
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
    const { startDate, endDate, groupBy = 'category' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Date range required',
        message: 'Both startDate and endDate are required'
      });
    }

    let summary;
    let usingMockData = false;
    
    try {
      summary = await firebaseService.getTransactionSummary(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
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
      }
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
    const { startDate, endDate } = req.query;

    let dateRange = null;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const stats = await transactionClassifierService.getCategoryStats(userId, dateRange);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      error: 'Failed to get category statistics',
      message: error.message
    });
  }
};

// Helper function to determine quarter from date
function getQuarterFromDate(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}
