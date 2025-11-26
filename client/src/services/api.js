import axios from 'axios';
import { auth } from './firebase';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});


// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data, // Extract just the data from axios response
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access - redirecting to login');
      // You might want to redirect to login here
    }
    // For errors, we still want to reject with the full error object
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
    create: (data) => api.post('/transactions', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: (id) => api.delete(`/transactions/${id}`),
    bulkUpdate: (transactions) => api.patch('/transactions/bulk', { transactions }),
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
};

export { api, apiClient };
export default apiClient;
