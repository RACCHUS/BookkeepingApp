/**
 * @fileoverview Receipt Service - Core receipt management operations
 * @description Handles CRUD operations, batch updates, and expiration cleanup for receipts
 * @version 1.0.0
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/index.js';
import storageService from './storageService.js';
import {
  ReceiptSchema,
  createReceiptObject,
  validateReceiptData,
  isReceiptExpiringSoon,
  isReceiptExpired,
  formatReceiptResponse,
  RECEIPT_RETENTION_MS,
  EXPIRING_SOON_DAYS,
  STORAGE_PROVIDERS
} from '../../shared/schemas/receiptSchema.js';

/**
 * Receipt Service - Manages receipt records and associated files
 */
class ReceiptService {
  constructor() {
    this.db = getFirestore();
    this.collection = 'receipts';
    logger.info('🧾 ReceiptService: Initialized');
  }

  /**
   * Create a new receipt
   * @param {string} userId - User ID (required)
   * @param {Object} receiptData - Receipt data (all fields optional)
   * @param {Object} file - Optional file to upload
   * @returns {Promise<Object>} Created receipt
   */
  async createReceipt(userId, receiptData = {}, file = null) {
    try {
      // Validate receipt data
      const validation = validateReceiptData(receiptData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Handle file upload if provided
      let fileInfo = {
        hasImage: false,
        fileUrl: '',
        fileId: '',
        fileName: '',
        fileSize: 0,
        mimeType: '',
        storageProvider: STORAGE_PROVIDERS.NONE,
        thumbnailUrl: ''
      };

      if (file) {
        const uploadResult = await storageService.uploadFile(userId, file);
        fileInfo = {
          hasImage: true,
          fileUrl: uploadResult.url,
          fileId: uploadResult.fileId,
          fileName: file.originalname || file.filename || 'receipt',
          fileSize: file.size,
          mimeType: file.mimetype,
          storageProvider: uploadResult.storageProvider,
          thumbnailUrl: uploadResult.thumbnailUrl || ''
        };
      }

      // Create receipt object
      const receipt = createReceiptObject(userId, {
        ...receiptData,
        ...fileInfo,
        amount: receiptData.amount ? parseFloat(receiptData.amount) : null
      });

      // Save to Firestore
      const docRef = await this.db.collection(this.collection).add(receipt);
      let createdReceipt = { ...receipt, id: docRef.id };

      // If createTransaction flag is set and we have enough data, create a transaction too
      if (receiptData.createTransaction && receiptData.amount && receiptData.date) {
        try {
          const transactionData = {
            userId,
            description: receiptData.vendor || 'Cash/Receipt Purchase',
            payee: receiptData.vendor || '',
            amount: -Math.abs(parseFloat(receiptData.amount)), // Expenses are negative
            date: new Date(receiptData.date),
            type: 'expense',
            category: receiptData.category || '',
            source: 'receipt',
            companyId: receiptData.companyId || null,
            receiptId: docRef.id,
            notes: receiptData.notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const txRef = await this.db.collection('transactions').add(transactionData);
          
          // Update receipt with transaction link
          await docRef.update({ transactionId: txRef.id });
          createdReceipt.transactionId = txRef.id;

          logger.info(`✅ Created transaction ${txRef.id} from receipt ${docRef.id}`);
        } catch (txError) {
          logger.warn(`Failed to create transaction from receipt: ${txError.message}`);
          // Receipt is still created, just without transaction
        }
      }

      logger.info(`✅ Created receipt: ${docRef.id} for user ${userId}`);
      
      return formatReceiptResponse(createdReceipt);
    } catch (error) {
      logger.error('Error creating receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Receipt
   */
  async getReceiptById(userId, receiptId) {
    try {
      const doc = await this.db.collection(this.collection).doc(receiptId).get();
      
      if (!doc.exists) {
        throw new Error('Receipt not found');
      }

      const receipt = { id: doc.id, ...doc.data() };

      // Verify ownership
      if (receipt.userId !== userId) {
        throw new Error('You do not have access to this receipt');
      }

      return formatReceiptResponse(receipt);
    } catch (error) {
      logger.error(`Error getting receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Get receipts for user with filters, sorting, and pagination
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @param {Object} sort - Sort options { field, order }
   * @param {Object} pagination - Pagination { limit, offset }
   * @returns {Promise<Object>} { receipts, total, hasMore }
   */
  async getReceiptsForUser(userId, filters = {}, sort = {}, pagination = {}) {
    try {
      let query = this.db.collection(this.collection)
        .where('userId', '==', userId);

      // Apply filters
      if (filters.startDate) {
        query = query.where('date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('date', '<=', filters.endDate);
      }
      if (filters.companyId) {
        query = query.where('companyId', '==', filters.companyId);
      }
      if (filters.hasImage !== undefined) {
        query = query.where('hasImage', '==', filters.hasImage);
      }
      if (filters.hasTransaction !== undefined) {
        if (filters.hasTransaction) {
          query = query.where('transactionId', '!=', '');
        } else {
          query = query.where('transactionId', '==', '');
        }
      }

      // Apply sorting
      const sortField = sort.field || 'createdAt';
      const sortOrder = sort.order || 'desc';
      query = query.orderBy(sortField, sortOrder);

      // Get total count (without pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Apply pagination
      const limit = pagination.limit || 25;
      const offset = pagination.offset || 0;
      
      if (offset > 0) {
        // Get documents to skip
        const skipSnapshot = await query.limit(offset).get();
        if (skipSnapshot.docs.length > 0) {
          const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }
      
      query = query.limit(limit);

      // Execute query
      const snapshot = await query.get();
      const receipts = snapshot.docs.map(doc => 
        formatReceiptResponse({ id: doc.id, ...doc.data() })
      );

      // Filter by vendor search (client-side since Firestore doesn't support partial matching)
      let filteredReceipts = receipts;
      if (filters.vendor) {
        const vendorSearch = filters.vendor.toLowerCase();
        filteredReceipts = receipts.filter(r => 
          r.vendor && r.vendor.toLowerCase().includes(vendorSearch)
        );
      }

      return {
        receipts: filteredReceipts,
        total,
        limit,
        offset,
        hasMore: offset + receipts.length < total
      };
    } catch (error) {
      // Handle missing index errors gracefully
      if (error.code === 9 || error.message?.includes('index')) {
        logger.warn('Firestore index not available, using fallback query');
        return this._getReceiptsFallback(userId, filters, sort, pagination);
      }
      logger.error('Error getting receipts:', error);
      throw error;
    }
  }

  /**
   * Fallback query without complex indexes
   * @private
   */
  async _getReceiptsFallback(userId, filters = {}, sort = {}, pagination = {}) {
    const snapshot = await this.db.collection(this.collection)
      .where('userId', '==', userId)
      .get();

    let receipts = snapshot.docs.map(doc => 
      formatReceiptResponse({ id: doc.id, ...doc.data() })
    );

    // Apply filters in memory
    if (filters.startDate) {
      receipts = receipts.filter(r => r.date >= filters.startDate);
    }
    if (filters.endDate) {
      receipts = receipts.filter(r => r.date <= filters.endDate);
    }
    if (filters.companyId) {
      receipts = receipts.filter(r => r.companyId === filters.companyId);
    }
    if (filters.hasImage !== undefined) {
      receipts = receipts.filter(r => r.hasImage === filters.hasImage);
    }
    if (filters.hasTransaction !== undefined) {
      receipts = receipts.filter(r => 
        filters.hasTransaction ? r.transactionId : !r.transactionId
      );
    }
    if (filters.vendor) {
      const vendorSearch = filters.vendor.toLowerCase();
      receipts = receipts.filter(r => 
        r.vendor && r.vendor.toLowerCase().includes(vendorSearch)
      );
    }

    // Sort in memory
    const sortField = sort.field || 'createdAt';
    const sortOrder = sort.order || 'desc';
    receipts.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = receipts.length;
    const limit = pagination.limit || 25;
    const offset = pagination.offset || 0;

    return {
      receipts: receipts.slice(offset, offset + limit),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  /**
   * Update a receipt
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated receipt
   */
  async updateReceipt(userId, receiptId, updates) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);
      
      // Validate updates
      const validation = validateReceiptData(updates);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      };

      // Handle amount conversion
      if (updates.amount !== undefined) {
        updateData.amount = updates.amount ? parseFloat(updates.amount) : null;
      }

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await this.db.collection(this.collection).doc(receiptId).update(updateData);

      logger.info(`✅ Updated receipt: ${receiptId}`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error updating receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Batch update multiple receipts
   * @param {string} userId - User ID
   * @param {string[]} receiptIds - Array of receipt IDs
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} { successful, failed }
   */
  async batchUpdateReceipts(userId, receiptIds, updates) {
    const results = { successful: [], failed: [] };

    // Validate updates
    const validation = validateReceiptData(updates);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const batch = this.db.batch();
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (updates.amount !== undefined) {
      updateData.amount = updates.amount ? parseFloat(updates.amount) : null;
    }

    // Verify ownership and prepare batch
    for (const receiptId of receiptIds) {
      try {
        const doc = await this.db.collection(this.collection).doc(receiptId).get();
        
        if (!doc.exists) {
          results.failed.push({ id: receiptId, error: 'Not found' });
          continue;
        }

        if (doc.data().userId !== userId) {
          results.failed.push({ id: receiptId, error: 'Access denied' });
          continue;
        }

        batch.update(doc.ref, updateData);
        results.successful.push(receiptId);
      } catch (error) {
        results.failed.push({ id: receiptId, error: error.message });
      }
    }

    if (results.successful.length > 0) {
      await batch.commit();
    }

    logger.info(`📦 Batch updated ${results.successful.length} receipts, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Delete a receipt and its associated file
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteReceipt(userId, receiptId) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      // Delete associated file if exists
      if (receipt.hasImage && receipt.fileId) {
        await storageService.deleteFile(receipt.fileId, receipt.storageProvider);
      }

      // Clear transaction link if exists
      if (receipt.transactionId) {
        await this._clearTransactionReceiptLink(receipt.transactionId);
      }

      // Delete Firestore document
      await this.db.collection(this.collection).doc(receiptId).delete();

      logger.info(`🗑️ Deleted receipt: ${receiptId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Batch delete multiple receipts
   * @param {string} userId - User ID
   * @param {string[]} receiptIds - Array of receipt IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  async batchDeleteReceipts(userId, receiptIds) {
    const results = { successful: [], failed: [] };

    for (const receiptId of receiptIds) {
      try {
        await this.deleteReceipt(userId, receiptId);
        results.successful.push(receiptId);
      } catch (error) {
        results.failed.push({ id: receiptId, error: error.message });
      }
    }

    logger.info(`🗑️ Batch deleted ${results.successful.length} receipts, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Bulk create receipts from transactions
   * Creates receipt records for multiple transactions at once
   * @param {string} userId - User ID
   * @param {Array} transactions - Array of transaction objects to create receipts from
   * @returns {Promise<Object>} { successful, failed, receipts }
   */
  async bulkCreateFromTransactions(userId, transactions) {
    const results = { successful: [], failed: [], receipts: [] };

    for (const transaction of transactions) {
      try {
        // Create receipt data from transaction
        const receiptData = {
          vendor: transaction.payee || this._extractVendorFromDescription(transaction.description),
          amount: Math.abs(transaction.amount),
          date: transaction.date,
          notes: `From transaction: ${transaction.description || ''}`.trim(),
          transactionId: transaction.id,
          companyId: transaction.companyId || null
        };

        // Create the receipt (without image)
        const receipt = await this.createReceipt(userId, receiptData, null);

        // Update transaction with receipt link
        await this.db.collection('transactions').doc(transaction.id).update({
          receiptId: receipt.id,
          updatedAt: FieldValue.serverTimestamp()
        });

        results.successful.push(transaction.id);
        results.receipts.push(receipt);
      } catch (error) {
        logger.warn(`Failed to create receipt for transaction ${transaction.id}:`, error.message);
        results.failed.push({ id: transaction.id, error: error.message });
      }
    }

    logger.info(`📝 Bulk created ${results.successful.length} receipts from transactions, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Bulk create receipts (with optional transaction creation for each)
   * Primary use case: Entering multiple cash/off-statement purchases quickly
   * @param {string} userId - User ID
   * @param {Array} receipts - Array of receipt data objects
   * @returns {Promise<Object>} { results, allSucceeded, someSucceeded }
   */
  async bulkCreate(userId, receipts) {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const receiptData of receipts) {
      try {
        // Create receipt (will also create transaction if createTransaction flag is set)
        const receipt = await this.createReceipt(userId, receiptData, null);
        
        results.push({
          success: true,
          receipt,
          transactionCreated: !!receiptData.createTransaction && !!receipt.transactionId
        });
        successCount++;
      } catch (error) {
        logger.warn(`Failed to bulk create receipt:`, error.message);
        results.push({
          success: false,
          error: error.message,
          data: receiptData
        });
        failCount++;
      }
    }

    logger.info(`📝 Bulk created ${successCount} receipts (${failCount} failed)`);

    return {
      results,
      total: receipts.length,
      successCount,
      failCount,
      allSucceeded: failCount === 0 && successCount > 0,
      someSucceeded: successCount > 0 && failCount > 0
    };
  }

  /**
   * Extract vendor name from transaction description
   * @private
   */
  _extractVendorFromDescription(description) {
    if (!description) return '';
    // Take the first meaningful part of the description
    const match = description.match(/^([A-Za-z0-9\s&'.-]+)/);
    return match ? match[1].trim().substring(0, 100) : description.substring(0, 100);
  }

  /**
   * Attach receipt to a transaction
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Updated receipt
   */
  async attachToTransaction(userId, receiptId, transactionId) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      // Verify transaction belongs to user
      const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
      if (!transactionDoc.exists) {
        throw new Error('Transaction not found');
      }
      if (transactionDoc.data().userId !== userId) {
        throw new Error('You do not have access to this transaction');
      }

      // Update receipt with transaction link
      await this.db.collection(this.collection).doc(receiptId).update({
        transactionId,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update transaction with receipt info
      await this.db.collection('transactions').doc(transactionId).update({
        receiptUrl: receipt.fileUrl || '',
        receiptFileId: receipt.fileId || '',
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`🔗 Attached receipt ${receiptId} to transaction ${transactionId}`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error attaching receipt ${receiptId} to transaction:`, error);
      throw error;
    }
  }

  /**
   * Detach receipt from transaction
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Updated receipt
   */
  async detachFromTransaction(userId, receiptId) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      if (receipt.transactionId) {
        await this._clearTransactionReceiptLink(receipt.transactionId);
      }

      await this.db.collection(this.collection).doc(receiptId).update({
        transactionId: '',
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`🔓 Detached receipt ${receiptId} from transaction`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error detaching receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Add a transaction to receipt's transactionIds array (multi-transaction support)
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @param {string} transactionId - Transaction ID to add
   * @returns {Promise<Object>} Updated receipt
   */
  async addTransactionLink(userId, receiptId, transactionId) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      // Verify transaction belongs to user
      const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
      if (!transactionDoc.exists) {
        throw new Error('Transaction not found');
      }
      if (transactionDoc.data().userId !== userId) {
        throw new Error('You do not have access to this transaction');
      }

      // Get current transactionIds or initialize
      const currentIds = receipt.transactionIds || [];
      if (currentIds.includes(transactionId)) {
        logger.info(`Receipt ${receiptId} already linked to transaction ${transactionId}`);
        return receipt;
      }

      // Add to transactionIds array
      const updatedIds = [...currentIds, transactionId];
      
      // Also set primary transactionId if not set
      const updates = {
        transactionIds: updatedIds,
        updatedAt: FieldValue.serverTimestamp()
      };
      if (!receipt.transactionId) {
        updates.transactionId = transactionId;
      }

      await this.db.collection(this.collection).doc(receiptId).update(updates);

      // Update transaction with receipt info
      await this.db.collection('transactions').doc(transactionId).update({
        receiptUrl: receipt.fileUrl || '',
        receiptFileId: receipt.fileId || '',
        receiptId: receiptId,
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`🔗 Added transaction ${transactionId} to receipt ${receiptId} (now has ${updatedIds.length} links)`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error adding transaction to receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a transaction from receipt's transactionIds array
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @param {string} transactionId - Transaction ID to remove
   * @returns {Promise<Object>} Updated receipt
   */
  async removeTransactionLink(userId, receiptId, transactionId) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      const currentIds = receipt.transactionIds || [];
      const updatedIds = currentIds.filter(id => id !== transactionId);

      // Update transactionIds array
      const updates = {
        transactionIds: updatedIds,
        updatedAt: FieldValue.serverTimestamp()
      };

      // Update primary transactionId if needed
      if (receipt.transactionId === transactionId) {
        updates.transactionId = updatedIds.length > 0 ? updatedIds[0] : '';
      }

      await this.db.collection(this.collection).doc(receiptId).update(updates);

      // Clear receipt link from transaction
      await this._clearTransactionReceiptLink(transactionId);

      logger.info(`🔓 Removed transaction ${transactionId} from receipt ${receiptId} (now has ${updatedIds.length} links)`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error removing transaction from receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk link multiple receipts to a single transaction
   * @param {string} userId - User ID
   * @param {string[]} receiptIds - Array of receipt IDs
   * @param {string} transactionId - Transaction ID to link to
   * @returns {Promise<Object>} { successful, failed }
   */
  async bulkLinkToTransaction(userId, receiptIds, transactionId) {
    const results = { successful: [], failed: [] };

    // Verify transaction belongs to user
    const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    if (transactionDoc.data().userId !== userId) {
      throw new Error('You do not have access to this transaction');
    }

    for (const receiptId of receiptIds) {
      try {
        await this.addTransactionLink(userId, receiptId, transactionId);
        results.successful.push(receiptId);
      } catch (error) {
        results.failed.push({ id: receiptId, error: error.message });
      }
    }

    logger.info(`📦 Bulk linked ${results.successful.length} receipts to transaction ${transactionId}, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Bulk unlink multiple receipts from their transactions
   * @param {string} userId - User ID
   * @param {string[]} receiptIds - Array of receipt IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  async bulkUnlinkFromTransactions(userId, receiptIds) {
    const results = { successful: [], failed: [] };

    for (const receiptId of receiptIds) {
      try {
        const receipt = await this.getReceiptById(userId, receiptId);
        
        // Clear all transaction links
        const allTransactionIds = [...(receipt.transactionIds || [])];
        if (receipt.transactionId && !allTransactionIds.includes(receipt.transactionId)) {
          allTransactionIds.push(receipt.transactionId);
        }

        // Clear links from all transactions
        for (const txId of allTransactionIds) {
          await this._clearTransactionReceiptLink(txId);
        }

        // Update receipt
        await this.db.collection(this.collection).doc(receiptId).update({
          transactionId: '',
          transactionIds: [],
          updatedAt: FieldValue.serverTimestamp()
        });

        results.successful.push(receiptId);
      } catch (error) {
        results.failed.push({ id: receiptId, error: error.message });
      }
    }

    logger.info(`📦 Bulk unlinked ${results.successful.length} receipts, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Link a single receipt to multiple transactions at once
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @returns {Promise<Object>} Updated receipt
   */
  async linkToMultipleTransactions(userId, receiptId, transactionIds) {
    const results = { successful: [], failed: [] };

    for (const transactionId of transactionIds) {
      try {
        await this.addTransactionLink(userId, receiptId, transactionId);
        results.successful.push(transactionId);
      } catch (error) {
        results.failed.push({ id: transactionId, error: error.message });
      }
    }

    logger.info(`📦 Linked receipt ${receiptId} to ${results.successful.length} transactions, ${results.failed.length} failed`);
    
    return {
      receipt: await this.getReceiptById(userId, receiptId),
      results
    };
  }

  /**
   * Upload or replace image for existing receipt
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @param {Object} file - File to upload
   * @returns {Promise<Object>} Updated receipt
   */
  async uploadImage(userId, receiptId, file) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      // Delete existing image if present
      if (receipt.hasImage && receipt.fileId) {
        await storageService.deleteFile(receipt.fileId, receipt.storageProvider);
      }

      // Upload new file
      const uploadResult = await storageService.uploadFile(userId, file);

      // Update receipt
      await this.db.collection(this.collection).doc(receiptId).update({
        hasImage: true,
        fileUrl: uploadResult.url,
        fileId: uploadResult.fileId,
        fileName: file.originalname || file.filename || 'receipt',
        fileSize: file.size,
        mimeType: file.mimetype,
        storageProvider: uploadResult.storageProvider,
        thumbnailUrl: uploadResult.thumbnailUrl || '',
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`📷 Uploaded image for receipt: ${receiptId}`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error uploading image for receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Delete image from receipt (keep receipt record)
   * @param {string} userId - User ID
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Updated receipt
   */
  async deleteImage(userId, receiptId) {
    try {
      const receipt = await this.getReceiptById(userId, receiptId);

      if (receipt.hasImage && receipt.fileId) {
        await storageService.deleteFile(receipt.fileId, receipt.storageProvider);
      }

      await this.db.collection(this.collection).doc(receiptId).update({
        hasImage: false,
        fileUrl: '',
        fileId: '',
        fileName: '',
        fileSize: 0,
        mimeType: '',
        storageProvider: STORAGE_PROVIDERS.NONE,
        thumbnailUrl: '',
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`🗑️ Deleted image from receipt: ${receiptId}`);
      
      return this.getReceiptById(userId, receiptId);
    } catch (error) {
      logger.error(`Error deleting image from receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Get receipt statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics
   */
  async getReceiptStats(userId) {
    try {
      const snapshot = await this.db.collection(this.collection)
        .where('userId', '==', userId)
        .get();

      const receipts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const stats = {
        total: receipts.length,
        withImage: receipts.filter(r => r.hasImage).length,
        withTransaction: receipts.filter(r => r.transactionId).length,
        expiringSoon: receipts.filter(r => isReceiptExpiringSoon(r.expiresAt)).length,
        totalStorageBytes: receipts.reduce((sum, r) => sum + (r.fileSize || 0), 0)
      };

      stats.withoutImage = stats.total - stats.withImage;
      stats.withoutTransaction = stats.total - stats.withTransaction;
      stats.totalStorageMB = Math.round(stats.totalStorageBytes / (1024 * 1024) * 100) / 100;

      return stats;
    } catch (error) {
      logger.error('Error getting receipt stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired receipts (2+ years old)
   * Should be run as a scheduled job
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupExpiredReceipts() {
    try {
      const now = new Date();
      
      const snapshot = await this.db.collection(this.collection)
        .where('expiresAt', '<', now)
        .get();

      const results = { deleted: 0, failed: 0, errors: [] };

      for (const doc of snapshot.docs) {
        const receipt = { id: doc.id, ...doc.data() };
        
        try {
          // Delete file if exists
          if (receipt.hasImage && receipt.fileId) {
            await storageService.deleteFile(receipt.fileId, receipt.storageProvider);
          }

          // Clear transaction link if exists
          if (receipt.transactionId) {
            await this._clearTransactionReceiptLink(receipt.transactionId);
          }

          // Delete document
          await doc.ref.delete();
          results.deleted++;
        } catch (error) {
          results.failed++;
          results.errors.push({ id: doc.id, error: error.message });
        }
      }

      logger.info(`🧹 Cleanup completed: ${results.deleted} deleted, ${results.failed} failed`);
      
      return results;
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Flag receipts expiring within 30 days
   * Should be run as a scheduled job
   * @returns {Promise<number>} Number of receipts flagged
   */
  async flagExpiringReceipts() {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await this.db.collection(this.collection)
        .where('expiresAt', '>', now)
        .where('expiresAt', '<=', thirtyDaysFromNow)
        .where('isExpiringSoon', '==', false)
        .get();

      const batch = this.db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isExpiringSoon: true });
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
      }

      logger.info(`⚠️ Flagged ${snapshot.docs.length} receipts as expiring soon`);
      
      return snapshot.docs.length;
    } catch (error) {
      logger.error('Error flagging expiring receipts:', error);
      throw error;
    }
  }

  /**
   * Clear receipt link from transaction
   * @private
   */
  async _clearTransactionReceiptLink(transactionId) {
    try {
      const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
      if (transactionDoc.exists) {
        await this.db.collection('transactions').doc(transactionId).update({
          receiptUrl: '',
          receiptFileId: '',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      logger.warn(`Could not clear receipt link from transaction ${transactionId}:`, error.message);
    }
  }
}

// Export singleton instance
const receiptService = new ReceiptService();
export default receiptService;
