import admin from '../config/firebaseAdmin.js';
import ChasePDFParser from '../services/chasePDFParser.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Downloads a PDF from Firebase Storage, extracts transactions, and writes to Firestore.
 * @param {string} storagePath - Path in Firebase Storage (e.g. 'pdfs/userId/filename.pdf')
 * @param {string} userId
 * @param {string} companyId
 * @param {string} companyName
 * @returns {Promise<object>} Extraction result
 */
export async function processPDFfromStorage(storagePath, userId, companyId = '', companyName = '') {
  const bucket = admin.storage().bucket();
  const tempFile = path.join('/tmp', path.basename(storagePath));
  await bucket.file(storagePath).download({ destination: tempFile });

  // Use robust parser
  const result = await ChasePDFParser.parsePDF(tempFile, userId, companyId, companyName);

  // Clean up temp file
  await fs.unlink(tempFile);

  // Save transactions to Firestore
  const db = admin.firestore();
  for (const tx of result.transactions) {
    await db.collection('transactions').add({ ...tx, userId, companyId, companyName });
  }

  return result;
}
