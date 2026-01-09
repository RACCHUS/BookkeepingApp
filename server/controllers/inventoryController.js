/**
 * @fileoverview Inventory Controller - Route handlers for inventory management
 * @description Handles HTTP requests for inventory items and stock movements
 * @version 1.0.0
 */

import { validationResult } from 'express-validator';
import inventoryService from '../services/inventoryService.js';
import { logger } from '../config/index.js';

/**
 * Get all inventory items for the current user
 */
export const getItems = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { companyId, category, lowStock, search, limit, offset } = req.query;

    const items = await inventoryService.getItems(userId, {
      companyId,
      category,
      lowStock: lowStock === 'true',
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    logger.error('Error getting inventory items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory items',
      message: error.message
    });
  }
};

/**
 * Get a single inventory item by ID
 */
export const getItemById = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;

    const item = await inventoryService.getItemById(userId, id);

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('Error getting inventory item:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: 'Failed to get inventory item',
      message: error.message
    });
  }
};

/**
 * Create a new inventory item
 */
export const createItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const item = await inventoryService.createItem(userId, req.body);

    res.status(201).json({
      success: true,
      data: item,
      message: 'Inventory item created successfully'
    });
  } catch (error) {
    logger.error('Error creating inventory item:', error);
    
    // Handle duplicate SKU error
    if (error.message.includes('unique_sku_per_user') || error.message.includes('duplicate')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate SKU',
        message: 'An item with this SKU already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create inventory item',
      message: error.message
    });
  }
};

/**
 * Update an inventory item
 */
export const updateItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;

    const item = await inventoryService.updateItem(userId, id, req.body);

    res.json({
      success: true,
      data: item,
      message: 'Inventory item updated successfully'
    });
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: 'Failed to update inventory item',
      message: error.message
    });
  }
};

/**
 * Delete an inventory item (soft delete)
 */
export const deleteItem = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;

    await inventoryService.deleteItem(userId, id);

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inventory item',
      message: error.message
    });
  }
};

/**
 * Adjust stock for an item
 */
export const adjustStock = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;
    const { quantity, type, notes, unitCost } = req.body;

    const transaction = await inventoryService.adjustStock(userId, id, quantity, type, notes, unitCost);

    res.json({
      success: true,
      data: transaction,
      message: 'Stock adjusted successfully'
    });
  } catch (error) {
    logger.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust stock',
      message: error.message
    });
  }
};

/**
 * Record a sale
 */
export const recordSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;
    const { quantity, transactionId } = req.body;

    const transaction = await inventoryService.recordSale(userId, id, quantity, transactionId);

    res.json({
      success: true,
      data: transaction,
      message: 'Sale recorded successfully'
    });
  } catch (error) {
    logger.error('Error recording sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record sale',
      message: error.message
    });
  }
};

/**
 * Record a purchase
 */
export const recordPurchase = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;
    const { quantity, unitCost, transactionId } = req.body;

    const transaction = await inventoryService.recordPurchase(userId, id, quantity, unitCost, transactionId);

    res.json({
      success: true,
      data: transaction,
      message: 'Purchase recorded successfully'
    });
  } catch (error) {
    logger.error('Error recording purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record purchase',
      message: error.message
    });
  }
};

/**
 * Get inventory valuation report
 */
export const getValuation = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { companyId } = req.query;

    const valuation = await inventoryService.getInventoryValuation(userId, companyId);

    res.json({
      success: true,
      data: valuation
    });
  } catch (error) {
    logger.error('Error getting inventory valuation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory valuation',
      message: error.message
    });
  }
};

/**
 * Get low stock items
 */
export const getLowStock = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { companyId } = req.query;

    const items = await inventoryService.getLowStockItems(userId, companyId);

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    logger.error('Error getting low stock items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get low stock items',
      message: error.message
    });
  }
};

/**
 * Get inventory transactions
 */
export const getTransactions = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { itemId, companyId, type, startDate, endDate, limit, offset } = req.query;

    const transactions = await inventoryService.getTransactions(userId, {
      itemId,
      companyId,
      type,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    logger.error('Error getting inventory transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory transactions',
      message: error.message
    });
  }
};

/**
 * Get inventory categories
 */
export const getCategories = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const categories = await inventoryService.getCategories(userId);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error getting inventory categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory categories',
      message: error.message
    });
  }
};
