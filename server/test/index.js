/**
 * @fileoverview Test Index - Centralized test exports and configuration
 * @description Main entry point for all test utilities and fixtures
 * @version 1.0.0
 */

// Export test helpers
export * from './fixtures/helpers/testHelpers.js';

// Export mock data
export * from './fixtures/mocks/mockData.js';

// Export test setup utilities
export { default as testUtils } from './setup/testSetup.js';

// Test configuration constants
export const TEST_CONFIG = {
  // Test timeouts
  TIMEOUT_SHORT: 5000,
  TIMEOUT_MEDIUM: 10000,
  TIMEOUT_LONG: 30000,
  
  // Test environments
  ENV_UNIT: 'unit',
  ENV_INTEGRATION: 'integration',
  ENV_E2E: 'e2e',
  
  // Mock service URLs
  MOCK_API_BASE: 'http://localhost:3001',
  MOCK_AUTH_URL: 'http://localhost:9099',
  
  // Test database settings
  TEST_DB_NAME: 'bookkeeping-test',
  TEST_COLLECTION_PREFIX: 'test_'
};

// Test suite runners
export const TEST_SUITES = {
  unit: {
    pattern: 'test/unit/**/*.test.js',
    timeout: TEST_CONFIG.TIMEOUT_SHORT
  },
  integration: {
    pattern: 'test/integration/**/*.test.js',
    timeout: TEST_CONFIG.TIMEOUT_MEDIUM
  },
  services: {
    pattern: 'test/unit/services/**/*.test.js',
    timeout: TEST_CONFIG.TIMEOUT_SHORT
  },
  utils: {
    pattern: 'test/unit/utils/**/*.test.js',
    timeout: TEST_CONFIG.TIMEOUT_SHORT
  },
  api: {
    pattern: 'test/integration/api/**/*.test.js',
    timeout: TEST_CONFIG.TIMEOUT_MEDIUM
  }
};

// Common test assertions
export const COMMON_ASSERTIONS = {
  // Success response structure
  SUCCESS_RESPONSE: {
    success: true,
    message: expect.any(String),
    data: expect.anything()
  },
  
  // Error response structure
  ERROR_RESPONSE: {
    success: false,
    error: expect.any(String),
    details: expect.anything()
  },
  
  // Standard entity fields
  ENTITY_FIELDS: {
    id: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String)
  }
};
