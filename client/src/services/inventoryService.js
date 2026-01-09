/**
 * Inventory API service - handles all inventory-related API calls
 */

import { apiClient } from './api.js';

const inventoryService = {
  /**
   * Get all inventory items for the current user
   * @param {object} params - Query parameters (companyId, category, lowStock, search, limit, offset)
   */
  async getAll(params = {}) {
    return await apiClient.inventory.getAll(params);
  },

  /**
   * Get a specific inventory item by ID with transaction history
   * @param {string} itemId - Item ID
   */
  async getById(itemId) {
    return await apiClient.inventory.getById(itemId);
  },

  /**
   * Create a new inventory item
   * @param {object} itemData - Item data
   */
  async create(itemData) {
    return await apiClient.inventory.create(itemData);
  },

  /**
   * Update an existing inventory item
   * @param {string} itemId - Item ID
   * @param {object} updateData - Update data
   */
  async update(itemId, updateData) {
    return await apiClient.inventory.update(itemId, updateData);
  },

  /**
   * Delete an inventory item (soft delete)
   * @param {string} itemId - Item ID
   */
  async delete(itemId) {
    return await apiClient.inventory.delete(itemId);
  },

  /**
   * Adjust stock for an item
   * @param {string} itemId - Item ID
   * @param {object} adjustmentData - { quantity, type, notes, unitCost }
   */
  async adjustStock(itemId, adjustmentData) {
    return await apiClient.inventory.adjustStock(itemId, adjustmentData);
  },

  /**
   * Record a sale (decreases stock)
   * @param {string} itemId - Item ID
   * @param {object} saleData - { quantity, transactionId }
   */
  async recordSale(itemId, saleData) {
    return await apiClient.inventory.recordSale(itemId, saleData);
  },

  /**
   * Record a purchase (increases stock)
   * @param {string} itemId - Item ID
   * @param {object} purchaseData - { quantity, unitCost, transactionId }
   */
  async recordPurchase(itemId, purchaseData) {
    return await apiClient.inventory.recordPurchase(itemId, purchaseData);
  },

  /**
   * Get inventory valuation report
   * @param {object} params - Query parameters (companyId)
   */
  async getValuation(params = {}) {
    return await apiClient.inventory.getValuation(params);
  },

  /**
   * Get low stock items
   * @param {object} params - Query parameters (companyId)
   */
  async getLowStock(params = {}) {
    return await apiClient.inventory.getLowStock(params);
  },

  /**
   * Get inventory transactions
   * @param {object} params - Query parameters (itemId, companyId, type, startDate, endDate, limit, offset)
   */
  async getTransactions(params = {}) {
    return await apiClient.inventory.getTransactions(params);
  },

  /**
   * Get inventory categories
   */
  async getCategories() {
    return await apiClient.inventory.getCategories();
  }
};

export default inventoryService;
