/**
 * @fileoverview Inventory Routes - API endpoints for inventory management
 * @description Express routes for inventory items and stock movements
 * @version 1.0.0
 */

import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  recordSale,
  recordPurchase,
  getValuation,
  getLowStock,
  getTransactions,
  getCategories
} from '../controllers/inventoryController.js';
import {
  createItemValidation,
  updateItemValidation,
  stockAdjustmentValidation,
  recordSaleValidation,
  recordPurchaseValidation,
  itemIdValidation,
  queryValidation,
  transactionQueryValidation
} from '../middlewares/inventoryValidation.js';
import { handleValidationErrors, apiRateLimit } from '../middlewares/index.js';

const router = express.Router();

// Apply rate limiting to all inventory routes
router.use(apiRateLimit);

/**
 * @route GET /api/inventory
 * @description Get all inventory items for the current user
 * @query {string} companyId - Filter by company
 * @query {string} category - Filter by category
 * @query {boolean} lowStock - Filter to show only low stock items
 * @query {string} search - Search by name, SKU, or description
 * @query {number} limit - Limit results (default: 100)
 * @query {number} offset - Offset for pagination
 */
router.get('/', queryValidation, handleValidationErrors, getItems);

/**
 * @route GET /api/inventory/categories
 * @description Get all unique categories
 */
router.get('/categories', getCategories);

/**
 * @route GET /api/inventory/report/valuation
 * @description Get inventory valuation report
 * @query {string} companyId - Filter by company
 */
router.get('/report/valuation', getValuation);

/**
 * @route GET /api/inventory/report/low-stock
 * @description Get low stock items
 * @query {string} companyId - Filter by company
 */
router.get('/report/low-stock', getLowStock);

/**
 * @route GET /api/inventory/transactions
 * @description Get inventory transactions
 * @query {string} itemId - Filter by item
 * @query {string} companyId - Filter by company
 * @query {string} type - Filter by transaction type
 * @query {string} startDate - Filter by start date
 * @query {string} endDate - Filter by end date
 * @query {number} limit - Limit results (default: 100)
 * @query {number} offset - Offset for pagination
 */
router.get('/transactions', transactionQueryValidation, handleValidationErrors, getTransactions);

/**
 * @route GET /api/inventory/:id
 * @description Get a single inventory item by ID with transaction history
 */
router.get('/:id', itemIdValidation, handleValidationErrors, getItemById);

/**
 * @route POST /api/inventory
 * @description Create a new inventory item
 */
router.post('/', createItemValidation, handleValidationErrors, createItem);

/**
 * @route PUT /api/inventory/:id
 * @description Update an inventory item
 */
router.put('/:id', updateItemValidation, handleValidationErrors, updateItem);

/**
 * @route DELETE /api/inventory/:id
 * @description Delete an inventory item (soft delete)
 */
router.delete('/:id', itemIdValidation, handleValidationErrors, deleteItem);

/**
 * @route POST /api/inventory/:id/adjust
 * @description Adjust stock for an item
 * @body {number} quantity - Quantity to adjust (positive or negative)
 * @body {string} type - Transaction type (adjustment, return, damaged, correction)
 * @body {string} notes - Optional notes
 * @body {number} unitCost - Optional unit cost
 */
router.post('/:id/adjust', stockAdjustmentValidation, handleValidationErrors, adjustStock);

/**
 * @route POST /api/inventory/:id/sale
 * @description Record a sale (decreases stock)
 * @body {number} quantity - Quantity sold
 * @body {string} transactionId - Optional linked financial transaction ID
 */
router.post('/:id/sale', recordSaleValidation, handleValidationErrors, recordSale);

/**
 * @route POST /api/inventory/:id/purchase
 * @description Record a purchase (increases stock)
 * @body {number} quantity - Quantity purchased
 * @body {number} unitCost - Cost per unit
 * @body {string} transactionId - Optional linked financial transaction ID
 */
router.post('/:id/purchase', recordPurchaseValidation, handleValidationErrors, recordPurchase);

export default router;
