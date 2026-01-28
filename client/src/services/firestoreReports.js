// Firestore summary and category stats for reports
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get transaction summary for a date range, company, and upload
 * Uses transaction.type field for proper income/expense/transfer classification
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
  
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransfers = 0;
  const transactionCount = transactions.length;
  const categoryBreakdown = {};
  
  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount) || 0;
    const category = tx.category || 'Uncategorized';
    
    // Initialize category tracking
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { income: 0, expenses: 0, transfers: 0, total: 0, count: 0 };
    }
    categoryBreakdown[category].count++;
    
    // Use transaction type field for proper classification
    // Transfers are neutral - don't affect income/expense totals
    if (tx.type === 'transfer') {
      totalTransfers += Math.abs(amount);
      categoryBreakdown[category].transfers += Math.abs(amount);
      categoryBreakdown[category].total += Math.abs(amount);
    } else if (tx.type === 'income') {
      totalIncome += amount;
      categoryBreakdown[category].income += amount;
      categoryBreakdown[category].total += amount;
    } else if (tx.type === 'expense') {
      totalExpenses += Math.abs(amount);
      categoryBreakdown[category].expenses += Math.abs(amount);
      categoryBreakdown[category].total += Math.abs(amount);
    } else {
      // Fallback for legacy data without type field - use amount sign
      if (amount > 0) {
        totalIncome += amount;
        categoryBreakdown[category].income += amount;
      } else {
        totalExpenses += Math.abs(amount);
        categoryBreakdown[category].expenses += Math.abs(amount);
      }
      categoryBreakdown[category].total += Math.abs(amount);
    }
  });
  
  // Net income excludes transfers
  const netIncome = totalIncome - totalExpenses;
  
  return {
    summary: {
      totalIncome,
      totalExpenses,
      totalTransfers,
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
