/**
 * Receipt Service - Supabase Version
 * Provides API methods for receipts CRUD, batch operations, and file uploads
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
const transformReceipt = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    amount: parseFloat(row.amount) || 0,
    vendor: row.vendor,
    vendorId: row.vendor_id,
    category: row.category,
    description: row.description,
    notes: row.notes,
    imageUrl: row.image_url,
    transactionId: row.transaction_id,
    companyId: row.company_id,
    isReconciled: row.is_reconciled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Receipt API Service
 */
const receiptService = {
  /**
   * Create a new receipt (with optional image)
   * @param {Object} receiptData - Receipt data
   * @param {File} file - Optional image file
   * @returns {Promise<Object>} Created receipt
   */
  createReceipt: async (receiptData, file = null) => {
    const userId = await getUserId();
    let imageUrl = null;
    
    // Upload image if provided
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `receipts/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }
    
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        date: receiptData.date,
        amount: receiptData.amount,
        vendor: receiptData.vendor,
        vendor_id: receiptData.vendorId,
        category: receiptData.category,
        description: receiptData.description,
        notes: receiptData.notes,
        image_url: imageUrl || receiptData.imageUrl,
        transaction_id: receiptData.transactionId,
        company_id: receiptData.companyId,
        is_reconciled: receiptData.isReconciled || false,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformReceipt(data) };
  },

  /**
   * Get all receipts with optional filters
   */
  getReceipts: async (options = {}) => {
    const userId = await getUserId();
    
    let query = supabase
      .from('receipts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (options.companyId) query = query.eq('company_id', options.companyId);
    if (options.category) query = query.eq('category', options.category);
    if (options.vendorId) query = query.eq('vendor_id', options.vendorId);
    if (options.startDate) query = query.gte('date', options.startDate);
    if (options.endDate) query = query.lte('date', options.endDate);
    if (options.isReconciled !== undefined) query = query.eq('is_reconciled', options.isReconciled);
    
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      success: true,
      data: (data || []).map(transformReceipt),
      total: count || 0,
    };
  },

  /**
   * Get a single receipt by ID
   */
  getReceipt: async (id) => {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return { success: true, data: transformReceipt(data) };
  },

  /**
   * Update a receipt
   */
  updateReceipt: async (id, updates, file = null) => {
    const userId = await getUserId();
    let imageUrl = updates.imageUrl;
    
    // Upload new image if provided
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `receipts/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }
    
    const dbUpdates = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor;
    if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (imageUrl !== undefined) dbUpdates.image_url = imageUrl;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
    if (updates.isReconciled !== undefined) dbUpdates.is_reconciled = updates.isReconciled;
    
    const { data, error } = await supabase
      .from('receipts')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: transformReceipt(data) };
  },

  /**
   * Delete a receipt
   */
  deleteReceipt: async (id) => {
    const userId = await getUserId();
    
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    return { success: true };
  },

  /**
   * Batch update multiple receipts
   */
  batchUpdateReceipts: async (receiptIds, updates) => {
    const userId = await getUserId();
    
    const dbUpdates = {};
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
    if (updates.isReconciled !== undefined) dbUpdates.is_reconciled = updates.isReconciled;
    
    const { data, error } = await supabase
      .from('receipts')
      .update(dbUpdates)
      .in('id', receiptIds)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    return { success: true, data: (data || []).map(transformReceipt) };
  },

  /**
   * Link a receipt to a transaction
   */
  linkToTransaction: async (receiptId, transactionId) => {
    return receiptService.updateReceipt(receiptId, { transactionId });
  },

  /**
   * Get receipt statistics
   */
  getStats: async (options = {}) => {
    const userId = await getUserId();
    
    let query = supabase
      .from('receipts')
      .select('amount, category, is_reconciled')
      .eq('user_id', userId);
    
    if (options.companyId) query = query.eq('company_id', options.companyId);
    if (options.startDate) query = query.gte('date', options.startDate);
    if (options.endDate) query = query.lte('date', options.endDate);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const stats = {
      totalCount: data.length,
      totalAmount: 0,
      reconciledCount: 0,
      unreconciledCount: 0,
      byCategory: {},
    };
    
    for (const receipt of data) {
      stats.totalAmount += parseFloat(receipt.amount) || 0;
      if (receipt.is_reconciled) {
        stats.reconciledCount++;
      } else {
        stats.unreconciledCount++;
      }
      const cat = receipt.category || 'Uncategorized';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    }
    
    return { success: true, data: stats };
  },

  /**
   * Bulk create receipts with automatic transaction creation
   * Each receipt creates a corresponding expense transaction
   */
  bulkCreate: async (receipts) => {
    const userId = await getUserId();
    const results = [];
    
    for (const receipt of receipts) {
      try {
        // First create the transaction if requested
        let transactionId = null;
        if (receipt.createTransaction !== false) {
          const { data: txData, error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              date: receipt.date,
              amount: -Math.abs(parseFloat(receipt.amount)), // Expenses are negative
              description: receipt.vendor || 'Receipt',
              payee: receipt.vendor,
              category: receipt.category,
              type: 'expense',
              source: 'receipt_entry'
            })
            .select()
            .single();
          
          if (txError) throw txError;
          transactionId = txData.id;
        }
        
        // Then create the receipt linked to the transaction
        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .insert({
            user_id: userId,
            date: receipt.date,
            amount: Math.abs(parseFloat(receipt.amount)),
            vendor: receipt.vendor,
            category: receipt.category,
            transaction_id: transactionId,
            company_id: receipt.companyId || null,
            is_reconciled: false,
          })
          .select()
          .single();
        
        if (receiptError) throw receiptError;
        
        results.push({ 
          success: true, 
          data: transformReceipt(receiptData),
          transactionId 
        });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    return {
      success: true,
      results,
      successCount,
      failCount: results.filter(r => !r.success).length,
      allSucceeded: successCount === receipts.length,
      someSucceeded: successCount > 0 && successCount < receipts.length
    };
  },

  /**
   * Batch delete receipts
   */
  batchDeleteReceipts: async (receiptIds) => {
    const userId = await getUserId();
    
    const { error } = await supabase
      .from('receipts')
      .delete()
      .in('id', receiptIds)
      .eq('user_id', userId);
    
    if (error) throw error;
    return { success: true, successCount: receiptIds.length };
  },

  /**
   * Bulk create from existing transactions (link receipts to transactions)
   */
  bulkCreateFromTransactions: async (transactions) => {
    const userId = await getUserId();
    const results = [];
    
    for (const tx of transactions) {
      try {
        const { data, error } = await supabase
          .from('receipts')
          .insert({
            user_id: userId,
            date: tx.date,
            amount: Math.abs(parseFloat(tx.amount)),
            vendor: tx.payee || tx.description,
            category: tx.category,
            transaction_id: tx.id,
            is_reconciled: false,
          })
          .select()
          .single();
        
        if (error) throw error;
        results.push({ success: true, data: transformReceipt(data) });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return {
      success: true,
      data: {
        results,
        successCount: results.filter(r => r.success).length,
        failCount: results.filter(r => !r.success).length,
      }
    };
  },
};

export default receiptService;
