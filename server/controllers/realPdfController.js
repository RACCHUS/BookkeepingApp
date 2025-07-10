import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import firebaseService from '../services/cleanFirebaseService.js';
import chasePDFParser from '../services/chasePDFParser.js';
import { isFirestoreIndexError, getIndexErrorMessage, logIndexError } from '../utils/errorHandler.js';

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
    
    // Handle empty string company IDs (treat as null)
    const sanitizedCompanyId = companyId && companyId.trim() !== '' ? companyId : null;
    const sanitizedCompanyName = companyName && companyName.trim() !== '' ? companyName : null;
    
    if (sanitizedCompanyId) {
      console.log('🏢 Company selected:', sanitizedCompanyName || sanitizedCompanyId);
    } else {
      console.log('❌ No valid company information received');
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

    // Create upload record and persist it to both disk and Firestore
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
      // Company information (sanitized)
      companyId: sanitizedCompanyId,
      companyName: sanitizedCompanyName
    };
    
    // Save upload record to Firestore
    try {
      await firebaseService.createUploadRecord(userId, uploadRecord);
      console.log(`✅ Upload record saved to Firestore: ${uploadId}`);
    } catch (error) {
      console.error('Failed to save upload record to Firestore:', error);
      // Continue with file processing even if Firestore save fails
    }
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
    const parseResult = await chasePDFParser.parsePDF(filePath, userId, companyInfo.companyId, companyInfo.companyName);

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
      const transactionsToSave = [];
      for (const transaction of parseResult.transactions) {
        // Use rule-based classification only
        let { category } = await chasePDFParser.classifyTransaction(transaction, userId);
        // Ensure category is always a string
        if (typeof category !== 'string') category = '';
        const enhancedTransaction = {
          ...transaction,
          category,
          source: 'chase_pdf_import',
          sourceFile: path.basename(filePath),
          sourceFileId: fileId,
          statementId: fileId, // always link to the statement/PDF
          isManuallyReviewed: false,
          createdBy: userId,
          companyId: companyInfo.companyId || null,
          companyName: companyInfo.companyName || null
        };
        transactionsToSave.push(enhancedTransaction);
      }
      // Save transactions one by one to get IDs
      for (const transaction of transactionsToSave) {
        try {
          // Defensive: ensure category is always a string
          if (typeof transaction.category !== 'string') transaction.category = '';
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
    const { uid: userId } = req.user;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to view uploads'
      });
    }
    
    // Extract query parameters for filtering and sorting
    const {
      companyId,
      search,
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = req.query;
    
    // Build filters for Firebase query
    const filters = {
      sortBy,
      sortOrder
    };
    
    if (companyId && companyId !== 'all') {
      filters.companyId = companyId;
    }
    
    try {
      // Get uploads from Firestore
      let uploads = await firebaseService.getUploads(userId, filters);
      
      // Apply search filter (client-side for now, could be optimized with Firestore text search)
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        uploads = uploads.filter(upload => 
          (upload.name || '').toLowerCase().includes(searchTerm) ||
          (upload.originalName || '').toLowerCase().includes(searchTerm) ||
          (upload.companyName || '').toLowerCase().includes(searchTerm) ||
          (upload.status || '').toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedUploads = uploads.slice(startIndex, endIndex);
      
      // Enhance each upload with transaction count and additional metadata
      const enhancedUploads = await Promise.all(paginatedUploads.map(async (upload) => {
        try {
          // Get transaction count for this upload
          const transactions = await firebaseService.getTransactionsByUploadId(userId, upload.id);
          const transactionCount = transactions.length;
          
          // Calculate date range from transactions
          let dateRange = null;
          const validTransactions = transactions.filter(t => t.date && !isNaN(Date.parse(t.date)));
          if (validTransactions.length > 0) {
            const dates = validTransactions.map(t => new Date(t.date)).sort((a, b) => a - b);
            dateRange = {
              start: dates[0].toISOString().split('T')[0],
              end: dates[dates.length - 1].toISOString().split('T')[0]
            };
          } else {
            dateRange = null;
          }
          
          return {
            ...upload,
            transactionCount,
            dateRange
          };
        } catch (error) {
          console.error(`Error enhancing upload ${upload.id}:`, error);
          
          // Check if it's a Firestore index error
          if (error.message && error.message.includes('index')) {
            console.log('Firestore index required for transaction queries. Upload will show 0 transactions until index is created.');
          }
          
          return {
            ...upload,
            transactionCount: 0,
            dateRange: null
          };
        }
      }));
      
      res.json({
        success: true,
        data: enhancedUploads,
        pagination: {
          total: uploads.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: endIndex < uploads.length
        }
      });
      
    } catch (firestoreError) {
      // Log the index error with helpful information
      logIndexError(firestoreError, 'getUserUploads');
      
      console.error('Firestore query failed, falling back to file system:', firestoreError);
      
      // If this is an index error, provide helpful information
      if (isFirestoreIndexError(firestoreError)) {
        console.warn('💡 To fix this permanently, create the required Firestore indexes.');
        console.warn('📖 See UPLOADS_INDEX_SETUP.md for detailed instructions.');
      }
      
      // Fallback to file system approach
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      try {
        const files = await fs.readdir(uploadsDir);
        const uploads = await Promise.all(files
          .filter(fileName => !fileName.endsWith('.meta.json'))
          .map(async (fileName) => {
            const filePath = path.join(uploadsDir, fileName);
            const stats = await fs.stat(filePath);
            
            let fileId = null;
            let userName = '';
            let companyInfo = {};
            const metaPath = filePath + '.meta.json';
            try {
              const metaRaw = await fs.readFile(metaPath, 'utf-8');
              const meta = JSON.parse(metaRaw);
              if (meta && meta.id) {
                fileId = meta.id;
                if (meta.name && typeof meta.name === 'string' && meta.name.trim()) {
                  userName = meta.name.trim();
                }
                companyInfo = {
                  companyId: meta.companyId || null,
                  companyName: meta.companyName || null
                };
              }
            } catch (e) {
              fileId = fileName.split('-')[0];
            }
            
            if (!fileId) return null;
            
            return {
              id: fileId,
              fileId,
              name: userName || fileName.substring(fileId.length + 1),
              originalName: fileName.substring(fileId.length + 1),
              fileName,
              fileSize: stats.size,
              uploadedAt: stats.ctime.toISOString(),
              status: 'uploaded',
              transactionCount: 0,
              ...companyInfo
            };
          })
          .filter(Boolean)
        );
        
        // Apply filters to file system results
        let filteredUploads = uploads;
        if (companyId && companyId !== 'all') {
          filteredUploads = filteredUploads.filter(u => u.companyId === companyId);
        }
        if (search && search.trim()) {
          const searchTerm = search.toLowerCase().trim();
          filteredUploads = filteredUploads.filter(upload => 
            (upload.name || '').toLowerCase().includes(searchTerm) ||
            (upload.originalName || '').toLowerCase().includes(searchTerm) ||
            (upload.companyName || '').toLowerCase().includes(searchTerm)
          );
        }
        
        // Sort results
        filteredUploads.sort((a, b) => {
          if (sortOrder === 'desc') {
            return new Date(b[sortBy] || 0) - new Date(a[sortBy] || 0);
          } else {
            return new Date(a[sortBy] || 0) - new Date(b[sortBy] || 0);
          }
        });
        
        // Paginate
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedUploads = filteredUploads.slice(startIndex, endIndex);
        
        res.json({
          success: true,
          data: paginatedUploads,
          pagination: {
            total: filteredUploads.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: endIndex < filteredUploads.length
          },
          fallback: true,
          message: 'Using file system fallback'
        });
        
      } catch (fsError) {
        console.error('File system fallback also failed:', fsError);
        res.status(500).json({
          error: 'Failed to retrieve uploads',
          message: 'Both Firestore and file system queries failed'
        });
      }
    }
    
  } catch (error) {
    console.error('Get user uploads error:', error);
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

// Get upload details with associated transactions
export const getUploadDetails = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { uploadId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to view upload details'
      });
    }

    try {
      // Get upload details from Firestore
      const upload = await firebaseService.getUploadById(userId, uploadId);
      
      if (!upload) {
        return res.status(404).json({
          error: 'Upload not found',
          message: 'The requested upload could not be found'
        });
      }
      
      // Get associated transactions from Firestore
      let transactions = [];
      let indexError = null;
      
      try {
        transactions = await firebaseService.getTransactionsByUploadId(userId, uploadId);
      } catch (transactionError) {
        console.error('Error fetching transactions:', transactionError);
        
        // Check if it's a Firestore index error
        if (transactionError.message && transactionError.message.includes('index')) {
          indexError = {
            type: 'firestore_index_required',
            message: 'Firestore index required for this query',
            indexUrl: transactionError.message.match(/https:\/\/[^\s]+/)?.[0] || null
          };
        }
      }
      
      // Calculate date range from transactions
      let dateRange = null;
      const validTransactions = transactions.filter(t => t.date && !isNaN(Date.parse(t.date)));
      if (validTransactions.length > 0) {
        const dates = validTransactions.map(t => new Date(t.date)).sort((a, b) => a - b);
        dateRange = {
          start: dates[0].toISOString().split('T')[0],
          end: dates[dates.length - 1].toISOString().split('T')[0]
        };
      } else {
        dateRange = null;
      }
      
      const uploadDetails = {
        ...upload,
        transactionCount: transactions.length,
        transactions: transactions,
        dateRange,
        indexError
      };
      
      res.json({
        success: true,
        data: uploadDetails
      });
      
    } catch (firestoreError) {
      console.error('Firestore query failed, falling back to file system:', firestoreError);
      
      // Fallback to file system approach
      const uploadsDir = path.join(__dirname, '../../uploads');
      const files = await fs.readdir(uploadsDir);
      const uploadFile = files.find(fileName => fileName.startsWith(uploadId));

      if (!uploadFile) {
        return res.status(404).json({
          error: 'Upload not found',
          message: 'The requested upload could not be found'
        });
      }

      const filePath = path.join(uploadsDir, uploadFile);
      const stats = await fs.stat(filePath);

      // Load metadata
      let metadata = {};
      const metaPath = filePath + '.meta.json';
      try {
        const metaRaw = await fs.readFile(metaPath, 'utf-8');
        metadata = JSON.parse(metaRaw);
      } catch (e) {
        // No metadata file
      }

      // Try to get transactions from Firestore, fallback to empty array
      let transactions = [];
      try {
        transactions = await firebaseService.getTransactionsByUploadId(userId, uploadId);
      } catch (e) {
        console.error('Failed to get transactions:', e);
      }

      const upload = {
        id: uploadId,
        originalName: metadata.name || uploadFile.substring(uploadId.length + 1),
        fileName: uploadFile,
        uploadedAt: stats.birthtime.toISOString(),
        fileSize: stats.size,
        status: metadata.status || 'uploaded',
        companyId: metadata.companyId,
        companyName: metadata.companyName,
        transactionCount: transactions.length,
        transactions: transactions,
        dateRange: transactions.length > 0 ? {
          start: Math.min(...transactions.map(t => new Date(t.date))).toISOString().split('T')[0],
          end: Math.max(...transactions.map(t => new Date(t.date))).toISOString().split('T')[0]
        } : null
      };

      res.json({
        success: true,
        data: upload,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error getting upload details:', error);
    res.status(500).json({
      error: 'Failed to get upload details',
      message: error.message
    });
  }
};

// Rename an upload
export const renameUpload = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { uploadId } = req.params;
    const { name } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to rename uploads'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Upload name is required'
      });
    }

    // Find the upload file
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const uploadFile = files.find(fileName => fileName.startsWith(uploadId));

    if (!uploadFile) {
      return res.status(404).json({
        error: 'Upload not found',
        message: 'The requested upload could not be found'
      });
    }

    const filePath = path.join(uploadsDir, uploadFile);
    const metaPath = filePath + '.meta.json';

    // Load existing metadata
    let metadata = {};
    try {
      const metaRaw = await fs.readFile(metaPath, 'utf-8');
      metadata = JSON.parse(metaRaw);
    } catch (e) {
      // Create new metadata if none exists
      metadata = { id: uploadId };
    }

    // Update the name
    metadata.name = name.trim();
    metadata.updatedAt = new Date().toISOString();

    // Save updated metadata to file system
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    // Also update the Firestore record if it exists
    try {
      await firebaseService.updateUpload(userId, uploadId, {
        name: name.trim(),
        originalName: name.trim(), // Update both name and originalName
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Updated Firestore record for upload: ${uploadId}`);
    } catch (firestoreError) {
      console.warn('Failed to update Firestore record, but file system updated:', firestoreError.message);
      // Don't fail the request if Firestore update fails, file system is updated
    }

    res.json({
      success: true,
      message: 'Upload renamed successfully',
      data: {
        id: uploadId,
        name: metadata.name
      }
    });

  } catch (error) {
    console.error('Error renaming upload:', error);
    res.status(500).json({
      error: 'Failed to rename upload',
      message: error.message
    });
  }
};

// Delete an upload and associated transactions
export const deleteUpload = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { uploadId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to delete uploads'
      });
    }

    // Find the upload file
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const uploadFile = files.find(fileName => fileName.startsWith(uploadId));

    if (!uploadFile) {
      return res.status(404).json({
        error: 'Upload not found',
        message: 'The requested upload could not be found'
      });
    }

    const filePath = path.join(uploadsDir, uploadFile);
    const metaPath = filePath + '.meta.json';

    // Delete associated transactions from Firestore
    const deletedCount = await firebaseService.deleteTransactionsByUploadId(userId, uploadId);

    // Delete the upload record from Firestore
    await firebaseService.deleteUpload(userId, uploadId);

    // Delete the PDF file
    await fs.unlink(filePath);

    // Delete metadata file if it exists
    try {
      await fs.unlink(metaPath);
    } catch (e) {
      // Metadata file doesn't exist, ignore
    }

    res.json({
      success: true,
      message: 'Upload and associated transactions deleted successfully',
      data: {
        deletedTransactions: deletedCount
      }
    });

  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({
      error: 'Failed to delete upload',
      message: error.message
    });
  }
};
