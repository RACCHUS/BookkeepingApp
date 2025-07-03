import pdfParserService from '../services/pdfParser.js';
import firebaseService from '../services/cleanFirebaseService.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for processing status (in production, use Redis or database)
const processingStatus = new Map();

export const uploadPDF = async (req, res) => {
  try {
    const { file } = req;
    const { uid: userId } = req.user;
    const { bankType = 'chase' } = req.body;

    if (!file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a PDF file to upload'
      });
    }

    // Generate unique filename
    const uploadId = crypto.randomUUID();
    const fileName = `${uploadId}-${file.originalname}`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, fileName);

    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Save file to local storage
    await fs.writeFile(filePath, file.buffer);

    // Save file metadata to Firestore
    const fileDoc = await firebaseService.createDocument('uploads', uploadId, {
      userId,
      originalName: file.originalname,
      fileName,
      filePath,
      bankType,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
      status: 'uploaded'
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      uploadId,
      file: {
        id: uploadId,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        bankType,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
};

export const processPDF = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { uid: userId } = req.user;
    const { autoSave = true } = req.body;

    // Get file metadata from Firestore
    const fileDoc = await firebaseService.getDocument('uploads', fileId);
    
    if (!fileDoc || fileDoc.userId !== userId) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The specified file does not exist or you do not have access to it'
      });
    }

    if (fileDoc.status === 'processed') {
      return res.status(400).json({
        error: 'Already processed',
        message: 'This file has already been processed'
      });
    }

    // Process PDF directly (synchronous for now, can be made async later)
    const processResult = await processFileSynchronously(fileDoc, userId, autoSave);

    // Update file status
    await firebaseService.updateDocument('uploads', fileId, {
      status: 'processed',
      processedAt: new Date(),
      transactionsCount: processResult.transactions.length
    });

    res.json({
      success: true,
      message: 'PDF processed successfully',
      data: {
        transactionsProcessed: processResult.transactions.length,
        transactions: processResult.transactions.slice(0, 5) // Return first 5 for preview
      }
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
};

const processFileSynchronously = async (fileDoc, userId, autoSave) => {
  try {
    // Read file from local storage
    const buffer = await fs.readFile(fileDoc.filePath);

    // Parse PDF
    const parseResult = await pdfParserService.parsePDF(buffer, {
      bankType: fileDoc.bankType || 'chase'
    });

    if (!parseResult.success) {
      throw new Error(parseResult.error || 'Failed to parse PDF');
    }

    const transactions = parseResult.transactions || [];

    // If autoSave is true, save transactions to Firestore
    if (autoSave && transactions.length > 0) {
      const savedTransactions = [];
      
      for (const transaction of transactions) {
        const transactionData = {
          ...transaction,
          userId,
          sourceFile: fileDoc.fileName,
          sourceFileId: fileDoc.id,
          importedAt: new Date(),
          // Add default classification if not present
          category: transaction.category || 'Uncategorized',
          isClassified: !!transaction.category
        };

        const savedTransaction = await firebaseService.createDocument(
          'transactions',
          crypto.randomUUID(),
          transactionData
        );
        
        savedTransactions.push(savedTransaction);
      }

      return { transactions: savedTransactions };
    }

    return { transactions };

  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};

// Duplicate export declarations removed. Only one definition for getPDFStatus and getUserUploads remains below.

export const getPDFStatus = async (req, res) => {
  try {
    const { processId } = req.params;
    
    const status = processingStatus.get(processId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Process not found',
        message: 'The specified process ID was not found'
      });
    }

    // Clean up completed or error processes after 1 hour
    const startTime = new Date(status.startTime);
    const now = new Date();
    const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);
    
    if (hoursSinceStart > 1 && (status.status === 'completed' || status.status === 'error')) {
      processingStatus.delete(processId);
      return res.status(410).json({
        error: 'Process expired',
        message: 'Process results have expired and been cleaned up'
      });
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Get PDF status error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
};

export const getUserUploads = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    // In a real implementation, you'd store file metadata in Firestore
    // For now, we'll return a simple response
    const bucket = firebaseService.storage.bucket();
    const [files] = await bucket.getFiles({
      prefix: `users/${userId}/uploads/`,
      maxResults: parseInt(limit),
      autoPaginate: false
    });

    const uploads = files.map(file => ({
      id: file.name,
      name: file.name.split('/').pop(),
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      uploadedAt: file.metadata.timeCreated,
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`
    }));

    res.json({
      success: true,
      uploads,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: uploads.length
      }
    });

  } catch (error) {
    console.error('Get user uploads error:', error);
    res.status(500).json({
      error: 'Failed to get uploads',
      message: error.message
    });
  }
};
