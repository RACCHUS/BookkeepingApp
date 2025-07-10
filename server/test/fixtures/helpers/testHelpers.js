/**
 * @fileoverview Test Helpers - Utility functions for testing
 * @description Common testing utilities and helper functions
 * @version 1.0.0
 */

import { jest } from '@jest/globals';

/**
 * Creates a mock Express request object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
export const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: { uid: 'test-user-123' },
  ...overrides
});

/**
 * Creates a mock Express response object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock response object
 */
export const createMockResponse = (overrides = {}) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    ...overrides
  };
  return res;
};

/**
 * Creates a mock Express next function
 * @returns {Function} Mock next function
 */
export const createMockNext = () => jest.fn();

/**
 * Creates a mock Firebase document reference
 * @param {Object} data - Document data
 * @returns {Object} Mock document reference
 */
export const createMockFirebaseDoc = (data = {}) => ({
  id: 'mock-doc-id',
  data: jest.fn().mockReturnValue(data),
  exists: true,
  get: jest.fn().mockResolvedValue({
    id: 'mock-doc-id',
    data: () => data,
    exists: true
  }),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined)
});

/**
 * Creates a mock Firebase collection reference
 * @param {Array} docs - Array of documents
 * @returns {Object} Mock collection reference
 */
export const createMockFirebaseCollection = (docs = []) => ({
  doc: jest.fn((id) => createMockFirebaseDoc(docs.find(d => d.id === id) || {})),
  add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    docs: docs.map(doc => createMockFirebaseDoc(doc)),
    empty: docs.length === 0,
    size: docs.length
  })
});

/**
 * Creates a mock Firebase service
 * @param {Object} mockData - Mock data for the service
 * @returns {Object} Mock Firebase service
 */
export const createMockFirebaseService = (mockData = {}) => ({
  isInitialized: true,
  db: {
    collection: jest.fn((name) => createMockFirebaseCollection(mockData[name] || []))
  },
  createTransaction: jest.fn().mockResolvedValue({ id: 'new-transaction-id' }),
  getTransactions: jest.fn().mockResolvedValue(mockData.transactions || []),
  updateTransaction: jest.fn().mockResolvedValue(true),
  deleteTransaction: jest.fn().mockResolvedValue(true),
  getCompanies: jest.fn().mockResolvedValue(mockData.companies || []),
  createCompany: jest.fn().mockResolvedValue('new-company-id'),
  getPayees: jest.fn().mockResolvedValue(mockData.payees || []),
  createPayee: jest.fn().mockResolvedValue('new-payee-id')
});

/**
 * Assertion helpers for testing
 */
export const assertResponseSuccess = (res, expectedData = null) => {
  expect(res.status).toHaveBeenCalledWith(200);
  if (expectedData) {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expectedData
      })
    );
  } else {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true
      })
    );
  }
};

export const assertResponseError = (res, expectedStatus = 400, expectedMessage = null) => {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  if (expectedMessage) {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining(expectedMessage)
      })
    );
  } else {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false
      })
    );
  }
};

/**
 * Database testing helpers
 */
export const clearMockDatabase = () => {
  jest.clearAllMocks();
};

export const seedMockDatabase = (mockData) => {
  // Implementation depends on your specific mock setup
  return mockData;
};

/**
 * File system helpers for testing
 */
export const createTempFile = async (content = 'test content', extension = '.txt') => {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  
  const tempDir = os.tmpdir();
  const filename = `test-${Date.now()}${extension}`;
  const filepath = path.join(tempDir, filename);
  
  await fs.writeFile(filepath, content);
  return filepath;
};

export const deleteTempFile = async (filepath) => {
  const fs = await import('fs/promises');
  try {
    await fs.unlink(filepath);
  } catch (error) {
    // File might not exist, ignore error
  }
};
