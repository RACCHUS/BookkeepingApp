import express from 'express';
import multer from 'multer';
import { 
  uploadPDF, 
  processPDF, 
  getPDFStatus,
  getUserUploads,
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

// Test endpoint for Chase PDF parsing
router.get('/test-chase', testChasePDF);

export default router;
