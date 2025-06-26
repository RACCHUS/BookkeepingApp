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
export const apiClient = {
  // Transaction methods
  transactions: {
    getAll: (params) => api.get('/transactions', { params }),
    getById: (id) => api.get(`/transactions/${id}`),
    create: (data) => api.post('/transactions', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: (id) => api.delete(`/transactions/${id}`),
    bulkUpdate: (transactions) => api.patch('/transactions/bulk', { transactions }),
    getSummary: (params) => api.get('/transactions/summary', { params })
  },
  // PDF methods
  pdf: {
    upload: (formData) => api.post('/pdf/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    process: (fileId, options = {}) => api.post(`/pdf/process/${fileId}`, options),
    getStatus: (processId) => api.get(`/pdf/status/${processId}`),
    getUploads: (params) => api.get('/pdf/uploads', { params })
  },

  // Classification methods
  classification: {
    classify: (transaction) => api.post('/classification/classify', { transaction }),
    train: (transactions) => api.post('/classification/train', { transactions }),
    getRules: () => api.get('/classification/rules'),
    createRule: (rule) => api.post('/classification/rules', rule),
    updateRule: (id, rule) => api.put(`/classification/rules/${id}`, rule),
    deleteRule: (id) => api.delete(`/classification/rules/${id}`)
  },

  // Report methods
  reports: {
    profitLoss: (params) => api.get('/reports/profit-loss', { params }),
    expenseSummary: (params) => api.get('/reports/expense-summary', { params }),
    employeeSummary: (params) => api.get('/reports/employee-summary', { params }),
    taxSummary: (params) => api.get('/reports/tax-summary', { params }),
    exportPDF: (reportType, data) => api.post(`/reports/export/${reportType}`, data, {
      responseType: 'blob'
    }),
    getHistory: () => api.get('/reports/history')
  }
};

export default api;
