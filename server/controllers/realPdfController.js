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
    const { uid: userId } = req.user; // Remove fallback to force proper auth
    // Accept user-provided name for the statement (optional) and company information
    const { 
      bankType = 'chase', 
      autoProcess = false, 
      name: userProvidedName,
      companyId,
      companyName
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to upload PDFs'
      });
    }

    console.log('📄 PDF upload by user:', userId);
    if (companyId) {
      console.log('🏢 Company selected:', companyName || companyId);
    }

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

    // Create upload record and persist it to disk before any processing
    const uploadRecord = {
      id: uploadId,
      fileId: uploadId, // for legacy compatibility
      name: userProvidedName && typeof userProvidedName === 'string' && userProvidedName.trim() ? userProvidedName.trim() : file.originalname,
      originalName: file.originalname,
      fileName: fileName,
      filePath: filePath,
      fileSize: file.size,
      bankType: bankType,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      processed: false,
      // Company information
      companyId: companyId || null,
      companyName: companyName || null
    };
    // Write metadata file before any processing (for robust statement listing)
    const metaPath = filePath + '.meta.json';
    try {
      await fs.writeFile(metaPath, JSON.stringify({
        id: uploadId,
        fileId: uploadId,
        name: uploadRecord.name,
        originalName: uploadRecord.originalName,
        fileName: uploadRecord.fileName,
        uploadedAt: uploadRecord.uploadedAt,
        bankType: uploadRecord.bankType,
        uploadedBy: uploadRecord.uploadedBy,
        companyId: uploadRecord.companyId,
        companyName: uploadRecord.companyName
      }, null, 2));
    } catch (metaErr) {
      console.error('Failed to write statement metadata file:', metaErr);
    }

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
          autoProcessing: true,
          companyId: companyId,
          companyName: companyName
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        id: uploadId,
        fileId: uploadId,
        name: uploadRecord.name,
        fileName: file.originalname,
        size: file.size,
        status: 'uploaded',
        uploadedAt: uploadRecord.uploadedAt,
        bankType: bankType,
        companyId: companyId,
        companyName: companyName
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
    const { uid: userId } = req.user; // Remove fallback to force proper auth

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to process PDFs'
      });
    }

    console.log('📄 PDF processing by user:', userId);

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
    // Read metadata to get company information
    let companyInfo = { companyId: null, companyName: null };
    const metaPath = filePath + '.meta.json';
    try {
      const metaData = await fs.readFile(metaPath, 'utf-8');
      const metadata = JSON.parse(metaData);
      if (metadata.companyId) {
        companyInfo.companyId = metadata.companyId;
        companyInfo.companyName = metadata.companyName;
      }
    } catch (metaError) {
      console.warn('Could not read metadata file for company info:', metaError.message);
    }

    console.log(`🏢 Processing PDF for company: ${companyInfo.companyName || companyInfo.companyId || 'No company specified'}`);

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
      // Prepare transactions for saving with advanced classification
      const transactionsToSave = [];
      for (const transaction of parseResult.transactions) {
        // Use advanced classification
        const classificationResult = await chasePDFParser.classifyTransactionAdvanced(transaction, userId);
        const enhancedTransaction = {
          ...transaction,
          category: classificationResult.category,
          classificationInfo: {
            autoClassified: true,
            confidence: classificationResult.confidence,
            source: classificationResult.source,
            needsReview: classificationResult.needsReview
          },
          source: 'chase_pdf_import',
          sourceFile: path.basename(filePath),
          sourceFileId: fileId,
          statementId: fileId, // <-- This is the key fix: always link to the statement/PDF
          isManuallyReviewed: false,
          createdBy: userId,
          importedAt: new Date().toISOString(),
          // Add company information
          companyId: companyInfo.companyId,
          companyName: companyInfo.companyName
        };
        transactionsToSave.push(enhancedTransaction);
      }
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
    const { uid: userId } = req.user; // Remove fallback to force proper auth
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to view uploads'
      });
    }
    
    // Get list of uploaded files for this user
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    try {
      const files = await fs.readdir(uploadsDir);
      const uploads = await Promise.all(files
        .filter(fileName => !fileName.endsWith('.meta.json')) // Skip metadata files
        .map(async (fileName) => {
          const filePath = path.join(uploadsDir, fileName);
          const stats = await fs.stat(filePath);
          
          // Try to load metadata file first for robust ID
          let fileId = null;
          let userName = '';
          const metaPath = filePath + '.meta.json';
          try {
            const metaRaw = await fs.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(metaRaw);
            if (meta && meta.id) {
              fileId = meta.id; // Use the robust ID from metadata
              if (meta.name && typeof meta.name === 'string' && meta.name.trim()) {
                userName = meta.name.trim();
              }
            }
          } catch (e) {
            // No metadata file, fallback to filename parsing
            fileId = fileName.split('-')[0];
          }
          
          // Skip if we couldn't determine a valid fileId
          if (!fileId) return null;
          
          return {
            id: fileId,
            fileId,
            name: userName || fileName.substring(fileId.length + 1),
            originalName: fileName.substring(fileId.length + 1),
            fileName,
            uploadedAt: stats.birthtime.toISOString(),
            size: stats.size,
            status: 'uploaded'
          };
        }));
      res.status(200).json({
        success: true,
        data: {
          uploads: uploads.filter(Boolean).reverse(), // Filter out null entries and reverse for newest first
          total: uploads.filter(Boolean).length
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
