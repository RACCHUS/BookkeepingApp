import pdfParserService from '../services/pdfParser.js';
import firebaseService from '../services/firebaseService.js';
import crypto from 'crypto';

// In-memory store for processing status (in production, use Redis or database)
const processingStatus = new Map();

export const uploadPDF = async (req, res) => {
  try {
    const { file } = req;
    const { uid: userId } = req.user;

    if (!file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a PDF file to upload'
      });
    }

    // Upload file to Firebase Storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const uploadResult = await firebaseService.uploadFile(
      file.buffer,
      fileName,
      file.mimetype,
      userId
    );

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: uploadResult.fileId,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: uploadResult.url,
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
    const { autoSave = false } = req.body;    // Generate processing ID
    const processId = crypto.randomUUID();
    
    // Set initial status
    processingStatus.set(processId, {
      status: 'processing',
      progress: 0,
      message: 'Starting PDF processing...',
      startTime: new Date().toISOString()
    });

    // Return processing ID immediately
    res.json({
      success: true,
      processId,
      message: 'PDF processing started'
    });

    // Process PDF asynchronously
    processAsyncPDF(processId, fileId, userId, autoSave);

  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
};

const processAsyncPDF = async (processId, fileId, userId, autoSave) => {
  try {
    // Update status
    processingStatus.set(processId, {
      status: 'processing',
      progress: 25,
      message: 'Downloading PDF file...',
      startTime: processingStatus.get(processId).startTime
    });

    // Download file from Firebase Storage
    const bucket = firebaseService.storage.bucket();
    const file = bucket.file(fileId);
    const [buffer] = await file.download();

    // Update status
    processingStatus.set(processId, {
      status: 'processing',
      progress: 50,
      message: 'Parsing PDF content...',
      startTime: processingStatus.get(processId).startTime
    });

    // Parse PDF
    const parseResult = await pdfParserService.parsePDF(buffer, {
      fileId,
      fileName: fileId.split('/').pop(),
      userId
    });

    // Update status
    processingStatus.set(processId, {
      status: 'processing',
      progress: 75,
      message: 'Processing transactions...',
      startTime: processingStatus.get(processId).startTime
    });

    if (!parseResult.success) {
      throw new Error(parseResult.error || 'PDF parsing failed');
    }

    // Auto-save transactions if requested
    let savedTransactionIds = [];
    if (autoSave && parseResult.transactions.length > 0) {
      // Prepare transactions for saving
      const transactionsToSave = parseResult.transactions.map(transaction => ({
        ...transaction,
        source: 'pdf_import',
        sourceFile: fileId.split('/').pop(),
        sourceFileId: fileId,
        isManuallyReviewed: false,
        createdBy: userId
      }));

      savedTransactionIds = await firebaseService.batchCreateTransactions(
        userId,
        transactionsToSave
      );
    }

    // Update final status
    processingStatus.set(processId, {
      status: 'completed',
      progress: 100,
      message: 'PDF processing completed successfully',
      startTime: processingStatus.get(processId).startTime,
      completedAt: new Date().toISOString(),
      result: {
        ...parseResult,
        savedTransactionIds
      }
    });

  } catch (error) {
    console.error('Async PDF processing error:', error);
    
    // Update error status
    processingStatus.set(processId, {
      status: 'error',
      progress: 0,
      message: error.message,
      startTime: processingStatus.get(processId).startTime,
      errorAt: new Date().toISOString(),
      error: error.message
    });
  }
};

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
