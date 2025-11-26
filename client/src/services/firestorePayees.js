// Firestore CRUD for payees, employees, and vendors
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';


/**
 * Get all payees for the current user
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Array>}
 */
export async function getPayees(userId) {
  if (!userId) throw new Error('Missing userId for Firestore query');
  const q = query(collection(db, 'payees'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get employees
 * @returns {Promise<Array>}
 */
export async function getEmployees() {
  const q = query(collection(db, 'payees'), where('type', '==', 'employee'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get vendors
 * @returns {Promise<Array>}
 */
export async function getVendors() {
  const q = query(collection(db, 'payees'), where('type', '==', 'vendor'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


/**
 * Add a payee for the current user
 * @param {object} payeeData
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<string>} Document ID
 */
export async function addPayee(payeeData, userId) {
  if (!userId) throw new Error('Missing userId for Firestore document');
  const docRef = await addDoc(collection(db, 'payees'), { ...payeeData, userId });
  return docRef.id;
}

/**
 * Update a payee
 * @param {string} id
 * @param {object} payeeData
 */
export async function updatePayee(id, payeeData) {
  await updateDoc(doc(db, 'payees', id), payeeData);
}

/**
 * Delete a payee
 * @param {string} id
 */
export async function deletePayee(id) {
  await deleteDoc(doc(db, 'payees', id));
}

/**
 * Get transactions without payees (for assignment)
 * @param {object} filters
 * @returns {Promise<Array>}
 */
export async function getTransactionsWithoutPayees(filters = {}) {
  let q = query(collection(db, 'transactions'), where('payeeId', '==', ''));
  if (filters.sectionCode) {
    q = query(q, where('sectionCode', '==', filters.sectionCode));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Bulk assign payee to transactions
 * @param {Array<string>} transactionIds
 * @param {string} payeeId
 * @param {string} payeeName
 * @returns {Promise<void>}
 */
export async function bulkAssignPayee(transactionIds, payeeId, payeeName) {
  // Firestore batch update
  const { writeBatch } = await import('firebase/firestore');
  const batch = writeBatch(db);
  transactionIds.forEach(id => {
    batch.update(doc(db, 'transactions', id), { payeeId, payeeName });
  });
  await batch.commit();
}
