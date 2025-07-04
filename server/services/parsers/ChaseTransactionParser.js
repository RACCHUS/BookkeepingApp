/**
 * Parses lines/sections into Chase transaction objects.
 * Handles all line-level regex and transaction object creation.
 */
import ChaseClassifier from './ChaseClassifier.js';
import ChaseDateUtils from './ChaseDateUtils.js';

class ChaseTransactionParser {
  static parseDepositLine(line, year) {
    // Handle Chase PDF format where only first amount has $ sign:
    // 01/08 Remote Online Deposit 1 $3,640.00   (with $)
    // 01/19 Remote Online Deposit 1 2,500.00    (without $)
    
    // Clean the line first
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.includes('DATE') || cleanLine.includes('Total')) return null;
    
    // Look for date pattern at start
    const dateMatch = cleanLine.match(/^(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) return null;
    
    const dateStr = dateMatch[1];
    
    // Try multiple amount patterns to be more flexible
    let amountMatch;
    
    // Pattern 1: With $ sign - may or may not have space before $
    amountMatch = cleanLine.match(/\s*\$(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/);
    
    // Pattern 2: Without $ sign but with commas - may or may not have space before amount
    if (!amountMatch) {
      amountMatch = cleanLine.match(/\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/);
    }
    
    // Pattern 3: Amount without commas (e.g., 450.00, 1450.00) - may or may not have space
    if (!amountMatch) {
      amountMatch = cleanLine.match(/\s*(\d{3,5}\.\d{2})\s*$/);
    }
    
    if (!amountMatch) {
      return null;
    }

    const amountStr = amountMatch[1];
    
    // Additional validation: ensure the captured amount looks reasonable
    if (amountStr.startsWith(',') || amountStr.endsWith(',')) {
      return null;
    }
    
    // Fix common PDF extraction issue: amounts like "12,910.00" that should be "2,910.00"
    // This happens when "Remote Online Deposit 1 2,910.00" becomes "Remote Online Deposit 12,910.00"
    let correctedAmountStr = amountStr;
    if (amountStr.startsWith('1') && (amountStr.includes(',') || amountStr.length >= 6)) {
      // Check if this looks like a concatenated "1" + amount
      const withoutFirst = amountStr.substring(1);
      if (withoutFirst.match(/^\d{1,3}(?:,\d{3})*\.?\d{0,2}$/) || withoutFirst.match(/^\d{3,4}\.\d{2}$/)) {
        // This looks like "1" + valid amount, so remove the "1"
        correctedAmountStr = withoutFirst;
      }
    }
    
    // Clean up amount string and convert to number
    let cleanAmountStr = correctedAmountStr.replace(/,/g, '');
    // Add .00 if no decimal point (e.g., "1790" becomes "1790.00")
    if (!cleanAmountStr.includes('.')) {
      cleanAmountStr += '.00';
    }
    
    const amount = parseFloat(cleanAmountStr);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0 || amount > 100000) {
      return null;
    }
    
    // Additional sanity check: ensure this looks like a valid deposit amount
    if (amount < 1 || amount > 50000) {
      return null;
    }
    
    // Extract description between date and amount
    const dateEnd = dateMatch.index + dateMatch[0].length;
    const amountStart = amountMatch.index;
    let descriptionPart = cleanLine.substring(dateEnd, amountStart).trim();
    
    // Clean up description
    const cleanDescription = descriptionPart.replace(/\s+/g, ' ').trim();
    
    if (!cleanDescription) {
      return null;
    }
    
    const date = ChaseDateUtils.toISODate(dateStr, year);
    
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
