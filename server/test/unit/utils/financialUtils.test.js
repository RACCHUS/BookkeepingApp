/**
 * @fileoverview Financial Utils Comprehensive Tests
 * @description Complete test coverage for financial utility functions
 * @version 1.0.0
 * 
 * Target: 90%+ coverage for financialUtils.js
 */

import { jest } from '@jest/globals';
import { 
  formatCurrency,
  calculatePercentage,
  calculatePercentageChange,
  sumAmounts,
  calculateRunningBalance,
  categorizeAmounts,
  calculateProfitLoss,
  calculateTaxEstimate,
  calculateQuarterlyTax,
  calculateExpenseRatios,
  calculateAverageAmount,
  calculateDepreciation,
  validateFinancialAmount
} from '../../../utils/financialUtils.js';

describe('Financial Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(1500.50)).toBe('$1,500.50');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00');
      expect(formatCurrency(-500.75)).toBe('-$500.75');
    });

    it('should handle zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle very large numbers', () => {
      expect(formatCurrency(1000000)).toContain('1,000,000');
    });

    it('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
    });
  });

  describe('sumAmounts', () => {
    it('should sum an array of numbers', () => {
      expect(sumAmounts([100, 200, 300])).toBe(600);
      expect(sumAmounts([10.50, 20.25, 30.75])).toBeCloseTo(61.50, 2);
    });

    it('should handle empty array', () => {
      expect(sumAmounts([])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(sumAmounts([100, -50, 200])).toBe(250);
    });

    it('should filter out invalid values', () => {
      expect(sumAmounts([100, null, 200, undefined, 300])).toBe(600);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 200)).toBeCloseTo(25, 2);
      expect(calculatePercentage(75, 300)).toBeCloseTo(25, 2);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('should handle 100 percent', () => {
      expect(calculatePercentage(200, 200)).toBeCloseTo(100, 2);
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate positive change', () => {
      const change = calculatePercentageChange(100, 150);
      expect(change).toBeCloseTo(50, 2);
    });

    it('should calculate negative change', () => {
      const change = calculatePercentageChange(100, 50);
      expect(change).toBeCloseTo(-50, 2);
    });

    it('should handle zero old value', () => {
      expect(calculatePercentageChange(0, 100)).toBe(0);
    });
  });

  describe('calculateProfitLoss', () => {
    it('should calculate profit correctly', () => {
      const result = calculateProfitLoss(5000, 3000);
      expect(result.profit).toBe(2000);
      expect(result.margin).toBeCloseTo(40, 2);
    });

    it('should calculate loss correctly', () => {
      const result = calculateProfitLoss(3000, 5000);
      expect(result.profit).toBe(-2000);
      expect(result.margin).toBeLessThan(0);
    });

    it('should handle zero income', () => {
      const result = calculateProfitLoss(0, 1000);
      expect(result.profit).toBe(-1000);
    });
  });

  describe('calculateTaxEstimate', () => {
    it('should calculate tax amount', () => {
      const tax = calculateTaxEstimate(10000, 0.25);
      expect(tax).toBeCloseTo(2500, 2);
    });

    it('should handle zero income', () => {
      const tax = calculateTaxEstimate(0, 0.25);
      expect(tax).toBe(0);
    });

    it('should handle different tax rates', () => {
      expect(calculateTaxEstimate(10000, 0.15)).toBeCloseTo(1500, 2);
      expect(calculateTaxEstimate(10000, 0.30)).toBeCloseTo(3000, 2);
    });
  });

  describe('calculateQuarterlyTax', () => {
    it('should calculate quarterly tax', () => {
      const quarterly = calculateQuarterlyTax(40000, 0.25);
      expect(quarterly).toBeCloseTo(2500, 2); // 40000 * 0.25 / 4
    });

    it('should handle zero annual income', () => {
      expect(calculateQuarterlyTax(0, 0.25)).toBe(0);
    });
  });

  describe('categorizeAmounts', () => {
    it('should categorize income and expenses', () => {
      const transactions = [
        { amount: 1000, type: 'income' },
        { amount: 500, type: 'expense' },
        { amount: 2000, type: 'income' },
        { amount: 300, type: 'expense' }
      ];

      const result = categorizeAmounts(transactions);
      expect(result.totalIncome).toBe(3000);
      expect(result.totalExpenses).toBe(800);
      expect(result.netAmount).toBe(2200);
    });

    it('should handle empty transactions', () => {
      const result = categorizeAmounts([]);
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netAmount).toBe(0);
    });
  });

  describe('calculateRunningBalance', () => {
    it('should calculate running balances', () => {
      const transactions = [
        { amount: 1000, type: 'income' },
        { amount: 500, type: 'expense' },
        { amount: 300, type: 'income' }
      ];

      const result = calculateRunningBalance(transactions, 0);
      expect(result).toHaveLength(3);
      expect(result[0].balance).toBe(1000);
      expect(result[1].balance).toBe(500);
      expect(result[2].balance).toBe(800);
    });

    it('should handle starting balance', () => {
      const transactions = [
        { amount: 100, type: 'expense' }
      ];

      const result = calculateRunningBalance(transactions, 1000);
      expect(result[0].balance).toBe(900);
    });
  });

  describe('calculateExpenseRatios', () => {
    it('should calculate expense ratios by category', () => {
      const expenses = [
        { amount: 500, category: 'Rent' },
        { amount: 300, category: 'Utilities' },
        { amount: 200, category: 'Rent' }
      ];

      const ratios = calculateExpenseRatios(expenses, 5000);
      expect(ratios).toHaveProperty('Rent');
      expect(ratios).toHaveProperty('Utilities');
      expect(ratios.Rent.percentage).toBeCloseTo(14, 0); // 700/5000 * 100
    });
  });

  describe('calculateAverageAmount', () => {
    it('should calculate average of all transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 }
      ];

      expect(calculateAverageAmount(transactions)).toBe(200);
    });

    it('should filter by type', () => {
      const transactions = [
        { amount: 100, type: 'income' },
        { amount: 200, type: 'expense' },
        { amount: 300, type: 'income' }
      ];

      expect(calculateAverageAmount(transactions, 'income')).toBe(200);
    });

    it('should handle empty array', () => {
      expect(calculateAverageAmount([])).toBe(0);
    });
  });

  describe('calculateDepreciation', () => {
    it('should calculate straight-line depreciation', () => {
      const depreciation = calculateDepreciation(10000, 1000, 5);
      expect(depreciation).toBe(1800); // (10000 - 1000) / 5
    });

    it('should handle zero salvage value', () => {
      const depreciation = calculateDepreciation(10000, 0, 5);
      expect(depreciation).toBe(2000);
    });
  });

  describe('validateFinancialAmount', () => {
    it('should validate positive numbers', () => {
      const result = validateFinancialAmount(100);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(100);
    });

    it('should validate negative numbers when allowed (default)', () => {
      const result = validateFinancialAmount(-100);
      expect(result.isValid).toBe(true);
    });

    it('should reject negative numbers when not allowed', () => {
      const result = validateFinancialAmount(-100, { allowNegative: false });
      expect(result.isValid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validateFinancialAmount('abc').isValid).toBe(false);
      // Note: null coerces to 0 which is valid
      expect(validateFinancialAmount(NaN).isValid).toBe(false);
      expect(validateFinancialAmount(Infinity).isValid).toBe(false);
    });

    it('should check minimum value', () => {
      const result = validateFinancialAmount(50, { minValue: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than');
    });

    it('should check maximum value', () => {
      const result = validateFinancialAmount(150, { maxValue: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should return formatted value', () => {
      const result = validateFinancialAmount(100.556);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(100.56);
      expect(result.formatted).toContain('100.56');
    });
  });
});
