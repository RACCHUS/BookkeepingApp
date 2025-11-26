// Firestore CRUD for companies
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from './firebase';


/**
 * Get all companies for the current user
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Array>}
 */
export async function getCompanies(userId) {
  if (!userId) throw new Error('Missing userId for Firestore query');
  const q = query(collection(db, 'companies'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


/**
 * Add a company for the current user
 * @param {object} companyData
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<string>} Document ID
 */
export async function addCompany(companyData, userId) {
  if (!userId) throw new Error('Missing userId for Firestore document');
  const docRef = await addDoc(collection(db, 'companies'), { ...companyData, userId });
  return docRef.id;
}

/**
 * Update a company
 * @param {string} id
 * @param {object} companyData
 */
export async function updateCompany(id, companyData) {
  await updateDoc(doc(db, 'companies', id), companyData);
}

/**
 * Delete a company
 * @param {string} id
 */
export async function deleteCompany(id) {
  await deleteDoc(doc(db, 'companies', id));
}
