// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  
  // Transactions
  TRANSACTIONS: {
    BASE: '/api/transactions',
    BY_ID: (id) => `/api/transactions/${id}`,
    CLASSIFY: '/api/transactions/classify',
    BULK_UPDATE: '/api/transactions/bulk-update',
  },
  
  // Companies
  COMPANIES: {
    BASE: '/api/companies',
    BY_ID: (id) => `/api/companies/${id}`,
  },
  
  // PDF Processing
  PDF: {
    UPLOAD: '/api/pdf/upload',
    PROCESS: '/api/pdf/process',
  },
  
  // Uploads
  UPLOADS: {
    BASE: '/api/uploads',
    BY_ID: (id) => `/api/uploads/${id}`,
    STATUS: (id) => `/api/uploads/${id}/status`,
  },
  
  // Reports
  REPORTS: {
    BASE: '/api/reports',
    TRANSACTION_SUMMARY: '/api/reports/transaction-summary-pdf',
    TAX_SUMMARY: '/api/reports/tax-summary-pdf',
    CHECKS_PAID: '/api/reports/checks-paid-pdf',
    CATEGORY_BREAKDOWN: '/api/reports/category-breakdown-pdf',
  },
  
  // Payees
  PAYEES: {
    BASE: '/api/payees',
    BY_ID: (id) => `/api/payees/${id}`,
    BY_COMPANY: (companyId) => `/api/payees/company/${companyId}`,
  },
  
  // Classification Rules
  CLASSIFICATION: {
    BASE: '/api/classification',
    RULES: '/api/classification/rules',
    RULE_BY_ID: (id) => `/api/classification/rules/${id}`,
  },
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Query Keys for React Query
export const QUERY_KEYS = {
  TRANSACTIONS: 'transactions',
  TRANSACTION_BY_ID: 'transaction',
  COMPANIES: 'companies',
  COMPANY_BY_ID: 'company',
  UPLOADS: 'uploads',
  UPLOAD_BY_ID: 'upload',
  PAYEES: 'payees',
  PAYEE_BY_ID: 'payee',
  PAYEES_BY_COMPANY: 'payees-by-company',
  CLASSIFICATION_RULES: 'classification-rules',
  USER_PROFILE: 'user-profile',
};
