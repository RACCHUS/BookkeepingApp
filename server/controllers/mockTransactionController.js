import { validationResult } from 'express-validator';
import firebaseService from '../services/cleanFirebaseService.js';

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
    console.log('🔍 getTransactions called for userId:', userId);
    console.log('🔍 req.user:', req.user);
    
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
    };    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (payee) filters.payee = payee;

    const result = await firebaseService.getTransactions(userId, filters);

    console.log('🔍 Firebase result:', result);
    console.log('🔍 Transaction count returned:', result.transactions?.length || 0);

    // Auto-migrate dev transactions for new users (one-time migration)
    if (result.transactions.length === 0 && userId !== 'dev-user-123') {
      try {
        console.log('🔄 Attempting to migrate dev transactions...');
        const migrationResult = await firebaseService.migrateDevTransactions(userId);
        console.log('🔄 Migration result:', migrationResult);
        
        if (migrationResult.migrated > 0) {
          // Re-fetch transactions after migration
          const updatedResult = await firebaseService.getTransactions(userId, filters);
          console.log('🔍 After migration - Transaction count:', updatedResult.transactions?.length || 0);
          
          res.json({
            success: true,
            data: updatedResult,
            filters,
            migration: migrationResult
          });
          return;
        }
      } catch (migrationError) {
        console.error('Migration failed:', migrationError);
        // Continue with original empty result
      }
    }

    res.json({
      success: true,
      data: result,
      filters
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
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
    }    const { uid: userId } = req.user;
    const transactionData = req.body;

    const result = await firebaseService.createTransaction(userId, transactionData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
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
    }    const { uid: userId } = req.user;
    const { id: transactionId } = req.params;
    const updateData = req.body;

    const result = await firebaseService.updateTransaction(userId, transactionId, updateData);

    res.json({
      success: true,
      data: result,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    if (error.message === 'Transaction not found') {
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
  try {    const { uid: userId } = req.user;
    const { id: transactionId } = req.params;

    await firebaseService.deleteTransaction(userId, transactionId);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    if (error.message === 'Transaction not found') {
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

export const getTransactionById = async (req, res) => {
  try {    const { uid: userId } = req.user;
    const { id: transactionId } = req.params;

    const transaction = await firebaseService.getTransactionById(userId, transactionId);

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    if (error.message === 'Transaction not found') {
      return res.status(404).json({
        error: 'Transaction not found',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Failed to fetch transaction',
      message: error.message
    });
  }
};

export const bulkUpdateTransactions = async (req, res) => {
  try {    const { uid: userId } = req.user;
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Updates must be an array'
      });
    }    // Process updates one by one
    // In a real implementation, we'd use Firebase batch operations
    const results = [];
    for (const update of updates) {
      try {
        const result = await firebaseService.updateTransaction(userId, update.id, update.data);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update transaction ${update.id}:`, error.message);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Successfully updated ${results.length} transactions`
    });
  } catch (error) {
    console.error('Error bulk updating transactions:', error);
    res.status(500).json({
      error: 'Failed to bulk update transactions',
      message: error.message
    });
  }
};

export const getTransactionSummary = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const {
      startDate,
      endDate,
      category,
      type
    } = req.query;

    // Build filters for summary
    const filters = {};    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (category) filters.category = category;
    if (type) filters.type = type;

    const summary = await firebaseService.getTransactionSummary(userId, filters);

    res.json({
      success: true,
      data: summary,
      filters
    });
  } catch (error) {
    console.error('Error generating transaction summary:', error);
    res.status(500).json({
      error: 'Failed to generate transaction summary',
      message: error.message
    });
  }
};

export const testTransactionStructure = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    console.log('🧪 Test endpoint called for user:', userId);
    
    // Return a simple test response to verify structure
    const testResponse = {
      success: true,
      data: {
        transactions: [
          {
            id: 'test-1',
            date: '2025-06-26',
            amount: 100,
            description: 'Test Transaction',
            category: 'Test',
            type: 'income'
          }
        ],
        total: 1,
        hasMore: false
      },
      test: true
    };
    
    console.log('🧪 Sending test response:', testResponse);
    res.json(testResponse);
  } catch (error) {
    console.error('🧪 Test endpoint error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
};

export const debugGetAllTransactions = async (req, res) => {
  try {
    console.log('🔍 Debug: Getting ALL transactions regardless of user');
    
    const result = await firebaseService.getTransactions('dev-user-123', {});
    console.log('🔍 Debug: Dev transactions found:', result.transactions?.length || 0);
    
    // Also try to get the authenticated user's transactions
    const { uid: userId } = req.user;
    const userResult = await firebaseService.getTransactions(userId, {});
    console.log('🔍 Debug: User transactions found:', userResult.transactions?.length || 0);
    
    res.json({
      success: true,
      debug: true,
      data: {
        devTransactions: result,
        userTransactions: userResult,
        devUserId: 'dev-user-123',
        authUserId: userId,
        userMatch: userId === 'dev-user-123'
      }
    });
  } catch (error) {
    console.error('🔍 Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
};
