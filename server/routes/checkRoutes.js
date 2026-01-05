/**
 * Check Routes
 * API endpoints for check management
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import checkController from '../controllers/checkController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Configure multer for check image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueName = `check-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and PDFs
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes require authentication
router.use(authMiddleware);

// Stats route (must be before /:id routes)
router.get('/stats', checkController.getStats);

// Bulk operations
router.post('/bulk', checkController.bulkCreate);
router.post('/from-transactions', checkController.bulkCreateFromTransactions);
router.post('/bulk-link', checkController.bulkLinkToTransaction);
router.post('/bulk-unlink', checkController.bulkUnlinkFromTransactions);

// Batch operations
router.put('/batch', checkController.batchUpdateChecks);
router.delete('/batch', checkController.batchDeleteChecks);

// CRUD operations
router.post('/', upload.single('image'), checkController.createCheck);
router.get('/', checkController.getChecks);
router.get('/:id', checkController.getCheck);
router.put('/:id', checkController.updateCheck);
router.delete('/:id', checkController.deleteCheck);

// Image operations
router.post('/:id/image', upload.single('image'), checkController.uploadImage);
router.delete('/:id/image', checkController.deleteImage);

// Transaction linking (single)
router.post('/:id/link/:transactionId', checkController.linkToTransaction);
router.post('/:id/unlink', checkController.unlinkFromTransaction);

// Multi-transaction support
router.post('/:id/link-multiple', checkController.linkToMultipleTransactions);
router.post('/:id/add-link/:transactionId', checkController.addTransactionLink);
router.delete('/:id/remove-link/:transactionId', checkController.removeTransactionLink);

export default router;
