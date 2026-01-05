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
export { Form1099Report } from './Form1099Report.js';
export { VendorPaymentReport } from './VendorPaymentReport.js';
export { PayeeYTDReport } from './PayeeYTDReport.js';
export { default as MonthlySummaryReport, monthlySummaryReport } from './MonthlySummaryReport.js';
export { default as MonthlyChecksReport, monthlyChecksReport } from './MonthlyChecksReport.js';

/**
 * Report type constants for easy reference
 */
export const REPORT_TYPES = {
  CATEGORY_BREAKDOWN: 'category-breakdown',
  CHECKS_PAID: 'checks-paid',
  TAX_SUMMARY: 'tax-summary',
  TRANSACTION_SUMMARY: 'transaction-summary',
  FORM_1099: '1099-summary',
  VENDOR_PAYMENT: 'vendor-summary',
  PAYEE_SUMMARY: 'payee-summary',
  MONTHLY_SUMMARY: 'monthly-summary',
  MONTHLY_CHECKS: 'monthly-checks'
};

/**
 * Available report generators
 */
export const REPORT_GENERATORS = {
  [REPORT_TYPES.CATEGORY_BREAKDOWN]: CategoryBreakdownReport,
  [REPORT_TYPES.CHECKS_PAID]: ChecksPaidReport,
  [REPORT_TYPES.TAX_SUMMARY]: TaxSummaryReport,
  [REPORT_TYPES.TRANSACTION_SUMMARY]: TransactionSummaryReport,
  [REPORT_TYPES.FORM_1099]: Form1099Report,
  [REPORT_TYPES.VENDOR_PAYMENT]: VendorPaymentReport,
  [REPORT_TYPES.PAYEE_SUMMARY]: PayeeYTDReport
};
