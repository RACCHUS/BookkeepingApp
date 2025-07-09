
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
      [IRS_CATEGORIES.MEALS_ENTERTAINMENT]: ['restaurant', 'starbucks', 'coffee', 'lunch', 'dinner', 'catering'],
      [IRS_CATEGORIES.UTILITIES]: ['verizon', 'att', 'comcast', 'internet', 'phone service', 'electric'],
      'Bank Service Charges': ['overdraft', 'maintenance fee', 'atm fee', 'service charge'],
      'Rent or Lease': ['rent', 'lease', 'property management', 'landlord'],
      'Insurance': ['insurance', 'policy premium', 'liability insurance'],
      'Advertising': ['google ads', 'facebook ads', 'marketing', 'advertising']
    };
  }

  /**
   * Rule-based classification: assign category if a rule matches, else empty
   * @param {Object} transaction - Transaction object
   * @param {string} userId - User ID (unused, for compatibility)
   * @returns {Object} Classification result with category (or empty)
   */
  async classifyTransaction(transaction, userId) {
    const { description = '', payee = '' } = transaction;
    const searchText = `${description} ${payee}`.toLowerCase();

    for (const [category, keywords] of Object.entries(this.rules)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          return { category };
        }
      }
    }
    // No rule matched
    return { category: '' };
  }
}

export default new TransactionClassifierService();
