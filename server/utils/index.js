/**
 * Centralized Utility Exports
 * 
 * This file provides a central point for importing all utility modules.
 * It enables clean imports and better organization of utility functions
 * throughout the application.
 * 
 * Usage:
 * import { pathUtils, validation, responseHelpers } from '../utils/index.js';
 * import { formatCurrency, validateAmount } from '../utils/index.js';
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// Import all utility modules
import * as pathUtils from './pathUtils.js';
import * as validation from './validation.js';
import * as responseHelpers from './responseHelpers.js';
import * as dateUtils from './dateUtils.js';
import * as financialUtils from './financialUtils.js';
import * as errorHandler from './errorHandler.js';
import * as sectionFiltering from './sectionFiltering.js';

// Export modules as namespaces
export {
  pathUtils,
  validation,
  responseHelpers,
  dateUtils,
  financialUtils,
  errorHandler,
  sectionFiltering
};

// Export commonly used functions directly for convenience
export {
  // Path utilities
  getCurrentDir,
  getCurrentFile,
  getProjectRoot,
  getServerRoot,
  resolveServerPath,
  resolveProjectPath,
  getCommonPaths,
  ensureDirectoryExists
} from './pathUtils.js';

export {
  // Validation utilities
  validateAmount,
  validateDate,
  validateEIN,
  validateEmail,
  validatePhone,
  validateCategory,
  validateDescription,
  validatePagination,
  validateDateRange,
  sanitizeString,
  validateObjectId
} from './validation.js';

export {
  // Response helpers
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthError,
  sendForbiddenError,
  sendNotFoundError,
  sendServerError,
  sendRateLimitError,
  sendPaginatedSuccess,
  sendCreatedResponse,
  sendNoContentResponse,
  sendFileResponse,
  sendHealthResponse
} from './responseHelpers.js';

export {
  // Date utilities
  formatDate,
  getDayBounds,
  getMonthBounds,
  getYearBounds,
  getFiscalYearBounds,
  getQuarterBounds,
  daysBetween,
  addDays,
  addMonths,
  isInPast,
  isToday,
  getRelativeDate,
  parseDate,
  getBusinessDays,
  generateDateRange
} from './dateUtils.js';

export {
  // Financial utilities
  formatCurrency,
  calculatePercentage,
  calculatePercentageChange,
  sumAmounts,
  calculateRunningBalance,
  categorizeAmounts,
  calculateProfitLoss,
  calculateTaxEstimate,
  calculateQuarterlyTax,
  calculateExpenseRatios,
  calculateAverageAmount,
  calculateDepreciation,
  validateFinancialAmount
} from './financialUtils.js';

export {
  // Error handling utilities
  isFirestoreIndexError,
  getIndexErrorMessage,
  extractIndexCreationUrl,
  logIndexError,
  withIndexFallback
} from './errorHandler.js';

export {
  // Section filtering utilities
  filterTransactionsBySection,
  getTransactionSectionSummary,
  getAvailableSectionCodes,
  isValidSectionCode,
  getSectionStatistics
} from './sectionFiltering.js';

// Utility configuration
export const utilsConfig = {
  version: '1.0.0',
  modules: [
    'pathUtils',
    'validation', 
    'responseHelpers',
    'dateUtils',
    'financialUtils',
    'errorHandler',
    'sectionFiltering'
  ],
  commonlyUsed: [
    'formatCurrency',
    'validateAmount',
    'sendSuccess',
    'sendError',
    'formatDate',
    'getCurrentDir'
  ]
};

/**
 * Utility Functions Overview:
 * 
 * pathUtils - File and directory path utilities for ES modules
 * validation - Data validation and sanitization functions
 * responseHelpers - Standardized API response formatting
 * dateUtils - Date manipulation and formatting utilities
 * financialUtils - Financial calculations and formatting
 * errorHandler - Firestore and general error handling
 * sectionFiltering - Transaction section filtering and analysis
 */
