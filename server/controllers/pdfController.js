import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { uploadFileToSupabase, deleteFileFromSupabase } from '../services/supabaseService.js';
import { fileURLToPath } from 'url';
import { getDatabaseAdapter } from '../services/adapters/index.js';
import chasePDFParser from '../services/chasePDFParser.js';
import { isFirestoreIndexError, getIndexErrorMessage, logIndexError } from '../utils/errorHandler.js';
import { logger } from '../config/index.js';
import { asyncHandler } from '../middlewares/index.js';

// Get database adapter (Supabase or Firebase based on DB_PROVIDER)
const getDb = () => getDatabaseAdapter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for processing status (in production, use Redis or database)
const processingStatus = new Map();

/**
 * Upload and process PDF bank statement
 * @route POST /api/pdf/upload
 * @access Private - Requires authentication
 */
export const uploadPDF = asyncHandler(async (req, res) => {
  const { file } = req;
  const { uid: userId } = req.user;
  
  // Accept user-provided name for the statement (optional) and company information
  const { 
    bankType = 'chase', 
    autoProcess = false, 
    name: userProvidedName,
    companyId,
    companyName,
    createTransactions = true // When false, PDF is uploaded but no transactions are created
  } = req.body;

  logger.info('PDF upload initiated', {
    userId,
    fileName: file?.originalname,
    bankType,
    autoProcess,
    createTransactions,
    companyId: companyId || null,
    requestId: req.id
  });

  if (!file) {
    logger.warn('PDF upload failed - no file provided', { userId, requestId: req.id });
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please select a PDF file to upload'
    });
  }

  // Handle empty string company IDs (treat as null)
  const sanitizedCompanyId = companyId && companyId.trim() !== '' ? companyId : null;
  const sanitizedCompanyName = companyName && companyName.trim() !== '' ? companyName : null;
  
  if (sanitizedCompanyId) {
    logger.debug('Company selected for upload', {
      companyId: sanitizedCompanyId,
      companyName: sanitizedCompanyName,
      userId,
      requestId: req.id
    });
  }

  if (!file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please select a PDF file to upload'
    });
  }


  // Helper: sanitize filename for Supabase compatibility
  function sanitizeFilename(name) {
    // Remove brackets, spaces, and other problematic characters
    return name.replace(/[\[\]{}()*?<>|"'`\\]/g, '')
               .replace(/\s+/g, '_');
  }

  const uploadId = crypto.randomUUID();
  // Store file in per-user folder for RLS policy compatibility
  const sanitizedOriginalName = sanitizeFilename(file.originalname);
  const fileName = `${userId}/${uploadId}-${sanitizedOriginalName}`;

  // Upload file to Supabase Storage (with Cloudinary fallback)
  let storageResult;
  try {
    storageResult = await uploadFileToSupabase(file.buffer, fileName);
    console.log(`📄 PDF uploaded to ${storageResult.storageProvider}: ${fileName} (${file.size} bytes)`);
  } catch (err) {
    logger.error('Storage upload failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to upload PDF', message: err.message });
  }

  // Create upload record and persist it to Firestore
  const uploadRecord = {
    id: uploadId,
    fileId: uploadId,
    name: userProvidedName && typeof userProvidedName === 'string' && userProvidedName.trim() ? userProvidedName.trim() : sanitizedOriginalName,
    originalName: sanitizedOriginalName,
    fileName: fileName,
    fileSize: file.size,
    bankType: bankType,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
    processed: false,
    companyId: sanitizedCompanyId,
    companyName: sanitizedCompanyName,
    supabaseUrl: storageResult.url, // URL from either Supabase or Cloudinary
    storageProvider: storageResult.storageProvider, // 'supabase' or 'cloudinary'
    cloudinaryPublicId: storageResult.cloudinaryPublicId || null, // For Cloudinary deletion
    createTransactions: createTransactions !== false && createTransactions !== 'false' // Normalize to boolean
  };
    
    // Save upload record to Firestore
    try {
      await getDb().createUploadRecord(userId, uploadRecord);
      console.log(`✅ Upload record saved to Firestore: ${uploadId}`);
    } catch (error) {
      console.error('Failed to save upload record to Firestore:', error);
      // Continue with file processing even if Firestore save fails
    }

    // Write metadata file before any processing (for robust statement listing)
    // (Optional: If you want to keep local metadata, you can use fileName as the key, or skip this step for Supabase-only storage)

    // If autoProcess is enabled, start processing immediately
    if (autoProcess) {
      // Start processing in background
      processUploadedFile(uploadId, fileName, userId, bankType)
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
});

/**
 * Process uploaded PDF to extract transactions
 * @route POST /api/pdf/process/:fileId
 * @access Private - Requires authentication
 */
export const processPDF = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { autoSave = true, classification = 'auto', createTransactions = true } = req.body;
  const { uid: userId } = req.user;

  logger.info('PDF processing initiated', {
    fileId,
    userId,
    autoSave,
    classification,
    createTransactions,
    requestId: req.id
  });

    console.log('📄 PDF processing by user:', userId);

    // Get upload record from Firestore to find Supabase file name
    let uploadRecord;
    try {
      uploadRecord = await getDb().getUploadById(userId, fileId);
      if (!uploadRecord || !uploadRecord.fileName) {
        return res.status(404).json({
          error: 'File not found',
          message: 'The uploaded PDF file could not be found'
        });
      }
    } catch (err) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The uploaded PDF file could not be found'
      });
    }

    const fileName = uploadRecord.fileName;
    const processId = crypto.randomUUID();

    // Start processing
    processingStatus.set(processId, {
      status: 'processing',
      progress: 10,
      message: 'Starting PDF processing...',
      startTime: new Date().toISOString()
    });

    // Process in background and return immediately
    // Check if upload record has createTransactions flag, otherwise use request body
    const shouldCreateTransactions = uploadRecord.createTransactions !== false && createTransactions !== false && createTransactions !== 'false';
    processUploadedFile(fileId, fileName, userId, 'chase', processId, autoSave && shouldCreateTransactions)
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
});

// Background processing function
async function processUploadedFile(fileId, filePath, userId, bankType, processId = null, autoSave = true) {
  const actualProcessId = processId || crypto.randomUUID();
  
  try {
    // Read metadata to get company information
    let companyInfo = { companyId: null, companyName: null };
    // Optionally fetch metadata from Firestore if needed

    // Get upload record to determine storage provider
    const uploadRecord = await getDb().getUploadById(userId, fileId);
    const storageProvider = uploadRecord?.storageProvider || 'supabase';
    
    let pdfBuffer;
    
    if (storageProvider === 'cloudinary' && uploadRecord?.supabaseUrl) {
      // Download from Cloudinary using the URL
      console.log('📥 Downloading PDF from Cloudinary...');
      const response = await fetch(uploadRecord.supabaseUrl);
      if (!response.ok) throw new Error(`Failed to download PDF from Cloudinary: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    } else {
      // Download file from Supabase Storage as a buffer
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.storage.from('uploads').download(filePath);
      if (error || !data) throw new Error('Failed to download PDF from Supabase: ' + (error?.message || 'No data'));
      pdfBuffer = Buffer.from(await data.arrayBuffer());
    }
    
    console.log('🔍 PDF buffer size:', pdfBuffer.length, 'Type:', typeof pdfBuffer, 'First 16 bytes:', pdfBuffer.slice(0, 16));

    // Write buffer to a temp file for parsing
    const tempDir = path.join(__dirname, '../../uploads/temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `${fileId}-${Date.now()}.pdf`);
    await fs.writeFile(tempFilePath, pdfBuffer);

    // Update progress
    processingStatus.set(actualProcessId, {
      status: 'processing',
      progress: 25,
      message: 'Parsing PDF content...',
      startTime: processingStatus.get(actualProcessId)?.startTime || new Date().toISOString()
    });

    // Parse the PDF using our Chase parser (pass file path)
    let parseResult;
    try {
      console.log(`[PDFController] Starting parsePDF for file: ${tempFilePath}, userId: ${userId}`);
      parseResult = await chasePDFParser.parsePDF(tempFilePath, userId);
      console.log(`[PDFController] parsePDF result:`, {
        success: parseResult?.success,
        error: parseResult?.error,
        transactionsType: typeof parseResult?.transactions,
        transactionsLength: Array.isArray(parseResult?.transactions) ? parseResult.transactions.length : 'N/A',
        transactionsSample: Array.isArray(parseResult?.transactions) ? parseResult.transactions.slice(0, 2) : [],
        accountInfo: parseResult?.accountInfo,
        summary: parseResult?.summary
      });
    } catch (err) {
      console.error('[PDFController] ❌ PDF parsing error:', err);
      throw err;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupErr) {
        console.warn('[PDFController] Failed to clean up temp PDF file:', cleanupErr.message);
      }
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
    if (autoSave) {
      if (Array.isArray(parseResult.transactions)) {
        console.log(`[PDFController] Attempting to save ${parseResult.transactions.length} transactions for upload ${fileId}`);
        if (parseResult.transactions.length > 0) {
          try {
            for (const tx of parseResult.transactions) {
              // Attach statementId/uploadId to each transaction
              const txWithStatementId = { ...tx, statementId: fileId };
              const result = await getDb().createTransaction(userId, txWithStatementId);
              savedTransactionIds.push(result.id);
            }
            console.log(`[PDFController] ✅ Saved ${savedTransactionIds.length} transactions for upload ${fileId}`);
          } catch (saveErr) {
            console.error('[PDFController] ❌ Failed to save transactions:', saveErr);
          }
        } else {
          console.warn(`[PDFController] No transactions to save for upload ${fileId}`);
        }
      } else {
        console.error(`[PDFController] parseResult.transactions is not an array:`, parseResult.transactions);
      }
    }

    // Update Firestore upload record to mark as processed
    try {
      await getDb().updateUpload(userId, fileId, {
        processed: true,
        status: 'processed',
        updatedAt: new Date().toISOString(),
        transactionCount: parseResult.transactions.length
      });
      console.log(`✅ Updated upload record as processed: ${fileId}`);
    } catch (updateErr) {
      console.error('❌ Failed to update upload record:', updateErr);
    }

    // Delete file from storage after everything is saved
    try {
      // Get upload record to determine storage provider
      const uploadRecordForDelete = await getDb().getUploadById(userId, fileId);
      const provider = uploadRecordForDelete?.storageProvider || 'supabase';
      const cloudinaryId = uploadRecordForDelete?.cloudinaryPublicId || null;
      await deleteFileFromSupabase(filePath, provider, cloudinaryId);
      console.log(`🗑️ Deleted PDF from ${provider}:`, filePath);
    } catch (deleteErr) {
      console.warn('Failed to delete PDF from storage:', deleteErr.message);
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
      let uploads = await getDb().getUploads(userId, filters);
      
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
          const transactions = await getDb().getTransactionsByUploadId(userId, upload.id);
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
      const upload = await getDb().getUploadById(userId, uploadId);
      
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
        transactions = await getDb().getTransactionsByUploadId(userId, uploadId);
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
        transactions = await getDb().getTransactionsByUploadId(userId, uploadId);
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
      await getDb().updateUpload(userId, uploadId, {
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

// Delete an upload with optional transaction deletion
export const deleteUpload = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { uploadId } = req.params;
    // deleteTransactions defaults to true for backward compatibility
    const deleteTransactions = req.query.deleteTransactions !== 'false';

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to delete uploads'
      });
    }

    // Get upload record from Firestore to find storage info
    let uploadRecord;
    try {
      uploadRecord = await getDb().getUploadById(userId, uploadId);
    } catch (err) {
      return res.status(404).json({
        error: 'Upload not found',
        message: 'The requested upload could not be found'
      });
    }

    let deletedTransactionCount = 0;
    let unlinkedTransactionCount = 0;

    if (deleteTransactions) {
      // Delete associated transactions from Firestore
      deletedTransactionCount = await getDb().deleteTransactionsByUploadId(userId, uploadId);
    } else {
      // Just unlink transactions (remove statementId but keep them)
      unlinkedTransactionCount = await getDb().unlinkTransactionsByUploadId(userId, uploadId);
    }

    // Record the deleted upload ID for reference (useful for audit trail)
    await getDb().recordDeletedUploadId(userId, {
      uploadId,
      uploadName: uploadRecord?.name || uploadRecord?.originalName || 'Unknown',
      deletedAt: new Date().toISOString(),
      transactionsDeleted: deleteTransactions,
      transactionCount: deleteTransactions ? deletedTransactionCount : unlinkedTransactionCount
    });

    // Delete the upload record from Firestore
    await getDb().deleteUpload(userId, uploadId);

    // Delete the PDF file from storage (Supabase or Cloudinary)
    if (uploadRecord && uploadRecord.fileName) {
      try {
        const provider = uploadRecord.storageProvider || 'supabase';
        const cloudinaryId = uploadRecord.cloudinaryPublicId || null;
        await deleteFileFromSupabase(uploadRecord.fileName, provider, cloudinaryId);
        console.log(`🗑️ Deleted PDF from ${provider}:`, uploadRecord.fileName);
      } catch (deleteErr) {
        console.warn('Failed to delete PDF from storage:', deleteErr.message);
      }
    }

    res.json({
      success: true,
      message: deleteTransactions 
        ? 'Upload and associated transactions deleted successfully'
        : 'Upload deleted, transactions preserved',
      data: {
        deletedTransactions: deletedTransactionCount,
        unlinkedTransactions: unlinkedTransactionCount,
        transactionsDeleted: deleteTransactions
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

/**
 * Batch delete multiple uploads
 * @route POST /api/pdf/uploads/batch-delete
 * @access Private
 */
export const batchDeleteUploads = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { uploadIds, deleteTransactions = false } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to delete uploads'
      });
    }

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'uploadIds must be a non-empty array'
      });
    }

    console.log(`🗑️ Batch deleting ${uploadIds.length} uploads for user ${userId}`);

    const results = {
      successful: [],
      failed: [],
      totalTransactionsDeleted: 0,
      totalTransactionsUnlinked: 0
    };

    // Process each upload
    for (const uploadId of uploadIds) {
      try {
        // Get upload record from Firestore
        let uploadRecord;
        try {
          uploadRecord = await getDb().getUploadById(userId, uploadId);
        } catch (err) {
          results.failed.push({ 
            uploadId, 
            error: 'Upload not found' 
          });
          continue;
        }

        let deletedTransactionCount = 0;
        let unlinkedTransactionCount = 0;

        if (deleteTransactions) {
          deletedTransactionCount = await getDb().deleteTransactionsByUploadId(userId, uploadId);
          results.totalTransactionsDeleted += deletedTransactionCount;
        } else {
          unlinkedTransactionCount = await getDb().unlinkTransactionsByUploadId(userId, uploadId);
          results.totalTransactionsUnlinked += unlinkedTransactionCount;
        }

        // Record the deleted upload ID
        await getDb().recordDeletedUploadId(userId, {
          uploadId,
          uploadName: uploadRecord?.name || uploadRecord?.originalName || 'Unknown',
          deletedAt: new Date().toISOString(),
          transactionsDeleted: deleteTransactions,
          transactionCount: deleteTransactions ? deletedTransactionCount : unlinkedTransactionCount
        });

        // Delete the upload record from Firestore
        await getDb().deleteUpload(userId, uploadId);

        // Delete the PDF file from storage
        if (uploadRecord && uploadRecord.fileName) {
          try {
            const provider = uploadRecord.storageProvider || 'supabase';
            const cloudinaryId = uploadRecord.cloudinaryPublicId || null;
            await deleteFileFromSupabase(uploadRecord.fileName, provider, cloudinaryId);
          } catch (deleteErr) {
            console.warn(`Failed to delete PDF from storage for ${uploadId}:`, deleteErr.message);
          }
        }

        results.successful.push({
          uploadId,
          name: uploadRecord?.name || uploadRecord?.originalName,
          deletedTransactions: deletedTransactionCount,
          unlinkedTransactions: unlinkedTransactionCount
        });
      } catch (err) {
        console.error(`Error deleting upload ${uploadId}:`, err);
        results.failed.push({ 
          uploadId, 
          error: err.message 
        });
      }
    }

    console.log(`✅ Batch delete complete: ${results.successful.length} succeeded, ${results.failed.length} failed`);

    res.json({
      success: true,
      message: `Deleted ${results.successful.length} of ${uploadIds.length} uploads`,
      data: results
    });

  } catch (error) {
    console.error('Error in batch delete uploads:', error);
    res.status(500).json({
      error: 'Failed to batch delete uploads',
      message: error.message
    });
  }
};

// Update upload company information
export const updateUploadCompany = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { uploadId } = req.params;
    const { companyId, companyName } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to update uploads'
      });
    }

    // Sanitize company information (handle empty strings)
    const sanitizedCompanyId = companyId && companyId.trim() !== '' ? companyId.trim() : null;
    const sanitizedCompanyName = companyName && companyName.trim() !== '' ? companyName.trim() : null;

    console.log(`📄 Updating upload ${uploadId} company: ${sanitizedCompanyName || sanitizedCompanyId || 'None'}`);

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

    // Update the company information
    metadata.companyId = sanitizedCompanyId;
    metadata.companyName = sanitizedCompanyName;
    metadata.updatedAt = new Date().toISOString();

    // Save updated metadata to file system
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    // Also update the Firestore record if it exists
    try {
      await getDb().updateUpload(userId, uploadId, {
        companyId: sanitizedCompanyId,
        companyName: sanitizedCompanyName,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Updated Firestore record for upload: ${uploadId}`);
    } catch (firestoreError) {
      console.warn('Failed to update Firestore record, but file system updated:', firestoreError.message);
      // Don't fail the request if Firestore update fails, file system is updated
    }

    res.json({
      success: true,
      message: 'Upload company information updated successfully',
      data: {
        id: uploadId,
        companyId: sanitizedCompanyId,
        companyName: sanitizedCompanyName
      }
    });

  } catch (error) {
    console.error('Error updating upload company:', error);
    res.status(500).json({
      error: 'Failed to update upload company',
      message: error.message
    });
  }
};

/**
 * Link existing transactions to an upload
 * @route POST /api/pdf/uploads/:uploadId/link-transactions
 * @access Private - Requires authentication
 */
export const linkTransactionsToUpload = asyncHandler(async (req, res) => {
  const { uploadId } = req.params;
  const { transactionIds } = req.body;
  const { uid: userId } = req.user;

  logger.info('Link transactions to upload', {
    uploadId,
    transactionCount: transactionIds?.length,
    userId,
    requestId: req.id
  });

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'transactionIds must be a non-empty array'
    });
  }

  // Verify the upload exists and belongs to the user
  try {
    const upload = await getDb().getUploadById(userId, uploadId);
    if (!upload) {
      return res.status(404).json({
        error: 'Upload not found',
        message: 'The specified upload does not exist'
      });
    }
  } catch (error) {
    return res.status(404).json({
      error: 'Upload not found',
      message: 'The specified upload does not exist'
    });
  }

  const result = await getDb().linkTransactionsToUpload(userId, uploadId, transactionIds);

  // Update the upload record with transaction count
  try {
    const linkedTransactions = await getDb().getTransactionsByUploadId(userId, uploadId);
    await getDb().updateUpload(userId, uploadId, {
      transactionCount: linkedTransactions.length,
      updatedAt: new Date().toISOString()
    });
  } catch (updateError) {
    logger.warn('Failed to update upload transaction count', { error: updateError.message });
  }

  res.json({
    success: true,
    message: `Linked ${result.linkedCount} transactions to upload`,
    data: {
      uploadId,
      linkedCount: result.linkedCount,
      errors: result.errors
    }
  });
});

/**
 * Unlink transactions from their uploads
 * @route POST /api/pdf/uploads/unlink-transactions
 * @access Private - Requires authentication
 */
export const unlinkTransactionsFromUpload = asyncHandler(async (req, res) => {
  const { transactionIds } = req.body;
  const { uid: userId } = req.user;

  logger.info('Unlink transactions from uploads', {
    transactionCount: transactionIds?.length,
    userId,
    requestId: req.id
  });

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'transactionIds must be a non-empty array'
    });
  }

  const result = await getDb().unlinkTransactionsFromUpload(userId, transactionIds);

  res.json({
    success: true,
    message: `Unlinked ${result.unlinkedCount} transactions`,
    data: {
      unlinkedCount: result.unlinkedCount,
      errors: result.errors
    }
  });
});
