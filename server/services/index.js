/**
 * @fileoverview Services Module - Centralized service exports
 * @description Barrel file for all business logic services
 * @version 2.0.0 - Enhanced with professional organization
 */

// Core Services
export { default as firebaseService } from './cleanFirebaseService.js';
export { default as companyService } from './companyService.js';
export { default as payeeService } from './payeeService.js';

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

/**
 * Service categories for easy reference
 */
export const SERVICE_CATEGORIES = {
  CORE: 'core',
  PDF: 'pdf',
  TRANSACTION: 'transaction',
  REPORT: 'report',
  PARSER: 'parser'
};

/**
 * Quick access to main services
 */
export const MAIN_SERVICES = {
  firebase: firebaseService,
  company: companyService,
  payee: payeeService,
  pdf: chasePDFParser,
  classifier: transactionClassifier,
  reports: reportService
};
