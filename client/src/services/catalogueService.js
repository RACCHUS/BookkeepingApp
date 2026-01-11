/**
 * Catalogue API Service
 * 
 * Frontend API client for catalogue management using Supabase directly
 * 
 * @author BookkeepingApp Team
 */

import { supabase } from './supabase';
import { auth } from './firebase';

/**
 * Get current Firebase user ID
 */
async function getUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
}

/**
 * Transform database row to camelCase
 */
function transformItem(item) {
  return {
    id: item.id,
    userId: item.user_id,
    companyId: item.company_id,
    name: item.name,
    description: item.description,
    sku: item.sku,
    category: item.category,
    unitPrice: parseFloat(item.unit_price) || 0,
    unit: item.unit,
    taxRate: parseFloat(item.tax_rate) || 0,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * Get all catalogue items
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function getCatalogueItems(options = {}) {
  const userId = await getUserId();
  
  let query = supabase
    .from('catalogue_items')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('name');
  
  if (options.companyId) {
    query = query.eq('company_id', options.companyId);
  }
  if (options.category) {
    query = query.eq('category', options.category);
  }
  if (options.activeOnly) {
    query = query.eq('is_active', true);
  }
  if (options.search) {
    query = query.or(`name.ilike.%${options.search}%,sku.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    success: true,
    data: {
      items: (data || []).map(transformItem),
      total: count || 0
    }
  };
}

/**
 * Get a single catalogue item
 * @param {string} id - Item ID
 * @returns {Promise<Object>}
 */
export async function getCatalogueItem(id) {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('catalogue_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: transformItem(data)
  };
}

/**
 * Create a new catalogue item
 * @param {Object} itemData - Item data
 * @returns {Promise<Object>}
 */
export async function createCatalogueItem(itemData) {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('catalogue_items')
    .insert({
      user_id: userId,
      company_id: itemData.companyId || null,
      name: itemData.name,
      description: itemData.description || null,
      sku: itemData.sku || null,
      category: itemData.category || null,
      unit_price: itemData.unitPrice || 0,
      unit: itemData.unit || 'each',
      tax_rate: itemData.taxRate || 0,
      is_active: itemData.isActive !== false,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: transformItem(data)
  };
}

/**
 * Update a catalogue item
 * @param {string} id - Item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateCatalogueItem(id, updates) {
  const userId = await getUserId();
  
  // Transform camelCase to snake_case
  const updateData = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.sku !== undefined) updateData.sku = updates.sku;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.companyId !== undefined) updateData.company_id = updates.companyId;
  
  const { data, error } = await supabase
    .from('catalogue_items')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: transformItem(data)
  };
}

/**
 * Delete a catalogue item
 * @param {string} id - Item ID
 * @param {boolean} hard - Permanently delete if true
 * @returns {Promise<Object>}
 */
export async function deleteCatalogueItem(id, hard = false) {
  const userId = await getUserId();
  
  if (hard) {
    // Hard delete - permanently remove
    const { error } = await supabase
      .from('catalogue_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  } else {
    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('catalogue_items')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }
  
  return { success: true };
}

/**
 * Get unique categories
 * @param {string} companyId - Optional company ID
 * @returns {Promise<Object>}
 */
export async function getCategories(companyId = null) {
  const userId = await getUserId();
  
  let query = supabase
    .from('catalogue_items')
    .select('category')
    .eq('user_id', userId)
    .not('category', 'is', null);
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Get unique categories
  const categories = [...new Set((data || []).map(item => item.category).filter(Boolean))];
  
  return {
    success: true,
    data: { categories }
  };
}

/**
 * Duplicate a catalogue item
 * @param {string} id - Item ID to duplicate
 * @returns {Promise<Object>}
 */
export async function duplicateCatalogueItem(id) {
  const userId = await getUserId();
  
  // Get the original item
  const { data: original, error: fetchError } = await supabase
    .from('catalogue_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Create a copy with a modified name
  const { data, error } = await supabase
    .from('catalogue_items')
    .insert({
      user_id: userId,
      company_id: original.company_id,
      name: `${original.name} (Copy)`,
      description: original.description,
      sku: original.sku ? `${original.sku}-COPY` : null,
      category: original.category,
      unit_price: original.unit_price,
      unit: original.unit,
      tax_rate: original.tax_rate,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: transformItem(data)
  };
}

export default {
  getCatalogueItems,
  getCatalogueItem,
  createCatalogueItem,
  updateCatalogueItem,
  deleteCatalogueItem,
  getCategories,
  duplicateCatalogueItem
};
