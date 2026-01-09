/**
 * Catalogue Service
 * 
 * Manages product/service catalogue items for quotes and invoices
 * 
 * @author BookkeepingApp Team
 */

import { getDatabaseAdapter } from '../adapters/index.js';
import logger from '../../config/logger.js';

const TABLE_NAME = 'catalogue_items';

/**
 * Get all catalogue items for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getCatalogueItems(userId, options = {}) {
  try {
    const db = getDatabaseAdapter();
    const { companyId, category, activeOnly = true, search } = options;
    
    let query = { user_id: userId };
    
    if (companyId) {
      query.company_id = companyId;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (activeOnly) {
      query.is_active = true;
    }
    
    let items = await db.query(TABLE_NAME, query);
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by name
    items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    return items;
  } catch (error) {
    logger.error('Error getting catalogue items:', error);
    throw error;
  }
}

/**
 * Get a single catalogue item by ID
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object|null>}
 */
export async function getCatalogueItem(userId, itemId) {
  try {
    const db = getDatabaseAdapter();
    const item = await db.getById(TABLE_NAME, itemId);
    
    if (!item || item.user_id !== userId) {
      return null;
    }
    
    return item;
  } catch (error) {
    logger.error('Error getting catalogue item:', error);
    throw error;
  }
}

/**
 * Create a new catalogue item
 * @param {string} userId - User ID
 * @param {Object} itemData - Item data
 * @returns {Promise<Object>}
 */
export async function createCatalogueItem(userId, itemData) {
  try {
    const db = getDatabaseAdapter();
    
    const item = {
      user_id: userId,
      company_id: itemData.company_id || null,
      name: itemData.name.trim(),
      description: itemData.description?.trim() || null,
      sku: itemData.sku?.trim() || null,
      category: itemData.category?.trim() || null,
      unit_price: parseFloat(itemData.unit_price) || 0,
      unit: itemData.unit || 'each',
      tax_rate: parseFloat(itemData.tax_rate) || 0,
      is_active: itemData.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const created = await db.create(TABLE_NAME, item);
    
    logger.info(`Created catalogue item: ${created.id} - ${created.name}`);
    return created;
  } catch (error) {
    logger.error('Error creating catalogue item:', error);
    throw error;
  }
}

/**
 * Update a catalogue item
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateCatalogueItem(userId, itemId, updates) {
  try {
    const db = getDatabaseAdapter();
    
    // Verify ownership
    const existing = await getCatalogueItem(userId, itemId);
    if (!existing) {
      throw new Error('Catalogue item not found');
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.sku !== undefined) updateData.sku = updates.sku?.trim() || null;
    if (updates.category !== undefined) updateData.category = updates.category?.trim() || null;
    if (updates.unit_price !== undefined) updateData.unit_price = parseFloat(updates.unit_price) || 0;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.tax_rate !== undefined) updateData.tax_rate = parseFloat(updates.tax_rate) || 0;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.company_id !== undefined) updateData.company_id = updates.company_id || null;
    
    const updated = await db.update(TABLE_NAME, itemId, updateData);
    
    logger.info(`Updated catalogue item: ${itemId}`);
    return updated;
  } catch (error) {
    logger.error('Error updating catalogue item:', error);
    throw error;
  }
}

/**
 * Soft delete a catalogue item (set inactive)
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>}
 */
export async function deleteCatalogueItem(userId, itemId) {
  try {
    const db = getDatabaseAdapter();
    
    // Verify ownership
    const existing = await getCatalogueItem(userId, itemId);
    if (!existing) {
      throw new Error('Catalogue item not found');
    }
    
    // Soft delete - set inactive
    const updated = await db.update(TABLE_NAME, itemId, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
    
    logger.info(`Soft deleted catalogue item: ${itemId}`);
    return updated;
  } catch (error) {
    logger.error('Error deleting catalogue item:', error);
    throw error;
  }
}

/**
 * Hard delete a catalogue item
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @returns {Promise<void>}
 */
export async function hardDeleteCatalogueItem(userId, itemId) {
  try {
    const db = getDatabaseAdapter();
    
    // Verify ownership
    const existing = await getCatalogueItem(userId, itemId);
    if (!existing) {
      throw new Error('Catalogue item not found');
    }
    
    await db.delete(TABLE_NAME, itemId);
    
    logger.info(`Hard deleted catalogue item: ${itemId}`);
  } catch (error) {
    logger.error('Error hard deleting catalogue item:', error);
    throw error;
  }
}

/**
 * Get unique categories for a user
 * @param {string} userId - User ID
 * @param {string} companyId - Optional company ID
 * @returns {Promise<Array<string>>}
 */
export async function getCategories(userId, companyId = null) {
  try {
    const items = await getCatalogueItems(userId, { companyId, activeOnly: false });
    
    const categories = [...new Set(
      items
        .map(item => item.category)
        .filter(Boolean)
    )].sort();
    
    return categories;
  } catch (error) {
    logger.error('Error getting categories:', error);
    throw error;
  }
}

/**
 * Duplicate a catalogue item
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID to duplicate
 * @returns {Promise<Object>}
 */
export async function duplicateCatalogueItem(userId, itemId) {
  try {
    const existing = await getCatalogueItem(userId, itemId);
    if (!existing) {
      throw new Error('Catalogue item not found');
    }
    
    const duplicateData = {
      ...existing,
      name: `${existing.name} (Copy)`,
      sku: existing.sku ? `${existing.sku}-COPY` : null
    };
    
    // Remove fields that shouldn't be copied
    delete duplicateData.id;
    delete duplicateData.created_at;
    delete duplicateData.updated_at;
    delete duplicateData.user_id;
    
    return await createCatalogueItem(userId, duplicateData);
  } catch (error) {
    logger.error('Error duplicating catalogue item:', error);
    throw error;
  }
}

export default {
  getCatalogueItems,
  getCatalogueItem,
  createCatalogueItem,
  updateCatalogueItem,
  deleteCatalogueItem,
  hardDeleteCatalogueItem,
  getCategories,
  duplicateCatalogueItem
};
