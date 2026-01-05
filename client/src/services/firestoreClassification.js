// Firestore CRUD for classification rules and uncategorized transactions
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get all classification rules
 * @returns {Promise<Array>}
 */
export async function getRules() {
  try {
    const snapshot = await getDocs(collection(db, 'classificationRules'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Failed to fetch classification rules:', error);
    throw new Error('Unable to load classification rules. Please try again.');
  }
}

/**
 * Get uncategorized transactions (category is empty)
 * @returns {Promise<Array>}
 */
export async function getUncategorizedTransactions() {
  // Require userId for Firestore rules compliance
  return async function(userId) {
    try {
      if (!userId) throw new Error('userId is required for Firestore queries');
      const q = query(collection(db, 'transactions'), where('userId', '==', userId), where('category', '==', ''));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Failed to fetch uncategorized transactions:', error);
      throw new Error('Unable to load uncategorized transactions. Please try again.');
    }
  };
}

/**
 * Create a new classification rule
 * @param {object} rule { keywords: Array<string>, category: string }
 */
export async function createRule(rule) {
  try {
    await addDoc(collection(db, 'classificationRules'), rule);
  } catch (error) {
    console.error('Failed to create classification rule:', error);
    throw new Error('Unable to save classification rule. Please try again.');
  }
}

/**
 * Delete a classification rule
 * @param {string} ruleId
 */
export async function deleteRule(ruleId) {
  try {
    await deleteDoc(doc(db, 'classificationRules', ruleId));
  } catch (error) {
    console.error('Failed to delete classification rule:', error);
    throw new Error('Unable to delete classification rule. Please try again.');
  }
}
