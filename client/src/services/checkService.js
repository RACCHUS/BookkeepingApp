/**
 * Check Service - Frontend API client for check management
 * @description Provides API methods for checks CRUD, batch operations, and file uploads
 * 
 * Checks can be:
 * - Income: checks you RECEIVE from others (deposits)
 * - Expense: checks you WRITE to pay others
 */

import axios from 'axios';
import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Get authorization headers with Firebase token
 */
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`
  };
};

/**
 * Check types
 */
export const CHECK_TYPES = {
  INCOME: 'income',   // Check received (deposit)
  EXPENSE: 'expense'  // Check written (payment)
};

/**
 * Check statuses
 */
export const CHECK_STATUSES = {
  PENDING: 'pending',
  CLEARED: 'cleared',
  BOUNCED: 'bounced',
  VOIDED: 'voided',
  CANCELLED: 'cancelled'
};

/**
 * Check API Service
 */
const checkService = {
  /**
   * Create a new check (with optional image)
   * @param {Object} checkData - Check data
   * @param {File} file - Optional image file
   * @returns {Promise<Object>} Created check
   */
  createCheck: async (checkData, file = null) => {
    const headers = await getAuthHeaders();
    
    if (file) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('image', file);
      Object.keys(checkData).forEach(key => {
        if (checkData[key] !== null && checkData[key] !== undefined && checkData[key] !== '') {
          formData.append(key, checkData[key]);
        }
      });
      
      const response = await axios.post(`${API_BASE}/checks`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } else {
      // JSON request without file
      const response = await axios.post(`${API_BASE}/checks`, checkData, {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    }
  },

  /**
   * Get paginated list of checks with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} { data: checks[], pagination }
   */
  getChecks: async (filters = {}) => {
    const headers = await getAuthHeaders();
    
    const params = { ...filters };
    
    // Remove undefined/null params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });
    
    const response = await axios.get(`${API_BASE}/checks`, {
      headers,
      params
    });
    return response.data;
  },

  /**
   * Get check by ID
   * @param {string} checkId - Check ID
   * @returns {Promise<Object>} Check data
   */
  getCheckById: async (checkId) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/checks/${checkId}`, {
      headers
    });
    return response.data;
  },

  /**
   * Update check
   * @param {string} checkId - Check ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated check
   */
  updateCheck: async (checkId, updates) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/checks/${checkId}`, updates, {
      headers
    });
    return response.data;
  },

  /**
   * Delete check
   * @param {string} checkId - Check ID
   * @param {Object} options - { deleteTransaction: boolean }
   * @returns {Promise<Object>} Success response
   */
  deleteCheck: async (checkId, options = {}) => {
    const headers = await getAuthHeaders();
    const params = {};
    if (options.deleteTransaction !== undefined) {
      params.deleteTransaction = options.deleteTransaction;
    }
    const response = await axios.delete(`${API_BASE}/checks/${checkId}`, {
      headers,
      params
    });
    return response.data;
  },

  /**
   * Upload or replace image for existing check
   * @param {string} checkId - Check ID
   * @param {File} file - Image file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Updated check
   */
  uploadImage: async (checkId, file, onProgress = null) => {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await axios.post(`${API_BASE}/checks/${checkId}/image`, formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      } : undefined
    });
    return response.data;
  },

  /**
   * Delete image from check (keep check record)
   * @param {string} checkId - Check ID
   * @returns {Promise<Object>} Updated check
   */
  deleteImage: async (checkId) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/checks/${checkId}/image`, {
      headers
    });
    return response.data;
  },

  /**
   * Link check to existing transaction
   * @param {string} checkId - Check ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Updated check
   */
  linkToTransaction: async (checkId, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/${checkId}/link/${transactionId}`, {}, {
      headers
    });
    return response.data;
  },

  /**
   * Unlink check from transaction
   * @param {string} checkId - Check ID
   * @returns {Promise<Object>} Updated check
   */
  unlinkFromTransaction: async (checkId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/${checkId}/unlink`, {}, {
      headers
    });
    return response.data;
  },

  /**
   * Bulk link multiple checks to a single transaction
   * @param {string[]} checkIds - Array of check IDs
   * @param {string} transactionId - Transaction ID to link to
   * @returns {Promise<Object>} { successful, failed }
   */
  bulkLinkToTransaction: async (checkIds, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/bulk-link`, {
      checkIds,
      transactionId
    }, { headers });
    return response.data;
  },

  /**
   * Bulk unlink multiple checks from their transactions
   * @param {string[]} checkIds - Array of check IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  bulkUnlinkFromTransactions: async (checkIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/bulk-unlink`, {
      checkIds
    }, { headers });
    return response.data;
  },

  /**
   * Link a check to multiple transactions at once
   * @param {string} checkId - Check ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @returns {Promise<Object>} Updated check with results
   */
  linkToMultipleTransactions: async (checkId, transactionIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/${checkId}/link-multiple`, {
      transactionIds
    }, { headers });
    return response.data;
  },

  /**
   * Add a single transaction link to check (multi-transaction support)
   * @param {string} checkId - Check ID
   * @param {string} transactionId - Transaction ID to add
   * @returns {Promise<Object>} Updated check
   */
  addTransactionLink: async (checkId, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/${checkId}/add-link/${transactionId}`, {}, {
      headers
    });
    return response.data;
  },

  /**
   * Remove a single transaction link from check
   * @param {string} checkId - Check ID
   * @param {string} transactionId - Transaction ID to remove
   * @returns {Promise<Object>} Updated check
   */
  removeTransactionLink: async (checkId, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/checks/${checkId}/remove-link/${transactionId}`, {
      headers
    });
    return response.data;
  },

  /**
   * Batch update multiple checks
   * @param {string[]} checkIds - Array of check IDs
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} { successful, failed }
   */
  batchUpdateChecks: async (checkIds, updates) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/checks/batch`, {
      checkIds,
      updates
    }, { headers });
    return response.data;
  },

  /**
   * Batch delete multiple checks
   * @param {string[]} checkIds - Array of check IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  batchDeleteChecks: async (checkIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/checks/batch`, {
      headers,
      data: { checkIds }
    });
    return response.data;
  },

  /**
   * Get check statistics
   * @param {Object} options - Filter options (companyId, startDate, endDate)
   * @returns {Promise<Object>} Statistics
   */
  getStats: async (options = {}) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/checks/stats`, {
      headers,
      params: options
    });
    return response.data;
  },

  /**
   * Bulk create checks from transactions
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise<Object>} { successCount, failCount, checks, failed }
   */
  bulkCreateFromTransactions: async (transactions) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/from-transactions`, {
      transactions
    }, {
      headers
    });
    return response.data;
  },

  /**
   * Bulk create checks (with automatic transaction creation for each)
   * @param {Array} checks - Array of check data objects
   * @returns {Promise<Object>} { results, allSucceeded, someSucceeded, successCount, failCount }
   */
  bulkCreate: async (checks) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/checks/bulk`, {
      checks
    }, {
      headers
    });
    return response.data;
  }
};

export default checkService;
