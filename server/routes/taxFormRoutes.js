/**
 * Tax Form Routes
 * 
 * API endpoints for tax form generation (1099-NEC, 1099-MISC, W-2)
 * 
 * @author BookkeepingApp Team
 */

import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  preview1099NEC,
  generate1099NEC,
  bulkGenerate1099NEC,
  preview1099MISC,
  generate1099MISC,
  previewW2,
  generateW2,
  bulkGenerateW2,
  getTaxFormSummary,
  getMissingInfo,
  validate1099NECPreview,
  validate1099NECGenerate,
  validateBulk1099NEC,
  validateW2Preview,
  validateW2Generate,
  validateBulkW2,
  validateTaxFormSummary
} from '../controllers/taxFormController.js';

const router = express.Router();

/**
 * @route   GET /api/tax-forms/1099-nec/preview/:payeeId
 * @desc    Preview 1099-NEC data for a payee
 * @access  Private
 * @query   companyId - Company ID (optional)
 * @query   taxYear - Tax year (optional, defaults to last year)
 */
router.get(
  '/1099-nec/preview/:payeeId',
  authMiddleware,
  validate1099NECPreview,
  preview1099NEC
);

/**
 * @route   GET /api/tax-forms/1099-nec/generate/:payeeId
 * @desc    Generate 1099-NEC PDF for a payee
 * @access  Private
 * @query   companyId - Company ID (optional)
 * @query   taxYear - Tax year (optional)
 * @query   flatten - Whether to flatten the PDF (default: true)
 * @query   ignoreErrors - Generate even with validation errors (default: false)
 */
router.get(
  '/1099-nec/generate/:payeeId',
  authMiddleware,
  validate1099NECGenerate,
  generate1099NEC
);

/**
 * @route   POST /api/tax-forms/1099-nec/bulk
 * @desc    Bulk generate 1099-NEC forms for all eligible contractors
 * @access  Private
 * @body    companyId - Company ID (required)
 * @body    taxYear - Tax year (optional)
 */
router.post(
  '/1099-nec/bulk',
  authMiddleware,
  validateBulk1099NEC,
  bulkGenerate1099NEC
);

/**
 * @route   GET /api/tax-forms/1099-misc/preview/:payeeId
 * @desc    Preview 1099-MISC data for a payee
 * @access  Private
 * @query   companyId - Company ID (optional)
 * @body    Payment data (rents, royalties, etc.)
 */
router.get(
  '/1099-misc/preview/:payeeId',
  authMiddleware,
  preview1099MISC
);

/**
 * @route   POST /api/tax-forms/1099-misc/generate/:payeeId
 * @desc    Generate 1099-MISC PDF for a payee
 * @access  Private
 * @query   companyId - Company ID (required)
 * @body    Payment data (rents, royalties, otherIncome, etc.)
 */
router.post(
  '/1099-misc/generate/:payeeId',
  authMiddleware,
  generate1099MISC
);

/**
 * @route   GET /api/tax-forms/w2/preview/:employeeId
 * @desc    Preview W-2 data for an employee
 * @access  Private
 * @query   companyId - Company ID (optional)
 * @body    Wage data (optional, calculated if not provided)
 */
router.get(
  '/w2/preview/:employeeId',
  authMiddleware,
  validateW2Preview,
  previewW2
);

/**
 * @route   POST /api/tax-forms/w2/preview/:employeeId
 * @desc    Preview W-2 with custom wage data
 * @access  Private
 * @query   companyId - Company ID (optional)
 * @body    Wage data
 */
router.post(
  '/w2/preview/:employeeId',
  authMiddleware,
  validateW2Preview,
  previewW2
);

/**
 * @route   POST /api/tax-forms/w2/generate/:employeeId
 * @desc    Generate W-2 PDF for an employee
 * @access  Private
 * @query   companyId - Company ID (required)
 * @body    Wage data (wages, federalWithholding, etc.)
 */
router.post(
  '/w2/generate/:employeeId',
  authMiddleware,
  validateW2Generate,
  generateW2
);

/**
 * @route   POST /api/tax-forms/w2/bulk
 * @desc    Bulk generate W-2 forms for all employees
 * @access  Private
 * @body    companyId - Company ID (required)
 * @body    taxYear - Tax year (optional)
 * @body    wageDataMap - Map of employeeId to wage data (optional)
 */
router.post(
  '/w2/bulk',
  authMiddleware,
  validateBulkW2,
  bulkGenerateW2
);

/**
 * @route   GET /api/tax-forms/summary/:taxYear
 * @desc    Get tax form summary for a tax year
 * @access  Private
 * @query   companyId - Company ID (optional)
 */
router.get(
  '/summary/:taxYear',
  authMiddleware,
  validateTaxFormSummary,
  getTaxFormSummary
);

/**
 * @route   GET /api/tax-forms/missing-info
 * @desc    Get payees with missing tax form information
 * @access  Private
 * @query   companyId - Company ID (optional)
 * @query   formType - Form type filter (1099-NEC, 1099-MISC, W-2)
 */
router.get(
  '/missing-info',
  authMiddleware,
  getMissingInfo
);

export default router;
