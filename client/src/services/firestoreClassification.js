// Firestore CRUD for classification rules and uncategorized transactions
import { collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get all classification rules
 * @returns {Promise<Array>}
 */
export async function getRules() {
  const snapshot = await getDocs(collection(db, 'classificationRules'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get uncategorized transactions (category is empty)
 * @returns {Promise<Array>}
 */
export async function getUncategorizedTransactions() {
  // Require userId for Firestore rules compliance
  return async function(userId) {
    if (!userId) throw new Error('userId is required for Firestore queries');
    const q = query(collection(db, 'transactions'), where('userId', '==', userId), where('category', '==', ''));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };
}

/**
 * Create a new classification rule
 * @param {object} rule { keywords: Array<string>, category: string }
 */
export async function createRule(rule) {
  await addDoc(collection(db, 'classificationRules'), rule);
}

/**
 * Delete a classification rule
 * @param {string} ruleId
 */
export async function deleteRule(ruleId) {
  await deleteDoc(doc(db, 'classificationRules', ruleId));
}
