/**
 * @fileoverview Jest Configuration for Server Tests
 * @description Comprehensive Jest configuration for unit and integration testing
 * @version 1.0.0
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup/testSetup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Transform configuration for ES modules
  extensionsToTreatAsEsm: ['.js'],
  transform: {},
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'middlewares/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/node_modules/**',
    '!coverage/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Globals
  globals: {
    '__TEST_ENV__': true
  }
};
