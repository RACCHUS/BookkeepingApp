/**
 * @fileoverview Legacy Firebase Services Index
 * @description Barrel file for Firebase-based services (for fallback/migration)
 * @version 1.0.0
 */

export { default as firebaseService } from './cleanFirebaseService.js';
export { default as companyService } from './companyService.js';
export { default as payeeService } from './payeeService.js';
export * as incomeSourceService from './incomeSourceService.js';
