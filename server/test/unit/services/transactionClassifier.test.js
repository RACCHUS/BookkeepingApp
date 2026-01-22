/**
 * Unit Tests for TransactionClassifier
 * Tests the advanced classifier with:
 * - User rules (new and old structures)
 * - Built-in classification (CLASSIFICATION_KEYWORDS)
 * - Historical pattern learning
 * - Confidence scoring and combination
 * - Training from reviewed transactions
 * 
 * Coverage: Advanced classification logic, machine learning simulation, confidence scoring
 * 
 * Note: This test suite uses spies on Firebase service methods to control test data
 * while allowing the full service integration to run.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories.js';
import transactionClassifier from '../../../services/transactionClassifier.js';
import firebaseService from '../../../services/cleanFirebaseService.js';

// Create spies for Firebase service methods
let getClassificationRulesSpy;
let getTransactionsSpy;
let createClassificationRuleSpy;
let updateClassificationRuleSpy;

describe('TransactionClassifier - Advanced Classification', () => {
  
  beforeEach(() => {
    // Spy on Firebase service methods
    getClassificationRulesSpy = jest.spyOn(firebaseService, 'getClassificationRules');
    getTransactionsSpy = jest.spyOn(firebaseService, 'getTransactions');
    createClassificationRuleSpy = jest.spyOn(firebaseService, 'createClassificationRule');
    updateClassificationRuleSpy = jest.spyOn(firebaseService, 'updateClassificationRule');
  });
  
  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('classifyTransaction() - User Rules Priority', () => {
    
    it('should use user rules with high confidence (>0.8)', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['staples'],
          confidence: 0.9
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Office supplies',
        payee: 'Staples Store #123',
        amount: -45.99
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.method).toBe('user_rule');
      expect(result.ruleId).toBe('rule1');
    });

    it('should include matched keywords in result', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          keywords: ['shell', 'gas'],
          confidence: 0.95
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Gas purchase',
        payee: 'Shell Station',
        amount: -52.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.matchedKeywords).toContain('shell');
      expect(result.matchedKeywords).toContain('gas');
    });

    it('should support old structure (payeeContains)', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.MEALS,
          payeeContains: ['starbucks', 'coffee'],
          descriptionContains: [],
          confidence: 0.85
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Morning coffee',
        payee: 'Starbucks #456',
        amount: -6.50
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
      expect(result.method).toBe('user_rule');
    });

    it('should support old structure (descriptionContains)', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.TRAVEL,
          payeeContains: [],
          descriptionContains: ['hotel', 'conference'],
          confidence: 0.9
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Hotel stay for business conference',
        payee: 'Marriott Inc',
        amount: -189.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.TRAVEL);
      expect(result.method).toBe('user_rule');
    });

    it('should combine old structure arrays (payeeContains + descriptionContains)', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.ADVERTISING,
          payeeContains: ['google'],
          descriptionContains: ['ads', 'marketing'],
          confidence: 0.9
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Monthly ads campaign',
        payee: 'Meta Business',
        amount: -250.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.ADVERTISING);
      expect(result.matchedKeywords).toContain('ads');
    });
  });

  describe('applyBuiltInClassification() - Keyword Matching', () => {
    
    it('should match payee keywords with high confidence (0.7)', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Payment',
        payee: 'Staples Office Supplies',
        amount: -78.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should match description keywords with medium confidence (0.5)', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Purchase of office supplies for team',
        payee: 'Random Store',
        amount: -45.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
      expect(result.method).toContain('keyword');
    });

    it('should prefer payee matches over description matches', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Travel expenses',
        payee: 'Staples',
        amount: -120.00
      };

      // Should match "staples" in payee (office) over "travel" in description
      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });

    it('should use amount-based heuristics for low confidence', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Purchase',
        payee: 'Starbucks',
        amount: -5.50
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      // Small amount + coffee/starbucks = meals (IRS_CATEGORIES.MEALS = 'Meals')
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
    });

    it('should classify large equipment purchases', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'New equipment for office',
        payee: 'Tech Store',
        amount: -2500.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OTHER_EXPENSES);
      expect(result.method).toBe('amount_heuristic');
    });
  });

  describe('getHistoricalClassification() - Pattern Learning', () => {
    
    it('should use historical data for similar payees', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      
      const historicalTransactions = [
        {
          id: 'tx1',
          payee: 'ABC Supplier Inc',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -100.00
        },
        {
          id: 'tx2',
          payee: 'ABC Supplier',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -150.00
        },
        {
          id: 'tx3',
          payee: 'ABC Supplier LLC',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -200.00
        }
      ];
      getTransactionsSpy.mockResolvedValue(historicalTransactions);

      const transaction = {
        description: 'Monthly order',
        payee: 'ABC Supplier',
        amount: -125.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.SUPPLIES);
      expect(result.method).toContain('historical');
    });

    it('should ignore non-reviewed transactions in historical data', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      
      const historicalTransactions = [
        {
          id: 'tx1',
          payee: 'XYZ Corp',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          isManuallyReviewed: false, // Not reviewed
          amount: -100.00
        },
        {
          id: 'tx2',
          payee: 'XYZ Corp',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -150.00
        }
      ];
      getTransactionsSpy.mockResolvedValue(historicalTransactions);

      const transaction = {
        description: 'Purchase',
        payee: 'XYZ Corp',
        amount: -125.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      // Should use only the reviewed transaction
      expect(result.category).toBe(IRS_CATEGORIES.SUPPLIES);
    });

    it('should calculate confidence based on consistency', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      
      const historicalTransactions = [
        {
          id: 'tx1',
          payee: 'XYZ Unique Supplier',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          isManuallyReviewed: true,
          amount: -100.00
        },
        {
          id: 'tx2',
          payee: 'XYZ Unique Supplier',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          isManuallyReviewed: true,
          amount: -100.00
        },
        {
          id: 'tx3',
          payee: 'XYZ Unique Supplier',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -100.00
        }
      ];
      getTransactionsSpy.mockResolvedValue(historicalTransactions);

      const transaction = {
        description: 'Monthly order',
        payee: 'XYZ Unique Supplier',
        amount: -100.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      // 2/3 transactions = OFFICE_EXPENSES, confidence ~0.67 (capped at 0.8)
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
      expect(result.confidence).toBeLessThanOrEqual(0.8);
    });

    it('should return UNCATEGORIZED when no historical data exists', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Unknown transaction',
        payee: 'Never Seen Before Inc',
        amount: -50.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.UNCATEGORIZED);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('combineClassifications() - Confidence Scoring', () => {
    
    it('should select highest confidence classification', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['office'],
          confidence: 0.6 // Lower confidence
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      
      const historicalTransactions = [
        {
          id: 'tx1',
          payee: 'Office Store',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -100.00
        },
        {
          id: 'tx2',
          payee: 'Office Store',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -100.00
        },
        {
          id: 'tx3',
          payee: 'Office Store',
          category: IRS_CATEGORIES.SUPPLIES,
          isManuallyReviewed: true,
          amount: -100.00
        }
      ];
      getTransactionsSpy.mockResolvedValue(historicalTransactions);

      const transaction = {
        description: 'Office supplies',
        payee: 'Office Store',
        amount: -100.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      // Historical (0.8) should beat user rule (0.6) and built-in (0.5-0.7)
      expect(result.category).toBe(IRS_CATEGORIES.SUPPLIES);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should provide alternative suggestions', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Business purchase',
        payee: 'Office Store',
        amount: -100.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should generate fallback suggestions when no classification found', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Unknown',
        payee: 'Unknown Store',
        amount: -50.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.UNCATEGORIZED);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            confidence: expect.any(Number),
            method: 'common_suggestion'
          })
        ])
      );
    });
  });

  describe('trainFromTransactions() - Learning from History', () => {
    
    it('should create rules for consistent payee-category pairs', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      createClassificationRuleSpy.mockResolvedValue({ id: 'newRule1' });

      const transactions = [
        {
          id: 'tx1',
          payee: 'Shell Gas',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -50.00
        },
        {
          id: 'tx2',
          payee: 'Shell Gas',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -60.00
        }
      ];

      const result = await transactionClassifier.trainFromTransactions(transactions, 'user123');
      
      expect(result.rulesCreated).toBe(1);
      expect(result.transactionsProcessed).toBe(2);
      expect(createClassificationRuleSpy).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          payeeContains: ['shell gas'],
          targetCategory: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          confidence: 0.7,
          isSystemGenerated: true
        })
      );
    });

    it('should require at least 2 occurrences to create rule', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transactions = [
        {
          id: 'tx1',
          payee: 'One Time Vendor',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -50.00
        }
      ];

      const result = await transactionClassifier.trainFromTransactions(transactions, 'user123');
      
      expect(result.rulesCreated).toBe(0);
      expect(createClassificationRuleSpy).not.toHaveBeenCalled();
    });

    it('should update existing rules instead of creating duplicates', async () => {
      const existingRules = [
        {
          id: 'existing1',
          payeeContains: ['shell gas'],
          targetCategory: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          trainingCount: 5,
          successRate: 0.9,
          confidence: 0.8
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(existingRules);
      updateClassificationRuleSpy.mockResolvedValue({ success: true });

      const transactions = [
        {
          id: 'tx1',
          payee: 'Shell Gas',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -50.00
        },
        {
          id: 'tx2',
          payee: 'Shell Gas',
          category: IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -60.00
        }
      ];

      const result = await transactionClassifier.trainFromTransactions(transactions, 'user123');
      
      expect(result.rulesUpdated).toBe(1);
      expect(result.rulesCreated).toBe(0);
      expect(updateClassificationRuleSpy).toHaveBeenCalledWith(
        'existing1',
        'user123',
        expect.objectContaining({
          trainingCount: expect.any(Number),
          confidence: expect.any(Number)
        })
      );
    });

    it('should ignore non-reviewed transactions', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);

      const transactions = [
        {
          id: 'tx1',
          payee: 'Test Vendor',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: false, // Not reviewed
          amount: -50.00
        },
        {
          id: 'tx2',
          payee: 'Test Vendor',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: false,
          amount: -60.00
        }
      ];

      const result = await transactionClassifier.trainFromTransactions(transactions, 'user123');
      
      expect(result.rulesCreated).toBe(0);
    });

    it('should handle multiple categories for same payee', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      createClassificationRuleSpy.mockResolvedValue({ id: 'newRule1' });

      const transactions = [
        {
          id: 'tx1',
          payee: 'Amazon',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -50.00
        },
        {
          id: 'tx2',
          payee: 'Amazon',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -60.00
        },
        {
          id: 'tx3',
          payee: 'Amazon',
          category: IRS_CATEGORIES.SUPPLIES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -100.00
        },
        {
          id: 'tx4',
          payee: 'Amazon',
          category: IRS_CATEGORIES.SUPPLIES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -120.00
        }
      ];

      const result = await transactionClassifier.trainFromTransactions(transactions, 'user123');
      
      // Should create 2 rules: one for OFFICE_EXPENSES, one for SUPPLIES
      expect(result.rulesCreated).toBe(2);
    });
  });

  describe('Error Handling', () => {
    
    it('should handle Firebase errors gracefully', async () => {
      getClassificationRulesSpy.mockRejectedValue(new Error('Firebase error'));
      getTransactionsSpy.mockRejectedValue(new Error('Firebase error'));

      const transaction = {
        description: 'Test',
        payee: 'Test Payee',
        amount: -50.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.UNCATEGORIZED);
      expect(result.method).toBe('error_fallback');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle malformed transaction gracefully', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        // Missing payee and description
        amount: -50.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result).toBeDefined();
      expect(result.category).toBe(IRS_CATEGORIES.UNCATEGORIZED);
    });

    it('should handle training errors gracefully', async () => {
      getClassificationRulesSpy.mockRejectedValue(new Error('Database error'));

      const transactions = [
        {
          id: 'tx1',
          payee: 'Test Vendor',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -50.00
        },
        {
          id: 'tx2',
          payee: 'Test Vendor',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          type: 'expense',
          isManuallyReviewed: true,
          amount: -50.00
        }
      ];

      // trainFromTransactions catches errors and re-throws them
      await expect(
        transactionClassifier.trainFromTransactions(transactions, 'user123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('Edge Cases', () => {
    
    it('should handle empty payee and description', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: '',
        payee: '',
        amount: -50.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.UNCATEGORIZED);
    });

    it('should handle very large transaction amounts', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Large equipment purchase',
        payee: 'Equipment Supplier',
        amount: -99999.99
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
    });

    it('should handle special characters in payee/description', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.MEALS,
          keywords: ['café'],
          confidence: 0.9
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Business lunch @ café',
        payee: "Joe's Café & Bakery",
        amount: -25.50
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.MEALS);
    });

    it('should handle zero-amount transactions', async () => {
      getClassificationRulesSpy.mockResolvedValue([]);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'Adjustment',
        payee: 'Bank',
        amount: 0.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result).toBeDefined();
    });

    it('should handle mixed case in payee/description', async () => {
      const userRules = [
        {
          id: 'rule1',
          category: IRS_CATEGORIES.OFFICE_EXPENSES,
          keywords: ['StApLeS'],
          confidence: 0.9
        }
      ];
      getClassificationRulesSpy.mockResolvedValue(userRules);
      getTransactionsSpy.mockResolvedValue([]);

      const transaction = {
        description: 'OFFICE SUPPLIES',
        payee: 'staples',
        amount: -50.00
      };

      const result = await transactionClassifier.classifyTransaction(transaction, 'user123');
      
      expect(result.category).toBe(IRS_CATEGORIES.OFFICE_EXPENSES);
    });
  });
});



