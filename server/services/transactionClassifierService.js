
import { IRS_CATEGORIES } from '../../shared/constants/categories.js';

class TransactionClassifierService {
  constructor() {
    // Example: user-defined rules could be loaded from Firestore or passed in
    // For now, use a static mapping for demonstration
    this.rules = {
      [IRS_CATEGORIES.GROSS_RECEIPTS]: ['deposit', 'payment received', 'invoice payment', 'customer payment'],
      [IRS_CATEGORIES.OFFICE_EXPENSES]: ['staples', 'office depot', 'office supplies'],
      [IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS]: ['microsoft', 'adobe', 'quickbooks', 'software', 'subscription'],
      [IRS_CATEGORIES.CAR_TRUCK_EXPENSES]: ['shell', 'exxon', 'mobil', 'chevron', 'bp', 'gas station', 'fuel'],
      [IRS_CATEGORIES.TRAVEL]: ['hotel', 'marriott', 'hilton', 'american airlines', 'delta', 'uber', 'lyft', 'rental car'],
      [IRS_CATEGORIES.MEALS]: ['restaurant', 'starbucks', 'coffee', 'lunch', 'dinner', 'catering'],
      [IRS_CATEGORIES.UTILITIES]: ['verizon', 'att', 'comcast', 'internet', 'phone service', 'electric'],
      [IRS_CATEGORIES.BANK_FEES]: ['overdraft', 'maintenance fee', 'atm fee', 'service charge'],
      [IRS_CATEGORIES.RENT_LEASE_OTHER]: ['rent', 'lease', 'property management', 'landlord'],
      [IRS_CATEGORIES.INSURANCE_OTHER]: ['insurance', 'policy premium', 'liability insurance'],
      [IRS_CATEGORIES.ADVERTISING]: ['google ads', 'facebook ads', 'marketing', 'advertising']
    };
  }

  /**
   * Rule-based classification: assign category if a rule matches, else empty
   * @param {Object} transaction - Transaction object
   * @param {string} userId - User ID (unused, for compatibility)
   * @returns {Object} Classification result with category (or empty)
   */
  async classifyTransaction(transaction, userId) {
    // Always use empty string for missing description/payee
    let description = transaction.description;
    let payee = transaction.payee;
    if (!description) description = '';
    if (!payee) payee = '';
    const searchText = `${description} ${payee}`;
    if (!this.rules || Object.keys(this.rules).length === 0) {
      console.warn('[Classifier] No rules loaded!');
    }
    // Debug: log only the first 100 chars of searchText and rule count
    console.log(`[Classifier] classifyTransaction: searchText="${searchText.slice(0,100)}" | rules=${Object.keys(this.rules).length}`);

    for (const [category, keywords] of Object.entries(this.rules)) {
      for (const keyword of keywords) {
        if (
          typeof keyword === 'string' &&
          searchText.toLowerCase().includes(keyword.toLowerCase())
        ) {
          console.log(`[Classifier] Matched keyword "${keyword}" for category "${category}"`);
          return { category };
        }
      }
    }
    console.log('[Classifier] No rule matched for transaction:', { description, payee });
    // No rule matched
    return { category: '' };
  }
}

export default new TransactionClassifierService();
