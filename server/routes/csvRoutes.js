/**
 * CSV Import Routes
 * Handles CSV file upload, preview, and transaction import
 */

import express from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import {
  uploadCSV,
  previewCSV,
  confirmImport,
  cancelImport,
  getBanks,
  getHeaders,
  getCSVImports,
  getCSVImportById,
  getCSVImportTransactions,
  deleteCSVImport,
  deleteCSVImportTransactions,
} from '../controllers/csvController.js';
import {
  authMiddleware,
  uploadRateLimit,
  requestSizeLimit,
  handleValidationErrors,
} from '../middlewares/index.js';

const router = express.Router();

/**
 * CSV file upload constants
 */
const CSV_CONSTANTS = {
  SIZE_LIMITS: {
    DEFAULT: 5 * 1024 * 1024, // 5MB
    STRING: '5mb',
  },
  ALLOWED_MIME_TYPES: [
    'text/csv',
    'text/plain',
    'application/csv',
    'application/vnd.ms-excel',
    'text/comma-separated-values',
  ],
  ALLOWED_EXTENSIONS: ['.csv', '.txt'],
  UPLOAD: {
    MAX_FILES: 1,
  },
};

/**
 * Configure multer for CSV uploads
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CSV_CONSTANTS.SIZE_LIMITS.DEFAULT,
    files: CSV_CONSTANTS.UPLOAD.MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
    
    if (
      CSV_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.mimetype) &&
      CSV_CONSTANTS.ALLOWED_EXTENSIONS.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

/**
 * @route GET /api/csv/banks
 * @desc Get list of supported bank formats for dropdown
 * @access Public
 */
router.get('/banks', getBanks);

/**
 * @route POST /api/csv/upload
 * @desc Upload CSV file and get preview of parsed transactions
 * @access Private
 */
router.post(
  '/upload',
  authMiddleware,
  uploadRateLimit,
  requestSizeLimit(CSV_CONSTANTS.SIZE_LIMITS.STRING),
  upload.single('csv'),
  body('bankFormat').optional().isString(),
  body('companyId').optional().isString(),
  body('companyName').optional().isString(),
  handleValidationErrors,
  uploadCSV
);

/**
 * @route POST /api/csv/headers
 * @desc Get headers from CSV file for custom column mapping
 * @access Private
 */
router.post(
  '/headers',
  authMiddleware,
  upload.single('csv'),
  getHeaders
);

/**
 * @route POST /api/csv/preview/:uploadId
 * @desc Re-preview CSV with different column mapping
 * @access Private
 */
router.post(
  '/preview/:uploadId',
  authMiddleware,
  param('uploadId').isUUID().withMessage('Invalid upload ID'),
  body('mapping').optional().isObject(),
  body('bankFormat').optional().isString(),
  handleValidationErrors,
  previewCSV
);

/**
 * @route POST /api/csv/confirm/:uploadId
 * @desc Confirm import and save transactions to database
 * @access Private
 */
router.post(
  '/confirm/:uploadId',
  authMiddleware,
  param('uploadId').isUUID().withMessage('Invalid upload ID'),
  body('companyId').optional().isString(),
  body('companyName').optional().isString(),
  body('skipDuplicates').optional().isBoolean(),
  handleValidationErrors,
  confirmImport
);

/**
 * @route DELETE /api/csv/cancel/:uploadId
 * @desc Cancel pending CSV import
 * @access Private
 */
router.delete(
  '/cancel/:uploadId',
  authMiddleware,
  param('uploadId').isUUID().withMessage('Invalid upload ID'),
  handleValidationErrors,
  cancelImport
);

// ===========================================
// CSV Import Management Routes
// ===========================================

/**
 * @route GET /api/csv/imports
 * @desc Get all CSV imports for the user
 * @access Private
 */
router.get(
  '/imports',
  authMiddleware,
  query('companyId').optional().isString(),
  query('status').optional().isIn(['completed', 'deleted', 'failed', 'all']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
  query('sortBy').optional().isIn(['created_at', 'file_name', 'transaction_count', 'bank_name']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Sort order must be ASC or DESC'),
  handleValidationErrors,
  getCSVImports
);

/**
 * @route GET /api/csv/imports/:importId
 * @desc Get a single CSV import by ID
 * @access Private
 */
router.get(
  '/imports/:importId',
  authMiddleware,
  param('importId').isUUID().withMessage('Invalid import ID'),
  handleValidationErrors,
  getCSVImportById
);

/**
 * @route GET /api/csv/imports/:importId/transactions
 * @desc Get transactions linked to a CSV import
 * @access Private
 */
router.get(
  '/imports/:importId/transactions',
  authMiddleware,
  param('importId').isUUID().withMessage('Invalid import ID'),
  handleValidationErrors,
  getCSVImportTransactions
);

/**
 * @route DELETE /api/csv/imports/:importId
 * @desc Delete a CSV import (with options to delete linked transactions and/or import ID)
 * @access Private
 * @body {boolean} deleteTransactions - Delete all linked transactions (default: false)
 * @body {boolean} deleteImportId - Permanently delete the import record (default: false)
 */
router.delete(
  '/imports/:importId',
  authMiddleware,
  param('importId').isUUID().withMessage('Invalid import ID'),
  body('deleteTransactions').optional().isBoolean(),
  body('deleteImportId').optional().isBoolean(),
  handleValidationErrors,
  deleteCSVImport
);

/**
 * @route DELETE /api/csv/imports/:importId/transactions
 * @desc Delete all transactions linked to a CSV import
 * @access Private
 * @body {boolean} deleteImportId - Also delete the import record (default: false)
 */
router.delete(
  '/imports/:importId/transactions',
  authMiddleware,
  param('importId').isUUID().withMessage('Invalid import ID'),
  body('deleteImportId').optional().isBoolean(),
  handleValidationErrors,
  deleteCSVImportTransactions
);

export default router;
