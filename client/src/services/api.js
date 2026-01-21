import axios from 'axios';
import toast from 'react-hot-toast';
import { auth } from './firebase';
import { supabaseClient } from './supabaseClient';
import { supabase } from './supabase';

// Create axios instance with base configuration (legacy - keeping for backward compatibility)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});


// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data, // Extract just the data from axios response
  (error) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Network error. Please check your connection.');
      }
      return Promise.reject(error);
    }

    const { status } = error.response;

    // Handle unauthorized access - redirect to login
    if (status === 401) {
      console.error('Unauthorized access - redirecting to login');
      // Clear any cached auth state and redirect
      auth.signOut().then(() => {
        window.location.href = '/login';
      }).catch(() => {
        window.location.href = '/login';
      });
      return Promise.reject(error);
    }

    // Handle forbidden access
    if (status === 403) {
      toast.error('You do not have permission to perform this action.');
      return Promise.reject(error);
    }

    // Handle not found
    if (status === 404) {
      // Don't toast for 404s - let the calling code handle it
      return Promise.reject(error);
    }

    // Handle server errors
    if (status >= 500) {
      toast.error('Server error. Please try again later.');
      return Promise.reject(error);
    }

    // For other errors (400, 422, etc.), let the calling code handle them
    return Promise.reject(error);
  }
);

// API methods
const apiClient = {
  // Transaction methods
  transactions: {
    getAll: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/transactions', {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    getById: (id) => api.get(`/transactions/${id}`),
    create: async (data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/transactions', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    update: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/transactions/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkUpdate: async (transactions) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.patch('/transactions/bulk', { transactions }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkCreate: async (transactions) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/transactions/bulk', { transactions }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
      getSummary: async (startDate, endDate, filters = {}) => {
        // Authenticated request: fetch token and set Authorization header
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        return api.get('/transactions/summary', {
          params: { startDate, endDate, ...filters },
          headers: { Authorization: `Bearer ${token}` }
        });
      },
    getClassificationSuggestions: (transactionIds) => api.post('/transactions/classify', { transactionIds }),
    bulkUpdateCategories: (updates) => api.post('/transactions/bulk-categorize', { updates }),
    getCategoryStats: async (startDate, endDate, filters = {}) => {
      // Authenticated request: fetch token and set Authorization header
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/transactions/stats', {
        params: { startDate, endDate, ...filters },
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },
  // PDF methods
  pdf: {
    upload: async (formData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/pdf/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
    },
    process: async (fileId, options = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/pdf/process/${fileId}`, options, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getStatus: async (processId) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/pdf/status/${processId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getUploads: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/pdf/uploads', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    deleteUpload: async (uploadId) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/pdf/uploads/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    renameUpload: async (uploadId, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/pdf/uploads/${uploadId}/rename`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    updateUploadCompany: async (uploadId, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/pdf/uploads/${uploadId}/company`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getUploadDetails: async (uploadId) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/pdf/uploads/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    linkTransactions: async (uploadId, transactionIds) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/pdf/uploads/${uploadId}/link-transactions`, { transactionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    unlinkTransactions: async (transactionIds) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/pdf/uploads/unlink-transactions', { transactionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // CSV Import methods
  csv: {
    /**
     * Get list of supported bank formats
     * @returns {Promise<{success: boolean, data: Array<{key: string, name: string}>}>}
     */
    getBanks: async () => {
      return api.get('/csv/banks');
    },

    /**
     * Upload CSV file and get preview of parsed transactions
     * @param {FormData} formData - Form data with csv file, bankFormat, companyId
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    upload: async (formData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      // Don't set Content-Type manually - let axios set it with proper boundary
      return api.post('/csv/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },

    /**
     * Get headers from CSV for custom mapping
     * @param {FormData} formData - Form data with csv file
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    getHeaders: async (formData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/csv/headers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
    },

    /**
     * Re-preview CSV with different column mapping
     * @param {string} uploadId - Upload ID from initial upload
     * @param {Object} options - { mapping, bankFormat }
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    preview: async (uploadId, options = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/csv/preview/${uploadId}`, options, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    /**
     * Confirm import and save transactions to database
     * @param {string} uploadId - Upload ID from initial upload
     * @param {Object} options - { companyId, companyName, skipDuplicates }
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    confirm: async (uploadId, options = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/csv/confirm/${uploadId}`, options, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    /**
     * Cancel pending CSV import
     * @param {string} uploadId - Upload ID to cancel
     * @returns {Promise<{success: boolean}>}
     */
    cancel: async (uploadId) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/csv/cancel/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    // ============================================
    // CSV Import Management Methods
    // ============================================

    /**
     * Get all CSV imports for the user
     * @param {Object} params - Query params { companyId, status, limit, offset }
     * @returns {Promise<{success: boolean, data: Array, count: number}>}
     */
    getImports: async (params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/csv/imports', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    /**
     * Get a single CSV import by ID
     * @param {string} importId - CSV import ID
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    getImportById: async (importId) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/csv/imports/${importId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    /**
     * Get transactions linked to a CSV import
     * @param {string} importId - CSV import ID
     * @param {Object} params - Query params { limit, offset }
     * @returns {Promise<{success: boolean, data: Array, count: number}>}
     */
    getImportTransactions: async (importId, params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/csv/imports/${importId}/transactions`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    /**
     * Delete a CSV import
     * @param {string} importId - CSV import ID
     * @param {Object} options - { deleteTransactions: boolean, deleteImportId: boolean }
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    deleteImport: async (importId, options = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/csv/imports/${importId}`, {
        data: options,
        headers: { Authorization: `Bearer ${token}` }
      });
    },

    /**
     * Delete transactions linked to a CSV import
     * @param {string} importId - CSV import ID
     * @param {Object} options - { deleteImportId: boolean }
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    deleteImportTransactions: async (importId, options = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/csv/imports/${importId}/transactions`, {
        data: options,
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // Classification methods
  classification: {
    classify: async (transaction) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/classification/classify', { transaction }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    testClassification: async (transaction) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/classification/test', { transaction }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    train: async (transactions) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/classification/train', { transactions }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkReclassify: async (filters = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/classification/bulk-reclassify', { filters }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getStats: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/classification/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getRules: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/classification/rules', {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getUncategorized: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/classification/uncategorized', {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    createRule: async (rule) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/classification/rules', rule, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    updateRule: async (id, rule) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/classification/rules/${id}`, rule, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    deleteRule: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/classification/rules/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // Report methods
  reports: {
    generateSummaryPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/summary-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generateTaxSummaryPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/tax-summary-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generateCategoryBreakdownPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/category-breakdown-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generateChecksPaidPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/checks-paid-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    download: async (fileName) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/reports/download/${fileName}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    profitLoss: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/profit-loss', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    expenseSummary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/expense-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    employeeSummary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/employee-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    taxSummary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/tax-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    // 1099-NEC Summary Report
    get1099Summary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/1099-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generate1099SummaryPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/1099-summary-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    // Vendor Payment Summary Report
    getVendorSummary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/vendor-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generateVendorSummaryPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/vendor-summary-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    // Payee Summary Report
    getPayeeSummary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/payee-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generatePayeeSummaryPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/payee-summary-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    // Monthly Summary Report
    getMonthlySummary: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/monthly-summary', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generateMonthlySummaryPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/monthly-summary-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    // Monthly Checks Report
    getMonthlyChecks: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/monthly-checks', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    generateMonthlyChecksPDF: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/reports/monthly-checks-pdf', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    exportPDF: async (reportType, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/reports/export/${reportType}`, data, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getHistory: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/reports/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // Company methods
  companies: {
    getAll: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getById: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    create: async (data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/companies', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    update: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/companies/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    setDefault: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/companies/${id}/set-default`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getTransactionsWithoutCompany: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/companies/transactions/unassigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkAssignTransactions: async (companyId, transactionIds) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/companies/${companyId}/assign-transactions`, { transactionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkUnassignTransactions: async (transactionIds) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.patch('/transactions/bulk-unassign-company', { transactionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // Payee methods
  payees: {
    getAll: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/payees', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getById: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/payees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    create: async (data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/payees', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    update: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/payees/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/payees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getEmployees: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/payees/employees', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getVendors: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/payees/vendors', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getTransactionsWithoutPayees: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/payees/transactions-without-payees', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getTransactionsWithoutVendors: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/payees/transactions-without-vendors', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    assignToTransaction: async (transactionId, payeeId, payeeName) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.patch(`/transactions/${transactionId}/assign-payee`, {
        payeeId,
        payeeName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkAssign: async (transactionIds, payeeId, payeeName) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.patch('/transactions/bulk-assign-payee', {
        transactionIds,
        payeeId,
        payeeName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    bulkUnassign: async (transactionIds) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.patch('/transactions/bulk-unassign-payee', { transactionIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getTransactionsByPayee: async (payeeId, params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/payees/${payeeId}/transactions`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getPayeeSummary: async (payeeId, params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/payees/${payeeId}/summary`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // Income Sources methods
  incomeSources: {
    getAll: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/income-sources', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getById: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/income-sources/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    create: async (data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/income-sources', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    update: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/income-sources/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/income-sources/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getTransactions: async (sourceId, params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/income-sources/${sourceId}/transactions`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getSummary: async (sourceId, params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/income-sources/${sourceId}/summary`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },

  // Inventory methods
  inventory: {
    getAll: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/inventory', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getById: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get(`/inventory/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    create: async (data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post('/inventory', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    update: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.put(`/inventory/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.delete(`/inventory/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    adjustStock: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/inventory/${id}/adjust`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    recordSale: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/inventory/${id}/sale`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    recordPurchase: async (id, data) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.post(`/inventory/${id}/purchase`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getValuation: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/inventory/report/valuation', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getLowStock: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/inventory/report/low-stock', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getTransactions: async (params) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/inventory/transactions', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getCategories: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return api.get('/inventory/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  },
};

// Use Supabase client for primary operations (transactions, companies, payees, etc.)
// Supabase Edge Functions handle PDF parsing and report generation
const hybridApiClient = {
  // Use Supabase directly for these
  transactions: supabaseClient.transactions,
  companies: supabaseClient.companies,
  payees: supabaseClient.payees,
  incomeSources: supabaseClient.incomeSources,
  receipts: supabaseClient.receipts,
  checks: supabaseClient.checks,
  vendors: supabaseClient.vendors,
  csv: supabaseClient.csv, // CSV parsing is now client-side
  
  // Use Supabase Edge Functions for PDF and reports
  pdf: supabaseClient.pdf,
  reports: supabaseClient.reports,
  
  // Classification uses local rules now (no server needed)
  classification: {
    applyRules: async (transactions) => {
      // Client-side classification logic
      // Uses stored rules from Supabase
      return { success: true, data: transactions };
    },
    getRules: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Fetch classification rules from Supabase
      const { data, error } = await supabase
        .from('classification_rules')
        .select('*')
        .eq('user_id', user.uid)
        .order('priority', { ascending: false });
      if (error) throw error;
      
      // Transform to frontend format (pattern -> keywords array)
      const rules = (data || []).map(rule => ({
        id: rule.id,
        keywords: rule.pattern ? rule.pattern.split(',').map(k => k.trim()) : [],
        category: rule.category,
        name: rule.name,
        patternType: rule.pattern_type,
        priority: rule.priority,
        isActive: rule.is_active
      }));
      
      return { success: true, data: rules };
    },
    getUncategorized: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.uid)
        .or('category.is.null,category.eq.')
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return { success: true, data: data || [] };
    },
    createRule: async (rule) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Transform from frontend format (keywords array -> pattern string)
      const dbRule = {
        user_id: user.uid,
        name: rule.keywords.join(', ').substring(0, 50) || 'Rule',
        pattern: Array.isArray(rule.keywords) ? rule.keywords.join(',') : rule.keywords,
        pattern_type: 'contains',
        category: rule.category,
        is_active: true,
        priority: 0
      };
      
      const { data, error } = await supabase
        .from('classification_rules')
        .insert(dbRule)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    },
    deleteRule: async (ruleId) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('classification_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', user.uid);
      if (error) throw error;
      return { success: true };
    },
    
    /**
     * Apply a rule to existing uncategorized transactions
     * @param {string[]} keywords - Keywords to match in description/payee
     * @param {string} category - Category to apply
     * @returns {Promise<{success: boolean, count: number}>}
     */
    applyRuleToExisting: async (keywords, category) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // First, fetch all uncategorized transactions
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, description, payee')
        .eq('user_id', user.uid)
        .or('category.is.null,category.eq.');
      
      if (fetchError) throw fetchError;
      if (!transactions || transactions.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Find transactions that match any of the keywords
      const matchingIds = transactions
        .filter(tx => {
          const searchText = `${tx.description || ''} ${tx.payee || ''}`.toLowerCase();
          return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
        })
        .map(tx => tx.id);
      
      if (matchingIds.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Update all matching transactions
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          category,
          updated_at: new Date().toISOString(),
          last_modified_by: user.uid
        })
        .in('id', matchingIds)
        .eq('user_id', user.uid);
      
      if (updateError) throw updateError;
      
      return { success: true, count: matchingIds.length };
    },
  },
  
  // File uploads handled via Supabase Storage
  uploads: {
    upload: async (file, bucket = 'receipts') => {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
        
      return { success: true, data: { url: urlData.publicUrl, path: data.path } };
    },
    delete: async (path, bucket = 'receipts') => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      if (error) throw error;
      return { success: true };
    },
  },
  
  // Invoicing - simplified version without email (uses Supabase)
  invoicing: {
    getAll: async (params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });
        
      const { data, error, count } = await query;
      if (error) throw error;
      return { success: true, data: { invoices: data || [], total: count } };
    },
    create: async (invoiceData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({ ...invoiceData, user_id: user.uid })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    },
    update: async (id, invoiceData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', id)
        .eq('user_id', user.uid)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    },
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', user.uid);
      if (error) throw error;
      return { success: true };
    },
  },
  
  // Inventory - using Supabase directly
  inventory: {
    getAll: async (params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      console.log('Inventory getAll - user.uid:', user.uid);
      
      let query = supabase
        .from('inventory_items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.uid)
        .order('name');
      
      // Apply filters
      if (params.companyId) {
        query = query.eq('company_id', params.companyId);
      }
      if (params.category) {
        query = query.eq('category', params.category);
      }
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
      }
        
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Inventory getAll error:', error);
        throw error;
      }
      
      return { success: true, data: { items: data || [], total: count } };
    },
    
    getById: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.uid)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
    
    getLowStock: async (params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Get items where quantity <= reorder_level
      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.uid)
        .eq('is_active', true);
      
      if (params.companyId) {
        query = query.eq('company_id', params.companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter for low stock items (quantity <= reorder_level)
      const lowStockItems = (data || []).filter(item => item.quantity <= item.reorder_level);
      
      return { success: true, data: { items: lowStockItems } };
    },
    
    getTransactions: async (params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      let query = supabase
        .from('inventory_transactions')
        .select('*, inventory_items(id, name, sku)')
        .eq('user_id', user.uid)
        .order('date', { ascending: false });
      
      if (params.itemId) {
        query = query.eq('item_id', params.itemId);
      }
      if (params.companyId) {
        query = query.eq('company_id', params.companyId);
      }
      if (params.type) {
        query = query.eq('type', params.type);
      }
      if (params.startDate) {
        query = query.gte('date', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('date', params.endDate);
      }
      
      const limit = params.limit || 100;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return { success: true, data: { transactions: data || [] } };
    },
    
    getValuation: async (params = {}) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.uid)
        .eq('is_active', true);
      
      if (params.companyId) {
        query = query.eq('company_id', params.companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calculate valuation
      const items = data || [];
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const totalRetailValue = items.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
      
      return { 
        success: true, 
        data: { 
          items, 
          totalCostValue: totalValue,
          totalRetailValue,
          itemCount: items.length
        } 
      };
    },
    
    getCategories: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('category')
        .eq('user_id', user.uid)
        .not('category', 'is', null);
      
      if (error) throw error;
      
      // Get unique categories
      const categories = [...new Set((data || []).map(item => item.category).filter(Boolean))];
      
      return { success: true, data: { categories } };
    },
    
    create: async (itemData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({ 
          user_id: user.uid,
          sku: itemData.sku || null,
          name: itemData.name,
          description: itemData.description || null,
          category: itemData.category || null,
          unit_cost: itemData.unitCost || 0,
          selling_price: itemData.sellingPrice || 0,
          quantity: itemData.quantity || 0,
          reorder_level: itemData.reorderLevel || 0,
          unit: itemData.unit || 'each',
          supplier: itemData.supplier || null,
          company_id: itemData.companyId || null,
          is_active: true
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    },
    
    update: async (id, itemData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Transform camelCase to snake_case for database
      const updateData = {};
      if (itemData.sku !== undefined) updateData.sku = itemData.sku;
      if (itemData.name !== undefined) updateData.name = itemData.name;
      if (itemData.description !== undefined) updateData.description = itemData.description;
      if (itemData.category !== undefined) updateData.category = itemData.category;
      if (itemData.unitCost !== undefined) updateData.unit_cost = itemData.unitCost;
      if (itemData.sellingPrice !== undefined) updateData.selling_price = itemData.sellingPrice;
      if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity;
      if (itemData.reorderLevel !== undefined) updateData.reorder_level = itemData.reorderLevel;
      if (itemData.unit !== undefined) updateData.unit = itemData.unit;
      if (itemData.supplier !== undefined) updateData.supplier = itemData.supplier;
      if (itemData.companyId !== undefined) updateData.company_id = itemData.companyId;
      if (itemData.isActive !== undefined) updateData.is_active = itemData.isActive;
      
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.uid)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    },
    
    delete: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.uid);
      if (error) throw error;
      return { success: true };
    },
    
    adjustStock: async (itemId, adjustmentData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Create inventory transaction
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert({
          user_id: user.uid,
          item_id: itemId,
          type: adjustmentData.type || 'adjustment',
          quantity: adjustmentData.quantity,
          unit_cost: adjustmentData.unitCost || 0,
          notes: adjustmentData.notes || null,
          date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // The trigger will update the inventory_items quantity
      return { success: true, data };
    },
    
    recordSale: async (itemId, saleData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Create a sale transaction (negative quantity)
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert({
          user_id: user.uid,
          item_id: itemId,
          type: 'sale',
          quantity: -Math.abs(saleData.quantity), // Negative for stock out
          transaction_id: saleData.transactionId || null,
          date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
    
    recordPurchase: async (itemId, purchaseData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Create a purchase transaction (positive quantity)
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert({
          user_id: user.uid,
          item_id: itemId,
          type: 'purchase',
          quantity: Math.abs(purchaseData.quantity), // Positive for stock in
          unit_cost: purchaseData.unitCost || 0,
          transaction_id: purchaseData.transactionId || null,
          date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    },
  },
};

export { api, apiClient, supabaseClient, hybridApiClient };
export default hybridApiClient;
