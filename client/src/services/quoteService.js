/**
 * Quote API Service
 * 
 * @author BookkeepingApp Team
 */

import { api } from './apiClient';
import { auth } from './firebase';

const BASE_URL = '/quotes';

/**
 * Helper to get auth headers
 */
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function getQuotes(options = {}) {
  const params = new URLSearchParams();
  if (options.companyId) params.append('companyId', options.companyId);
  if (options.clientId) params.append('clientId', options.clientId);
  if (options.status) params.append('status', options.status);
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
  const headers = await getAuthHeaders();
  return api.get(url, { headers });
}

export async function getQuote(id) {
  const headers = await getAuthHeaders();
  return api.get(`${BASE_URL}/${id}`, { headers });
}

export async function createQuote(quoteData) {
  const headers = await getAuthHeaders();
  return api.post(BASE_URL, quoteData, { headers });
}

export async function updateQuote(id, updates) {
  const headers = await getAuthHeaders();
  return api.put(`${BASE_URL}/${id}`, updates, { headers });
}

export async function deleteQuote(id) {
  const headers = await getAuthHeaders();
  return api.delete(`${BASE_URL}/${id}`, { headers });
}

export async function updateQuoteStatus(id, status) {
  const headers = await getAuthHeaders();
  return api.put(`${BASE_URL}/${id}/status`, { status }, { headers });
}

export async function convertQuoteToInvoice(id, paymentTerms = 'net_30') {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/${id}/convert`, { payment_terms: paymentTerms }, { headers });
}

export async function duplicateQuote(id) {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/${id}/duplicate`, {}, { headers });
}

export async function downloadQuotePDF(id) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${apiBaseUrl}${BASE_URL}/${id}/pdf`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to download PDF');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Extract filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
    : `quote-${id}.pdf`;
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function sendQuoteEmail(id) {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/${id}/send`, {}, { headers });
}

export default {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  updateQuoteStatus,
  convertQuoteToInvoice,
  duplicateQuote,
  downloadQuotePDF,
  sendQuoteEmail
};
