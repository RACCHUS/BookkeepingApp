/**
 * Extracts Chase statement sections (deposits, checks, cards, electronic withdrawals) from raw PDF text.
 * Keeps all regex and section boundary logic in one place.
 */

class ChaseSectionExtractor {
  static extractDepositsSection(text) {
    // Returns the raw deposits section text or null
    const match = text.match(/DEPOSITS AND ADDITIONS[\s\S]*?Total Deposits and Additions[\s\S]*?\$[\d,]+\.?\d{2}/i);
    return match ? match[0] : null;
  }

  static extractChecksSection(text) {
    // Returns the raw checks section text or null
    const match = text.match(/CHECKS PAID[\s\S]*?Total Checks Paid/i);
    return match ? match[0] : null;
  }

  static extractCardSection(text) {
    // Returns the raw card transactions section text or null
    const match = text.match(/ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT[\s\S]*?Total ATM\s*&\s*DEBIT CARD WITHDRAWALS/i);
    return match ? match[0] : null;
  }

  static extractElectronicSection(text) {
    // Returns the raw electronic withdrawals section text or null
    const match = text.match(/ELECTRONIC WITHDRAWALS[\s\S]*?Total Electronic Withdrawals/i);
    return match ? match[0] : null;
  }
}

export default ChaseSectionExtractor;
