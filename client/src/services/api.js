import axios from 'axios';
import { auth } from './firebase';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return config;
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
    getAll: (params) => api.get('/transactions', { params }),
    getById: (id) => api.get(`/transactions/${id}`),
    create: (data) => api.post('/transactions', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: (id) => api.delete(`/transactions/${id}`),
    bulkUpdate: (transactions) => api.patch('/transactions/bulk', { transactions }),
    getSummary: (startDate, endDate, filters = {}) => api.get('/transactions/summary', { 
      params: { startDate, endDate, ...filters } 
    }),
    getClassificationSuggestions: (transactionIds) => api.post('/transactions/classify', { transactionIds }),
    bulkUpdateCategories: (updates) => api.post('/transactions/bulk-categorize', { updates }),
    getCategoryStats: (startDate, endDate, filters = {}) => api.get('/transactions/stats', {
      params: { startDate, endDate, ...filters }
    })
  },
  // PDF methods
  pdf: {
    upload: (formData) => api.post('/pdf/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    process: (fileId, options = {}) => api.post(`/pdf/process/${fileId}`, options),
    getStatus: (processId) => api.get(`/pdf/status/${processId}`),
    getUploads: (params) => api.get('/pdf/uploads', { params }),
    deleteUpload: (uploadId) => api.delete(`/pdf/uploads/${uploadId}`),
    renameUpload: (uploadId, data) => api.put(`/pdf/uploads/${uploadId}/rename`, data),
    updateUploadCompany: (uploadId, data) => api.put(`/pdf/uploads/${uploadId}/company`, data),
    getUploadDetails: (uploadId) => api.get(`/pdf/uploads/${uploadId}`)
  },

  // Classification methods
  classification: {
    classify: (transaction) => api.post('/classification/classify', { transaction }),
    testClassification: (transaction) => api.post('/classification/test', { transaction }),
    train: (transactions) => api.post('/classification/train', { transactions }),
    bulkReclassify: (filters = {}) => api.post('/classification/bulk-reclassify', { filters }),
    getStats: () => api.get('/classification/stats'),
    getRules: () => api.get('/classification/rules'),
    getUncategorized: () => api.get('/classification/uncategorized'),
    createRule: (rule) => api.post('/classification/rules', rule),
    updateRule: (id, rule) => api.put(`/classification/rules/${id}`, rule),
    deleteRule: (id) => api.delete(`/classification/rules/${id}`)
  },

  // Report methods
  reports: {
    generateSummaryPDF: (params) => api.post('/reports/summary-pdf', params, {
      responseType: 'blob'
    }),
    generateTaxSummaryPDF: (params) => api.post('/reports/tax-summary-pdf', params, {
      responseType: 'blob'
    }),
    generateCategoryBreakdownPDF: (params) => api.post('/reports/category-breakdown-pdf', params, {
      responseType: 'blob'
    }),
    generateChecksPaidPDF: (params) => api.post('/reports/checks-paid-pdf', params, {
      responseType: 'blob'
    }),
    download: (fileName) => api.get(`/reports/download/${fileName}`, {
      responseType: 'blob'
    }),
    profitLoss: (params) => api.get('/reports/profit-loss', { params }),
    expenseSummary: (params) => api.get('/reports/expense-summary', { params }),
    employeeSummary: (params) => api.get('/reports/employee-summary', { params }),
    taxSummary: (params) => api.get('/reports/tax-summary', { params }),
    exportPDF: (reportType, data) => api.post(`/reports/export/${reportType}`, data, {
      responseType: 'blob'
    }),
    getHistory: () => api.get('/reports/history')
  },

  // Company methods
  companies: {
    getAll: () => api.get('/companies'),
    getById: (id) => api.get(`/companies/${id}`),
    create: (data) => api.post('/companies', data),
    update: (id, data) => api.put(`/companies/${id}`, data),
    delete: (id) => api.delete(`/companies/${id}`),
    setDefault: (id) => api.put(`/companies/${id}/set-default`)
  },

  // Payee methods
  payees: {
    getAll: (params) => api.get('/payees', { params }),
    getById: (id) => api.get(`/payees/${id}`),
    create: (data) => api.post('/payees', data),
    update: (id, data) => api.put(`/payees/${id}`, data),
    delete: (id) => api.delete(`/payees/${id}`),
    getEmployees: (params) => api.get('/payees/employees', { params }),
    getVendors: (params) => api.get('/payees/vendors', { params }),
    getTransactionsWithoutPayees: (params) => api.get('/payees/transactions-without-payees', { params }),
    assignToTransaction: (transactionId, payeeId, payeeName) => api.patch(`/transactions/${transactionId}/assign-payee`, {
      payeeId,
      payeeName
    }),
    bulkAssign: (transactionIds, payeeId, payeeName) => api.patch('/transactions/bulk-assign-payee', {
      transactionIds,
      payeeId,
      payeeName
    }),
    getTransactionsByPayee: (payeeId, params) => api.get(`/payees/${payeeId}/transactions`, { params }),
    getPayeeSummary: (payeeId, params) => api.get(`/payees/${payeeId}/summary`, { params })
  },
};

export { apiClient };
export default apiClient;
