/**
 * Income Source Service
 * Handles CRUD operations for income sources (customers, services, products)
 * @note This is a LEGACY service - new code should use the database adapter
 */

import admin from '../../../config/firebaseAdmin.js';
import cache from '../../../utils/serverCache.js';

const COLLECTION = 'incomeSources';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get Firestore database reference
const getDb = () => {
  if (!admin) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.firestore();
};

/**
 * Get all income sources for a user
 */
const getAllIncomeSources = async (userId, filters = {}) => {
  try {
    // Check cache first
    const cacheKey = cache.makeKey(userId, 'incomeSources', filters);
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache HIT] incomeSources for user:', userId);
      return cached;
    }
    
    console.log('[Cache MISS] incomeSources for user:', userId);
    const db = getDb();
    let query = db.collection(COLLECTION).where('userId', '==', userId);
    
    if (filters.sourceType) {
      query = query.where('sourceType', '==', filters.sourceType);
    }
    
    const snapshot = await query.orderBy('name').get();
    
    const sources = [];
    snapshot.forEach(doc => {
      sources.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    const result = { success: true, sources };
    
    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('Error getting income sources:', error);
    throw error;
  }
};

/**
 * Get income source by ID
 */
const getIncomeSourceById = async (userId, sourceId) => {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(sourceId).get();
    
    if (!doc.exists) {
      return { success: false, error: 'Income source not found' };
    }
    
    const data = doc.data();
    if (data.userId !== userId) {
      return { success: false, error: 'Unauthorized access' };
    }
    
    return { 
      success: true, 
      source: { id: doc.id, ...data } 
    };
  } catch (error) {
    console.error('Error getting income source:', error);
    throw error;
  }
};

/**
 * Create a new income source
 */
const createIncomeSource = async (userId, sourceData) => {
  try {
    const db = getDb();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const newSource = {
      userId,
      name: sourceData.name,
      sourceType: sourceData.sourceType || 'other',
      category: sourceData.category || '',
      description: sourceData.description || '',
      contactEmail: sourceData.contactEmail || '',
      contactPhone: sourceData.contactPhone || '',
      notes: sourceData.notes || '',
      totalAmount: 0,
      transactionCount: 0,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await db.collection(COLLECTION).add(newSource);
    
    // Invalidate cache for this user's income sources
    cache.delByPrefix(`user:${userId}:incomeSources`);
    
    return {
      success: true,
      source: { id: docRef.id, ...newSource }
    };
  } catch (error) {
    console.error('Error creating income source:', error);
    throw error;
  }
};

/**
 * Update an income source
 */
const updateIncomeSource = async (userId, sourceId, updateData) => {
  try {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(sourceId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return { success: false, error: 'Income source not found' };
    }
    
    if (doc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized access' };
    }
    
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Only update allowed fields
    const allowedFields = ['name', 'sourceType', 'category', 'description', 'contactEmail', 'contactPhone', 'notes'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });
    
    await docRef.update(updates);
    
    // Invalidate cache for this user's income sources
    cache.delByPrefix(`user:${userId}:incomeSources`);
    
    const updatedDoc = await docRef.get();
    return {
      success: true,
      source: { id: updatedDoc.id, ...updatedDoc.data() }
    };
  } catch (error) {
    console.error('Error updating income source:', error);
    throw error;
  }
};

/**
 * Delete an income source
 */
const deleteIncomeSource = async (userId, sourceId) => {
  try {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(sourceId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return { success: false, error: 'Income source not found' };
    }
    
    if (doc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized access' };
    }
    
    // Optionally: Remove incomeSourceId from linked transactions
    const transactionsSnapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .where('incomeSourceId', '==', sourceId)
      .get();
    
    const batch = db.batch();
    
    transactionsSnapshot.forEach(txDoc => {
      batch.update(txDoc.ref, {
        incomeSourceId: admin.firestore.FieldValue.delete(),
        incomeSourceName: admin.firestore.FieldValue.delete()
      });
    });
    
    batch.delete(docRef);
    await batch.commit();
    
    // Invalidate cache for this user's income sources
    cache.delByPrefix(`user:${userId}:incomeSources`);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting income source:', error);
    throw error;
  }
};

/**
 * Get transactions for an income source
 */
const getTransactionsBySource = async (userId, sourceId, filters = {}) => {
  try {
    const db = getDb();
    let query = db.collection('transactions')
      .where('userId', '==', userId)
      .where('incomeSourceId', '==', sourceId);
    
    const snapshot = await query.orderBy('date', 'desc').get();
    
    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, transactions };
  } catch (error) {
    console.error('Error getting transactions by source:', error);
    throw error;
  }
};

/**
 * Get summary for an income source
 */
const getSourceSummary = async (userId, sourceId, filters = {}) => {
  try {
    const transactionsResult = await getTransactionsBySource(userId, sourceId, filters);
    
    if (!transactionsResult.success) {
      return transactionsResult;
    }
    
    const transactions = transactionsResult.transactions;
    const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    return {
      success: true,
      summary: {
        transactionCount: transactions.length,
        totalAmount,
        averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0
      }
    };
  } catch (error) {
    console.error('Error getting source summary:', error);
    throw error;
  }
};

/**
 * Update income source totals (called when transactions are assigned/unassigned)
 */
const updateSourceTotals = async (userId, sourceId) => {
  try {
    const transactionsResult = await getTransactionsBySource(userId, sourceId);
    
    if (!transactionsResult.success) {
      return transactionsResult;
    }
    
    const transactions = transactionsResult.transactions;
    const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    const db = getDb();
    await db.collection(COLLECTION).doc(sourceId).update({
      totalAmount,
      transactionCount: transactions.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating source totals:', error);
    throw error;
  }
};

export {
  getAllIncomeSources,
  getIncomeSourceById,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  getTransactionsBySource,
  getSourceSummary,
  updateSourceTotals
};

export default {
  getAllIncomeSources,
  getIncomeSourceById,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  getTransactionsBySource,
  getSourceSummary,
  updateSourceTotals
};
