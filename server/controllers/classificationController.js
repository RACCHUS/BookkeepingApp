import transactionClassifierService from '../services/transactionClassifierService.js';
import { getDatabaseAdapter } from '../services/adapters/index.js';
import { logger } from '../config/index.js';

// Get database adapter (Supabase or Firebase based on DB_PROVIDER)
const getDb = () => getDatabaseAdapter();

// Classify a transaction using rule-based logic only
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
    logger.error('Classification error:', error);
    res.status(500).json({
      success: false,
      error: 'Classification failed',
      message: error.message
    });
  }
};

// Remove training and learning endpoints (no longer needed)

// Get all classification rules for the current user
export const getClassificationRules = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const rules = await getDb().getClassificationRules(userId);
    res.json({ rules });
  } catch (error) {
    logger.error('Get classification rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get classification rules',
      message: error.message
    });
  }
};

export const createClassificationRule = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const ruleData = req.body;

    const ruleId = await getDb().createClassificationRule(userId, ruleData);

    // Clear the rule cache for this user since rules changed
    transactionClassifierService.clearCache(userId);

    res.status(201).json({
      success: true,
      message: 'Classification rule created successfully',
      ruleId
    });

  } catch (error) {
    logger.error('Create classification rule error:', error);
    res.status(500).json({
      success: false,
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

    const updatedRule = await getDb().updateClassificationRule(userId, ruleId, updateData);

    // Clear the rule cache for this user since rules changed
    transactionClassifierService.clearCache(userId);

    res.json({
      success: true,
      message: 'Classification rule updated successfully',
      rule: updatedRule
    });

  } catch (error) {
    logger.error('Update classification rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update classification rule',
      message: error.message
    });
  }
};

export const deleteClassificationRule = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id: ruleId } = req.params;

    await getDb().deleteClassificationRule(userId, ruleId);

    // Clear the rule cache for this user since rules changed
    transactionClassifierService.clearCache(userId);

    res.json({
      success: true,
      message: 'Classification rule deleted successfully'
    });

  } catch (error) {
    logger.error('Delete classification rule error:', error);
    res.status(500).json({
      success: false,
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
    logger.error('Test classification error:', error);
    res.status(500).json({
      success: false,
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
    const transactions = await getDb().getTransactions(userId, {
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
        logger.error(`Error classifying transaction ${transaction.id}:`, error);
      }
    }

    // Apply updates in batches
    if (updates.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await Promise.all(
          batch.map(update => 
            getDb().updateTransaction(userId, update.id, {
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
    logger.error('Bulk reclassify error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk reclassification failed',
      message: error.message
    });
  }
};

export const getClassificationStats = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    // Get classification rules count
    const rules = await getDb().getClassificationRules(userId);
    const totalRules = rules ? rules.length : 0;

    // Get all transactions for stats
    const transactions = await getDb().getTransactions(userId, { limit: 10000 });
    
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
    logger.error('Get classification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get classification stats',
      message: error.message
    });
  }
};

export const getUncategorizedTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const limit = parseInt(req.query.limit) || 50;

    const uncategorizedTransactions = await getDb().getUncategorizedTransactions(userId, limit);

    res.json({
      success: true,
      transactions: uncategorizedTransactions || []
    });

  } catch (error) {
    logger.error('Get uncategorized transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get uncategorized transactions',
      message: error.message
    });
  }
};
