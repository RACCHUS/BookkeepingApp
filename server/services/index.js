/**
 * @fileoverview Services Module - Centralized service exports
 * @description Barrel file for all business logic services
 * @version 3.0.0 - Added database adapter pattern for multi-provider support
 */

// =============================================================================
// DATABASE ADAPTER (Primary - use this for new code)
// =============================================================================
// The adapter automatically uses Supabase or Firebase based on DB_PROVIDER env var
export { 
  db, 
  getDatabaseAdapter, 
  createDatabaseAdapter,
  switchDatabaseProvider,
  getDbProvider,
  DB_PROVIDERS 
} from './adapters/index.js';

// =============================================================================
// LEGACY FIREBASE SERVICES (For backwards compatibility)
// =============================================================================
// These are the original Firebase services - kept for migration period
// New code should use the `db` adapter instead
export { default as firebaseService } from './cleanFirebaseService.js';
export { default as companyService } from './companyService.js';
export { default as payeeService } from './payeeService.js';
export { default as checkService } from './checkService.js';

// PDF Processing
export { default as chasePDFParser } from './chasePDFParser.js';

// Transaction Services
export { default as transactionClassifier } from './transactionClassifier.js';
export { default as transactionClassifierService } from './transactionClassifierService.js';

// Report Services
export { default as reportGenerator } from './reportGenerator.js';
export { default as reportService } from './reportService.js';

// Specialized Modules
export * as parsers from './parsers/index.js';
export * as reports from './reports/index.js';

// Adapters
export * as adapters from './adapters/index.js';

/**
 * Service categories for easy reference
 */
export const SERVICE_CATEGORIES = {
  CORE: 'core',
  DATABASE: 'database',
  PDF: 'pdf',
  TRANSACTION: 'transaction',
  REPORT: 'report',
  PARSER: 'parser'
};

/**
 * Quick access to main services
 * @deprecated Use `db` adapter for database operations
 */
export const MAIN_SERVICES = {
  firebase: firebaseService,
  company: companyService,
  payee: payeeService,
  pdf: chasePDFParser,
  classifier: transactionClassifier,
  reports: reportService
};
