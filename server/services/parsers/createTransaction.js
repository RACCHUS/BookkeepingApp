// Async utility to create a transaction object, always sanitizing fields
import transactionClassifierService from '../transactionClassifierService.js';

/**
 * Asynchronously creates a transaction object, applying user rule-based classification.
 * @param {string} dateStr - MM/DD format
 * @param {string} description
 * @param {string} amountStr
 * @param {string} type - 'income' or 'expense'
 * @param {number} year
 * @param {string} userId
 * @param {string} companyId
 * @param {string} companyName
 * @returns {Promise<Object|null>} Transaction object or null if invalid
 */
export default async function createTransaction(dateStr, description, amountStr, type, year, userId, companyId = '', companyName = '') {
  try {
    // Normalize dateStr to MM/DD (replace any dash with slash)
    const normalizedDateStr = (dateStr || '').replace(/-/g, '/');
    let fullDate = '';
    try {
      const dateParts = normalizedDateStr.split('/');
      const month = parseInt(dateParts[0]);
      const day = parseInt(dateParts[1]);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        console.warn(`[createTransaction] Invalid month/day: dateStr='${dateStr}', normalized='${normalizedDateStr}', year='${year}'`);
        return null;
      }
      fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
      if (isNaN(Date.parse(fullDate))) {
        console.warn(`[createTransaction] Invalid fullDate: dateStr='${dateStr}', normalized='${normalizedDateStr}', year='${year}', fullDate='${fullDate}'`);
        fullDate = '';
      }
    } catch (err) {
      console.warn(`[createTransaction] Exception parsing date: dateStr='${dateStr}', normalized='${normalizedDateStr}', year='${year}', err=${err}`);
      fullDate = '';
    }
    // Parse amount
    const amount = parseFloat((amountStr || '').replace(/[$,]/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > 1000000) return null;
    // Clean up description
    let cleanDescription = (description || '').replace(/\s+/g, ' ').trim();
    if (!cleanDescription) cleanDescription = '';
    // Extract payee from description (null if not available, e.g., for checks)
    let payee = cleanDescription;
    if (/^check\s*#?\d+$/i.test(cleanDescription.trim())) payee = '';
    // Use async rule-based classifier (user rules)
    let category = '';
    try {
      const classification = await transactionClassifierService.classifyTransaction({
        description: cleanDescription,
        type,
        payee,
      }, userId);
      category = classification?.category || '';
    } catch {
      category = '';
    }
    return {
      date: fullDate,
      amount,
      description: cleanDescription,
      category,
      type,
      payee,
      companyId: companyId || '',
      companyName: companyName || '',
      source: 'chase_pdf',
      needsReview: !category || category === 'Uncategorized' || !payee
    };
  } catch (error) {
    console.error('[createTransaction] Fatal error:', error);
    return null;
  }
}
