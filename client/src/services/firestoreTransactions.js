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
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


/**
 * Add a transaction for the current user
 * @param {object} txData
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<string>} Document ID
 */
export async function addTransaction(txData, userId) {
  if (!userId) throw new Error('Missing userId for Firestore document');
  const docRef = await addDoc(collection(db, 'transactions'), { ...txData, userId });
  return docRef.id;
}

/**
 * Update a transaction
 * @param {string} id
 * @param {object} txData
 */
export async function updateTransaction(id, txData) {
  await updateDoc(doc(db, 'transactions', id), txData);
}

/**
 * Delete a transaction
 * @param {string} id
 */
export async function deleteTransaction(id) {
  await deleteDoc(doc(db, 'transactions', id));
}
