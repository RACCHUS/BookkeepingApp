import firebaseService from '../services/firebaseService.js';
import transactionClassifierService from '../services/transactionClassifierService.js';

export const classifyTransaction = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({
        error: 'Transaction required',
        message: 'Transaction data is required for classification'
      });
    }

    const classification = await transactionClassifierService.classifyTransaction(transaction, userId);

    res.json({
      success: true,
      classification
    });

  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({
      error: 'Classification failed',
      message: error.message
    });
  }
};

export const trainClassifier = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        error: 'Training data required',
        message: 'Array of classified transactions is required for training'
      });
    }

    const trainingResult = await transactionClassifierService.trainFromTransactions(transactions, userId);

    res.json({
      success: true,
      message: 'Classifier training completed',
      result: trainingResult
    });

  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({
      error: 'Training failed',
      message: error.message
    });
  }
};

export const getClassificationRules = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const rules = await firebaseService.getClassificationRules(userId);

    res.json({
      success: true,
      rules
    });

  } catch (error) {
    console.error('Get classification rules error:', error);
    res.status(500).json({
      error: 'Failed to get classification rules',
      message: error.message
    });
  }
};

export const createClassificationRule = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const ruleData = req.body;

    const ruleId = await firebaseService.createClassificationRule(userId, ruleData);

    res.status(201).json({
      success: true,
      message: 'Classification rule created successfully',
      ruleId
    });

  } catch (error) {
    console.error('Create classification rule error:', error);
    res.status(500).json({
      error: 'Failed to create classification rule',
      message: error.message
    });
  }
};

export const updateClassificationRule = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: ruleId } = req.params;
    const updateData = req.body;

    const updatedRule = await firebaseService.updateClassificationRule(userId, ruleId, updateData);

    res.json({
      success: true,
      message: 'Classification rule updated successfully',
      rule: updatedRule
    });

  } catch (error) {
    console.error('Update classification rule error:', error);
    res.status(500).json({
      error: 'Failed to update classification rule',
      message: error.message
    });
  }
};

export const deleteClassificationRule = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: ruleId } = req.params;

    await firebaseService.deleteClassificationRule(userId, ruleId);

    res.json({
      success: true,
      message: 'Classification rule deleted successfully'
    });

  } catch (error) {
    console.error('Delete classification rule error:', error);
    res.status(500).json({
      error: 'Failed to delete classification rule',
      message: error.message
    });
  }
};

export const testClassification = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        error: 'Description required',
        message: 'Transaction description is required for testing'
      });
    }

    // Create a test transaction object
    const testTransaction = {
      description,
      amount: 100, // Default amount for testing
      payee: description, // Use description as payee for testing
      date: new Date().toISOString()
    };

    const classification = await transactionClassifierService.classifyTransaction(testTransaction, userId);

    res.json({
      success: true,
      classification,
      testTransaction: {
        description: testTransaction.description,
        suggestedCategory: classification.category,
        confidence: classification.confidence,
        reason: classification.reason || 'Based on keywords and patterns'
      }
    });

  } catch (error) {
    console.error('Test classification error:', error);
    res.status(500).json({
      error: 'Classification test failed',
      message: error.message
    });
  }
};

export const bulkReclassify = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { filters } = req.body;

    // Get transactions based on filters
    const transactions = await firebaseService.getTransactions(userId, {
      ...filters,
      limit: 1000 // Limit bulk operations to prevent timeouts
    });

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        message: 'No transactions found matching the criteria',
        processedCount: 0
      });
    }

    let processedCount = 0;
    const updates = [];

    // Process transactions in batches
    for (const transaction of transactions) {
      try {
        const classification = await transactionClassifierService.classifyTransaction(transaction, userId);
        
        // Only update if classification changed and has reasonable confidence
        if (classification.category !== transaction.category && classification.confidence > 0.7) {
          updates.push({
            id: transaction.id,
            category: classification.category,
            classificationInfo: {
              suggestedCategory: classification.category,
              confidence: classification.confidence,
              source: classification.source,
              manuallyReviewed: false,
              lastClassified: new Date().toISOString()
            }
          });
          processedCount++;
        }
      } catch (error) {
        console.error(`Error classifying transaction ${transaction.id}:`, error);
      }
    }

    // Apply updates in batches
    if (updates.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await Promise.all(
          batch.map(update => 
            firebaseService.updateTransaction(userId, update.id, {
              category: update.category,
              classificationInfo: update.classificationInfo
            })
          )
        );
      }
    }

    res.json({
      success: true,
      message: `Successfully reclassified ${processedCount} transactions`,
      processedCount,
      totalTransactions: transactions.length
    });

  } catch (error) {
    console.error('Bulk reclassify error:', error);
    res.status(500).json({
      error: 'Bulk reclassification failed',
      message: error.message
    });
  }
};

export const getClassificationStats = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    // Get classification rules count
    const rules = await firebaseService.getClassificationRules(userId);
    const totalRules = rules ? rules.length : 0;

    // Get all transactions for stats
    const transactions = await firebaseService.getTransactions(userId, { limit: 10000 });
    
    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRules,
          autoClassified: 0,
          manualReviews: 0,
          accuracy: 0
        }
      });
    }

    let autoClassified = 0;
    let manualReviews = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    transactions.forEach(transaction => {
      if (transaction.category && transaction.category !== 'Uncategorized') {
        if (transaction.classificationInfo?.manuallyReviewed) {
          manualReviews++;
        } else {
          autoClassified++;
        }

        if (transaction.classificationInfo?.confidence) {
          totalConfidence += transaction.classificationInfo.confidence;
          confidenceCount++;
        }
      }
    });

    const accuracy = confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) : 0;

    const stats = {
      totalRules,
      autoClassified,
      manualReviews,
      accuracy
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get classification stats error:', error);
    res.status(500).json({
      error: 'Failed to get classification stats',
      message: error.message
    });
  }
};

export const getUncategorizedTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const limit = parseInt(req.query.limit) || 50;

    const uncategorizedTransactions = await firebaseService.getUncategorizedTransactions(userId, limit);

    res.json({
      success: true,
      transactions: uncategorizedTransactions || []
    });

  } catch (error) {
    console.error('Get uncategorized transactions error:', error);
    res.status(500).json({
      error: 'Failed to get uncategorized transactions',
      message: error.message
    });
  }
};
