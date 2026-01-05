/**
 * Manual mock for cleanFirebaseService
 * Jest will automatically use this when cleanFirebaseService is imported in tests
 */

import { jest } from '@jest/globals';

export default {
  // Classification Rules
  getClassificationRules: jest.fn(),
  createClassificationRule: jest.fn(),
  updateClassificationRule: jest.fn(),
  deleteClassificationRule: jest.fn(),
  
  // Transactions
  getTransactions: jest.fn(),
  getTransactionById: jest.fn(),
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  
  // Uploads
  getUploads: jest.fn(),
  getUploadById: jest.fn(),
  createUpload: jest.fn(),
  updateUpload: jest.fn(),
  deleteUpload: jest.fn(),
  
  // Companies
  getCompanies: jest.fn(),
  getCompanyById: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};
