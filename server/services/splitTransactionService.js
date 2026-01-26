/**
 * Split Transaction Service
 * 
 * Handles splitting transactions into multiple parts with different
 * categories, descriptions, and amounts while maintaining links.
 * 
 * Features:
 * - Split single transaction into multiple parts
 * - Bulk split multiple transactions
 * - Validate split amounts match original
 * - Maintain audit trail with parent_transaction_id
 * - Undo splits (merge back)
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/index.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * @typedef {Object} SplitPart
 * @property {number} amount - Amount for this split part (positive number)
 * @property {string} category - Category for this part
 * @property {string} [subcategory] - Optional subcategory
 * @property {string} [description] - Optional description override
 * @property {string} [vendorName] - Optional vendor name override
 * @property {string} [notes] - Optional notes
 */

/**
 * @typedef {Object} SplitResult
 * @property {boolean} success
 * @property {Object} originalTransaction - Updated original transaction
 * @property {Array<Object>} splitTransactions - Newly created split transactions
 * @property {string} [error] - Error message if failed
 */

class SplitTransactionService {
  constructor() {
    this.supabase = null;
  }

  /**
   * Initialize Supabase client
   * @private
   */
  _getClient() {
    if (!this.supabase && supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    return this.supabase;
  }

  /**
   * Validate split parts against original transaction
   * @param {Object} originalTransaction - The original transaction
   * @param {Array<SplitPart>} splitParts - Array of split parts
   * @throws {Error} If validation fails
   */
  validateSplitParts(originalTransaction, splitParts) {
    if (!originalTransaction) {
      throw new Error('Original transaction is required');
    }

    if (!Array.isArray(splitParts) || splitParts.length === 0) {
      throw new Error('At least one split part is required');
    }

    const originalAmount = Math.abs(parseFloat(originalTransaction.amount));
    
    // Validate each split part
    for (let i = 0; i < splitParts.length; i++) {
      const part = splitParts[i];
      
      if (typeof part.amount !== 'number' || part.amount <= 0) {
        throw new Error(`Split part ${i + 1}: Amount must be a positive number`);
      }
      
      if (!part.category || typeof part.category !== 'string') {
        throw new Error(`Split part ${i + 1}: Category is required`);
      }
    }

    // Calculate total split amount
    const totalSplitAmount = splitParts.reduce((sum, part) => sum + part.amount, 0);
    
    // Total split amount must not exceed original
    if (totalSplitAmount > originalAmount + 0.01) { // Allow 1 cent tolerance for rounding
      throw new Error(
        `Total split amount ($${totalSplitAmount.toFixed(2)}) exceeds ` +
        `original amount ($${originalAmount.toFixed(2)})`
      );
    }

    // Calculate remainder
    const remainder = originalAmount - totalSplitAmount;
    
    return {
      originalAmount,
      totalSplitAmount,
      remainder: Math.round(remainder * 100) / 100 // Round to 2 decimals
    };
  }

  /**
   * Split a single transaction into multiple parts
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID to split
   * @param {Array<SplitPart>} splitParts - Array of split parts
   * @returns {Promise<SplitResult>}
   */
  async splitTransaction(userId, transactionId, splitParts) {
    const client = this._getClient();
    if (!client) {
      throw new Error('Database client not initialized');
    }

    try {
      // 1. Get the original transaction
      const { data: originalTxn, error: fetchError } = await client
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !originalTxn) {
        throw new Error(`Transaction not found: ${fetchError?.message || 'Not found'}`);
      }

      // Check if already split
      if (originalTxn.is_split) {
        throw new Error('Transaction has already been split. Unsplit first to modify.');
      }

      // 2. Validate split parts
      const { remainder } = this.validateSplitParts(originalTxn, splitParts);
      
      const originalAmount = parseFloat(originalTxn.amount);
      const isNegative = originalAmount < 0;

      // 3. Create split transactions
      const createdSplits = [];
      const now = new Date().toISOString();

      for (let i = 0; i < splitParts.length; i++) {
        const part = splitParts[i];
        
        // Amount should have same sign as original
        const splitAmount = isNegative ? -Math.abs(part.amount) : Math.abs(part.amount);

        const splitTxn = {
          user_id: userId,
          date: originalTxn.date,
          description: part.description || originalTxn.description,
          amount: splitAmount,
          type: originalTxn.type,
          category: part.category,
          subcategory: part.subcategory || null,
          payee: originalTxn.payee,
          payee_id: originalTxn.payee_id,
          company_id: originalTxn.company_id,
          upload_id: originalTxn.upload_id,
          bank_name: originalTxn.bank_name,
          account_last_four: originalTxn.account_last_four,
          check_number: originalTxn.check_number,
          reference_number: originalTxn.reference_number,
          tags: originalTxn.tags,
          notes: part.notes || `Split from: ${originalTxn.description}`,
          original_description: originalTxn.original_description || originalTxn.description,
          metadata: {
            ...originalTxn.metadata,
            split_source: transactionId,
            split_date: now
          },
          // Split tracking fields
          parent_transaction_id: transactionId,
          is_split: false,
          split_index: i + 1,
          original_amount: Math.abs(originalAmount),
          // Vendor info
          vendor_name: part.vendorName || originalTxn.vendor_name,
          vendor_id: originalTxn.vendor_id,
          // Audit
          created_at: now,
          updated_at: now,
          created_by: userId,
          last_modified_by: userId,
          classification_source: 'split'
        };

        const { data: created, error: createError } = await client
          .from('transactions')
          .insert(splitTxn)
          .select()
          .single();

        if (createError) {
          // Rollback: delete any previously created splits
          if (createdSplits.length > 0) {
            await client
              .from('transactions')
              .delete()
              .in('id', createdSplits.map(s => s.id));
          }
          throw new Error(`Failed to create split part ${i + 1}: ${createError.message}`);
        }

        createdSplits.push(created);
      }

      // 4. Update original transaction
      const newAmount = isNegative ? -remainder : remainder;
      
      const { data: updatedOriginal, error: updateError } = await client
        .from('transactions')
        .update({
          amount: newAmount,
          is_split: true,
          original_amount: Math.abs(originalAmount),
          split_index: 0,
          updated_at: now,
          last_modified_by: userId,
          notes: originalTxn.notes 
            ? `${originalTxn.notes}\n[Split on ${new Date().toLocaleDateString()}]`
            : `[Split on ${new Date().toLocaleDateString()}]`
        })
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        // Rollback: delete created splits
        await client
          .from('transactions')
          .delete()
          .in('id', createdSplits.map(s => s.id));
        throw new Error(`Failed to update original transaction: ${updateError.message}`);
      }

      logger.info(`✅ Split transaction ${transactionId} into ${splitParts.length} parts`);

      return {
        success: true,
        originalTransaction: updatedOriginal,
        splitTransactions: createdSplits,
        summary: {
          originalAmount: Math.abs(originalAmount),
          remainderAmount: remainder,
          splitCount: splitParts.length,
          splitTotal: splitParts.reduce((sum, p) => sum + p.amount, 0)
        }
      };

    } catch (error) {
      logger.error('Split transaction error:', error);
      return {
        success: false,
        error: error.message,
        originalTransaction: null,
        splitTransactions: []
      };
    }
  }

  /**
   * Bulk split multiple transactions
   * @param {string} userId - User ID
   * @param {Array<{transactionId: string, splitParts: Array<SplitPart>}>} splits - Array of split operations
   * @returns {Promise<{success: boolean, results: Array}>}
   */
  async bulkSplitTransactions(userId, splits) {
    if (!Array.isArray(splits) || splits.length === 0) {
      return {
        success: false,
        error: 'No splits provided',
        results: []
      };
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const split of splits) {
      try {
        const result = await this.splitTransaction(
          userId,
          split.transactionId,
          split.splitParts
        );
        
        results.push({
          transactionId: split.transactionId,
          ...result
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        results.push({
          transactionId: split.transactionId,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      message: `Completed ${successCount} of ${splits.length} splits`,
      successCount,
      errorCount,
      results
    };
  }

  /**
   * Unsplit a transaction - merge split parts back into original
   * @param {string} userId - User ID
   * @param {string} transactionId - Original (parent) transaction ID
   * @returns {Promise<{success: boolean, transaction?: Object, error?: string}>}
   */
  async unsplitTransaction(userId, transactionId) {
    const client = this._getClient();
    if (!client) {
      throw new Error('Database client not initialized');
    }

    try {
      // 1. Get the original transaction
      const { data: originalTxn, error: fetchError } = await client
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !originalTxn) {
        throw new Error(`Transaction not found: ${fetchError?.message || 'Not found'}`);
      }

      if (!originalTxn.is_split) {
        throw new Error('Transaction is not split');
      }

      // 2. Get all child split transactions
      const { data: childTxns, error: childError } = await client
        .from('transactions')
        .select('*')
        .eq('parent_transaction_id', transactionId)
        .eq('user_id', userId);

      if (childError) {
        throw new Error(`Failed to get split parts: ${childError.message}`);
      }

      // 3. Restore original amount
      const originalAmount = originalTxn.original_amount || Math.abs(originalTxn.amount);
      const isNegative = parseFloat(originalTxn.amount) < 0;
      const restoredAmount = isNegative ? -originalAmount : originalAmount;

      // 4. Update original transaction
      const { data: restored, error: updateError } = await client
        .from('transactions')
        .update({
          amount: restoredAmount,
          is_split: false,
          original_amount: null,
          split_index: 0,
          updated_at: new Date().toISOString(),
          last_modified_by: userId
        })
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to restore original: ${updateError.message}`);
      }

      // 5. Delete child transactions
      if (childTxns && childTxns.length > 0) {
        const { error: deleteError } = await client
          .from('transactions')
          .delete()
          .in('id', childTxns.map(t => t.id));

        if (deleteError) {
          // Transaction was updated but children weren't deleted - log but don't fail
          logger.warn(`Failed to delete split children: ${deleteError.message}`);
        }
      }

      logger.info(`✅ Unsplit transaction ${transactionId}, deleted ${childTxns?.length || 0} parts`);

      return {
        success: true,
        transaction: restored,
        deletedCount: childTxns?.length || 0
      };

    } catch (error) {
      logger.error('Unsplit transaction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get split parts for a transaction
   * @param {string} userId - User ID
   * @param {string} transactionId - Parent transaction ID
   * @returns {Promise<{success: boolean, parts?: Array, error?: string}>}
   */
  async getSplitParts(userId, transactionId) {
    const client = this._getClient();
    if (!client) {
      throw new Error('Database client not initialized');
    }

    try {
      // Get original transaction
      const { data: originalTxn, error: fetchError } = await client
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !originalTxn) {
        throw new Error(`Transaction not found`);
      }

      // Get child transactions
      const { data: children, error: childError } = await client
        .from('transactions')
        .select('*')
        .eq('parent_transaction_id', transactionId)
        .order('split_index', { ascending: true });

      if (childError) {
        throw new Error(`Failed to get split parts: ${childError.message}`);
      }

      return {
        success: true,
        original: originalTxn,
        parts: children || [],
        totalParts: (children?.length || 0) + 1 // +1 for original/remainder
      };

    } catch (error) {
      logger.error('Get split parts error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const splitTransactionService = new SplitTransactionService();
export default splitTransactionService;
