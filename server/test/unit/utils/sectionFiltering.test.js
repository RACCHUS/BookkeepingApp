/**
 * @fileoverview Section Filtering Utils Comprehensive Tests
 * @description Complete test coverage for transaction section filtering utilities
 * @version 1.0.0
 * 
 * Target: 100% coverage for sectionFiltering.js
 */

import { jest } from '@jest/globals';
import {
  filterTransactionsBySection,
  getTransactionSectionSummary,
  getAvailableSectionCodes,
  isValidSectionCode,
  getSectionStatistics
} from '../../../utils/sectionFiltering.js';

describe('Section Filtering Utils', () => {
  // Sample transaction data for tests
  const sampleTransactions = [
    { sectionCode: 'deposits', amount: 1000, description: 'Salary' },
    { sectionCode: 'deposits', amount: 500, description: 'Bonus' },
    { sectionCode: 'checks', amount: -200, description: 'Rent Check' },
    { sectionCode: 'card', amount: -50, description: 'ATM Withdrawal' },
    { sectionCode: 'electronic', amount: -100, description: 'ACH Payment' },
    { sectionCode: 'electronic', amount: -75, description: 'Online Bill Pay' }
  ];

  describe('filterTransactionsBySection', () => {
    it('should filter transactions by section code', () => {
      const result = filterTransactionsBySection(sampleTransactions, 'deposits');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.sectionCode === 'deposits')).toBe(true);
    });

    it('should filter transactions for different section codes', () => {
      const checksResult = filterTransactionsBySection(sampleTransactions, 'checks');
      expect(checksResult).toHaveLength(1);
      expect(checksResult[0].sectionCode).toBe('checks');

      const electronicResult = filterTransactionsBySection(sampleTransactions, 'electronic');
      expect(electronicResult).toHaveLength(2);
    });

    it('should return all transactions when sectionCode is empty', () => {
      const result = filterTransactionsBySection(sampleTransactions, '');
      expect(result).toHaveLength(sampleTransactions.length);
      expect(result).toEqual(sampleTransactions);
    });

    it('should return all transactions when sectionCode is null', () => {
      const result = filterTransactionsBySection(sampleTransactions, null);
      expect(result).toEqual(sampleTransactions);
    });

    it('should return empty array for non-existent section code', () => {
      const result = filterTransactionsBySection(sampleTransactions, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should throw error for non-array input', () => {
      expect(() => filterTransactionsBySection(null, 'deposits')).toThrow('Transactions must be an array');
      expect(() => filterTransactionsBySection('string', 'deposits')).toThrow('Transactions must be an array');
      expect(() => filterTransactionsBySection({}, 'deposits')).toThrow('Transactions must be an array');
    });

    it('should handle empty array', () => {
      const result = filterTransactionsBySection([], 'deposits');
      expect(result).toHaveLength(0);
    });
  });

  describe('getTransactionSectionSummary', () => {
    it('should generate correct summary for transactions', () => {
      const result = getTransactionSectionSummary(sampleTransactions);
      
      expect(result.sections).toContain('deposits');
      expect(result.sections).toContain('checks');
      expect(result.sections).toContain('card');
      expect(result.sections).toContain('electronic');
      expect(result.totalTransactions).toBe(6);
    });

    it('should correctly count transactions per section', () => {
      const result = getTransactionSectionSummary(sampleTransactions);
      
      expect(result.counts.deposits).toBe(2);
      expect(result.counts.checks).toBe(1);
      expect(result.counts.card).toBe(1);
      expect(result.counts.electronic).toBe(2);
    });

    it('should correctly sum amounts per section (absolute values)', () => {
      const result = getTransactionSectionSummary(sampleTransactions);
      
      expect(result.amounts.deposits).toBe(1500); // 1000 + 500
      expect(result.amounts.checks).toBe(200); // |-200|
      expect(result.amounts.card).toBe(50); // |-50|
      expect(result.amounts.electronic).toBe(175); // |-100| + |-75|
    });

    it('should handle transactions without sectionCode', () => {
      const transactions = [
        { amount: 100, description: 'No section' },
        { sectionCode: 'deposits', amount: 200 }
      ];
      const result = getTransactionSectionSummary(transactions);
      
      expect(result.counts.uncategorized).toBe(1);
      expect(result.counts.deposits).toBe(1);
      expect(result.amounts.uncategorized).toBe(100);
    });

    it('should handle transactions with zero amounts', () => {
      const transactions = [
        { sectionCode: 'deposits', amount: 0 },
        { sectionCode: 'deposits', amount: 100 }
      ];
      const result = getTransactionSectionSummary(transactions);
      
      expect(result.amounts.deposits).toBe(100);
    });

    it('should throw error for non-array input', () => {
      expect(() => getTransactionSectionSummary(null)).toThrow('Transactions must be an array');
      expect(() => getTransactionSectionSummary('string')).toThrow('Transactions must be an array');
      expect(() => getTransactionSectionSummary({})).toThrow('Transactions must be an array');
    });

    it('should handle empty array', () => {
      const result = getTransactionSectionSummary([]);
      expect(result.sections).toHaveLength(0);
      expect(result.totalTransactions).toBe(0);
      expect(result.counts).toEqual({});
      expect(result.amounts).toEqual({});
    });

    it('should handle transactions without amount field', () => {
      const transactions = [
        { sectionCode: 'deposits', description: 'No amount' },
        { sectionCode: 'deposits', amount: 100 }
      ];
      const result = getTransactionSectionSummary(transactions);
      
      expect(result.amounts.deposits).toBe(100); // 0 + 100
    });
  });

  describe('getAvailableSectionCodes', () => {
    it('should return object with section codes', () => {
      const result = getAvailableSectionCodes();
      
      expect(result).toHaveProperty('deposits');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('card');
      expect(result).toHaveProperty('electronic');
      expect(result).toHaveProperty('manual');
      expect(result).toHaveProperty('uncategorized');
    });

    it('should have descriptive values for each code', () => {
      const result = getAvailableSectionCodes();
      
      expect(result.deposits).toBe('DEPOSITS AND ADDITIONS');
      expect(result.checks).toBe('CHECKS PAID');
      expect(result.card).toBe('ATM & DEBIT CARD WITHDRAWALS');
      expect(result.electronic).toBe('ELECTRONIC WITHDRAWALS');
      expect(result.manual).toBe('MANUALLY ENTERED TRANSACTIONS');
      expect(result.uncategorized).toBe('UNCATEGORIZED TRANSACTIONS');
    });

    it('should return consistent object on multiple calls', () => {
      const result1 = getAvailableSectionCodes();
      const result2 = getAvailableSectionCodes();
      
      expect(result1).toEqual(result2);
    });
  });

  describe('isValidSectionCode', () => {
    it('should return true for valid section codes', () => {
      expect(isValidSectionCode('deposits')).toBe(true);
      expect(isValidSectionCode('checks')).toBe(true);
      expect(isValidSectionCode('card')).toBe(true);
      expect(isValidSectionCode('electronic')).toBe(true);
      expect(isValidSectionCode('manual')).toBe(true);
      expect(isValidSectionCode('uncategorized')).toBe(true);
    });

    it('should return false for invalid section codes', () => {
      expect(isValidSectionCode('invalid')).toBe(false);
      expect(isValidSectionCode('DEPOSITS')).toBe(false); // Case sensitive
      expect(isValidSectionCode('')).toBe(false);
      expect(isValidSectionCode('check')).toBe(false); // Singular vs plural
    });

    it('should return false for non-string inputs', () => {
      expect(isValidSectionCode(null)).toBe(false);
      expect(isValidSectionCode(undefined)).toBe(false);
      expect(isValidSectionCode(123)).toBe(false);
      expect(isValidSectionCode({})).toBe(false);
    });
  });

  describe('getSectionStatistics', () => {
    it('should generate statistics for all sections', () => {
      const result = getSectionStatistics(sampleTransactions);
      
      expect(result).toHaveLength(4); // deposits, checks, card, electronic
      expect(result.every(stat => stat.code && stat.description && typeof stat.count === 'number')).toBe(true);
    });

    it('should calculate correct statistics for each section', () => {
      const result = getSectionStatistics(sampleTransactions);
      
      const depositsStats = result.find(s => s.code === 'deposits');
      expect(depositsStats).toMatchObject({
        code: 'deposits',
        description: 'DEPOSITS AND ADDITIONS',
        count: 2,
        totalAmount: 1500
      });
      expect(depositsStats.averageAmount).toBe(750); // 1500 / 2
      expect(depositsStats.percentage).toBeCloseTo(33.33, 1); // 2/6 * 100
    });

    it('should calculate percentages correctly', () => {
      const result = getSectionStatistics(sampleTransactions);
      
      const totalPercentage = result.reduce((sum, stat) => sum + stat.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('should handle unknown section codes with generic description', () => {
      const transactions = [
        { sectionCode: 'unknown_code', amount: 100 }
      ];
      const result = getSectionStatistics(transactions);
      
      const unknownStats = result.find(s => s.code === 'unknown_code');
      expect(unknownStats.description).toBe('Unknown Section');
    });

    it('should calculate average amount correctly', () => {
      const result = getSectionStatistics(sampleTransactions);
      
      const electronicStats = result.find(s => s.code === 'electronic');
      expect(electronicStats.averageAmount).toBe(87.5); // 175 / 2
    });

    it('should handle empty transactions array', () => {
      const result = getSectionStatistics([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single transaction', () => {
      const transactions = [{ sectionCode: 'deposits', amount: 1000 }];
      const result = getSectionStatistics(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        code: 'deposits',
        count: 1,
        totalAmount: 1000,
        averageAmount: 1000,
        percentage: 100
      });
    });
  });
});
