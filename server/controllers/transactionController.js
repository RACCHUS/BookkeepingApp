import { validationResult } from 'express-validator';
import firebaseService from '../services/firebaseService.js';
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

    const transactions = await firebaseService.getTransactions(userId, filters);

    // Apply additional client-side filters if needed
    let filteredTransactions = transactions;
    if (payee) {
      filteredTransactions = transactions.filter(t => 
        t.payee.toLowerCase().includes(payee.toLowerCase())
      );
    }

    res.json({
      success: true,
      transactions: filteredTransactions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredTransactions.length,
        hasMore: filteredTransactions.length === parseInt(limit)
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

    // Create transaction object based on schema
    const transaction = {
      ...TransactionSchema,
      ...transactionData,
      date: new Date(transactionData.date),
      userId,
      createdBy: userId,
      lastModifiedBy: userId,
      taxYear: new Date(transactionData.date).getFullYear(),
      quarterlyPeriod: getQuarterFromDate(new Date(transactionData.date))
    };

    // Validate business purpose for business expenses
    if (transaction.type === 'expense' && transaction.category !== 'Personal Expense' && !transaction.businessPurpose) {
      return res.status(400).json({
        error: 'Business purpose required',
        message: 'Business purpose is required for business expenses'
      });
    }

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

    // Convert date string to Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
      updateData.taxYear = updateData.date.getFullYear();
      updateData.quarterlyPeriod = getQuarterFromDate(updateData.date);
    }

    // Mark as manually reviewed if user is updating classification
    if (updateData.category || updateData.type) {
      updateData.isManuallyReviewed = true;
      updateData.isTrainingData = true; // Use for future ML training
    }

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

    await firebaseService.deleteTransaction(id, userId);

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

    const summary = await firebaseService.getTransactionSummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      summary,
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

// Helper function to determine quarter from date
function getQuarterFromDate(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}
