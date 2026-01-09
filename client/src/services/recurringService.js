/**
 * Recurring Invoice API Service
 * 
 * API client for recurring invoice schedule operations
 * 
 * @author BookkeepingApp Team
 */

import { api } from './apiClient';
import { auth } from './firebase';

const BASE_URL = '/recurring';

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
 * Get all recurring schedules
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Schedules list
 */
export async function getRecurringSchedules(params = {}) {
  const searchParams = new URLSearchParams();
  
  if (params.companyId) searchParams.set('companyId', params.companyId);
  if (params.activeOnly !== undefined) searchParams.set('activeOnly', params.activeOnly);
  
  const queryString = searchParams.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
  
  const headers = await getAuthHeaders();
  const response = await api.get(url, { headers });
  // Ensure we always return an object with schedules array
  return response.data || { schedules: [] };
}

/**
 * Get a single recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Schedule details
 */
export async function getRecurringSchedule(id) {
  const headers = await getAuthHeaders();
  const response = await api.get(`${BASE_URL}/${id}`, { headers });
  return response.data;
}

/**
 * Create a new recurring schedule
 * @param {Object} scheduleData - Schedule data
 * @returns {Promise<Object>} Created schedule
 */
export async function createRecurringSchedule(scheduleData) {
  const headers = await getAuthHeaders();
  const response = await api.post(BASE_URL, scheduleData, { headers });
  return response.data;
}

/**
 * Create recurring schedule from existing invoice
 * @param {string} invoiceId - Source invoice ID
 * @param {Object} options - Schedule options
 * @returns {Promise<Object>} Created schedule and invoice
 */
export async function createFromInvoice(invoiceId, options) {
  const headers = await getAuthHeaders();
  const response = await api.post(`${BASE_URL}/from-invoice`, {
    invoice_id: invoiceId,
    ...options
  }, { headers });
  return response.data;
}

/**
 * Update a recurring schedule
 * @param {string} id - Schedule ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated schedule
 */
export async function updateRecurringSchedule(id, updates) {
  const headers = await getAuthHeaders();
  const response = await api.put(`${BASE_URL}/${id}`, updates, { headers });
  return response.data;
}

/**
 * Delete a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteRecurringSchedule(id) {
  const headers = await getAuthHeaders();
  const response = await api.delete(`${BASE_URL}/${id}`, { headers });
  return response.data;
}

/**
 * Pause a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function pauseRecurringSchedule(id) {
  const headers = await getAuthHeaders();
  const response = await api.post(`${BASE_URL}/${id}/pause`, {}, { headers });
  return response.data;
}

/**
 * Resume a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function resumeRecurringSchedule(id) {
  const headers = await getAuthHeaders();
  const response = await api.post(`${BASE_URL}/${id}/resume`, {}, { headers });
  return response.data;
}

/**
 * Manually trigger processing of due recurring invoices
 * @returns {Promise<Object>} Processing results
 */
export async function processRecurringInvoices() {
  const headers = await getAuthHeaders();
  const response = await api.post(`${BASE_URL}/process`, {}, { headers });
  return response.data;
}

export default {
  getRecurringSchedules,
  getRecurringSchedule,
  createRecurringSchedule,
  createFromInvoice,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  pauseRecurringSchedule,
  resumeRecurringSchedule,
  processRecurringInvoices
};
