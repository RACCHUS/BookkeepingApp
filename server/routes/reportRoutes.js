import express from 'express';
import { query, body } from 'express-validator';
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

const router = express.Router();

// Validation middleware
const reportValidation = [
  query('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('format').optional().isIn(['json', 'pdf', 'csv']).withMessage('Format must be json, pdf, or csv')
];

const pdfReportValidation = [
  body('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  body('includeDetails').optional().isBoolean().withMessage('includeDetails must be a boolean'),
  body('includeTransactionDetails').optional().isBoolean().withMessage('includeTransactionDetails must be a boolean')
];

// Routes
router.get('/profit-loss', reportValidation, generateProfitLossReport);
router.get('/expense-summary', reportValidation, generateExpenseSummaryReport);
router.get('/employee-summary', reportValidation, generateEmployeeSummaryReport);
router.get('/tax-summary', reportValidation, generateTaxSummaryReport);
router.post('/export/:reportType', exportReportToPDF);
router.get('/history', getReportHistory);

// New PDF generation routes
router.post('/summary-pdf', pdfReportValidation, generateSummaryReportPDF);
router.post('/tax-summary-pdf', pdfReportValidation, generateTaxSummaryReportPDF);
router.post('/category-breakdown-pdf', pdfReportValidation, generateCategoryBreakdownReportPDF);
router.post('/checks-paid-pdf', pdfReportValidation, generateChecksPaidReportPDF);
router.get('/download/:fileName', downloadReport);

export default router;
