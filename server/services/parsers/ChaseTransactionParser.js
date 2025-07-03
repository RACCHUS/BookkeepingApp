/**
 * Parses lines/sections into Chase transaction objects.
 * Handles all line-level regex and transaction object creation.
 */
import ChaseClassifier from './ChaseClassifier.js';
import ChaseDateUtils from './ChaseDateUtils.js';

class ChaseTransactionParser {
  static parseDepositLine(line, year) {
    // Example: 01/08Remote Online Deposit 1$3,640.00
    const match = line.match(/(\d{2}\/\d{2})(.+?)\$?([\d,]+\.\d{2})/);
    if (!match) return null;
    const [, dateStr, description, amountStr] = match;
    const date = ChaseDateUtils.toISODate(dateStr, year);
    const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
    if (isNaN(amount) || amount <= 0) return null;
    const cleanDescription = description.trim();
    return {
      date,
      amount,
      description: cleanDescription,
      ...ChaseClassifier.classify(cleanDescription, amount, 'income'),
      source: 'chase_pdf',
    };
  }

  static parseCheckLine(line, year) {
    // Example: 533 ^ 01/03 01/03 400.00 or 538 * ^ 01/19 2,500.00
    const match = line.match(/(\d+)\s*[^\d\s]?[\^]?\s*(\d{2}\/\d{2})(?:\s*(\d{2}\/\d{2}))?\s*\$?([\d,]+\.\d{2})/);
    if (!match) return null;
    const checkNum = match[1];
    const dateStr = match[3] ? match[3] : match[2];
    const amountStr = match[4];
    const date = ChaseDateUtils.toISODate(dateStr, year);
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > 100000) return null;
    return {
      date,
      amount,
      description: `CHECK #${checkNum}`,
      ...ChaseClassifier.classify(`CHECK #${checkNum}`, amount, 'expense'),
      source: 'chase_pdf',
    };
  }

  static parseCardLine(line, year) {
    // Example: 01/02Card Purchase 12/29 Chevron ... Card 1819$38.80
    const match = line.match(/(\d{2}\/\d{2})Card Purchase.*?Card\s*1819\$?([\d,]+\.\d{2})$/);
    if (!match) return null;
    const dateStr = match[1];
    const amountStr = match[2];
    const date = ChaseDateUtils.toISODate(dateStr, year);
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > 50000) return null;
    // Extract merchant name
    const merchantMatch = line.match(/Card Purchase\s*(?:\d{2}\/\d{2}\s+)?(.+?)\s+Card\s*1819/);
    let merchantName = 'Card Purchase';
    if (merchantMatch && merchantMatch[1]) {
      merchantName = merchantMatch[1].replace(/\s+/g, ' ').replace(/\d{7,}/, '').replace(/\s+[A-Z]{2}\s*$/, '').trim();
      const words = merchantName.split(' ');
      if (words.length > 4) merchantName = words.slice(0, 4).join(' ');
    }
    return {
      date,
      amount,
      description: merchantName,
      ...ChaseClassifier.classify(merchantName, amount, 'expense'),
      source: 'chase_pdf',
    };
  }

  static parseElectronicLine(line, year) {
    // Example: 01/11 Orig CO Name:Home Depot ... $389.20
    const dateCompanyMatch = line.match(/(\d{2}\/\d{2})\s+Orig CO Name:([^O]+?)(?:Orig|$)/);
    if (!dateCompanyMatch) return null;
    const dateStr = dateCompanyMatch[1];
    const companyName = dateCompanyMatch[2].trim();
    // Find amount on current or next lines is handled in main parser, but here we just try current line
    const amountMatch = line.match(/\$?([\d,]+\.\d{2})/);
    if (!amountMatch) return null;
    const amountStr = amountMatch[1];
    const date = ChaseDateUtils.toISODate(dateStr, year);
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > 50000) return null;
    return {
      date,
      amount,
      description: `Electronic Payment: ${companyName}`,
      ...ChaseClassifier.classify(`Electronic Payment: ${companyName}`, amount, 'expense'),
      source: 'chase_pdf',
    };
  }
}

export default ChaseTransactionParser;
