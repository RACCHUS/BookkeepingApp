/**
 * CSV Import Service
 * Manages CSV import records for tracking and linking to transactions
 */

import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/index.js';

const getSupabase = () => getSupabaseAdmin();

/**
 * Validate required string parameter
 * @param {string} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @throws {Error} If validation fails
 */
function validateRequiredString(value, name) {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required and must be a non-empty string`);
  }
}

/**
 * Validate UUID format
 * @param {string} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @throws {Error} If validation fails
 */
function validateUUID(value, name) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!value || !uuidRegex.test(value)) {
    throw new Error(`${name} must be a valid UUID`);
  }
}

/**
 * Create a new CSV import record
 * @param {string} userId - User ID
 * @param {Object} importData - CSV import metadata
 * @returns {Promise<Object>} Created import record
 */
export async function createCSVImport(userId, importData) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');
  if (!importData || typeof importData !== 'object') {
    throw new Error('importData is required and must be an object');
  }
  if (!importData.fileName) {
    throw new Error('fileName is required in importData');
  }

  const supabase = getSupabase();
  
  const record = {
    user_id: userId,
    file_name: importData.fileName,
    original_name: importData.originalName || importData.fileName,
    file_size: importData.fileSize || 0,
    bank_name: importData.bankName || null,
    bank_format: importData.bankFormat || 'auto',
    company_id: importData.companyId || null,
    company_name: importData.companyName || null,
    transaction_count: importData.transactionCount || 0,
    duplicate_count: importData.duplicateCount || 0,
    error_count: importData.errorCount || 0,
    date_range_start: importData.dateRangeStart || null,
    date_range_end: importData.dateRangeEnd || null,
    status: 'completed',
    metadata: importData.metadata || {}
  };

  logger.info('Creating CSV import record', { userId, fileName: record.file_name });

  const { data, error } = await supabase
    .from('csv_imports')
    .insert(record)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create CSV import', { error: error.message, userId });
    throw error;
  }

  return data;
}

/**
 * Get all CSV imports for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of CSV imports
 */
export async function getCSVImports(userId, options = {}) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');

  const supabase = getSupabase();
  const { 
    companyId, 
    status = 'completed', 
    limit = 50, 
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  // Validate numeric options
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  // Build query
  let query = supabase
    .from('csv_imports')
    .select('*')
    .eq('user_id', userId);

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Filter by company
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  // Validate sort options
  const validSortColumns = ['created_at', 'file_name', 'transaction_count', 'bank_name'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const ascending = sortOrder.toUpperCase() !== 'DESC';
  
  query = query.order(safeSortBy, { ascending });
  query = query.range(safeOffset, safeOffset + safeLimit - 1);

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to get CSV imports', { error: error.message, userId });
    throw error;
  }

  // Get linked transaction counts for each import
  const importsWithCounts = await Promise.all(
    data.map(async (importRecord) => {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('csv_import_id', importRecord.id);
      
      return {
        ...importRecord,
        linked_transaction_count: count || 0
      };
    })
  );

  return importsWithCounts;
}

/**
 * Get a single CSV import by ID
 * @param {string} userId - User ID
 * @param {string} importId - CSV import ID
 * @returns {Promise<Object|null>} CSV import record or null
 */
export async function getCSVImportById(userId, importId) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');
  validateUUID(importId, 'importId');

  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('csv_imports')
    .select('*')
    .eq('id', importId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logger.error('Failed to get CSV import by ID', { error: error.message, userId, importId });
    throw error;
  }

  // Get linked transaction count
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('csv_import_id', importId);

  return {
    ...data,
    linked_transaction_count: count || 0
  };
}

/**
 * Get transactions linked to a CSV import
 * @param {string} userId - User ID
 * @param {string} importId - CSV import ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of transactions
 */
export async function getTransactionsByCSVImport(userId, importId, options = {}) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');
  validateUUID(importId, 'importId');

  const supabase = getSupabase();
  const { limit = 100, offset = 0 } = options;
  
  // Validate numeric options
  const safeLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('csv_import_id', importId)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) {
    logger.error('Failed to get transactions by CSV import', { error: error.message, userId, importId });
    throw error;
  }

  return data || [];
}

/**
 * Delete a CSV import record
 * @param {string} userId - User ID
 * @param {string} importId - CSV import ID
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCSVImport(userId, importId, options = {}) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');
  validateUUID(importId, 'importId');

  const supabase = getSupabase();
  const { 
    deleteTransactions = false,
    deleteImportId = false  // If true, completely removes the import record
  } = options;

  logger.info('Deleting CSV import', { 
    userId, 
    importId, 
    deleteTransactions, 
    deleteImportId 
  });

  // First verify ownership
  const importRecord = await getCSVImportById(userId, importId);
  if (!importRecord) {
    throw new Error('CSV import not found or access denied');
  }

  let deletedTransactionCount = 0;

  // Delete linked transactions if requested
  if (deleteTransactions) {
    const { data: deletedTx, error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('csv_import_id', importId)
      .eq('user_id', userId)
      .select('id');
    
    if (deleteError) {
      logger.error('Failed to delete transactions', { error: deleteError.message });
      throw deleteError;
    }
    
    deletedTransactionCount = deletedTx?.length || 0;
    logger.info('Deleted linked transactions', { importId, count: deletedTransactionCount });
  } else {
    // Just unlink transactions (set csv_import_id to null)
    const { error: unlinkError } = await supabase
      .from('transactions')
      .update({ csv_import_id: null, updated_at: new Date().toISOString() })
      .eq('csv_import_id', importId)
      .eq('user_id', userId);
    
    if (unlinkError) {
      logger.error('Failed to unlink transactions', { error: unlinkError.message });
      throw unlinkError;
    }
    
    logger.info('Unlinked transactions from CSV import', { importId });
  }

  // Delete or mark as deleted the import record
  if (deleteImportId) {
    // Completely remove the import record
    const { error: deleteError } = await supabase
      .from('csv_imports')
      .delete()
      .eq('id', importId)
      .eq('user_id', userId);
    
    if (deleteError) {
      logger.error('Failed to delete CSV import record', { error: deleteError.message });
      throw deleteError;
    }
    
    logger.info('Deleted CSV import record', { importId });
  } else {
    // Just mark as deleted (keeps the ID for reference)
    const { error: updateError } = await supabase
      .from('csv_imports')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', importId)
      .eq('user_id', userId);
    
    if (updateError) {
      logger.error('Failed to update CSV import status', { error: updateError.message });
      throw updateError;
    }
    
    logger.info('Marked CSV import as deleted', { importId });
  }

  return {
    success: true,
    importId,
    deletedTransactionCount,
    importDeleted: deleteImportId,
    transactionsDeleted: deleteTransactions
  };
}

/**
 * Delete transactions by CSV import ID
 * @param {string} userId - User ID
 * @param {string} importId - CSV import ID
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTransactionsByCSVImport(userId, importId, options = {}) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');
  validateUUID(importId, 'importId');

  const supabase = getSupabase();
  const { deleteImportId = false } = options;

  logger.info('Deleting transactions by CSV import', { 
    userId, 
    importId, 
    deleteImportId 
  });

  // Verify ownership
  const importRecord = await getCSVImportById(userId, importId);
  if (!importRecord) {
    throw new Error('CSV import not found or access denied');
  }

  // Delete transactions
  const { data: deletedTx, error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('csv_import_id', importId)
    .eq('user_id', userId)
    .select('id');

  if (deleteError) {
    logger.error('Failed to delete transactions', { error: deleteError.message });
    throw deleteError;
  }

  const deletedCount = deletedTx?.length || 0;

  // Update import record transaction count
  const { error: updateError } = await supabase
    .from('csv_imports')
    .update({ transaction_count: 0, updated_at: new Date().toISOString() })
    .eq('id', importId)
    .eq('user_id', userId);

  if (updateError) {
    logger.warn('Failed to update import transaction count', { error: updateError.message });
  }

  // Optionally delete the import ID as well
  if (deleteImportId) {
    const { error: deleteImportError } = await supabase
      .from('csv_imports')
      .delete()
      .eq('id', importId)
      .eq('user_id', userId);
    
    if (deleteImportError) {
      logger.error('Failed to delete CSV import record', { error: deleteImportError.message });
      throw deleteImportError;
    }
    
    logger.info('Also deleted CSV import record', { importId });
  }

  return {
    success: true,
    importId,
    deletedCount,
    importDeleted: deleteImportId
  };
}

/**
 * Update CSV import record
 * @param {string} userId - User ID
 * @param {string} importId - CSV import ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated record
 */
export async function updateCSVImport(userId, importId, updates) {
  // Validate required parameters
  validateRequiredString(userId, 'userId');
  validateUUID(importId, 'importId');
  if (!updates || typeof updates !== 'object') {
    throw new Error('updates must be an object');
  }

  const supabase = getSupabase();
  
  const allowedFields = [
    'company_id', 'company_name', 'transaction_count', 
    'duplicate_count', 'error_count', 'status', 'metadata',
    'date_range_start', 'date_range_end'
  ];
  
  const updateData = { updated_at: new Date().toISOString() };
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updateData[key] = value;
    }
  }

  const { data, error } = await supabase
    .from('csv_imports')
    .update(updateData)
    .eq('id', importId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('CSV import not found or access denied');
    }
    logger.error('Failed to update CSV import', { error: error.message, userId, importId });
    throw error;
  }

  return data;
}

export default {
  createCSVImport,
  getCSVImports,
  getCSVImportById,
  getTransactionsByCSVImport,
  deleteCSVImport,
  deleteTransactionsByCSVImport,
  updateCSVImport
};
