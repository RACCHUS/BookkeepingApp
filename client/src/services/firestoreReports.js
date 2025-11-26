// Firestore summary and category stats for reports
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get transaction summary for a date range, company, and upload
 * @param {object} filters { startDate, endDate, companyId, uploadId }
 * @returns {Promise<object>} summary
 */
export async function getTransactionSummary(filters = {}) {
  if (!filters.userId) throw new Error('userId is required for Firestore queries');
  let q = query(collection(db, 'transactions'), where('userId', '==', filters.userId));
  if (filters.startDate) {
    q = query(q, where('date', '>=', filters.startDate));
  }
  if (filters.endDate) {
    q = query(q, where('date', '<=', filters.endDate));
  }
  if (filters.companyId) {
    q = query(q, where('companyId', '==', filters.companyId));
  }
  if (filters.uploadId) {
    q = query(q, where('statementId', '==', filters.uploadId));
  }
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  let totalIncome = 0, totalExpenses = 0, netIncome = 0, transactionCount = transactions.length;
  const categoryBreakdown = {};
  transactions.forEach(tx => {
    if (typeof tx.amount === 'number') {
      if (tx.amount > 0) totalIncome += tx.amount;
      else totalExpenses += Math.abs(tx.amount);
      netIncome += tx.amount;
    }
    if (tx.category) {
      categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
    }
  });
  return {
    summary: {
      totalIncome,
      totalExpenses,
      netIncome,
      transactionCount,
      categoryBreakdown
    }
  };
}

/**
 * Get category stats for a date range, company, and upload
 * @param {string} startDate
 * @param {string} endDate
 * @param {object} filters
 * @returns {Promise<object>} stats
 */
export async function getCategoryStats(startDate, endDate, filters = {}) {
  if (!filters.userId) throw new Error('userId is required for Firestore queries');
  let q = query(collection(db, 'transactions'), where('userId', '==', filters.userId));
  if (startDate) {
    q = query(q, where('date', '>=', startDate));
  }
  if (endDate) {
    q = query(q, where('date', '<=', endDate));
  }
  if (filters.companyId) {
    q = query(q, where('companyId', '==', filters.companyId));
  }
  if (filters.uploadId) {
    q = query(q, where('statementId', '==', filters.uploadId));
  }
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const stats = {};
  transactions.forEach(tx => {
    if (tx.category) {
      stats[tx.category] = (stats[tx.category] || 0) + tx.amount;
    }
  });
  return { stats };
}
