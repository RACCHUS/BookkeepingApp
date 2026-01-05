// Firestore CRUD for transactions
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get transactions for a user, ordered by date desc, limited to N
 * @param {string} userId
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
export async function getTransactions(userId, maxResults = 50) {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(maxResults)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw new Error('Unable to load transactions. Please try again.');
  }
}


/**
 * Add a transaction for the current user
 * @param {object} txData
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<string>} Document ID
 */
export async function addTransaction(txData, userId) {
  try {
    if (!userId) throw new Error('Missing userId for Firestore document');
    const docRef = await addDoc(collection(db, 'transactions'), { ...txData, userId });
    return docRef.id;
  } catch (error) {
    console.error('Failed to add transaction:', error);
    throw new Error('Unable to save transaction. Please try again.');
  }
}

/**
 * Update a transaction
 * @param {string} id
 * @param {object} txData
 */
export async function updateTransaction(id, txData) {
  try {
    await updateDoc(doc(db, 'transactions', id), txData);
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw new Error('Unable to update transaction. Please try again.');
  }
}

/**
 * Delete a transaction
 * @param {string} id
 */
export async function deleteTransaction(id) {
  try {
    await deleteDoc(doc(db, 'transactions', id));
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw new Error('Unable to delete transaction. Please try again.');
  }
}
