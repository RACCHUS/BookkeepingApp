/**
 * CSV Controller
 * Handles CSV file upload, preview, and transaction import
 */

import crypto from 'crypto';
import { getDatabaseAdapter } from '../services/adapters/index.js';
import { parseCSV, getSupportedBanks, getCSVHeaders, validateMapping } from '../services/csvParserService.js';
import csvImportService from '../services/csvImportService.js';
import { logger } from '../config/index.js';
import { asyncHandler } from '../middlewares/index.js';

// Get database adapter
const getDb = () => getDatabaseAdapter();

// In-memory store for pending CSV imports (auto-cleanup after 30 minutes)
const pendingImports = new Map();

// Cleanup expired imports every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of pendingImports.entries()) {
    if (data.expiresAt < now) {
      pendingImports.delete(id);
      logger.debug('Cleaned up expired CSV import', { uploadId: id });
    }
  }
}, 5 * 60 * 1000);

/**
 * Upload and preview CSV file
 * Parses CSV and returns preview data for user confirmation
 * @route POST /api/csv/upload
 * @access Private
 */
export const uploadCSV = asyncHandler(async (req, res) => {
  const { file } = req;
  const { uid: userId } = req.user;
  const { bankFormat = 'auto', companyId, companyName } = req.body;

  logger.info('CSV upload initiated', {
    userId,
    fileName: file?.originalname,
    fileSize: file?.size,
    bankFormat,
    companyId: companyId || null,
    requestId: req.id
  });

  if (!file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      message: 'Please select a CSV file to upload'
    });
  }

  // Sanitize company info
  const sanitizedCompanyId = companyId && companyId.trim() !== '' ? companyId : null;
  const sanitizedCompanyName = companyName && companyName.trim() !== '' ? companyName : null;

  try {
    // Parse CSV
    const csvData = file.buffer.toString('utf-8');
    const parseResult = parseCSV(csvData, { bankFormat });

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to parse CSV',
        message: parseResult.error
      });
    }

    // Generate upload ID and store for later confirmation
    const uploadId = crypto.randomUUID();
    
    pendingImports.set(uploadId, {
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      companyId: sanitizedCompanyId,
      companyName: sanitizedCompanyName,
      transactions: parseResult.transactions,
      detectedBank: parseResult.detectedBank,
      detectedBankName: parseResult.detectedBankName,
      headers: parseResult.headers,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    logger.info('CSV parsed successfully', {
      uploadId,
      userId,
      transactionCount: parseResult.transactions.length,
      detectedBank: parseResult.detectedBank,
      requestId: req.id
    });

    res.status(200).json({
      success: true,
      message: 'CSV parsed successfully',
      data: {
        uploadId,
        fileName: file.originalname,
        detectedBank: parseResult.detectedBank,
        detectedBankName: parseResult.detectedBankName,
        headers: parseResult.headers,
        totalRows: parseResult.totalRows,
        parsedCount: parseResult.parsedCount,
        sampleTransactions: parseResult.transactions.slice(0, 10),
        requiresMapping: parseResult.requiresMapping,
        errors: parseResult.errors,
      }
    });
  } catch (error) {
    logger.error('CSV upload error', { error: error.message, userId, requestId: req.id });
    res.status(500).json({
      success: false,
      error: 'CSV processing failed',
      message: error.message
    });
  }
});

/**
 * Re-preview CSV with different column mapping
 * @route POST /api/csv/preview/:uploadId
 * @access Private
 */
export const previewCSV = asyncHandler(async (req, res) => {
  const { uploadId } = req.params;
  const { uid: userId } = req.user;
  const { mapping, bankFormat } = req.body;

  const pending = pendingImports.get(uploadId);

  if (!pending) {
    return res.status(404).json({
      success: false,
      error: 'Upload not found',
      message: 'CSV upload expired or not found. Please upload again.'
    });
  }

  if (pending.userId !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this upload'
    });
  }

  // Validate custom mapping if provided
  if (mapping) {
    const validation = validateMapping(mapping);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid column mapping',
        message: validation.errors.join(', ')
      });
    }
  }

  // Re-parse with new mapping would require storing raw CSV
  // For now, return current state
  res.status(200).json({
    success: true,
    data: {
      uploadId,
      fileName: pending.fileName,
      detectedBank: pending.detectedBank,
      detectedBankName: pending.detectedBankName,
      headers: pending.headers,
      totalRows: pending.transactions.length,
      parsedCount: pending.transactions.filter(t => !t._needsMapping).length,
      sampleTransactions: pending.transactions.slice(0, 10),
    }
  });
});

/**
 * Confirm and save CSV transactions
 * @route POST /api/csv/confirm/:uploadId
 * @access Private
 */
export const confirmImport = asyncHandler(async (req, res) => {
  const { uploadId } = req.params;
  const { uid: userId } = req.user;
  const { 
    companyId: overrideCompanyId, 
    companyName: overrideCompanyName,
    skipDuplicates = true 
  } = req.body;

  logger.info('CSV import confirmation initiated', {
    uploadId,
    userId,
    skipDuplicates,
    requestId: req.id
  });

  const pending = pendingImports.get(uploadId);

  if (!pending) {
    return res.status(404).json({
      success: false,
      error: 'Upload not found',
      message: 'CSV upload expired or not found. Please upload again.'
    });
  }

  if (pending.userId !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this upload'
    });
  }

  // Use override company or original
  const finalCompanyId = overrideCompanyId || pending.companyId;
  const finalCompanyName = overrideCompanyName || pending.companyName;

  try {
    const db = getDb();
    const savedIds = [];
    const duplicates = [];
    const errors = [];
    let dateRangeStart = null;
    let dateRangeEnd = null;

    // Filter out transactions that need mapping
    const validTransactions = pending.transactions.filter(t => !t._needsMapping);

    // Create CSV import record first to get the ID
    const csvImportRecord = await csvImportService.createCSVImport(userId, {
      fileName: pending.fileName,
      originalName: pending.fileName,
      fileSize: pending.fileSize || 0,
      bankName: pending.detectedBankName || null,
      bankFormat: pending.detectedBank || 'auto',
      companyId: finalCompanyId,
      companyName: finalCompanyName,
      transactionCount: 0, // Will update after import
      duplicateCount: 0,
      errorCount: 0,
      metadata: {
        headers: pending.headers,
        originalUploadId: uploadId
      }
    });

    const csvImportId = csvImportRecord.id;

    for (const transaction of validTransactions) {
      try {
        // Check for duplicates if requested
        if (skipDuplicates) {
          const isDuplicate = await checkDuplicate(db, userId, transaction);
          if (isDuplicate) {
            duplicates.push({
              date: transaction.date,
              description: transaction.description,
              amount: transaction.amount
            });
            continue;
          }
        }

        // Track date range
        if (transaction.date) {
          if (!dateRangeStart || transaction.date < dateRangeStart) {
            dateRangeStart = transaction.date;
          }
          if (!dateRangeEnd || transaction.date > dateRangeEnd) {
            dateRangeEnd = transaction.date;
          }
        }

        // Prepare transaction for save
        const txToSave = {
          ...transaction,
          userId,
          companyId: finalCompanyId || '',
          companyName: finalCompanyName || '',
          csvImportId: csvImportId,
          source: 'csv_import',
          sourceFile: pending.fileName,
          isManuallyReviewed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Remove internal fields
        delete txToSave._rowIndex;
        delete txToSave._raw;
        delete txToSave._needsMapping;
        delete txToSave.originalType;

        const result = await db.createTransaction(userId, txToSave);
        
        // Track saved transaction with its ID and classification status
        savedIds.push({
          id: result.id,
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.date,
          category: transaction.category || null,
          isClassified: !!(transaction.category && transaction.category.trim())
        });
      } catch (err) {
        errors.push({
          transaction: { 
            date: transaction.date, 
            description: transaction.description?.substring(0, 50) 
          },
          error: err.message
        });
      }
    }

    // Update CSV import record with final counts and date range
    await csvImportService.updateCSVImport(userId, csvImportId, {
      transaction_count: savedIds.length,
      duplicate_count: duplicates.length,
      error_count: errors.length,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd
    });

    // Clean up pending import
    pendingImports.delete(uploadId);

    logger.info('CSV import completed', {
      uploadId,
      userId,
      savedCount: savedIds.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      requestId: req.id
    });

    // Calculate classification stats
    const classifiedTransactions = savedIds.filter(t => t.isClassified);
    const unclassifiedTransactions = savedIds.filter(t => !t.isClassified);

    res.status(200).json({
      success: true,
      message: `Successfully imported ${savedIds.length} transactions`,
      data: {
        csvImportId: csvImportId,
        // New field names expected by frontend
        imported: savedIds.length,
        classified: classifiedTransactions.length,
        unclassified: unclassifiedTransactions.length,
        // Return unclassified transactions for AI classification
        unclassifiedTransactions: unclassifiedTransactions.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date
        })),
        // Keep old field names for backward compatibility
        savedCount: savedIds.length,
        savedIds: savedIds.map(t => t.id),
        duplicateCount: duplicates.length,
        duplicates: duplicates.slice(0, 10), // Only return first 10 duplicates
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Only return first 10 errors
        dateRange: {
          start: dateRangeStart,
          end: dateRangeEnd
        }
      }
    });
  } catch (error) {
    logger.error('CSV import failed', { 
      uploadId, 
      userId, 
      error: error.message, 
      requestId: req.id 
    });

    res.status(500).json({
      success: false,
      error: 'Import failed',
      message: error.message
    });
  }
});

/**
 * Cancel pending CSV import
 * @route DELETE /api/csv/cancel/:uploadId
 * @access Private
 */
export const cancelImport = asyncHandler(async (req, res) => {
  const { uploadId } = req.params;
  const { uid: userId } = req.user;

  const pending = pendingImports.get(uploadId);

  if (!pending) {
    return res.status(404).json({
      success: false,
      error: 'Upload not found',
      message: 'CSV upload not found or already cancelled'
    });
  }

  if (pending.userId !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to cancel this upload'
    });
  }

  pendingImports.delete(uploadId);

  logger.info('CSV import cancelled', { uploadId, userId, requestId: req.id });

  res.status(200).json({
    success: true,
    message: 'CSV import cancelled'
  });
});

/**
 * Get supported bank formats
 * @route GET /api/csv/banks
 * @access Public (no auth required for dropdown)
 */
export const getBanks = asyncHandler(async (req, res) => {
  const banks = getSupportedBanks();
  
  res.status(200).json({
    success: true,
    data: [
      { key: 'auto', name: 'Auto-Detect' },
      ...banks,
      { key: 'custom', name: 'Other / Custom Mapping' }
    ]
  });
});

/**
 * Get headers from CSV for custom mapping
 * @route POST /api/csv/headers
 * @access Private
 */
export const getHeaders = asyncHandler(async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  const csvData = file.buffer.toString('utf-8');
  const result = getCSVHeaders(csvData);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error
    });
  }

  res.status(200).json({
    success: true,
    data: {
      headers: result.headers,
      sampleRows: result.sampleRows
    }
  });
});

/**
 * Check if a transaction is a duplicate
 * @param {Object} db - Database adapter
 * @param {string} userId - User ID
 * @param {Object} transaction - Transaction to check
 * @returns {boolean} True if duplicate found
 */
async function checkDuplicate(db, userId, transaction) {
  try {
    // Look for transactions with same date, amount, and similar description
    const existing = await db.getTransactions(userId, {
      startDate: transaction.date,
      endDate: transaction.date,
    });

    if (!existing || existing.length === 0) {
      return false;
    }

    // Check for matching amount and similar description
    for (const tx of existing) {
      if (Math.abs(tx.amount - transaction.amount) < 0.01) {
        // Amount matches, check description similarity
        const desc1 = (tx.description || '').toLowerCase().trim();
        const desc2 = (transaction.description || '').toLowerCase().trim();
        
        if (desc1 === desc2 || desc1.includes(desc2) || desc2.includes(desc1)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.warn('Duplicate check failed', { error: error.message });
    return false; // Don't block import on duplicate check failure
  }
}

/**
 * Get all CSV imports for the user
 * @route GET /api/csv/imports
 * @access Private
 */
export const getCSVImports = asyncHandler(async (req, res) => {
  const { uid: userId } = req.user;
  const { companyId, status, limit, offset, sortBy, sortOrder } = req.query;

  const imports = await csvImportService.getCSVImports(userId, {
    companyId,
    status: status || 'completed',
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
    sortBy,
    sortOrder
  });

  res.status(200).json({
    success: true,
    data: imports,
    count: imports.length
  });
});

/**
 * Get a single CSV import by ID
 * @route GET /api/csv/imports/:importId
 * @access Private
 */
export const getCSVImportById = asyncHandler(async (req, res) => {
  const { uid: userId } = req.user;
  const { importId } = req.params;

  const importRecord = await csvImportService.getCSVImportById(userId, importId);

  if (!importRecord) {
    return res.status(404).json({
      success: false,
      error: 'Not found',
      message: 'CSV import not found'
    });
  }

  res.status(200).json({
    success: true,
    data: importRecord
  });
});

/**
 * Get transactions linked to a CSV import
 * @route GET /api/csv/imports/:importId/transactions
 * @access Private
 */
export const getCSVImportTransactions = asyncHandler(async (req, res) => {
  const { uid: userId } = req.user;
  const { importId } = req.params;
  const { limit, offset } = req.query;

  const transactions = await csvImportService.getTransactionsByCSVImport(
    userId, 
    importId,
    {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    }
  );

  res.status(200).json({
    success: true,
    data: transactions,
    count: transactions.length
  });
});

/**
 * Delete a CSV import
 * @route DELETE /api/csv/imports/:importId
 * @access Private
 */
export const deleteCSVImport = asyncHandler(async (req, res) => {
  const { uid: userId } = req.user;
  const { importId } = req.params;
  const { deleteTransactions, deleteImportId } = req.body;

  logger.info('CSV import delete requested', {
    userId,
    importId,
    deleteTransactions: !!deleteTransactions,
    deleteImportId: !!deleteImportId,
    requestId: req.id
  });

  const result = await csvImportService.deleteCSVImport(userId, importId, {
    deleteTransactions: deleteTransactions === true,
    deleteImportId: deleteImportId === true
  });

  res.status(200).json({
    success: true,
    message: 'CSV import deleted successfully',
    data: result
  });
});

/**
 * Delete transactions linked to a CSV import
 * @route DELETE /api/csv/imports/:importId/transactions
 * @access Private
 */
export const deleteCSVImportTransactions = asyncHandler(async (req, res) => {
  const { uid: userId } = req.user;
  const { importId } = req.params;
  const { deleteImportId } = req.body;

  logger.info('CSV import transactions delete requested', {
    userId,
    importId,
    deleteImportId: !!deleteImportId,
    requestId: req.id
  });

  const result = await csvImportService.deleteTransactionsByCSVImport(userId, importId, {
    deleteImportId: deleteImportId === true
  });

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount} transactions`,
    data: result
  });
});

export default {
  uploadCSV,
  previewCSV,
  confirmImport,
  cancelImport,
  getBanks,
  getHeaders,
  getCSVImports,
  getCSVImportById,
  getCSVImportTransactions,
  deleteCSVImport,
  deleteCSVImportTransactions,
};
