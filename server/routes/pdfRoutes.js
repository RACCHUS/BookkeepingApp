import express from 'express';
import multer from 'multer';
import { body, param } from 'express-validator';
import { 
  uploadPDF, 
  processPDF, 
  getPDFStatus,
  getUserUploads,
  deleteUpload,
  renameUpload,
  getUploadDetails,
  updateUploadCompany,
  testChasePDF
} from '../controllers/pdfController.js';
import {
  validatePdfUpload,
  validateObjectId,
  uploadRateLimit,
  requestSizeLimit,
  handleValidationErrors
} from '../middlewares/index.js';

import { authMiddleware } from '../middlewares/index.js';
const router = express.Router();

// Configure multer for file uploads with enhanced validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only allow one file at a time
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf'];
    const allowedExtensions = ['.pdf'];
    const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Enhanced PDF Routes with validation and rate limiting

/**
 * @route POST /api/pdf/upload
 * @desc Upload PDF bank statement for processing
 * @access Private
 */
router.post('/upload', 
  uploadRateLimit,
  requestSizeLimit('10mb'),
  upload.single('pdf'), 
  validatePdfUpload,
  uploadPDF
);

/**
 * @route POST /api/pdf/process/:fileId
 * @desc Process uploaded PDF to extract transactions
 * @access Private
 */
router.post('/process/:fileId',
  validateObjectId('fileId'),
  processPDF
);

/**
 * @route GET /api/pdf/status/:processId
 * @desc Get processing status of uploaded PDF
 * @access Private
 */
router.get('/status/:processId',
  validateObjectId('processId'),
  getPDFStatus
);
router.get('/uploads', authMiddleware, getUserUploads);
router.get('/uploads/:uploadId', 
  authMiddleware,
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  getUploadDetails
);
router.put('/uploads/:uploadId/rename', 
  authMiddleware,
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),
  renameUpload
);
router.put('/uploads/:uploadId/company', 
  authMiddleware,
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  body('companyId').optional().isString(),
  body('companyName').optional().isString(),
  updateUploadCompany
);
router.delete('/uploads/:uploadId', 
  authMiddleware,
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  deleteUpload
);

// Test endpoint for Chase PDF parsing
router.get('/test-chase', testChasePDF);

export default router;
