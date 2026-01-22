/**
 * Unit Tests for TransactionClassifierService
 * Tests the simpler rule-based classifier that uses:
 * - User-defined rules from Firestore (new keyword structure)
 * - User-defined rules (old payeeContains/descriptionContains structure)
 * - Fallback hardcoded rules
 * 
 * Coverage: Rule matching logic, keyword structure compatibility, fallback handling
 * 
 * Note: This test suite mocks Firebase at the Firestore level using spies
 * rather than mocking cleanFirebaseService, allowing us to test the full integration.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories.js';
import transactionClassifierService from '../../../services/transactionClassifierService.js';
import firebaseService from '../../../services/cleanFirebaseService.js';

// Create spies for Firebase service methods
let getClassificationRulesSpy;

describe('TransactionClassifierService - Rule-Based Classification', () => {
  
  beforeEach(() => {
    // Spy on the getClassificationRules method
    getClassificationRulesSpy = jest.spyOn(firebaseService, 'getClassificationRules');
    // Clear the rule cache before each test
    transactionClassifierService.clearCache();
  });
  
  afterEach(() => {
    // Restore original implementations
    jest.restoreAllMocks();
  });

  describe('classifyTransaction() - User Rules with New Structure (keywords array)', () => {
    
    it('should match user rule with single keyword', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['staples']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Purchase at Staples Inc',
        payee: 'Staples',
        amount: -45.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
      expect(getClassificationRulesSpy).toHaveBeenCalledWith('user123');
    });

    it('should match user rule with multiple keywords (first match)', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          keywords: ['shell', 'chevron', 'exxon', 'mobil']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Gas purchase',
        payee: 'Chevron Station #4521',
        amount: -52.30
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.CAR_TRUCK_EXPENSES);
    });

    it('should be case-insensitive for keyword matching', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.ADVERTISING,
          keywords: ['Google Ads', 'Facebook Ads']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Monthly ad spend',
        payee: 'google ads',
        amount: -250.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.ADVERTISING);
    });

    it('should match keyword in description when not in payee', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.TRAVEL,
          keywords: ['hotel']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Hotel stay for conference',
        payee: 'Marriott International',
        amount: -189.50
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.TRAVEL);
    });

    it('should match keyword in payee when not in description', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.MEALS,
          keywords: ['starbucks']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Coffee purchase',
        payee: 'Starbucks #2451',
        amount: -6.50
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
    });

    it('should return first matching rule when multiple rules match', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['office']
        },
        {
          id: 'rule2',
          category: IRS_CATEGORIES.SUPPLIES,
          keywords: ['supplies', 'office']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Office supplies purchase',
        payee: 'Office Depot',
        amount: -78.90
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should handle empty keywords array', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: []
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Purchase at Staples',
        payee: 'Staples',
        amount: -45.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // Should fall through to fallback rules
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES); // Fallback rule matches 'staples'
    });

    it('should handle null/undefined keywords gracefully', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: [null, undefined, '', 'staples']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Purchase at Staples',
        payee: 'Staples',
        amount: -45.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });
  });

  describe('classifyTransaction() - Fallback Rules', () => {
    
    it('should use fallback rules when no user rules match', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.ADVERTISING,
          keywords: ['facebook']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Office supplies',
        payee: 'Staples Store',
        amount: -30.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should classify gas station as car/truck expense', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Fuel purchase',
        payee: 'Shell Gas Station',
        amount: -45.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.CAR_TRUCK_EXPENSES);
    });

    it('should classify software subscriptions', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Monthly subscription',
        payee: 'Microsoft 365',
        amount: -12.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS);
    });

    it('should classify travel expenses', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Conference trip',
        payee: 'Marriott Hotel',
        amount: -189.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.TRAVEL);
    });

    it('should classify restaurant meals', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Client lunch',
        payee: 'Restaurant Downtown',
        amount: -65.50
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
    });

    it('should classify utilities', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Monthly bill',
        payee: 'Verizon Wireless',
        amount: -85.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.UTILITIES);
    });

    it('should classify bank fees', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Monthly maintenance fee',
        payee: 'Chase Bank',
        amount: -12.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.BANK_FEES);
    });

    it('should classify rent/lease', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Office rent payment',
        payee: 'Property Management LLC',
        amount: -1500.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.RENT_LEASE_OTHER);
    });

    it('should classify insurance', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Monthly premium',
        payee: 'Business Insurance Co',
        amount: -250.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.INSURANCE_OTHER);
    });

    it('should classify advertising', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Monthly ad spend',
        payee: 'Google Ads',
        amount: -500.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.ADVERTISING);
    });
  });

  describe('classifyTransaction() - No Match Cases', () => {
    
    it('should return empty category when no rule matches', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Unknown transaction',
        payee: 'Random Store XYZ',
        amount: -25.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe('');
    });

    it('should handle missing description gracefully', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        payee: 'Shell',
        amount: -40.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.CAR_TRUCK_EXPENSES);
    });

    it('should handle missing payee gracefully', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Gas station purchase',
        amount: -40.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.CAR_TRUCK_EXPENSES);
    });

    it('should handle both missing description and payee', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        amount: -40.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe('');
    });

    it('should handle empty strings for description and payee', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['test']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: '',
        payee: '',
        amount: -40.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe('');
    });
  });

  describe('classifyTransaction() - Error Handling', () => {
    
    it('should use fallback rules when Firebase service fails', async () => {
      getClassificationRulesSpy.mockRejectedValue(new Error('Firebase error'));

      const transaction = {
        description: 'Office supplies',
        payee: 'Staples',
        amount: -30.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should return empty category when Firebase fails and no fallback matches', async () => {
      getClassificationRulesSpy.mockRejectedValue(new Error('Firebase error'));

      const transaction = {
        description: 'Unknown transaction',
        payee: 'Unknown Store',
        amount: -30.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe('');
    });

    it('should handle malformed user rules gracefully', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: 'not-an-array' // Invalid: should be array
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Purchase at Staples',
        payee: 'Staples',
        amount: -45.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // Should fall through to fallback
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should handle non-string keywords gracefully', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: [123, true, {}, ['nested']]
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Purchase at Staples',
        payee: 'Staples',
        amount: -45.99
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // Should fall through to fallback
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });
  });

  describe('classifyTransaction() - Edge Cases', () => {
    
    it('should handle partial keyword matches', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          keywords: ['chev']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Gas',
        payee: 'Chevron',
        amount: -45.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.CAR_TRUCK_EXPENSES);
    });

    it('should match keywords with special characters', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.MEALS,
          keywords: ["mcdonald's"]
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Fast food',
        payee: "McDonald's Restaurant",
        amount: -12.50
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
    });

    it('should handle unicode characters in keywords', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.MEALS,
          keywords: ['café']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Coffee',
        payee: 'Le Café Parisien',
        amount: -8.50
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
    });

    it('should handle very long descriptions', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['paper']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const longDescription = 'Purchase of ' + 'office supplies '.repeat(50) + 'including paper and pens';
      const transaction = {
        description: longDescription,
        payee: 'Office Depot',
        amount: -150.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should handle whitespace variations in keywords', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.ADVERTISING,
          keywords: ['  google ads  ']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Ad spend',
        payee: 'Google Ads',
        amount: -200.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.ADVERTISING);
    });
  });

  describe('classifyTransaction() - Income Transactions', () => {
    
    it('should classify deposits as gross receipts', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.GROSS_RECEIPTS,
          keywords: ['deposit', 'payment received']
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Customer payment received',
        payee: 'Invoice #1234',
        amount: 1500.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.GROSS_RECEIPTS);
    });

    it('should handle positive amounts (income)', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Deposit',
        payee: 'Client Payment',
        amount: 2500.00
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // "Deposit" keyword matches GROSS_RECEIPTS fallback rule
      expect(result.category).toBe(IRS_CATEGORIES.GROSS_RECEIPTS);
    });
  });

  describe('classifyTransaction() - Amount Direction Filtering', () => {
    
    it('should match positive-only rule for positive amounts (income)', async () => {
      const userRules = [
        {
          id: 'rule-income',
          category: IRS_CATEGORIES.GROSS_RECEIPTS,
          keywords: ['deerfield rental'],
          amount_direction: 'positive',
        },
        {
          id: 'rule-expense',
          category: IRS_CATEGORIES.RENT_LEASE_OTHER,
          keywords: ['deerfield rental'],
          amount_direction: 'negative',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Deerfield Rental Income',
        payee: 'Deerfield Rental',
        amount: 500.00, // Positive
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.GROSS_RECEIPTS);
    });

    it('should match negative-only rule for negative amounts (expense)', async () => {
      const userRules = [
        {
          id: 'rule-income',
          category: IRS_CATEGORIES.GROSS_RECEIPTS,
          keywords: ['deerfield rental'],
          amount_direction: 'positive',
        },
        {
          id: 'rule-expense',
          category: IRS_CATEGORIES.RENT_LEASE_OTHER,
          keywords: ['deerfield rental'],
          amount_direction: 'negative',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Deerfield Rental Equipment',
        payee: 'Deerfield Rental',
        amount: -200.00, // Negative
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.RENT_LEASE_OTHER);
    });

    it('should NOT match positive-only rule for negative amounts', async () => {
      const userRules = [
        {
          id: 'rule-income',
          category: IRS_CATEGORIES.GROSS_RECEIPTS,
          keywords: ['acme consulting'],
          amount_direction: 'positive',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Acme Consulting',
        payee: 'Acme Consulting',
        amount: -100.00, // Negative - should NOT match positive-only rule
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // Should return empty (no match) since direction doesn't match
      expect(result.category).toBe('');
    });

    it('should NOT match negative-only rule for positive amounts', async () => {
      const userRules = [
        {
          id: 'rule-expense',
          category: IRS_CATEGORIES.OTHER_EXPENSES,
          keywords: ['acme consulting'],
          amount_direction: 'negative',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Acme Consulting',
        payee: 'Acme Consulting',
        amount: 100.00, // Positive - should NOT match negative-only rule
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // Should return empty (no match) since direction doesn't match
      expect(result.category).toBe('');
    });

    it('should match "any" direction rule regardless of amount sign', async () => {
      const userRules = [
        {
          id: 'rule-any',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['office depot'],
          amount_direction: 'any',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      // Test positive amount
      const positiveTransaction = {
        description: 'Office Depot Refund',
        payee: 'Office Depot',
        amount: 50.00,
      };
      const positiveResult = await transactionClassifierService.classifyTransaction(positiveTransaction, 'user123');
      expect(positiveResult.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);

      // Test negative amount
      const negativeTransaction = {
        description: 'Office Depot Purchase',
        payee: 'Office Depot',
        amount: -75.00,
      };
      const negativeResult = await transactionClassifierService.classifyTransaction(negativeTransaction, 'user123');
      expect(negativeResult.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should treat missing amount_direction as "any"', async () => {
      const userRules = [
        {
          id: 'rule-no-direction',
          category: IRS_CATEGORIES.SUPPLIES,
          keywords: ['xyz vendor unique'],
          // No amount_direction field
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      // Test positive amount
      const positiveTransaction = {
        description: 'XYZ Vendor Unique Refund',
        payee: 'XYZ Vendor Unique',
        amount: 25.00,
      };
      const positiveResult = await transactionClassifierService.classifyTransaction(positiveTransaction, 'user123');
      expect(positiveResult.category).toBe(IRS_CATEGORIES.SUPPLIES);

      // Test negative amount
      const negativeTransaction = {
        description: 'XYZ Vendor Unique Purchase',
        payee: 'XYZ Vendor Unique',
        amount: -45.00,
      };
      const negativeResult = await transactionClassifierService.classifyTransaction(negativeTransaction, 'user123');
      expect(negativeResult.category).toBe(IRS_CATEGORIES.SUPPLIES);
    });

    it('should treat null amount_direction as "any"', async () => {
      const userRules = [
        {
          id: 'rule-null-direction',
          category: IRS_CATEGORIES.TRAVEL,
          keywords: ['uber'],
          amount_direction: null,
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'Uber Trip',
        payee: 'Uber',
        amount: -25.00,
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.TRAVEL);
    });

    it('should treat zero amount as positive direction', async () => {
      const userRules = [
        {
          id: 'rule-income',
          category: IRS_CATEGORIES.GROSS_RECEIPTS,
          keywords: ['xyzco megacorp'],
          amount_direction: 'positive',
        },
        {
          id: 'rule-expense',
          category: IRS_CATEGORIES.OTHER_EXPENSES,
          keywords: ['xyzco megacorp'],
          amount_direction: 'negative',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'XYZCO MEGACORP Zero',
        payee: 'XYZCO MEGACORP',
        amount: 0, // Zero - should be treated as positive (>= 0)
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.GROSS_RECEIPTS);
    });

    it('should handle missing amount gracefully (treat as 0/positive)', async () => {
      const userRules = [
        {
          id: 'rule-income',
          category: IRS_CATEGORIES.GROSS_RECEIPTS,
          keywords: ['xyzco megacorp'],
          amount_direction: 'positive',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'XYZCO MEGACORP',
        payee: 'XYZCO MEGACORP',
        // No amount field
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      // Missing amount defaults to 0, which is positive
      expect(result.category).toBe(IRS_CATEGORIES.GROSS_RECEIPTS);
    });

    it('should handle string amount values', async () => {
      const userRules = [
        {
          id: 'rule-expense',
          category: IRS_CATEGORIES.OTHER_EXPENSES,
          keywords: ['xyzco megacorp'],
          amount_direction: 'negative',
        },
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);

      const transaction = {
        description: 'XYZCO MEGACORP',
        payee: 'XYZCO MEGACORP',
        amount: '-50.00', // String instead of number
      };

      const result = await transactionClassifierService.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OTHER_EXPENSES);
    });
  });
});
