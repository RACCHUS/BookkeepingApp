// Firestore upload status polling utility
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Get status and result for an upload
 * @param {string} uploadId
 * @returns {Promise<{status: string, result?: object}>}
 */
export async function getStatus(uploadId) {
  const uploadRef = doc(db, 'uploads', uploadId);
  const snap = await getDoc(uploadRef);
  if (!snap.exists()) return { status: 'not-found' };
  const data = snap.data();
  return {
    status: data.status || 'uploaded',
    result: data.result || null
  };
}
