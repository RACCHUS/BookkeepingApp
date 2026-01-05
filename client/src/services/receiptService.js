/**
 * Receipt Service - Frontend API client for receipt management
 * @description Provides API methods for receipts CRUD, batch operations, and file uploads
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
 * Receipt API Service
 */
const receiptService = {
  /**
   * Create a new receipt (with optional image)
   * @param {Object} receiptData - Receipt data
   * @param {File} file - Optional image file
   * @returns {Promise<Object>} Created receipt
   */
  createReceipt: async (receiptData, file = null) => {
    const headers = await getAuthHeaders();
    
    if (file) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('image', file);
      Object.keys(receiptData).forEach(key => {
        if (receiptData[key] !== null && receiptData[key] !== undefined && receiptData[key] !== '') {
          formData.append(key, receiptData[key]);
        }
      });
      
      const response = await axios.post(`${API_BASE}/receipts`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } else {
      // JSON request without file
      const response = await axios.post(`${API_BASE}/receipts`, receiptData, {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    }
  },

  /**
   * Get paginated list of receipts with filters
   * @param {Object} filters - Filter options
   * @param {Object} sort - Sort options { field, order }
   * @param {Object} pagination - Pagination { limit, offset }
   * @returns {Promise<Object>} { data: receipts[], pagination }
   */
  getReceipts: async (filters = {}, sort = {}, pagination = {}) => {
    const headers = await getAuthHeaders();
    
    const params = {
      ...filters,
      sortBy: sort.field,
      sortOrder: sort.order,
      limit: pagination.limit,
      offset: pagination.offset
    };
    
    // Remove undefined/null params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      }
    });
    
    const response = await axios.get(`${API_BASE}/receipts`, {
      headers,
      params
    });
    return response.data;
  },

  /**
   * Get receipt by ID
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Receipt data
   */
  getReceiptById: async (receiptId) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/receipts/${receiptId}`, {
      headers
    });
    return response.data;
  },

  /**
   * Update receipt
   * @param {string} receiptId - Receipt ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated receipt
   */
  updateReceipt: async (receiptId, updates) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/receipts/${receiptId}`, updates, {
      headers
    });
    return response.data;
  },

  /**
   * Delete receipt
   * @param {string} receiptId - Receipt ID
   * @param {Object} options - { deleteTransaction: boolean }
   * @returns {Promise<Object>} Success response
   */
  deleteReceipt: async (receiptId, options = {}) => {
    const headers = await getAuthHeaders();
    const params = {};
    if (options.deleteTransaction !== undefined) {
      params.deleteTransaction = options.deleteTransaction;
    }
    const response = await axios.delete(`${API_BASE}/receipts/${receiptId}`, {
      headers,
      params
    });
    return response.data;
  },

  /**
   * Batch update multiple receipts
   * @param {string[]} receiptIds - Array of receipt IDs
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} { successful, failed }
   */
  batchUpdateReceipts: async (receiptIds, updates) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/receipts/batch`, {
      receiptIds,
      updates
    }, {
      headers
    });
    return response.data;
  },

  /**
   * Batch delete multiple receipts
   * @param {string[]} receiptIds - Array of receipt IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  batchDeleteReceipts: async (receiptIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/receipts/batch`, {
      headers,
      data: { receiptIds }
    });
    return response.data;
  },

  /**
   * Attach receipt to transaction
   * @param {string} receiptId - Receipt ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Updated receipt
   */
  attachToTransaction: async (receiptId, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/${receiptId}/attach`, {
      transactionId
    }, {
      headers
    });
    return response.data;
  },

  /**
   * Detach receipt from transaction
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Updated receipt
   */
  detachFromTransaction: async (receiptId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/${receiptId}/detach`, {}, {
      headers
    });
    return response.data;
  },

  /**
   * Bulk link multiple receipts to a single transaction
   * @param {string[]} receiptIds - Array of receipt IDs
   * @param {string} transactionId - Transaction ID to link to
   * @returns {Promise<Object>} { successful, failed }
   */
  bulkLinkToTransaction: async (receiptIds, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/bulk-link`, {
      receiptIds,
      transactionId
    }, { headers });
    return response.data;
  },

  /**
   * Bulk unlink multiple receipts from their transactions
   * @param {string[]} receiptIds - Array of receipt IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  bulkUnlinkFromTransactions: async (receiptIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/bulk-unlink`, {
      receiptIds
    }, { headers });
    return response.data;
  },

  /**
   * Link a receipt to multiple transactions at once
   * @param {string} receiptId - Receipt ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @returns {Promise<Object>} Updated receipt with results
   */
  linkToMultipleTransactions: async (receiptId, transactionIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/${receiptId}/link-multiple`, {
      transactionIds
    }, { headers });
    return response.data;
  },

  /**
   * Add a single transaction link to receipt (multi-transaction support)
   * @param {string} receiptId - Receipt ID
   * @param {string} transactionId - Transaction ID to add
   * @returns {Promise<Object>} Updated receipt
   */
  addTransactionLink: async (receiptId, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/${receiptId}/add-link/${transactionId}`, {}, {
      headers
    });
    return response.data;
  },

  /**
   * Remove a single transaction link from receipt
   * @param {string} receiptId - Receipt ID
   * @param {string} transactionId - Transaction ID to remove
   * @returns {Promise<Object>} Updated receipt
   */
  removeTransactionLink: async (receiptId, transactionId) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/receipts/${receiptId}/remove-link/${transactionId}`, {
      headers
    });
    return response.data;
  },

  /**
   * Upload or replace image for existing receipt
   * @param {string} receiptId - Receipt ID
   * @param {File} file - Image file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Updated receipt
   */
  uploadImage: async (receiptId, file, onProgress = null) => {
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await axios.post(`${API_BASE}/receipts/${receiptId}/upload`, formData, {
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
   * Delete image from receipt (keep receipt record)
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Updated receipt
   */
  deleteImage: async (receiptId) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/receipts/${receiptId}/image`, {
      headers
    });
    return response.data;
  },

  /**
   * Get receipt statistics
   * @returns {Promise<Object>} Statistics
   */
  getReceiptStats: async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/receipts/stats`, {
      headers
    });
    return response.data;
  },

  /**
   * Bulk create receipts from transactions
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise<Object>} { successCount, failCount, receipts, failed }
   */
  bulkCreateFromTransactions: async (transactions) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/bulk-from-transactions`, {
      transactions
    }, {
      headers
    });
    return response.data;
  },

  /**
   * Bulk create receipts (with automatic transaction creation for each)
   * PRIMARY use case: Quickly enter multiple cash/off-statement purchases
   * @param {Array} receipts - Array of receipt data objects
   * @returns {Promise<Object>} { results, allSucceeded, someSucceeded, successCount, failCount }
   */
  bulkCreate: async (receipts) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/receipts/bulk`, {
      receipts
    }, {
      headers
    });
    return response.data;
  }
};

export default receiptService;
