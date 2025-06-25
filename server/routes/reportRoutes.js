import express from 'express';
import { query } from 'express-validator';
import {
  generateProfitLossReport,
  generateExpenseSummaryReport,
  generateEmployeeSummaryReport,
  generateTaxSummaryReport,
  exportReportToPDF,
  getReportHistory
} from '../controllers/reportController.js';

const router = express.Router();

// Validation middleware
const reportValidation = [
  query('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('format').optional().isIn(['json', 'pdf', 'csv']).withMessage('Format must be json, pdf, or csv')
];

// Routes
router.get('/profit-loss', reportValidation, generateProfitLossReport);
router.get('/expense-summary', reportValidation, generateExpenseSummaryReport);
router.get('/employee-summary', reportValidation, generateEmployeeSummaryReport);
router.get('/tax-summary', reportValidation, generateTaxSummaryReport);
router.post('/export/:reportType', exportReportToPDF);
router.get('/history', getReportHistory);

export default router;
