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
} from '../controllers/realPdfController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Routes
router.post('/upload', upload.single('pdf'), uploadPDF);
router.post('/process/:fileId', processPDF);
router.get('/status/:processId', getPDFStatus);
router.get('/uploads', getUserUploads);
router.get('/uploads/:uploadId', 
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  getUploadDetails
);
router.put('/uploads/:uploadId/rename', 
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),
  renameUpload
);
router.put('/uploads/:uploadId/company', 
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  body('companyId').optional().isString(),
  body('companyName').optional().isString(),
  updateUploadCompany
);
router.delete('/uploads/:uploadId', 
  param('uploadId').notEmpty().withMessage('Upload ID is required'),
  deleteUpload
);

// Test endpoint for Chase PDF parsing
router.get('/test-chase', testChasePDF);

export default router;
