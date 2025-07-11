import { IRS_CATEGORIES } from '../../shared/constants/categories.js';
import firebaseService from './cleanFirebaseService.js';

class TransactionClassifierServiceNoLog {
  constructor() {
    this.fallbackRules = {
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
   * Rule-based classification: Check user rules first, then fallback rules
   * @param {Object} transaction - Transaction object
   * @param {string} userId - User ID to load user-specific rules
   * @returns {Object} Classification result with category (or empty)
   */
  async classifyTransaction(transaction, userId) {
    let description = transaction.description || '';
    let payee = transaction.payee || '';
    const searchText = `${description} ${payee}`;

    try {
      const userRules = await firebaseService.getClassificationRules(userId);
      for (const rule of userRules) {
        if (rule.keywords && Array.isArray(rule.keywords)) {
          for (const keyword of rule.keywords) {
            if (
              typeof keyword === 'string' &&
              searchText.toLowerCase().includes(keyword.toLowerCase())
            ) {
              return { category: rule.category };
            }
          }
        }
      }
      for (const [category, keywords] of Object.entries(this.fallbackRules)) {
        for (const keyword of keywords) {
          if (
            typeof keyword === 'string' &&
            searchText.toLowerCase().includes(keyword.toLowerCase())
          ) {
            return { category };
          }
        }
      }
    } catch (error) {
      for (const [category, keywords] of Object.entries(this.fallbackRules)) {
        for (const keyword of keywords) {
          if (
            typeof keyword === 'string' &&
            searchText.toLowerCase().includes(keyword.toLowerCase())
          ) {
            return { category };
          }
        }
      }
    }
    return { category: '' };
  }
}

export default new TransactionClassifierServiceNoLog();
