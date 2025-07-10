
import { IRS_CATEGORIES } from '../../shared/constants/categories.js';
import firebaseService from './cleanFirebaseService.js';

class TransactionClassifierService {
  constructor() {
    // Hardcoded fallback rules (kept for compatibility)
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
    // Always use empty string for missing description/payee
    let description = transaction.description;
    let payee = transaction.payee;
    if (!description) description = '';
    if (!payee) payee = '';
    const searchText = `${description} ${payee}`;

    try {
      // First, try user-defined rules from Firestore
      const userRules = await firebaseService.getClassificationRules(userId);
      console.log(`[Classifier] classifyTransaction: searchText="${searchText.slice(0,100)}" | rules=${userRules.length}`);

      for (const rule of userRules) {
        if (rule.keywords && Array.isArray(rule.keywords)) {
          for (const keyword of rule.keywords) {
            if (
              typeof keyword === 'string' &&
              searchText.toLowerCase().includes(keyword.toLowerCase())
            ) {
              console.log(`[Classifier] Matched keyword "${keyword}" for category "${rule.category}"`);
              return { category: rule.category };
            }
          }
        }
      }

      // If no user rules matched, try fallback rules
      for (const [category, keywords] of Object.entries(this.fallbackRules)) {
        for (const keyword of keywords) {
          if (
            typeof keyword === 'string' &&
            searchText.toLowerCase().includes(keyword.toLowerCase())
          ) {
            console.log(`[Classifier] Matched fallback keyword "${keyword}" for category "${category}"`);
            return { category };
          }
        }
      }

    } catch (error) {
      console.error('[Classifier] Error loading user rules, using fallback only:', error);
      
      // Try fallback rules only
      for (const [category, keywords] of Object.entries(this.fallbackRules)) {
        for (const keyword of keywords) {
          if (
            typeof keyword === 'string' &&
            searchText.toLowerCase().includes(keyword.toLowerCase())
          ) {
            console.log(`[Classifier] Matched fallback keyword "${keyword}" for category "${category}"`);
            return { category };
          }
        }
      }
    }

    console.log('[Classifier] No rule matched for transaction:', { description, payee });
    // No rule matched
    return { category: '' };
  }
}

export default new TransactionClassifierService();
