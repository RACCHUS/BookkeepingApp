import firebaseService from '../services/firebaseService.js';
import transactionClassifier from '../services/transactionClassifier.js';

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

    const classification = await transactionClassifier.classifyTransaction(transaction, userId);

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

    const trainingResult = await transactionClassifier.trainFromTransactions(transactions, userId);

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
    // Implementation for updating classification rules
    res.json({
      success: true,
      message: 'Update classification rule endpoint - to be implemented'
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
    // Implementation for deleting classification rules
    res.json({
      success: true,
      message: 'Delete classification rule endpoint - to be implemented'
    });

  } catch (error) {
    console.error('Delete classification rule error:', error);
    res.status(500).json({
      error: 'Failed to delete classification rule',
      message: error.message
    });
  }
};
