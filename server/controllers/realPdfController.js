import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import firebaseService from '../services/cleanFirebaseService.js';
import chasePDFParser from '../services/chasePDFParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for processing status (in production, use Redis or database)
const processingStatus = new Map();

export const uploadPDF = async (req, res) => {
  try {
    const { file } = req;
    const { uid: userId } = req.user || { uid: 'dev-user-123' };
    const { bankType = 'chase', autoProcess = false } = req.body;

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

    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.log('Uploads directory already exists or created');
    }

    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);

    console.log(`📄 PDF uploaded: ${fileName} (${file.size} bytes)`);

    // Create upload record - we could save this to Firebase if needed
    const uploadRecord = {
      fileId: uploadId,
      originalName: file.originalname,
      fileName: fileName,
      filePath: filePath,
      fileSize: file.size,
      bankType: bankType,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      processed: false
    };

    // If autoProcess is enabled, start processing immediately
    if (autoProcess) {
      // Start processing in background
      processUploadedFile(uploadId, filePath, userId, bankType)
        .catch(error => console.error('Background processing error:', error));
      
      return res.status(200).json({
        success: true,
        message: 'PDF uploaded and processing started',
        data: {
          fileId: uploadId,
          fileName: file.originalname,
          size: file.size,
          status: 'processing',
          uploadedAt: uploadRecord.uploadedAt,
          bankType: bankType,
          autoProcessing: true
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        fileId: uploadId,
        fileName: file.originalname,
        size: file.size,
        status: 'uploaded',
        uploadedAt: uploadRecord.uploadedAt,
        bankType: bankType
      },
      next_steps: {
        process_url: `/api/pdf/process/${uploadId}`,
        status_url: `/api/pdf/status/${uploadId}`
      }
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
};

export const processPDF = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { autoSave = true, classification = 'auto' } = req.body;
    const { uid: userId } = req.user || { uid: 'dev-user-123' };

    // Find the uploaded file
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const targetFile = files.find(f => f.startsWith(fileId));
    
    if (!targetFile) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The uploaded PDF file could not be found'
      });
    }

    const filePath = path.join(uploadsDir, targetFile);
    const processId = crypto.randomUUID();

    // Start processing
    processingStatus.set(processId, {
      status: 'processing',
      progress: 10,
      message: 'Starting PDF processing...',
      startTime: new Date().toISOString()
    });

    // Process in background and return immediately
    processUploadedFile(fileId, filePath, userId, 'chase', processId, autoSave)
      .catch(error => {
        console.error('Processing error:', error);
        processingStatus.set(processId, {
          status: 'error',
          progress: 0,
          message: error.message,
          startTime: processingStatus.get(processId)?.startTime,
          errorAt: new Date().toISOString()
        });
      });

    res.status(200).json({
      success: true,
      message: 'PDF processing started',
      data: {
        processId,
        status: 'processing',
        estimatedTime: '30-60 seconds',
        fileId
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

// Background processing function
async function processUploadedFile(fileId, filePath, userId, bankType, processId = null, autoSave = true) {
  const actualProcessId = processId || crypto.randomUUID();
  
  try {
    // Update progress
    processingStatus.set(actualProcessId, {
      status: 'processing',
      progress: 25,
      message: 'Parsing PDF content...',
      startTime: processingStatus.get(actualProcessId)?.startTime || new Date().toISOString()
    });

    // Parse the PDF using our Chase parser
    const parseResult = await chasePDFParser.parsePDF(filePath);

    if (!parseResult.success) {
      throw new Error(parseResult.error || 'PDF parsing failed');
    }

    // Update progress
    processingStatus.set(actualProcessId, {
      status: 'processing',
      progress: 75,
      message: `Processing ${parseResult.transactions.length} transactions...`,
      startTime: processingStatus.get(actualProcessId)?.startTime
    });

    // Auto-save transactions if requested
    let savedTransactionIds = [];
    if (autoSave && parseResult.transactions.length > 0) {
      // Prepare transactions for saving
      const transactionsToSave = parseResult.transactions.map(transaction => ({
        ...transaction,
        source: 'chase_pdf_import',
        sourceFile: path.basename(filePath),
        sourceFileId: fileId,
        isManuallyReviewed: false,
        createdBy: userId,
        importedAt: new Date().toISOString()
      }));

      // Save transactions one by one to get IDs
      for (const transaction of transactionsToSave) {
        try {
          const result = await firebaseService.createTransaction(userId, transaction);
          savedTransactionIds.push(result.id);
        } catch (error) {
          console.error('Error saving transaction:', error);
          // Continue with other transactions
        }
      }
    }

    // Update final status
    processingStatus.set(actualProcessId, {
      status: 'completed',
      progress: 100,
      message: `PDF processing completed successfully. ${parseResult.transactions.length} transactions found, ${savedTransactionIds.length} saved.`,
      startTime: processingStatus.get(actualProcessId)?.startTime,
      completedAt: new Date().toISOString(),
      result: {
        success: true,
        transactionCount: parseResult.transactions.length,
        transactions: parseResult.transactions,
        savedTransactionIds: savedTransactionIds,
        accountInfo: parseResult.accountInfo,
        summary: parseResult.summary,
        needsReview: parseResult.transactions.filter(t => t.needsReview).length
      }
    });

    console.log(`✅ PDF processing completed: ${parseResult.transactions.length} transactions, ${savedTransactionIds.length} saved`);

  } catch (error) {
    console.error('Background PDF processing error:', error);
    
    processingStatus.set(actualProcessId, {
      status: 'error',
      progress: 0,
      message: error.message,
      startTime: processingStatus.get(actualProcessId)?.startTime,
      errorAt: new Date().toISOString(),
      error: error.message
    });
  }
}

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

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting PDF status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
};

export const getUserUploads = async (req, res) => {
  try {
    const { uid: userId } = req.user || { uid: 'dev-user-123' };
    
    // Get list of uploaded files for this user
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    try {
      const files = await fs.readdir(uploadsDir);
      
      const uploads = await Promise.all(files.map(async (fileName) => {
        const filePath = path.join(uploadsDir, fileName);
        const stats = await fs.stat(filePath);
        
        // Extract fileId from filename (format: uuid-originalname)
        const fileId = fileName.split('-')[0];
        
        return {
          fileId,
          originalName: fileName.substring(fileId.length + 1), // Remove uuid prefix
          fileName,
          uploadedAt: stats.birthtime.toISOString(),
          size: stats.size,
          status: 'uploaded' // In a real app, this would come from database
        };
      }));

      res.status(200).json({
        success: true,
        data: {
          uploads: uploads.reverse(), // Most recent first
          total: uploads.length
        }
      });
      
    } catch (error) {
      // Directory doesn't exist or is empty
      res.status(200).json({
        success: true,
        data: {
          uploads: [],
          total: 0
        }
      });
    }

  } catch (error) {
    console.error('Error getting user uploads:', error);
    res.status(500).json({
      error: 'Failed to get uploads',
      message: error.message
    });
  }
};

// Test endpoint to process the sample PDF
export const testChasePDF = async (req, res) => {
  try {
    const samplePDFPath = path.join(__dirname, '../../chasepdf.pdf');
    
    // Check if sample PDF exists
    try {
      await fs.access(samplePDFPath);
    } catch {
      return res.status(404).json({
        error: 'Sample PDF not found',
        message: 'Please ensure chasepdf.pdf is in the project root'
      });
    }

    console.log('🧪 Testing Chase PDF parser with sample file...');
    
    const parseResult = await chasePDFParser.parsePDF(samplePDFPath);
    
    res.status(200).json({
      success: true,
      message: 'Sample PDF parsed successfully',
      data: parseResult
    });

  } catch (error) {
    console.error('Error testing Chase PDF:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
};
