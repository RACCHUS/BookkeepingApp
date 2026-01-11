/**
 * Uploads Service - Supabase Version
 * 
 * Provides API methods for PDF upload management
 * Uses Supabase directly instead of Express API
 */

import { supabase } from './supabase';
import { auth } from './firebase';

/**
 * Get the current user's Firebase UID
 * Waits for auth to be ready if needed
 */
const getUserId = async () => {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Authentication timeout - please refresh the page'));
    }, 5000);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        reject(new Error('User not authenticated'));
      }
    });
  });
};

/**
 * Transform database row to frontend format
 */
const transformUpload = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    bankDetected: row.bank_detected,
    transactionCount: row.transaction_count,
    status: row.status,
    companyId: row.company_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Get uploads for the current user
 * @param {object} params - filter, pagination, etc.
 */
export async function getUploads(params = {}) {
  const userId = await getUserId();

  let query = supabase
    .from('pdf_uploads')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (params.companyId) {
    query = query.eq('company_id', params.companyId);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return (data || []).map(transformUpload);
}

/**
 * Rename an upload
 * @param {string} uploadId
 * @param {string} name
 */
export async function renameUpload(uploadId, name) {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('pdf_uploads')
    .update({
      file_name: name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', uploadId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    data: transformUpload(data),
  };
}

/**
 * Delete an upload
 * @param {string} uploadId
 * @param {object} options - { deleteTransactions: boolean }
 */
export async function deleteUpload(uploadId, options = {}) {
  const userId = await getUserId();
  
  // Optionally delete associated transactions
  if (options.deleteTransactions) {
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('upload_id', uploadId)
      .eq('user_id', userId);
    
    if (txError) throw txError;
  }
  
  // Delete the upload record
  const { error } = await supabase
    .from('pdf_uploads')
    .delete()
    .eq('id', uploadId)
    .eq('user_id', userId);

  if (error) throw error;

  return {
    success: true,
    data: { id: uploadId },
  };
}

/**
 * Batch delete multiple uploads
 * @param {string[]} uploadIds - Array of upload IDs to delete
 * @param {object} options - { deleteTransactions: boolean }
 * @returns {Promise<{ successful: Array, failed: Array }>}
 */
export async function batchDeleteUploads(uploadIds, options = {}) {
  const userId = await getUserId();
  const successful = [];
  const failed = [];

  for (const uploadId of uploadIds) {
    try {
      // Optionally delete associated transactions
      if (options.deleteTransactions) {
        await supabase
          .from('transactions')
          .delete()
          .eq('upload_id', uploadId)
          .eq('user_id', userId);
      }
      
      // Delete the upload record
      const { error } = await supabase
        .from('pdf_uploads')
        .delete()
        .eq('id', uploadId)
        .eq('user_id', userId);

      if (error) throw error;
      successful.push(uploadId);
    } catch (err) {
      failed.push({ id: uploadId, error: err.message });
    }
  }

  return { successful, failed };
}
