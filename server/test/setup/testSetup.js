/**
 * @fileoverview Test Setup - Global test configuration and initialization
 * @description Sets up test environment, mocks, and global test utilities
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global test configuration
global.__TEST_ENV__ = true;
global.__dirname = __dirname;

// Firebase Emulator Setup
// When USE_EMULATOR=true, tests will connect to local Firebase emulators
// Otherwise, Firebase Admin SDK is mocked via __mocks__/firebase-admin.js
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';

if (USE_EMULATOR) {
  console.log('🔥 Using Firebase Emulators for tests');
  // Emulator setup is done per-test-suite to allow proper isolation
  // Import emulatorSetup in integration tests that need real Firebase
} else {
  // Note: Firebase Admin SDK is mocked via __mocks__/firebase-admin.js
  // Jest will automatically use the manual mock when firebase-admin is imported
}

// Mock console methods for cleaner test output
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

beforeAll(() => {
  // Suppress console output during tests unless explicitly enabled
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  if (!process.env.VERBOSE_TESTS) {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test IDs
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Mock user ID for tests
  TEST_USER_ID: 'test-user-123',
  
  // Mock company ID for tests
  TEST_COMPANY_ID: 'test-company-456'
};

export default global.testUtils;
