// Utility to parse a Chase transaction line (MM/DD DESCRIPTION AMOUNT)
// Always returns sanitized fields (no nulls)

/**
 * Parse a Chase transaction line (MM/DD DESCRIPTION AMOUNT)
 * @param {string} line
 * @param {number} year
 * @returns {object|null} Parsed transaction fields or null if not matched
 */
export default function parseTransactionLine(line, year) {
  // Accept both MM/DD and MM-DD as date separator
  const match = line.match(/^([0-9]{1,2}[\/\-][0-9]{1,2})\s+(.+?)\s+([-$]?[\d,]+\.?\d{2})\s*$/);
  if (!match) return null;
  const [, dateStrRaw, description, amountStr] = match;

  // Normalize dateStr to MM/DD
  const dateStr = (dateStrRaw || '').replace(/-/g, '/');

  // Parse date
  let fullDate = '';
  try {
    const dateParts = dateStr.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
    if (isNaN(Date.parse(fullDate))) fullDate = '';
  } catch {
    fullDate = '';
  }

  // Parse amount
  let amount = parseFloat(amountStr.replace(/[$,]/g, ''));
  const isNegative = amountStr.includes('-') || amount < 0;
  amount = Math.abs(amount);

  // Clean up description
  let cleanDescription = (description || '').trim();
  if (!cleanDescription) cleanDescription = '';

  // Determine transaction type
  const type = isNegative ? 'expense' : 'income';

  return {
    date: fullDate,
    amount,
    description: cleanDescription,
    type
  };
}
