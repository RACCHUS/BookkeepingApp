/**
 * Catalogue API Service
 * 
 * Frontend API client for catalogue management
 * 
 * @author BookkeepingApp Team
 */

import { api } from './apiClient';
import { auth } from './firebase';

const BASE_URL = '/catalogue';

/**
 * Helper to get auth headers
 */
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Get all catalogue items
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function getCatalogueItems(options = {}) {
  const params = new URLSearchParams();
  
  if (options.companyId) params.append('companyId', options.companyId);
  if (options.category) params.append('category', options.category);
  if (options.activeOnly !== undefined) params.append('activeOnly', options.activeOnly);
  if (options.search) params.append('search', options.search);
  
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
  const headers = await getAuthHeaders();
  
  return api.get(url, { headers });
}

/**
 * Get a single catalogue item
 * @param {string} id - Item ID
 * @returns {Promise<Object>}
 */
export async function getCatalogueItem(id) {
  const headers = await getAuthHeaders();
  return api.get(`${BASE_URL}/${id}`, { headers });
}

/**
 * Create a new catalogue item
 * @param {Object} itemData - Item data
 * @returns {Promise<Object>}
 */
export async function createCatalogueItem(itemData) {
  const headers = await getAuthHeaders();
  return api.post(BASE_URL, itemData, { headers });
}

/**
 * Update a catalogue item
 * @param {string} id - Item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateCatalogueItem(id, updates) {
  const headers = await getAuthHeaders();
  return api.put(`${BASE_URL}/${id}`, updates, { headers });
}

/**
 * Delete a catalogue item
 * @param {string} id - Item ID
 * @param {boolean} hard - Permanently delete if true
 * @returns {Promise<Object>}
 */
export async function deleteCatalogueItem(id, hard = false) {
  const url = hard ? `${BASE_URL}/${id}?hard=true` : `${BASE_URL}/${id}`;
  const headers = await getAuthHeaders();
  return api.delete(url, { headers });
}

/**
 * Get unique categories
 * @param {string} companyId - Optional company ID
 * @returns {Promise<Object>}
 */
export async function getCategories(companyId = null) {
  const url = companyId 
    ? `${BASE_URL}/categories?companyId=${companyId}` 
    : `${BASE_URL}/categories`;
  const headers = await getAuthHeaders();
  return api.get(url, { headers });
}

/**
 * Duplicate a catalogue item
 * @param {string} id - Item ID to duplicate
 * @returns {Promise<Object>}
 */
export async function duplicateCatalogueItem(id) {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/${id}/duplicate`, {}, { headers });
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
