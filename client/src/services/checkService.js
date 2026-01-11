/**
 * Check Service - Frontend API client for check management
 * @description Provides API methods for checks CRUD, batch operations, and file uploads
 * Now uses Supabase directly instead of Express API
 * 
 * Checks can be:
 * - Income: checks you RECEIVE from others (deposits)
 * - Expense: checks you WRITE to pay others
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
 * Check types
 */
export const CHECK_TYPES = {
  INCOME: 'income',   // Check received (deposit)
  EXPENSE: 'expense'  // Check written (payment)
};

/**
 * Check statuses
 */
export const CHECK_STATUSES = {
  PENDING: 'pending',
  CLEARED: 'cleared',
  BOUNCED: 'bounced',
  VOIDED: 'voided',
  CANCELLED: 'cancelled'
};

/**
 * Transform database row to frontend format
 */
const transformCheck = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    checkNumber: row.check_number,
    date: row.date,
    amount: parseFloat(row.amount) || 0,
    type: row.type || 'expense',
    payee: row.payee,
    payeeId: row.payee_id,
    vendorId: row.vendor_id,
    memo: row.memo,
    status: row.status || 'pending',
    imageUrl: row.image_url,
    transactionId: row.transaction_id,
    companyId: row.company_id,
    bankAccount: row.bank_account,
    clearedDate: row.cleared_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Check API Service
 */
const checkService = {
  /**
   * Create a new check (with optional image)
   */
  createCheck: async (checkData, file = null) => {
    const userId = await getUserId();
    
    let imageUrl = null;
    
    // Upload image to Supabase Storage if provided
    if (file) {
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('checks')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('checks')
        .getPublicUrl(fileName);
      
      imageUrl = urlData.publicUrl;
    }
    
    const { data, error } = await supabase
      .from('checks')
      .insert({
        user_id: userId,
        check_number: checkData.checkNumber,
        date: checkData.date,
        amount: checkData.amount,
        type: checkData.type || 'expense',
        payee: checkData.payee,
        payee_id: checkData.payeeId || null,
        vendor_id: checkData.vendorId || null,
        memo: checkData.memo,
        status: checkData.status || 'pending',
        image_url: imageUrl || checkData.imageUrl,
        transaction_id: checkData.transactionId || null,
        company_id: checkData.companyId || null,
        bank_account: checkData.bankAccount,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Get paginated list of checks with filters
   */
  getChecks: async (filters = {}) => {
    const userId = await getUserId();
    
    let query = supabase
      .from('checks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Apply filters
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.payeeId) query = query.eq('payee_id', filters.payeeId);
    if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId);
    if (filters.companyId) query = query.eq('company_id', filters.companyId);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.hasTransaction !== undefined) {
      if (filters.hasTransaction) {
        query = query.not('transaction_id', 'is', null);
      } else {
        query = query.is('transaction_id', null);
      }
    }
    
    // Apply sorting
    const sortField = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });
    
    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      data: (data || []).map(transformCheck),
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    };
  },

  /**
   * Get check by ID
   */
  getCheckById: async (checkId) => {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('checks')
      .select('*')
      .eq('id', checkId)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Update check
   */
  updateCheck: async (checkId, updates) => {
    const userId = await getUserId();
    
    const dbUpdates = {};
    if (updates.checkNumber !== undefined) dbUpdates.check_number = updates.checkNumber;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.payee !== undefined) dbUpdates.payee = updates.payee;
    if (updates.payeeId !== undefined) dbUpdates.payee_id = updates.payeeId;
    if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId;
    if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
    if (updates.bankAccount !== undefined) dbUpdates.bank_account = updates.bankAccount;
    if (updates.clearedDate !== undefined) dbUpdates.cleared_date = updates.clearedDate;
    
    const { data, error } = await supabase
      .from('checks')
      .update(dbUpdates)
      .eq('id', checkId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Delete check
   */
  deleteCheck: async (checkId, options = {}) => {
    const userId = await getUserId();
    
    // Get the check first to check for transaction
    const { data: check } = await supabase
      .from('checks')
      .select('transaction_id')
      .eq('id', checkId)
      .eq('user_id', userId)
      .single();
    
    // Delete associated transaction if requested
    if (options.deleteTransaction && check?.transaction_id) {
      await supabase
        .from('transactions')
        .delete()
        .eq('id', check.transaction_id)
        .eq('user_id', userId);
    }
    
    const { error } = await supabase
      .from('checks')
      .delete()
      .eq('id', checkId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return { success: true };
  },

  /**
   * Upload or replace image for existing check
   */
  uploadImage: async (checkId, file, onProgress = null) => {
    const userId = await getUserId();
    
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('checks')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from('checks')
      .getPublicUrl(fileName);
    
    const { data, error } = await supabase
      .from('checks')
      .update({ image_url: urlData.publicUrl })
      .eq('id', checkId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Delete image from check
   */
  deleteImage: async (checkId) => {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('checks')
      .update({ image_url: null })
      .eq('id', checkId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Link check to transaction
   */
  linkToTransaction: async (checkId, transactionId) => {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('checks')
      .update({ transaction_id: transactionId })
      .eq('id', checkId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Unlink check from transaction
   */
  unlinkFromTransaction: async (checkId) => {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('checks')
      .update({ transaction_id: null })
      .eq('id', checkId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformCheck(data) };
  },

  /**
   * Batch update checks
   */
  batchUpdateChecks: async (checkIds, updates) => {
    const userId = await getUserId();
    
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.payeeId !== undefined) dbUpdates.payee_id = updates.payeeId;
    if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId;
    if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
    
    const { data, error } = await supabase
      .from('checks')
      .update(dbUpdates)
      .in('id', checkIds)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    
    return {
      success: true,
      data: {
        successful: data?.length || 0,
        failed: 0,
      },
    };
  },

  /**
   * Batch delete checks
   */
  batchDeleteChecks: async (checkIds, options = {}) => {
    const userId = await getUserId();
    
    // Delete associated transactions if requested
    if (options.deleteTransactions) {
      const { data: checks } = await supabase
        .from('checks')
        .select('transaction_id')
        .in('id', checkIds)
        .eq('user_id', userId);
      
      const transactionIds = (checks || [])
        .map(c => c.transaction_id)
        .filter(Boolean);
      
      if (transactionIds.length > 0) {
        await supabase
          .from('transactions')
          .delete()
          .in('id', transactionIds)
          .eq('user_id', userId);
      }
    }
    
    const { error } = await supabase
      .from('checks')
      .delete()
      .in('id', checkIds)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return {
      success: true,
      data: {
        successful: checkIds.length,
        failed: 0,
      },
    };
  },

  /**
   * Get check statistics
   */
  getStats: async () => {
    const userId = await getUserId();
    
    const { data, error, count } = await supabase
      .from('checks')
      .select('amount, type, status', { count: 'exact' })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const income = (data || []).filter(c => c.type === 'income');
    const expense = (data || []).filter(c => c.type === 'expense');
    const pending = (data || []).filter(c => c.status === 'pending');
    const cleared = (data || []).filter(c => c.status === 'cleared');
    
    return {
      success: true,
      data: {
        totalChecks: count || 0,
        incomeChecks: income.length,
        incomeAmount: income.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
        expenseChecks: expense.length,
        expenseAmount: expense.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
        pending: pending.length,
        cleared: cleared.length,
      },
    };
  },

  /**
   * Bulk create checks
   */
  bulkCreate: async (checks) => {
    const userId = await getUserId();
    
    const checksToInsert = checks.map(c => ({
      user_id: userId,
      check_number: c.checkNumber,
      date: c.date,
      amount: c.amount,
      type: c.type || 'expense',
      payee: c.payee,
      payee_id: c.payeeId || null,
      vendor_id: c.vendorId || null,
      memo: c.memo,
      status: c.status || 'pending',
      company_id: c.companyId || null,
    }));
    
    const { data, error } = await supabase
      .from('checks')
      .insert(checksToInsert)
      .select();
    
    if (error) throw error;
    
    return {
      success: true,
      data: {
        created: data?.length || 0,
        checks: (data || []).map(transformCheck),
      },
    };
  },
};

export default checkService;
