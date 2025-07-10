/**
 * Controller exports for the bookkeeping application
 * Centralized exports for all controllers
 */

// PDF processing controllers
export {
  uploadPDF,
  processPDF,
  getPDFStatus,
  getUserUploads,
  testChasePDF,
  getUploadDetails,
  renameUpload,
  deleteUpload,
  updateUploadCompany
} from './pdfController.js';

// Transaction management controllers
export {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  classifyTransaction,
  getTransactionsByUpload,
  getTransactionSummary,
  batchUpdateTransactions,
  exportTransactions
} from './transactionController.js';

// Company management controllers
export {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyTransactions,
  getCompanyReports
} from './companyController.js';

// Report generation controllers
export {
  getReports,
  generateMonthlyReport,
  generateQuarterlyReport,
  generateYearlyReport,
  generateCustomReport,
  getReportData,
  exportReport
} from './reportController.js';

// Payee management controllers
export {
  getPayees,
  createPayee,
  updatePayee,
  deletePayee,
  getEmployees,
  assignPayeeToTransaction,
  getTransactionsWithoutPayees,
  suggestPayeeForTransaction
} from './payeeController.js';

// Classification controllers
export {
  classifyTransactions,
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  trainClassifier,
  getClassificationStats
} from './classificationController.js';

// Mock data controllers (for testing)
export {
  getMockTransactions,
  createMockTransaction,
  generateMockData,
  clearMockData
} from './mockTransactionController.js';

/**
 * Controller groups for different API modules
 */
export const pdfControllers = {
  uploadPDF,
  processPDF,
  getPDFStatus,
  getUserUploads,
  testChasePDF,
  getUploadDetails,
  renameUpload,
  deleteUpload,
  updateUploadCompany
};

export const transactionControllers = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  classifyTransaction,
  getTransactionsByUpload,
  getTransactionSummary,
  batchUpdateTransactions,
  exportTransactions
};

export const companyControllers = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyTransactions,
  getCompanyReports
};

export const reportControllers = {
  getReports,
  generateMonthlyReport,
  generateQuarterlyReport,
  generateYearlyReport,
  generateCustomReport,
  getReportData,
  exportReport
};

export const payeeControllers = {
  getPayees,
  createPayee,
  updatePayee,
  deletePayee,
  getEmployees,
  assignPayeeToTransaction,
  getTransactionsWithoutPayees,
  suggestPayeeForTransaction
};

export const classificationControllers = {
  classifyTransactions,
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  trainClassifier,
  getClassificationStats
};

/**
 * Controller configuration for validation and middleware
 */
export const controllerConfig = {
  // Controllers that require strict authentication
  protectedControllers: [
    'deleteUpload',
    'deleteTransaction',
    'deleteCompany',
    'deletePayee',
    'deleteClassificationRule'
  ],
  
  // Controllers that support pagination
  paginatedControllers: [
    'getTransactions',
    'getCompanies',
    'getPayees',
    'getReports',
    'getUserUploads'
  ],
  
  // Controllers that support filtering
  filterableControllers: [
    'getTransactions',
    'getCompanies',
    'getReports',
    'getPayees'
  ],
  
  // Controllers that handle file uploads
  fileUploadControllers: [
    'uploadPDF'
  ],
  
  // Controllers that generate exports
  exportControllers: [
    'exportTransactions',
    'exportReport'
  ]
};
