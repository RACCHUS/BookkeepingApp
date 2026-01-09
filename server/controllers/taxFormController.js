/**
 * Tax Form Controller
 * 
 * Handles HTTP requests for tax form generation (1099-NEC, 1099-MISC, W-2)
 * 
 * @author BookkeepingApp Team
 */

import { validationResult, param, query, body } from 'express-validator';
import taxFormService from '../services/taxForms/TaxFormService.js';
import { logger } from '../config/index.js';

/**
 * Preview 1099-NEC data for a payee
 */
export const preview1099NEC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { payeeId } = req.params;
    const { companyId, taxYear } = req.query;

    const result = await taxFormService.preview1099NEC(
      userId, 
      payeeId, 
      companyId, 
      taxYear ? parseInt(taxYear) : null
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('Preview 1099-NEC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview 1099-NEC',
      message: error.message
    });
  }
};

/**
 * Generate 1099-NEC PDF for a payee
 */
export const generate1099NEC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { payeeId } = req.params;
    const { companyId, taxYear, flatten, ignoreErrors } = req.query;

    const result = await taxFormService.generate1099NEC(
      userId,
      payeeId,
      companyId,
      taxYear ? parseInt(taxYear) : null,
      { 
        flatten: flatten !== 'false',
        ignoreErrors: ignoreErrors === 'true'
      }
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Send PDF as download
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.size);
    res.send(result.buffer);

  } catch (error) {
    logger.error('Generate 1099-NEC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate 1099-NEC',
      message: error.message
    });
  }
};

/**
 * Bulk generate 1099-NEC forms for all eligible contractors
 */
export const bulkGenerate1099NEC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { companyId, taxYear } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required for bulk generation'
      });
    }

    const result = await taxFormService.bulkGenerate1099NEC(
      userId,
      companyId,
      taxYear ? parseInt(taxYear) : null
    );

    // For bulk, return JSON summary (actual files would be zipped or sent separately)
    res.json({
      success: result.success,
      summary: result.summary,
      generated: result.generated?.map(g => ({
        payeeId: g.payeeId,
        payeeName: g.payeeName,
        amount: g.amount,
        fileName: g.fileName
      })),
      skipped: result.skipped,
      errors: result.errors
    });

  } catch (error) {
    logger.error('Bulk generate 1099-NEC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk generate 1099-NECs',
      message: error.message
    });
  }
};

/**
 * Preview 1099-MISC data for a payee
 */
export const preview1099MISC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { payeeId } = req.params;
    const { companyId } = req.query;
    const paymentData = req.body || {};

    const result = await taxFormService.preview1099MISC(userId, payeeId, companyId, paymentData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('Preview 1099-MISC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview 1099-MISC',
      message: error.message
    });
  }
};

/**
 * Generate 1099-MISC PDF for a payee
 */
export const generate1099MISC = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { payeeId } = req.params;
    const { companyId, flatten, ignoreErrors } = req.query;
    const paymentData = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const result = await taxFormService.generate1099MISC(
      userId,
      payeeId,
      companyId,
      paymentData,
      { 
        flatten: flatten !== 'false',
        ignoreErrors: ignoreErrors === 'true'
      }
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.size);
    res.send(result.buffer);

  } catch (error) {
    logger.error('Generate 1099-MISC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate 1099-MISC',
      message: error.message
    });
  }
};

/**
 * Preview W-2 data for an employee
 */
export const previewW2 = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { employeeId } = req.params;
    const { companyId, taxYear } = req.query;
    const wageData = req.body || null;

    const result = await taxFormService.previewW2(
      userId, 
      employeeId, 
      companyId,
      wageData
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('Preview W-2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview W-2',
      message: error.message
    });
  }
};

/**
 * Generate W-2 PDF for an employee
 */
export const generateW2 = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { employeeId } = req.params;
    const { companyId, flatten, ignoreErrors } = req.query;
    const wageData = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!wageData || typeof wageData.wages !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Wage data with wages amount is required'
      });
    }

    const result = await taxFormService.generateW2(
      userId,
      employeeId,
      companyId,
      wageData,
      { 
        flatten: flatten !== 'false',
        ignoreErrors: ignoreErrors === 'true'
      }
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.size);
    res.send(result.buffer);

  } catch (error) {
    logger.error('Generate W-2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate W-2',
      message: error.message
    });
  }
};

/**
 * Bulk generate W-2 forms for all employees
 */
export const bulkGenerateW2 = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { companyId, taxYear, wageDataMap } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required for bulk generation'
      });
    }

    const result = await taxFormService.bulkGenerateW2(
      userId,
      companyId,
      taxYear ? parseInt(taxYear) : null,
      wageDataMap || {}
    );

    res.json({
      success: result.success,
      summary: result.summary,
      generated: result.generated?.map(g => ({
        employeeId: g.employeeId,
        employeeName: g.employeeName,
        wages: g.wages,
        fileName: g.fileName
      })),
      skipped: result.skipped,
      errors: result.errors
    });

  } catch (error) {
    logger.error('Bulk generate W-2 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk generate W-2s',
      message: error.message
    });
  }
};

/**
 * Get tax form summary for a tax year
 */
export const getTaxFormSummary = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { taxYear } = req.params;
    const { companyId } = req.query;

    const result = await taxFormService.getTaxFormSummary(
      userId,
      companyId,
      taxYear ? parseInt(taxYear) : null
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('Get tax form summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tax form summary',
      message: error.message
    });
  }
};

/**
 * Get payees with missing tax form information
 */
export const getMissingInfo = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { companyId, formType } = req.query;

    const result = await taxFormService.getMissingInfo(userId, companyId, formType);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('Get missing info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get missing info',
      message: error.message
    });
  }
};

// Validation rules
export const validate1099NECPreview = [
  param('payeeId').notEmpty().withMessage('Payee ID is required'),
  query('taxYear').optional().isInt({ min: 2020, max: 2030 }).withMessage('Invalid tax year')
];

export const validate1099NECGenerate = [
  param('payeeId').notEmpty().withMessage('Payee ID is required')
];

export const validateBulk1099NEC = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('taxYear').optional().isInt({ min: 2020, max: 2030 }).withMessage('Invalid tax year')
];

export const validateW2Preview = [
  param('employeeId').notEmpty().withMessage('Employee ID is required')
];

export const validateW2Generate = [
  param('employeeId').notEmpty().withMessage('Employee ID is required'),
  query('companyId').notEmpty().withMessage('Company ID is required'),
  body('wages').isNumeric().withMessage('Wages amount is required')
];

export const validateBulkW2 = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('taxYear').optional().isInt({ min: 2020, max: 2030 }).withMessage('Invalid tax year')
];

export const validateTaxFormSummary = [
  param('taxYear').isInt({ min: 2020, max: 2030 }).withMessage('Valid tax year is required')
];

export default {
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
  // Validation exports
  validate1099NECPreview,
  validate1099NECGenerate,
  validateBulk1099NEC,
  validateW2Preview,
  validateW2Generate,
  validateBulkW2,
  validateTaxFormSummary
};
