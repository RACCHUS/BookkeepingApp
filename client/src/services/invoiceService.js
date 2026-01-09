/**
 * Invoice API Service
 * 
 * @author BookkeepingApp Team
 */

import { api } from './apiClient';
import { auth } from './firebase';

const BASE_URL = '/invoices';

/**
 * Helper to get auth headers
 */
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function getInvoices(options = {}) {
  const params = new URLSearchParams();
  if (options.companyId) params.append('companyId', options.companyId);
  if (options.clientId) params.append('clientId', options.clientId);
  if (options.status) params.append('status', options.status);
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.overdue) params.append('overdue', options.overdue);
  
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
  const headers = await getAuthHeaders();
  return api.get(url, { headers });
}

export async function getInvoice(id) {
  const headers = await getAuthHeaders();
  return api.get(`${BASE_URL}/${id}`, { headers });
}

export async function createInvoice(invoiceData) {
  const headers = await getAuthHeaders();
  return api.post(BASE_URL, invoiceData, { headers });
}

export async function createInvoiceFromQuote(quoteId, paymentTerms = 'net_30') {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/from-quote/${quoteId}`, { payment_terms: paymentTerms }, { headers });
}

export async function updateInvoice(id, updates) {
  const headers = await getAuthHeaders();
  return api.put(`${BASE_URL}/${id}`, updates, { headers });
}

export async function deleteInvoice(id, permanent = false) {
  const url = permanent ? `${BASE_URL}/${id}?permanent=true` : `${BASE_URL}/${id}`;
  const headers = await getAuthHeaders();
  return api.delete(url, { headers });
}

export async function recordPayment(invoiceId, paymentData) {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/${invoiceId}/payments`, paymentData, { headers });
}

export async function deletePayment(invoiceId, paymentId) {
  const headers = await getAuthHeaders();
  return api.delete(`${BASE_URL}/${invoiceId}/payments/${paymentId}`, { headers });
}

export async function getInvoiceSummary(options = {}) {
  const params = new URLSearchParams();
  if (options.companyId) params.append('companyId', options.companyId);
  
  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}/summary?${queryString}` : `${BASE_URL}/summary`;
  const headers = await getAuthHeaders();
  return api.get(url, { headers });
}

export async function downloadInvoicePDF(id) {
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
    : `invoice-${id}.pdf`;
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function sendInvoiceEmail(id) {
  const headers = await getAuthHeaders();
  return api.post(`${BASE_URL}/${id}/send`, {}, { headers });
}

export default {
  getInvoices,
  getInvoice,
  createInvoice,
  createInvoiceFromQuote,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  deletePayment,
  getInvoiceSummary,
  downloadInvoicePDF,
  sendInvoiceEmail
};
