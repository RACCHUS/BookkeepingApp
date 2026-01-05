/**
 * Income Source Controller
 * Handles HTTP requests for income source management
 */

import { getDatabaseAdapter } from '../services/adapters/index.js';

/**
 * Get all income sources
 */
const getAllIncomeSources = async (req, res) => {
  try {
    const userId = req.user.uid;
    const filters = {
      sourceType: req.query.sourceType
    };
    
    const db = getDatabaseAdapter();
    const result = await db.getAllIncomeSources(userId, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getAllIncomeSources:', error);
    res.status(500).json({ success: false, error: 'Failed to get income sources' });
  }
};

/**
 * Get income source by ID
 */
const getIncomeSourceById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const db = getDatabaseAdapter();
    const result = await db.getIncomeSourceById(userId, id);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Income source not found') {
      res.status(404).json(result);
    } else if (result.error === 'Unauthorized access') {
      res.status(403).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getIncomeSourceById:', error);
    res.status(500).json({ success: false, error: 'Failed to get income source' });
  }
};

/**
 * Create a new income source
 */
const createIncomeSource = async (req, res) => {
  try {
    const userId = req.user.uid;
    const sourceData = req.body;
    
    if (!sourceData.name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    const db = getDatabaseAdapter();
    const result = await db.createIncomeSource(userId, sourceData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in createIncomeSource:', error);
    res.status(500).json({ success: false, error: 'Failed to create income source' });
  }
};

/**
 * Update an income source
 */
const updateIncomeSource = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = req.body;
    
    const db = getDatabaseAdapter();
    const result = await db.updateIncomeSource(userId, id, updateData);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Income source not found') {
      res.status(404).json(result);
    } else if (result.error === 'Unauthorized access') {
      res.status(403).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in updateIncomeSource:', error);
    res.status(500).json({ success: false, error: 'Failed to update income source' });
  }
};

/**
 * Delete an income source
 */
const deleteIncomeSource = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const db = getDatabaseAdapter();
    const result = await db.deleteIncomeSource(userId, id);
    
    if (result.success) {
      res.json(result);
    } else if (result.error === 'Income source not found') {
      res.status(404).json(result);
    } else if (result.error === 'Unauthorized access') {
      res.status(403).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in deleteIncomeSource:', error);
    res.status(500).json({ success: false, error: 'Failed to delete income source' });
  }
};

/**
 * Get transactions for an income source
 */
const getTransactionsBySource = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const filters = req.query;
    
    const db = getDatabaseAdapter();
    const result = await db.getTransactionsByIncomeSource(userId, id, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getTransactionsBySource:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
};

/**
 * Get summary for an income source
 */
const getSourceSummary = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const filters = req.query;
    
    const db = getDatabaseAdapter();
    const result = await db.getIncomeSourceSummary(userId, id, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getSourceSummary:', error);
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
};

export {
  getAllIncomeSources,
  getIncomeSourceById,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  getTransactionsBySource,
  getSourceSummary
};

export default {
  getAllIncomeSources,
  getIncomeSourceById,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  getTransactionsBySource,
  getSourceSummary
};
