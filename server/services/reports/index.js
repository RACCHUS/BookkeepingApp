/**
 * @fileoverview Reports Module - Centralized report generator exports
 * @description Barrel file for all PDF report generators
 * @version 1.0.0
 */

export { BaseReportGenerator } from './BaseReportGenerator.js';
export { CategoryBreakdownReport } from './CategoryBreakdownReport.js';
export { ChecksPaidReport } from './ChecksPaidReport.js';
export { TaxSummaryReport } from './TaxSummaryReport.js';
export { TransactionSummaryReport } from './TransactionSummaryReport.js';

/**
 * Report type constants for easy reference
 */
export const REPORT_TYPES = {
  CATEGORY_BREAKDOWN: 'category-breakdown',
  CHECKS_PAID: 'checks-paid',
  TAX_SUMMARY: 'tax-summary',
  TRANSACTION_SUMMARY: 'transaction-summary'
};

/**
 * Available report generators
 */
export const REPORT_GENERATORS = {
  [REPORT_TYPES.CATEGORY_BREAKDOWN]: CategoryBreakdownReport,
  [REPORT_TYPES.CHECKS_PAID]: ChecksPaidReport,
  [REPORT_TYPES.TAX_SUMMARY]: TaxSummaryReport,
  [REPORT_TYPES.TRANSACTION_SUMMARY]: TransactionSummaryReport
};
