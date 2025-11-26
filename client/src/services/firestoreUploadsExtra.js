// Firestore PDF upload and processing utilities
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';

/**
 * Upload a PDF file to Firebase Storage and create Firestore metadata
 * @param {object} params { file, companyId, companyName, bankType, tempId }
 * @returns {Promise<object>} Firestore upload document
 */
/**
 * Upload a PDF file to Firebase Storage and create Firestore metadata
 * @param {object} params { file, companyId, companyName, bankType, tempId, userId }
 * @returns {Promise<object>} Firestore upload document
 */
/**
 * Create a Firestore upload document for a PDF file (no file upload)
 * @param {object} params { file, companyId, userId }
 * @returns {Promise<object>} Firestore upload document
 */
// Removed pdfjs-dist imports; use pdf-parse or backend extraction instead

export async function uploadPDF({ file, companyId, userId }) {
  if (!userId) throw new Error('Missing userId for Firestore document');
  let extractedTransactions = [];
  let extractedText = '';
  let pageCount = 0;
  try {
    // Parse PDF client-side
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pageCount = pdf.numPages;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      extractedText += pageText + '\n';
      // Simple Chase statement transaction extraction (example)
      const transactionRegex = /([0-9]{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-]+)\s+(-?\$?\d{1,3}(,\d{3})*(\.\d{2})?)/g;
      let match;
      while ((match = transactionRegex.exec(pageText)) !== null) {
        extractedTransactions.push({
          date: match[1],
          description: match[2].trim(),
          amount: match[3].replace(/[^\d.-]/g, ''),
        });
      }
    }
    // Save extracted metadata and transactions to Firestore
    const uploadDoc = await addDoc(collection(db, 'uploads'), {
      originalName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'processed',
      companyId: companyId || '',
      userId,
      pageCount,
      extractedText,
      transactions: extractedTransactions,
    });
    return { id: uploadDoc.id, transactions: extractedTransactions };
  } catch (error) {
    throw error;
  }
}

/**
 * Start PDF processing (simulated: update status in Firestore)
 * @param {string} uploadId
 */
export async function startProcessing(uploadId) {
  await updateDoc(doc(db, 'uploads', uploadId), {
    status: 'processing',
    startTime: new Date().toISOString()
  });
}

/**
 * Update company info for an upload
 * @param {string} uploadId
 * @param {object} params { companyId, companyName }
 */
export async function updateCompany(uploadId, { companyId, companyName }) {
  await updateDoc(doc(db, 'uploads', uploadId), {
    companyId: companyId || '',
    companyName: companyName || ''
  });
}
