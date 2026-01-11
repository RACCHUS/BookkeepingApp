/**
 * @fileoverview Inventory Service - Inventory management service
 * @description Handles inventory items, stock movements, and valuations
 * @version 1.0.0
 */

import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/index.js';

/**
 * Inventory transaction types
 */
const INVENTORY_TRANSACTION_TYPES = ['purchase', 'sale', 'adjustment', 'return', 'damaged', 'correction'];

/**
 * Inventory Service - Manages inventory items and stock movements
 */
class InventoryService {
  constructor() {
    this.supabase = null;
    this.itemsTable = 'inventory_items';
    this.transactionsTable = 'inventory_transactions';
    logger.info('📦 InventoryService: Initialized');
  }

  /**
   * Get Supabase client (lazy initialization)
   * @returns {import('@supabase/supabase-js').SupabaseClient}
   */
  getClient() {
    if (!this.supabase) {
      this.supabase = getSupabaseAdmin();
    }
    return this.supabase;
  }

  /**
   * Create a new inventory item
   * @param {string} userId - User ID
   * @param {object} itemData - Item data
   * @returns {Promise<object>} Created item
   */
  async createItem(userId, itemData) {
    try {
      const { companyId, sku, name, description, category, unitCost, sellingPrice, quantity, reorderLevel, unit, supplier } = itemData;

      if (!name) {
        throw new Error('Name is required');
      }

      const { data, error } = await this.getClient()
        .from(this.itemsTable)
        .insert({
          user_id: userId,
          company_id: companyId || null,
          sku,
          name,
          description: description || null,
          category: category || null,
          unit_cost: unitCost || 0,
          selling_price: sellingPrice || 0,
          quantity: quantity || 0,
          reorder_level: reorderLevel || 0,
          unit: unit || 'each',
          supplier: supplier || null,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating inventory item:', error);
        throw new Error(`Failed to create inventory item: ${error.message}`);
      }

      logger.info(`✅ Created inventory item: ${name} (${data.id})`);
      return this.formatItem(data);
    } catch (error) {
      logger.error('Error in createItem:', error);
      throw error;
    }
  }

  /**
   * Get all inventory items for a user
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} Array of items
   */
  async getItems(userId, filters = {}) {
    try {
      const { companyId, category, lowStock, search, limit = 100, offset = 0 } = filters;

      let query = this.getClient()
        .from(this.itemsTable)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting inventory items:', error);
        throw new Error(`Failed to get inventory items: ${error.message}`);
      }

      let items = data.map(item => this.formatItem(item));

      // Filter low stock items if requested
      if (lowStock) {
        items = items.filter(item => item.quantity <= item.reorderLevel);
      }

      return items;
    } catch (error) {
      logger.error('Error in getItems:', error);
      throw error;
    }
  }

  /**
   * Get a single inventory item by ID
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @returns {Promise<object>} Item with transaction history
   */
  async getItemById(userId, itemId) {
    try {
      const { data, error } = await this.getClient()
        .from(this.itemsTable)
        .select('*')
        .eq('id', itemId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Inventory item not found');
        }
        throw new Error(`Failed to get inventory item: ${error.message}`);
      }

      // Get transaction history for this item
      const { data: transactions, error: txnError } = await this.getClient()
        .from(this.transactionsTable)
        .select('*')
        .eq('item_id', itemId)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50);

      if (txnError) {
        logger.warn('Error fetching item transactions:', txnError);
      }

      return {
        ...this.formatItem(data),
        transactions: transactions ? transactions.map(t => this.formatTransaction(t)) : []
      };
    } catch (error) {
      logger.error('Error in getItemById:', error);
      throw error;
    }
  }

  /**
   * Update an inventory item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @param {object} updates - Update data
   * @returns {Promise<object>} Updated item
   */
  async updateItem(userId, itemId, updates) {
    try {
      const { companyId, sku, name, description, category, unitCost, sellingPrice, reorderLevel, unit, supplier } = updates;

      const updateData = {};
      if (companyId !== undefined) updateData.company_id = companyId || null;
      if (sku !== undefined) updateData.sku = sku;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (unitCost !== undefined) updateData.unit_cost = unitCost;
      if (sellingPrice !== undefined) updateData.selling_price = sellingPrice;
      if (reorderLevel !== undefined) updateData.reorder_level = reorderLevel;
      if (unit !== undefined) updateData.unit = unit;
      if (supplier !== undefined) updateData.supplier = supplier;

      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid update fields provided');
      }

      const { data, error } = await this.getClient()
        .from(this.itemsTable)
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating inventory item:', error);
        throw new Error(`Failed to update inventory item: ${error.message}`);
      }

      logger.info(`✅ Updated inventory item: ${data.name} (${data.id})`);
      return this.formatItem(data);
    } catch (error) {
      logger.error('Error in updateItem:', error);
      throw error;
    }
  }

  /**
   * Soft delete an inventory item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @returns {Promise<boolean>} Success
   */
  async deleteItem(userId, itemId) {
    try {
      const { error } = await this.getClient()
        .from(this.itemsTable)
        .update({ is_active: false })
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error deleting inventory item:', error);
        throw new Error(`Failed to delete inventory item: ${error.message}`);
      }

      logger.info(`✅ Deleted inventory item: ${itemId}`);
      return true;
    } catch (error) {
      logger.error('Error in deleteItem:', error);
      throw error;
    }
  }

  /**
   * Adjust stock for an item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity change (positive or negative)
   * @param {string} type - Transaction type
   * @param {string} notes - Optional notes
   * @param {number} unitCost - Optional unit cost
   * @returns {Promise<object>} The inventory transaction
   */
  async adjustStock(userId, itemId, quantity, type, notes = '', unitCost = 0) {
    try {
      if (!INVENTORY_TRANSACTION_TYPES.includes(type)) {
        throw new Error(`Invalid transaction type: ${type}. Must be one of: ${INVENTORY_TRANSACTION_TYPES.join(', ')}`);
      }

      // Get the item first to verify ownership and get company_id
      const item = await this.getItemById(userId, itemId);
      
      const { data, error } = await this.getClient()
        .from(this.transactionsTable)
        .insert({
          user_id: userId,
          company_id: item.companyId,
          item_id: itemId,
          type,
          quantity,
          unit_cost: unitCost || item.unitCost,
          notes: notes || null,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adjusting stock:', error);
        throw new Error(`Failed to adjust stock: ${error.message}`);
      }

      logger.info(`✅ Stock adjusted for item ${itemId}: ${quantity > 0 ? '+' : ''}${quantity} (${type})`);
      return this.formatTransaction(data);
    } catch (error) {
      logger.error('Error in adjustStock:', error);
      throw error;
    }
  }

  /**
   * Record a sale (decreases stock)
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity sold (positive number)
   * @param {string} transactionId - Optional linked financial transaction ID
   * @returns {Promise<object>} The inventory transaction
   */
  async recordSale(userId, itemId, quantity, transactionId = null) {
    try {
      const item = await this.getItemById(userId, itemId);

      const { data, error } = await this.getClient()
        .from(this.transactionsTable)
        .insert({
          user_id: userId,
          company_id: item.companyId,
          item_id: itemId,
          type: 'sale',
          quantity: -Math.abs(quantity), // Always negative for sales
          unit_cost: item.unitCost,
          transaction_id: transactionId,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record sale: ${error.message}`);
      }

      logger.info(`✅ Recorded sale: ${quantity} units of item ${itemId}`);
      return this.formatTransaction(data);
    } catch (error) {
      logger.error('Error in recordSale:', error);
      throw error;
    }
  }

  /**
   * Record a purchase (increases stock)
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity purchased
   * @param {number} unitCost - Cost per unit
   * @param {string} transactionId - Optional linked financial transaction ID
   * @returns {Promise<object>} The inventory transaction
   */
  async recordPurchase(userId, itemId, quantity, unitCost, transactionId = null) {
    try {
      const item = await this.getItemById(userId, itemId);

      const { data, error } = await this.getClient()
        .from(this.transactionsTable)
        .insert({
          user_id: userId,
          company_id: item.companyId,
          item_id: itemId,
          type: 'purchase',
          quantity: Math.abs(quantity), // Always positive for purchases
          unit_cost: unitCost,
          transaction_id: transactionId,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record purchase: ${error.message}`);
      }

      // Update the item's unit cost to the latest purchase cost
      await this.updateItem(userId, itemId, { unitCost });

      logger.info(`✅ Recorded purchase: ${quantity} units of item ${itemId} at $${unitCost}/unit`);
      return this.formatTransaction(data);
    } catch (error) {
      logger.error('Error in recordPurchase:', error);
      throw error;
    }
  }

  /**
   * Get inventory valuation (total value of all inventory)
   * @param {string} userId - User ID
   * @param {string} companyId - Optional company filter
   * @returns {Promise<object>} Valuation report
   */
  async getInventoryValuation(userId, companyId = null) {
    try {
      let query = this.getClient()
        .from(this.itemsTable)
        .select('id, name, sku, quantity, unit_cost, selling_price, category')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('quantity', 0);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get inventory valuation: ${error.message}`);
      }

      const items = data.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitCost: parseFloat(item.unit_cost),
        sellingPrice: parseFloat(item.selling_price),
        category: item.category,
        totalCost: item.quantity * parseFloat(item.unit_cost),
        totalValue: item.quantity * parseFloat(item.selling_price)
      }));

      const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
      const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        items,
        summary: {
          totalItems,
          totalCost: Math.round(totalCost * 100) / 100,
          totalValue: Math.round(totalValue * 100) / 100,
          potentialProfit: Math.round((totalValue - totalCost) * 100) / 100,
          itemCount: items.length
        }
      };
    } catch (error) {
      logger.error('Error in getInventoryValuation:', error);
      throw error;
    }
  }

  /**
   * Get low stock items
   * @param {string} userId - User ID
   * @param {string} companyId - Optional company filter
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockItems(userId, companyId = null) {
    try {
      // We need to fetch and filter since Supabase doesn't support comparing columns directly in where clause easily
      let query = this.getClient()
        .from(this.itemsTable)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get low stock items: ${error.message}`);
      }

      // Filter items where quantity <= reorder_level
      const lowStockItems = data
        .filter(item => item.quantity <= item.reorder_level)
        .map(item => this.formatItem(item));

      return lowStockItems;
    } catch (error) {
      logger.error('Error in getLowStockItems:', error);
      throw error;
    }
  }

  /**
   * Get inventory transactions
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} Array of transactions
   */
  async getTransactions(userId, filters = {}) {
    try {
      const { itemId, companyId, type, startDate, endDate, limit = 100, offset = 0 } = filters;

      let query = this.getClient()
        .from(this.transactionsTable)
        .select(`
          *,
          inventory_items (id, name, sku)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get inventory transactions: ${error.message}`);
      }

      return data.map(t => ({
        ...this.formatTransaction(t),
        item: t.inventory_items ? {
          id: t.inventory_items.id,
          name: t.inventory_items.name,
          sku: t.inventory_items.sku
        } : null
      }));
    } catch (error) {
      logger.error('Error in getTransactions:', error);
      throw error;
    }
  }

  /**
   * Get unique categories for a user's inventory
   * @param {string} userId - User ID
   * @returns {Promise<Array<string>>} Array of categories
   */
  async getCategories(userId) {
    try {
      const { data, error } = await this.getClient()
        .from(this.itemsTable)
        .select('category')
        .eq('user_id', userId)
        .eq('is_active', true)
        .not('category', 'is', null);

      if (error) {
        throw new Error(`Failed to get categories: ${error.message}`);
      }

      // Get unique categories
      const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
      return categories.sort();
    } catch (error) {
      logger.error('Error in getCategories:', error);
      throw error;
    }
  }

  /**
   * Format item from database to API response
   * @param {object} item - Database item
   * @returns {object} Formatted item
   */
  formatItem(item) {
    return {
      id: item.id,
      userId: item.user_id,
      companyId: item.company_id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unitCost: parseFloat(item.unit_cost),
      sellingPrice: parseFloat(item.selling_price),
      quantity: item.quantity,
      reorderLevel: item.reorder_level,
      unit: item.unit,
      supplier: item.supplier,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      // Computed fields
      totalValue: item.quantity * parseFloat(item.unit_cost),
      isLowStock: item.quantity <= item.reorder_level
    };
  }

  /**
   * Format transaction from database to API response
   * @param {object} txn - Database transaction
   * @returns {object} Formatted transaction
   */
  formatTransaction(txn) {
    return {
      id: txn.id,
      userId: txn.user_id,
      companyId: txn.company_id,
      itemId: txn.item_id,
      type: txn.type,
      quantity: txn.quantity,
      unitCost: parseFloat(txn.unit_cost),
      totalCost: parseFloat(txn.total_cost),
      transactionId: txn.transaction_id,
      notes: txn.notes,
      date: txn.date,
      createdAt: txn.created_at
    };
  }
}

// Export singleton instance
const inventoryService = new InventoryService();
export default inventoryService;
