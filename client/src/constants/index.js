// Import shared constants
import { IRS_CATEGORIES, TRANSACTION_TYPES } from '../../../shared/constants/categories.js';

// UI Constants
export const UI_CONSTANTS = {
  // Theme
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.pdf', '.csv', '.xlsx', '.xls'],
  
  // Date Formats
  DATE_FORMAT: 'MM/dd/yyyy',
  DATETIME_FORMAT: 'MM/dd/yyyy HH:mm',
  ISO_DATE_FORMAT: 'yyyy-MM-dd',
  
  // Currency
  DEFAULT_CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$',
  
  // Loading States
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 4000,
  
  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_COMPANY_NAME_LENGTH: 100,
};

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  CATEGORIZED: 'categorized',
  REVIEWED: 'reviewed',
  RECONCILED: 'reconciled',
};

// Upload Status
export const UPLOAD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Processing Status Colors
export const STATUS_COLORS = {
  [UPLOAD_STATUS.PENDING]: 'yellow',
  [UPLOAD_STATUS.PROCESSING]: 'blue',
  [UPLOAD_STATUS.COMPLETED]: 'green',
  [UPLOAD_STATUS.FAILED]: 'red',
  [UPLOAD_STATUS.CANCELLED]: 'gray',
};

// Chart Colors
export const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#EC4899', // pink-500
  '#6B7280', // gray-500
];

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'bookkeeping-theme',
  USER_PREFERENCES: 'bookkeeping-user-preferences',
  LAST_COMPANY: 'bookkeeping-last-company',
  DASHBOARD_CONFIG: 'bookkeeping-dashboard-config',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a PDF, CSV, or Excel file.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: `Password must be at least ${UI_CONSTANTS.MIN_PASSWORD_LENGTH} characters.`,
  AMOUNT_INVALID: 'Please enter a valid amount.',
  DATE_INVALID: 'Please enter a valid date.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  TRANSACTION_CREATED: 'Transaction created successfully.',
  TRANSACTION_UPDATED: 'Transaction updated successfully.',
  TRANSACTION_DELETED: 'Transaction deleted successfully.',
  COMPANY_CREATED: 'Company created successfully.',
  COMPANY_UPDATED: 'Company updated successfully.',
  FILE_UPLOADED: 'File uploaded successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
  REPORT_GENERATED: 'Report generated successfully.',
};

// Re-export shared constants
export { IRS_CATEGORIES, TRANSACTION_TYPES };

// Export all constants
export default {
  UI_CONSTANTS,
  TRANSACTION_STATUS,
  UPLOAD_STATUS,
  STATUS_COLORS,
  CHART_COLORS,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  IRS_CATEGORIES,
  TRANSACTION_TYPES,
};
