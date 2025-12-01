import express from 'express';
import { query, body, param } from 'express-validator';
import {
  generateProfitLossReport,
  generateExpenseSummaryReport,
  generateEmployeeSummaryReport,
  generateTaxSummaryReport,
  exportReportToPDF,
  getReportHistory,
  generateSummaryReportPDF,
  generateTaxSummaryReportPDF,
  generateCategoryBreakdownReportPDF,
  generateChecksPaidReportPDF,
  downloadReport
} from '../controllers/reportController.js';
import { 
  handleValidationErrors,
  validateObjectId,
  requestSizeLimit,
  apiRateLimit
} from '../middlewares/index.js';
import { 
  REPORT_CONSTANTS, 
  COMMON_VALIDATION 
} from './routeConstants.js';

const router = express.Router();

// Apply rate limiting to all report routes
router.use(apiRateLimit);

// Validation schemas
const reportValidation = [
  query('startDate').isISO8601().withMessage(`Start date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  query('endDate').isISO8601().withMessage(`End date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  query('format')
    .optional()
    .isIn(REPORT_CONSTANTS.FORMATS)
    .withMessage(`Format must be one of: ${REPORT_CONSTANTS.FORMATS.join(', ')}`),
  query('companyId').optional().isLength({ min: 1 }).withMessage('Company ID must be valid'),
  handleValidationErrors
];

const pdfReportValidation = [
  body('startDate').isISO8601().withMessage(`Start date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  body('endDate').isISO8601().withMessage(`End date ${COMMON_VALIDATION.DATE_MESSAGE}`),
  body('includeDetails').optional().isBoolean().withMessage('includeDetails must be a boolean'),
  body('includeTransactionDetails').optional().isBoolean().withMessage('includeTransactionDetails must be a boolean'),
  body('companyId').optional().isLength({ min: 1 }).withMessage('Company ID must be valid'),
  requestSizeLimit(REPORT_CONSTANTS.SIZE_LIMITS.PDF_GENERATION),
  handleValidationErrors
];

// Enhanced Report Routes with comprehensive validation

/**
 * @route GET /api/reports/profit-loss
 * @desc Generate profit and loss report
 * @access Private
 */
router.get('/profit-loss', reportValidation, generateProfitLossReport);

/**
 * @route GET /api/reports/expense-summary
 * @desc Generate expense summary report
 * @access Private
 */
router.get('/expense-summary', reportValidation, generateExpenseSummaryReport);

/**
 * @route GET /api/reports/employee-summary
 * @desc Generate employee payment summary report
 * @access Private
 */
router.get('/employee-summary', reportValidation, generateEmployeeSummaryReport);

/**
 * @route GET /api/reports/tax-summary
 * @desc Generate tax summary report
 * @access Private
 */
router.get('/tax-summary', reportValidation, generateTaxSummaryReport);

/**
 * @route POST /api/reports/export/:reportType
 * @desc Export report to PDF format
 * @access Private
 */
router.post('/export/:reportType', 
  param('reportType').isIn(['profit-loss', 'expense-summary', 'employee-summary', 'tax-summary', 'category-breakdown', 'checks-paid']).withMessage('Invalid report type'),
  pdfReportValidation,
  exportReportToPDF
);

/**
 * @route GET /api/reports/history
 * @desc Get report generation history
 * @access Private
 */
router.get('/history', getReportHistory);

// New PDF generation routes
router.post('/summary-pdf', pdfReportValidation, generateSummaryReportPDF);
router.post('/tax-summary-pdf', pdfReportValidation, generateTaxSummaryReportPDF);
router.post('/category-breakdown-pdf', pdfReportValidation, generateCategoryBreakdownReportPDF);
router.post('/checks-paid-pdf', pdfReportValidation, generateChecksPaidReportPDF);
router.get('/download/:fileName', downloadReport);

export default router;
