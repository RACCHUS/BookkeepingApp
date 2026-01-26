/**
 * Unit tests for Split Transaction Service
 * Tests the split, unsplit, and bulk split functionality
 * 
 * Note: The service expects positive amounts for split parts and handles
 * sign conversion internally based on the original transaction type.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import splitTransactionService from '../../../services/splitTransactionService.js';

describe('splitTransactionService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateSplitParts', () => {
    const mockExpenseTransaction = {
      id: 'txn-123',
      amount: -100.00,
      description: 'Test Transaction',
      type: 'expense'
    };

    const mockIncomeTransaction = {
      id: 'txn-456',
      amount: 500.00,
      description: 'Client Payment',
      type: 'income'
    };

    it('should validate split parts with correct total for expenses', () => {
      // Service expects positive amounts - it handles sign conversion
      const splitParts = [
        { amount: 60.00, category: 'CAR_TRUCK_EXPENSES', description: 'Gas' },
        { amount: 40.00, category: 'MEALS', description: 'Snacks' }
      ];

      const result = splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      expect(result.originalAmount).toBe(100);
      expect(result.totalSplitAmount).toBe(100);
      expect(result.remainder).toBe(0);
    });

    it('should validate split parts with correct total for income', () => {
      const splitParts = [
        { amount: 300.00, category: 'GROSS_RECEIPTS', description: 'Service A' },
        { amount: 200.00, category: 'GROSS_RECEIPTS', description: 'Service B' }
      ];

      const result = splitTransactionService.validateSplitParts(mockIncomeTransaction, splitParts);
      expect(result.originalAmount).toBe(500);
      expect(result.totalSplitAmount).toBe(500);
      expect(result.remainder).toBe(0);
    });

    it('should calculate remainder when split does not use full amount', () => {
      const splitParts = [
        { amount: 50.00, category: 'CAR_TRUCK_EXPENSES', description: 'Gas' },
        { amount: 30.00, category: 'MEALS', description: 'Snacks' }
      ];

      const result = splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      expect(result.originalAmount).toBe(100);
      expect(result.totalSplitAmount).toBe(80);
      expect(result.remainder).toBe(20);
    });

    it('should throw error when split exceeds original amount', () => {
      const splitParts = [
        { amount: 60.00, category: 'CAR_TRUCK_EXPENSES', description: 'Gas' },
        { amount: 50.00, category: 'MEALS', description: 'Snacks' } // Total 110, exceeds 100
      ];

      expect(() => {
        splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      }).toThrow(/exceeds.*original amount/i);
    });

    it('should throw error for empty split parts array', () => {
      expect(() => {
        splitTransactionService.validateSplitParts(mockExpenseTransaction, []);
      }).toThrow('At least one split part is required');
    });

    it('should throw error for null split parts', () => {
      expect(() => {
        splitTransactionService.validateSplitParts(mockExpenseTransaction, null);
      }).toThrow('At least one split part is required');
    });

    it('should throw error for split parts with zero amount', () => {
      const splitParts = [
        { amount: 0, category: 'CAR_TRUCK_EXPENSES', description: 'Gas' },
        { amount: 100.00, category: 'MEALS', description: 'Snacks' }
      ];

      expect(() => {
        splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      }).toThrow(/Amount must be a positive number/);
    });

    it('should throw error for split parts with negative amount', () => {
      const splitParts = [
        { amount: -60.00, category: 'CAR_TRUCK_EXPENSES', description: 'Gas' },
        { amount: 40.00, category: 'MEALS', description: 'Snacks' }
      ];

      expect(() => {
        splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      }).toThrow(/Amount must be a positive number/);
    });

    it('should throw error for split parts without category', () => {
      const splitParts = [
        { amount: 60.00, description: 'Gas' },
        { amount: 40.00, category: 'MEALS', description: 'Snacks' }
      ];

      expect(() => {
        splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      }).toThrow(/Category is required/);
    });

    it('should throw error when original transaction is missing', () => {
      const splitParts = [
        { amount: 60.00, category: 'CAR_TRUCK_EXPENSES', description: 'Gas' }
      ];

      expect(() => {
        splitTransactionService.validateSplitParts(null, splitParts);
      }).toThrow('Original transaction is required');
    });

    it('should allow floating point precision in total calculation', () => {
      const splitParts = [
        { amount: 33.33, category: 'CAR_TRUCK_EXPENSES', description: 'Part 1' },
        { amount: 33.33, category: 'MEALS', description: 'Part 2' },
        { amount: 33.34, category: 'SUPPLIES', description: 'Part 3' }
      ];

      const result = splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      expect(result.originalAmount).toBe(100);
      // Total should be exactly 100
      expect(result.totalSplitAmount).toBeCloseTo(100, 2);
    });

    it('should accept many split parts when amounts are valid', () => {
      const splitParts = Array.from({ length: 10 }, (_, i) => ({
        amount: 10.00,
        category: 'SUPPLIES',
        description: `Part ${i + 1}`
      }));

      const result = splitTransactionService.validateSplitParts(mockExpenseTransaction, splitParts);
      expect(result.totalSplitAmount).toBe(100);
      expect(result.remainder).toBe(0);
    });
  });

  describe('Service method existence', () => {
    it('should have splitTransaction method', () => {
      expect(typeof splitTransactionService.splitTransaction).toBe('function');
    });

    it('should have unsplitTransaction method', () => {
      expect(typeof splitTransactionService.unsplitTransaction).toBe('function');
    });

    it('should have getSplitParts method', () => {
      expect(typeof splitTransactionService.getSplitParts).toBe('function');
    });

    it('should have bulkSplitTransactions method', () => {
      expect(typeof splitTransactionService.bulkSplitTransactions).toBe('function');
    });

    it('should have validateSplitParts method', () => {
      expect(typeof splitTransactionService.validateSplitParts).toBe('function');
    });
  });
});
