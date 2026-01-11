/**
 * Upload Details Service - Supabase Version
 * 
 * Provides API methods for getting upload details
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
 * Transform transaction from database to frontend format
 */
const transformTransaction = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: parseFloat(row.amount) || 0,
    type: row.type || 'expense',
    category: row.category,
    subcategory: row.subcategory,
    payee: row.payee,
    payeeId: row.payee_id,
    companyId: row.company_id,
    uploadId: row.upload_id,
    statementId: row.statement_id,
    csvImportId: row.csv_import_id,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Get details for a specific upload
 * @param {string} uploadId
 */
export async function getUploadDetails(uploadId) {
  const userId = await getUserId();
  
  // Get upload record
  const { data: upload, error: uploadError } = await supabase
    .from('pdf_uploads')
    .select('*')
    .eq('id', uploadId)
    .eq('user_id', userId)
    .single();

  if (uploadError) throw uploadError;

  // Get associated transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('upload_id', uploadId)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (txError) throw txError;

  return {
    success: true,
    data: {
      ...transformUpload(upload),
      transactions: (transactions || []).map(transformTransaction),
    },
  };
}
