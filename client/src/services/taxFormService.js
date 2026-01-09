/**
 * Tax Form Service
 * 
 * API client for tax form generation endpoints
 * 
 * @author BookkeepingApp Team
 */

import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Get authorization headers
 * @returns {Promise<Object>} Headers with auth token
 */
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Tax Form API client
 */
const taxFormService = {
  // ==================== 1099-NEC ====================

  /**
   * Preview 1099-NEC data for a payee
   * @param {string} payeeId - Payee ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Preview data
   */
  preview1099NEC: async (payeeId, options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    if (options.taxYear) params.append('taxYear', options.taxYear);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/1099-nec/preview/${payeeId}?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to preview 1099-NEC');
    }
    
    return response.json();
  },

  /**
   * Generate 1099-NEC PDF for a payee
   * @param {string} payeeId - Payee ID
   * @param {Object} options - Query options
   * @returns {Promise<Blob>} PDF blob
   */
  generate1099NEC: async (payeeId, options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    if (options.taxYear) params.append('taxYear', options.taxYear);
    if (options.flatten !== undefined) params.append('flatten', options.flatten);
    if (options.ignoreErrors) params.append('ignoreErrors', 'true');
    
    const response = await fetch(
      `${API_BASE}/tax-forms/1099-nec/generate/${payeeId}?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.join(', ') || 'Failed to generate 1099-NEC');
    }
    
    return response.blob();
  },

  /**
   * Bulk generate 1099-NEC forms
   * @param {string} companyId - Company ID
   * @param {number} taxYear - Tax year (optional)
   * @returns {Promise<Object>} Bulk generation results
   */
  bulkGenerate1099NEC: async (companyId, taxYear = null) => {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/tax-forms/1099-nec/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId, taxYear })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to bulk generate 1099-NECs');
    }
    
    return response.json();
  },

  // ==================== 1099-MISC ====================

  /**
   * Preview 1099-MISC data for a payee
   * @param {string} payeeId - Payee ID
   * @param {Object} paymentData - Payment data
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Preview data
   */
  preview1099MISC: async (payeeId, paymentData = {}, options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/1099-misc/preview/${payeeId}?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to preview 1099-MISC');
    }
    
    return response.json();
  },

  /**
   * Generate 1099-MISC PDF for a payee
   * @param {string} payeeId - Payee ID
   * @param {Object} paymentData - Payment data
   * @param {Object} options - Query options
   * @returns {Promise<Blob>} PDF blob
   */
  generate1099MISC: async (payeeId, paymentData, options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    if (options.flatten !== undefined) params.append('flatten', options.flatten);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/1099-misc/generate/${payeeId}?${params}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.join(', ') || 'Failed to generate 1099-MISC');
    }
    
    return response.blob();
  },

  // ==================== W-2 ====================

  /**
   * Preview W-2 data for an employee
   * @param {string} employeeId - Employee ID
   * @param {Object} wageData - Wage data (optional)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Preview data
   */
  previewW2: async (employeeId, wageData = null, options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/w2/preview/${employeeId}?${params}`,
      {
        method: wageData ? 'POST' : 'GET',
        headers,
        ...(wageData ? { body: JSON.stringify(wageData) } : {})
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to preview W-2');
    }
    
    return response.json();
  },

  /**
   * Generate W-2 PDF for an employee
   * @param {string} employeeId - Employee ID
   * @param {Object} wageData - Wage data
   * @param {Object} options - Query options
   * @returns {Promise<Blob>} PDF blob
   */
  generateW2: async (employeeId, wageData, options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    if (options.flatten !== undefined) params.append('flatten', options.flatten);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/w2/generate/${employeeId}?${params}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(wageData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.join(', ') || 'Failed to generate W-2');
    }
    
    return response.blob();
  },

  /**
   * Bulk generate W-2 forms
   * @param {string} companyId - Company ID
   * @param {number} taxYear - Tax year (optional)
   * @param {Object} wageDataMap - Map of employeeId to wage data (optional)
   * @returns {Promise<Object>} Bulk generation results
   */
  bulkGenerateW2: async (companyId, taxYear = null, wageDataMap = {}) => {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/tax-forms/w2/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId, taxYear, wageDataMap })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to bulk generate W-2s');
    }
    
    return response.json();
  },

  // ==================== Summary & Utilities ====================

  /**
   * Get tax form summary for a tax year
   * @param {number} taxYear - Tax year
   * @param {string} companyId - Company ID (optional)
   * @returns {Promise<Object>} Summary data
   */
  getTaxFormSummary: async (taxYear, companyId = null) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/summary/${taxYear}?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get tax form summary');
    }
    
    return response.json();
  },

  /**
   * Get payees with missing tax form information
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Missing info data
   */
  getMissingInfo: async (options = {}) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options.companyId) params.append('companyId', options.companyId);
    if (options.formType) params.append('formType', options.formType);
    
    const response = await fetch(
      `${API_BASE}/tax-forms/missing-info?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get missing info');
    }
    
    return response.json();
  },

  // ==================== Utility Functions ====================

  /**
   * Download a blob as a file
   * @param {Blob} blob - PDF blob
   * @param {string} fileName - File name
   */
  downloadBlob: (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Open blob in new tab for preview
   * @param {Blob} blob - PDF blob
   */
  previewBlob: (blob) => {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
};

export default taxFormService;
