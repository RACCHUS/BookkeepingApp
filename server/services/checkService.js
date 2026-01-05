/**
 * Check Service
 * Handles CRUD operations for check records
 * 
 * Features:
 * - Create/read/update/delete checks
 * - Optional image upload
 * - Transaction creation (income or expense)
 * - Bulk operations
 * - Link checks to existing transactions
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/index.js';
import storageService from './storageService.js';
import {
  createCheckObject,
  validateCheck,
  formatCheckResponse,
  CHECK_TYPES,
  STORAGE_PROVIDERS
} from '../../shared/schemas/checkSchema.js';

class CheckService {
  constructor() {
    this.db = getFirestore();
    this.collection = 'checks';
  }

  /**
   * Create a new check record
   * @param {string} userId - User ID
   * @param {Object} checkData - Check data
   * @param {Object} file - Optional image file
   * @returns {Promise<Object>} Created check
   */
  async createCheck(userId, checkData, file = null) {
    try {
      // Validate check data
      const validation = validateCheck(checkData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
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
          fileName: file.originalname || file.filename || 'check',
          fileSize: file.size,
          mimeType: file.mimetype,
          storageProvider: uploadResult.storageProvider,
          thumbnailUrl: uploadResult.thumbnailUrl || ''
        };
      }

      // Create check object
      const check = createCheckObject(userId, {
        ...checkData,
        ...fileInfo,
        amount: checkData.amount ? parseFloat(checkData.amount) : null
      });

      // Save to Firestore
      const docRef = await this.db.collection(this.collection).add(check);
      let createdCheck = { ...check, id: docRef.id };

      // If createTransaction flag is set and we have enough data, create a transaction
      if (checkData.createTransaction && checkData.amount && checkData.date) {
        try {
          const isIncome = checkData.type === CHECK_TYPES.INCOME;
          const amount = parseFloat(checkData.amount);
          
          // Income = positive, Expense = negative
          const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

          const transactionData = {
            userId,
            description: checkData.memo || `Check #${checkData.checkNumber || 'N/A'} - ${checkData.payee || 'Unknown'}`,
            payee: checkData.payee || '',
            amount: finalAmount,
            date: new Date(checkData.date),
            type: isIncome ? 'income' : 'expense',
            category: checkData.category || '',
            source: 'check',
            sectionCode: 'checks',
            section: 'CHECKS PAID',
            companyId: checkData.companyId || null,
            checkId: docRef.id,
            checkNumber: checkData.checkNumber || '',
            paymentMethod: 'check',
            vendorId: checkData.vendorId || '',
            vendorName: checkData.vendorName || '',
            isContractorPayment: !!checkData.isContractorPayment,
            notes: checkData.notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const txRef = await this.db.collection('transactions').add(transactionData);
          
          // Update check with transaction link
          await docRef.update({ transactionId: txRef.id });
          createdCheck.transactionId = txRef.id;

          logger.info(`✅ Created transaction ${txRef.id} from check ${docRef.id} (${isIncome ? 'income' : 'expense'})`);
        } catch (txError) {
          logger.warn(`Failed to create transaction from check: ${txError.message}`);
          // Check is still created, just without transaction
        }
      }

      logger.info(`✅ Created check: ${docRef.id} for user ${userId}`);
      
      return formatCheckResponse(createdCheck);
    } catch (error) {
      logger.error('Error creating check:', error);
      throw error;
    }
  }

  /**
   * Get check by ID
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @returns {Promise<Object|null>} Check or null
   */
  async getCheck(userId, checkId) {
    try {
      const doc = await this.db.collection(this.collection).doc(checkId).get();
      
      if (!doc.exists) {
        return null;
      }

      const check = { id: doc.id, ...doc.data() };
      
      // Verify ownership
      if (check.userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      return formatCheckResponse(check);
    } catch (error) {
      logger.error(`Error getting check ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Get all checks for a user with optional filters
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} { checks, total }
   */
  async getChecks(userId, filters = {}) {
    try {
      let query = this.db.collection(this.collection)
        .where('userId', '==', userId);

      // Apply filters
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.companyId) {
        query = query.where('companyId', '==', filters.companyId);
      }

      if (filters.hasImage !== undefined) {
        query = query.where('hasImage', '==', filters.hasImage);
      }

      // Sort by date descending by default
      query = query.orderBy('date', 'desc');

      // Apply limit
      if (filters.limit) {
        query = query.limit(parseInt(filters.limit));
      }

      const snapshot = await query.get();
      let checks = snapshot.docs.map(doc => 
        formatCheckResponse({ id: doc.id, ...doc.data() })
      );

      // Client-side filters for partial matching
      if (filters.payee) {
        const payeeSearch = filters.payee.toLowerCase();
        checks = checks.filter(c => 
          c.payee && c.payee.toLowerCase().includes(payeeSearch)
        );
      }

      if (filters.checkNumber) {
        checks = checks.filter(c => 
          c.checkNumber && c.checkNumber.includes(filters.checkNumber)
        );
      }

      if (filters.startDate) {
        checks = checks.filter(c => c.date >= filters.startDate);
      }

      if (filters.endDate) {
        checks = checks.filter(c => c.date <= filters.endDate);
      }

      if (filters.minAmount) {
        const min = parseFloat(filters.minAmount);
        checks = checks.filter(c => c.amount >= min);
      }

      if (filters.maxAmount) {
        const max = parseFloat(filters.maxAmount);
        checks = checks.filter(c => c.amount <= max);
      }

      return {
        checks,
        total: checks.length
      };
    } catch (error) {
      logger.error('Error getting checks:', error);
      throw error;
    }
  }

  /**
   * Update a check
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated check
   */
  async updateCheck(userId, checkId, updates) {
    try {
      const doc = await this.db.collection(this.collection).doc(checkId).get();
      
      if (!doc.exists) {
        throw new Error('Check not found');
      }

      const check = doc.data();
      
      // Verify ownership
      if (check.userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      // Validate updates
      const validation = validateCheck(updates);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      };

      // Parse amount if provided
      if (updates.amount !== undefined) {
        updateData.amount = updates.amount ? parseFloat(updates.amount) : null;
      }

      await this.db.collection(this.collection).doc(checkId).update(updateData);

      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error updating check ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a check
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @returns {Promise<boolean>}
   */
  async deleteCheck(userId, checkId) {
    try {
      const doc = await this.db.collection(this.collection).doc(checkId).get();
      
      if (!doc.exists) {
        throw new Error('Check not found');
      }

      const check = doc.data();
      
      // Verify ownership
      if (check.userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      // Delete associated image if exists
      if (check.hasImage && check.fileId) {
        try {
          await storageService.deleteFile(check.fileId, check.storageProvider);
        } catch (imgError) {
          logger.warn(`Failed to delete check image: ${imgError.message}`);
        }
      }

      // Delete the check
      await this.db.collection(this.collection).doc(checkId).delete();

      logger.info(`🗑️ Deleted check: ${checkId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting check ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Upload image to existing check
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @param {Object} file - Image file
   * @returns {Promise<Object>} Updated check
   */
  async uploadImage(userId, checkId, file) {
    try {
      const doc = await this.db.collection(this.collection).doc(checkId).get();
      
      if (!doc.exists) {
        throw new Error('Check not found');
      }

      const check = doc.data();
      
      // Verify ownership
      if (check.userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      // Delete old image if exists
      if (check.hasImage && check.fileId) {
        try {
          await storageService.deleteFile(check.fileId, check.storageProvider);
        } catch (imgError) {
          logger.warn(`Failed to delete old check image: ${imgError.message}`);
        }
      }

      // Upload new image
      const uploadResult = await storageService.uploadFile(userId, file);

      const updateData = {
        hasImage: true,
        fileUrl: uploadResult.url,
        fileId: uploadResult.fileId,
        fileName: file.originalname || file.filename || 'check',
        fileSize: file.size,
        mimeType: file.mimetype,
        storageProvider: uploadResult.storageProvider,
        thumbnailUrl: uploadResult.thumbnailUrl || '',
        updatedAt: FieldValue.serverTimestamp()
      };

      await this.db.collection(this.collection).doc(checkId).update(updateData);

      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error uploading check image ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Delete image from check
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @returns {Promise<Object>} Updated check
   */
  async deleteImage(userId, checkId) {
    try {
      const doc = await this.db.collection(this.collection).doc(checkId).get();
      
      if (!doc.exists) {
        throw new Error('Check not found');
      }

      const check = doc.data();
      
      // Verify ownership
      if (check.userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      // Delete image from storage
      if (check.hasImage && check.fileId) {
        await storageService.deleteFile(check.fileId, check.storageProvider);
      }

      const updateData = {
        hasImage: false,
        fileUrl: '',
        fileId: '',
        fileName: '',
        fileSize: 0,
        mimeType: '',
        storageProvider: STORAGE_PROVIDERS.NONE,
        thumbnailUrl: '',
        updatedAt: FieldValue.serverTimestamp()
      };

      await this.db.collection(this.collection).doc(checkId).update(updateData);

      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error deleting check image ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create checks (with optional transaction creation)
   * @param {string} userId - User ID
   * @param {Array} checks - Array of check data
   * @returns {Promise<Object>} { results, successCount, failCount }
   */
  async bulkCreate(userId, checks) {
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const checkData of checks) {
      try {
        const check = await this.createCheck(userId, checkData, null);
        
        results.push({
          success: true,
          check,
          transactionCreated: !!checkData.createTransaction && !!check.transactionId
        });
        successCount++;
      } catch (error) {
        logger.warn(`Failed to bulk create check:`, error.message);
        results.push({
          success: false,
          error: error.message,
          data: checkData
        });
        failCount++;
      }
    }

    logger.info(`📝 Bulk created ${successCount} checks (${failCount} failed)`);

    return {
      results,
      total: checks.length,
      successCount,
      failCount,
      allSucceeded: failCount === 0 && successCount > 0,
      someSucceeded: successCount > 0 && failCount > 0
    };
  }

  /**
   * Link check to existing transaction
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @param {string} transactionId - Transaction ID to link
   * @returns {Promise<Object>} Updated check
   */
  async linkToTransaction(userId, checkId, transactionId) {
    try {
      // Verify check ownership
      const checkDoc = await this.db.collection(this.collection).doc(checkId).get();
      if (!checkDoc.exists) {
        throw new Error('Check not found');
      }
      if (checkDoc.data().userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      // Verify transaction ownership
      const txDoc = await this.db.collection('transactions').doc(transactionId).get();
      if (!txDoc.exists) {
        throw new Error('Transaction not found');
      }
      if (txDoc.data().userId !== userId) {
        throw new Error('Unauthorized access to transaction');
      }

      // Update check with transaction link
      await this.db.collection(this.collection).doc(checkId).update({
        transactionId,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update transaction with check link
      await this.db.collection('transactions').doc(transactionId).update({
        checkId,
        updatedAt: FieldValue.serverTimestamp()
      });

      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error linking check ${checkId} to transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Unlink check from transaction
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @returns {Promise<Object>} Updated check
   */
  async unlinkFromTransaction(userId, checkId) {
    try {
      const checkDoc = await this.db.collection(this.collection).doc(checkId).get();
      if (!checkDoc.exists) {
        throw new Error('Check not found');
      }
      if (checkDoc.data().userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      const check = checkDoc.data();
      
      // Clear check link from transaction if linked
      if (check.transactionId) {
        try {
          await this.db.collection('transactions').doc(check.transactionId).update({
            checkId: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
          });
        } catch (e) {
          logger.warn(`Could not clear check link from transaction ${check.transactionId}:`, e.message);
        }
      }

      // Clear all transaction links
      const allTransactionIds = [...(check.transactionIds || [])];
      for (const txId of allTransactionIds) {
        if (txId !== check.transactionId) {
          try {
            await this.db.collection('transactions').doc(txId).update({
              checkId: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp()
            });
          } catch (e) {
            logger.warn(`Could not clear check link from transaction ${txId}:`, e.message);
          }
        }
      }

      // Update check
      await this.db.collection(this.collection).doc(checkId).update({
        transactionId: '',
        transactionIds: [],
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`🔓 Unlinked check ${checkId} from all transactions`);
      
      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error unlinking check ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Add a transaction to check's transactionIds array (multi-transaction support)
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @param {string} transactionId - Transaction ID to add
   * @returns {Promise<Object>} Updated check
   */
  async addTransactionLink(userId, checkId, transactionId) {
    try {
      const checkDoc = await this.db.collection(this.collection).doc(checkId).get();
      if (!checkDoc.exists) {
        throw new Error('Check not found');
      }
      if (checkDoc.data().userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      // Verify transaction belongs to user
      const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
      if (!transactionDoc.exists) {
        throw new Error('Transaction not found');
      }
      if (transactionDoc.data().userId !== userId) {
        throw new Error('You do not have access to this transaction');
      }

      const check = checkDoc.data();
      const currentIds = check.transactionIds || [];
      
      if (currentIds.includes(transactionId)) {
        logger.info(`Check ${checkId} already linked to transaction ${transactionId}`);
        return formatCheckResponse({ id: checkId, ...check });
      }

      // Add to transactionIds array
      const updatedIds = [...currentIds, transactionId];
      
      // Also set primary transactionId if not set
      const updates = {
        transactionIds: updatedIds,
        updatedAt: FieldValue.serverTimestamp()
      };
      if (!check.transactionId) {
        updates.transactionId = transactionId;
      }

      await this.db.collection(this.collection).doc(checkId).update(updates);

      // Update transaction with check info
      await this.db.collection('transactions').doc(transactionId).update({
        checkId: checkId,
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`🔗 Added transaction ${transactionId} to check ${checkId} (now has ${updatedIds.length} links)`);
      
      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error adding transaction to check ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a transaction from check's transactionIds array
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @param {string} transactionId - Transaction ID to remove
   * @returns {Promise<Object>} Updated check
   */
  async removeTransactionLink(userId, checkId, transactionId) {
    try {
      const checkDoc = await this.db.collection(this.collection).doc(checkId).get();
      if (!checkDoc.exists) {
        throw new Error('Check not found');
      }
      if (checkDoc.data().userId !== userId) {
        throw new Error('Unauthorized access to check');
      }

      const check = checkDoc.data();
      const currentIds = check.transactionIds || [];
      const updatedIds = currentIds.filter(id => id !== transactionId);

      // Update transactionIds array
      const updates = {
        transactionIds: updatedIds,
        updatedAt: FieldValue.serverTimestamp()
      };

      // Update primary transactionId if needed
      if (check.transactionId === transactionId) {
        updates.transactionId = updatedIds.length > 0 ? updatedIds[0] : '';
      }

      await this.db.collection(this.collection).doc(checkId).update(updates);

      // Clear check link from transaction
      try {
        await this.db.collection('transactions').doc(transactionId).update({
          checkId: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        });
      } catch (e) {
        logger.warn(`Could not clear check link from transaction ${transactionId}:`, e.message);
      }

      logger.info(`🔓 Removed transaction ${transactionId} from check ${checkId} (now has ${updatedIds.length} links)`);
      
      const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
      return formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
      logger.error(`Error removing transaction from check ${checkId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk link multiple checks to a single transaction
   * @param {string} userId - User ID
   * @param {string[]} checkIds - Array of check IDs
   * @param {string} transactionId - Transaction ID to link to
   * @returns {Promise<Object>} { successful, failed }
   */
  async bulkLinkToTransaction(userId, checkIds, transactionId) {
    const results = { successful: [], failed: [] };

    // Verify transaction belongs to user
    const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
    if (!transactionDoc.exists) {
      throw new Error('Transaction not found');
    }
    if (transactionDoc.data().userId !== userId) {
      throw new Error('You do not have access to this transaction');
    }

    for (const checkId of checkIds) {
      try {
        await this.addTransactionLink(userId, checkId, transactionId);
        results.successful.push(checkId);
      } catch (error) {
        results.failed.push({ id: checkId, error: error.message });
      }
    }

    logger.info(`📦 Bulk linked ${results.successful.length} checks to transaction ${transactionId}, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Bulk unlink multiple checks from their transactions
   * @param {string} userId - User ID
   * @param {string[]} checkIds - Array of check IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  async bulkUnlinkFromTransactions(userId, checkIds) {
    const results = { successful: [], failed: [] };

    for (const checkId of checkIds) {
      try {
        await this.unlinkFromTransaction(userId, checkId);
        results.successful.push(checkId);
      } catch (error) {
        results.failed.push({ id: checkId, error: error.message });
      }
    }

    logger.info(`📦 Bulk unlinked ${results.successful.length} checks, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Link a single check to multiple transactions at once
   * @param {string} userId - User ID
   * @param {string} checkId - Check ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @returns {Promise<Object>} Updated check with results
   */
  async linkToMultipleTransactions(userId, checkId, transactionIds) {
    const results = { successful: [], failed: [] };

    for (const transactionId of transactionIds) {
      try {
        await this.addTransactionLink(userId, checkId, transactionId);
        results.successful.push(transactionId);
      } catch (error) {
        results.failed.push({ id: transactionId, error: error.message });
      }
    }

    logger.info(`📦 Linked check ${checkId} to ${results.successful.length} transactions, ${results.failed.length} failed`);
    
    const updatedDoc = await this.db.collection(this.collection).doc(checkId).get();
    return {
      check: formatCheckResponse({ id: updatedDoc.id, ...updatedDoc.data() }),
      results
    };
  }

  /**
   * Batch update multiple checks
   * @param {string} userId - User ID
   * @param {string[]} checkIds - Array of check IDs
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} { successful, failed }
   */
  async batchUpdateChecks(userId, checkIds, updates) {
    const results = { successful: [], failed: [] };
    const batch = this.db.batch();

    // Sanitize updates
    const allowedFields = ['status', 'category', 'companyId', 'notes', 'memo'];
    const sanitizedUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }
    sanitizedUpdates.updatedAt = FieldValue.serverTimestamp();

    for (const checkId of checkIds) {
      try {
        const doc = await this.db.collection(this.collection).doc(checkId).get();
        if (!doc.exists) {
          results.failed.push({ id: checkId, error: 'Check not found' });
          continue;
        }
        if (doc.data().userId !== userId) {
          results.failed.push({ id: checkId, error: 'Unauthorized' });
          continue;
        }
        batch.update(doc.ref, sanitizedUpdates);
        results.successful.push(checkId);
      } catch (error) {
        results.failed.push({ id: checkId, error: error.message });
      }
    }

    if (results.successful.length > 0) {
      await batch.commit();
    }

    logger.info(`📦 Batch updated ${results.successful.length} checks, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Batch delete multiple checks
   * @param {string} userId - User ID
   * @param {string[]} checkIds - Array of check IDs
   * @returns {Promise<Object>} { successful, failed }
   */
  async batchDeleteChecks(userId, checkIds) {
    const results = { successful: [], failed: [] };

    for (const checkId of checkIds) {
      try {
        await this.deleteCheck(userId, checkId);
        results.successful.push(checkId);
      } catch (error) {
        results.failed.push({ id: checkId, error: error.message });
      }
    }

    logger.info(`🗑️ Batch deleted ${results.successful.length} checks, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Create checks from existing transactions (add check record to existing check transactions)
   * @param {string} userId - User ID
   * @param {Array} transactions - Transactions to create checks from
   * @returns {Promise<Object>} { successful, failed, checks }
   */
  async bulkCreateFromTransactions(userId, transactions) {
    const results = { successful: [], failed: [], checks: [] };

    for (const transaction of transactions) {
      try {
        // Create check data from transaction
        const checkData = {
          payee: transaction.payee || '',
          amount: Math.abs(transaction.amount),
          date: transaction.date,
          type: transaction.amount >= 0 ? CHECK_TYPES.INCOME : CHECK_TYPES.EXPENSE,
          checkNumber: transaction.checkNumber || '',
          memo: transaction.description || '',
          notes: `From transaction: ${transaction.description || ''}`.trim(),
          transactionId: transaction.id,
          companyId: transaction.companyId || null,
          category: transaction.category || '',
          vendorId: transaction.vendorId || '',
          vendorName: transaction.vendorName || '',
          isContractorPayment: !!transaction.isContractorPayment,
          createTransaction: false // Don't create duplicate transaction
        };

        // Create the check (without image)
        const check = await this.createCheck(userId, checkData, null);

        // Update transaction with check link
        await this.db.collection('transactions').doc(transaction.id).update({
          checkId: check.id,
          updatedAt: FieldValue.serverTimestamp()
        });

        results.successful.push(transaction.id);
        results.checks.push(check);
      } catch (error) {
        logger.warn(`Failed to create check for transaction ${transaction.id}:`, error.message);
        results.failed.push({ id: transaction.id, error: error.message });
      }
    }

    logger.info(`📝 Bulk created ${results.successful.length} checks from transactions, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Get check statistics for user
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getStats(userId, options = {}) {
    try {
      const { checks } = await this.getChecks(userId, options);

      const stats = {
        total: checks.length,
        withImages: checks.filter(c => c.hasImage).length,
        withoutImages: checks.filter(c => !c.hasImage).length,
        byType: {
          income: checks.filter(c => c.type === CHECK_TYPES.INCOME).length,
          expense: checks.filter(c => c.type === CHECK_TYPES.EXPENSE).length
        },
        byStatus: {
          pending: checks.filter(c => c.status === 'pending').length,
          cleared: checks.filter(c => c.status === 'cleared').length,
          bounced: checks.filter(c => c.status === 'bounced').length,
          voided: checks.filter(c => c.status === 'voided').length
        },
        totalIncome: checks
          .filter(c => c.type === CHECK_TYPES.INCOME && c.amount)
          .reduce((sum, c) => sum + c.amount, 0),
        totalExpense: checks
          .filter(c => c.type === CHECK_TYPES.EXPENSE && c.amount)
          .reduce((sum, c) => sum + c.amount, 0),
        linkedToTransactions: checks.filter(c => c.transactionId).length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting check stats:', error);
      throw error;
    }
  }
}

export const checkService = new CheckService();
export default checkService;
