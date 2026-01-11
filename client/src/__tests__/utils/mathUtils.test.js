/**
 * @file mathUtils.test.js
 * @description Comprehensive tests for math utility functions
 * Tests all mathematical operations for correctness, edge cases, and error handling
 */

import { describe, it, expect } from 'vitest';
import {
  safeParseNumber,
  roundTo,
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide,
  safePercentage,
  safePercentageChange,
  safeSum,
  safeAverage,
  safeAbs,
  clamp,
  isValidAmount,
  formatAmount,
  calculateProfitMargin,
  calculateNetIncome
} from '../../../../shared/utils/mathUtils';

describe('mathUtils', () => {
  describe('safeParseNumber', () => {
    it('should parse valid numbers correctly', () => {
      expect(safeParseNumber(100)).toBe(100);
      expect(safeParseNumber(-50.25)).toBe(-50.25);
      expect(safeParseNumber(0)).toBe(0);
    });

    it('should parse string numbers correctly', () => {
      expect(safeParseNumber('100')).toBe(100);
      expect(safeParseNumber('-50.25')).toBe(-50.25);
      expect(safeParseNumber('0.99')).toBe(0.99);
    });

    it('should handle currency format strings', () => {
      expect(safeParseNumber('$1,234.56')).toBe(1234.56);
      expect(safeParseNumber('$100.00')).toBe(100);
      expect(safeParseNumber('-$500')).toBe(-500);
    });

    it('should return default value for invalid inputs', () => {
      expect(safeParseNumber(null)).toBe(0);
      expect(safeParseNumber(undefined)).toBe(0);
      expect(safeParseNumber('')).toBe(0);
      expect(safeParseNumber('abc')).toBe(0);
      expect(safeParseNumber(NaN)).toBe(0);
      expect(safeParseNumber(Infinity)).toBe(0);
      expect(safeParseNumber(-Infinity)).toBe(0);
    });

    it('should use custom default value', () => {
      expect(safeParseNumber(null, -1)).toBe(-1);
      expect(safeParseNumber('invalid', 999)).toBe(999);
    });
  });

  describe('roundTo', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundTo(10.126)).toBe(10.13);
      expect(roundTo(10.124)).toBe(10.12);
      expect(roundTo(10.125)).toBe(10.13); // Round half up
    });

    it('should round to specified decimal places', () => {
      expect(roundTo(10.12345, 3)).toBe(10.123);
      expect(roundTo(10.12345, 4)).toBe(10.1235);
      expect(roundTo(10.12345, 0)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(roundTo(null)).toBe(0);
      expect(roundTo(undefined)).toBe(0);
      expect(roundTo('100.999')).toBe(101);
    });
  });

  describe('safeAdd', () => {
    it('should add numbers correctly', () => {
      expect(safeAdd(100, 50)).toBe(150);
      expect(safeAdd(10.50, 20.25)).toBe(30.75);
    });

    it('should handle floating-point precision', () => {
      // 0.1 + 0.2 normally equals 0.30000000000000004
      expect(safeAdd(0.1, 0.2)).toBe(0.3);
      expect(safeAdd(0.07, 0.01)).toBe(0.08);
    });

    it('should handle negative numbers', () => {
      expect(safeAdd(100, -50)).toBe(50);
      expect(safeAdd(-100, -50)).toBe(-150);
    });

    it('should handle string inputs', () => {
      expect(safeAdd('100', '50')).toBe(150);
      expect(safeAdd('$10.50', '$20.25')).toBe(30.75);
    });

    it('should handle invalid inputs', () => {
      expect(safeAdd(100, null)).toBe(100);
      expect(safeAdd(null, 50)).toBe(50);
      expect(safeAdd(null, null)).toBe(0);
    });
  });

  describe('safeSubtract', () => {
    it('should subtract numbers correctly', () => {
      expect(safeSubtract(100, 50)).toBe(50);
      expect(safeSubtract(10.50, 3.25)).toBe(7.25);
    });

    it('should handle floating-point precision', () => {
      expect(safeSubtract(1.0, 0.9)).toBe(0.1);
      expect(safeSubtract(0.3, 0.1)).toBe(0.2);
    });

    it('should handle negative results', () => {
      expect(safeSubtract(50, 100)).toBe(-50);
      expect(safeSubtract(-100, 50)).toBe(-150);
    });
  });

  describe('safeMultiply', () => {
    it('should multiply numbers correctly', () => {
      expect(safeMultiply(100, 2)).toBe(200);
      expect(safeMultiply(10.50, 3)).toBe(31.5);
    });

    it('should handle decimal multipliers', () => {
      expect(safeMultiply(100, 0.15)).toBe(15);
      expect(safeMultiply(50, 1.08)).toBe(54); // Tax calculation
    });

    it('should handle zero', () => {
      expect(safeMultiply(100, 0)).toBe(0);
      expect(safeMultiply(0, 100)).toBe(0);
    });
  });

  describe('safeDivide', () => {
    it('should divide numbers correctly', () => {
      expect(safeDivide(100, 2)).toBe(50);
      expect(safeDivide(100, 4)).toBe(25);
    });

    it('should handle division by zero', () => {
      expect(safeDivide(100, 0)).toBe(0);
      expect(safeDivide(100, 0, -1)).toBe(-1); // Custom default
    });

    it('should handle decimal results', () => {
      expect(safeDivide(100, 3)).toBeCloseTo(33.33, 1);
      expect(safeDivide(10, 4)).toBe(2.5);
    });

    it('should handle invalid inputs', () => {
      expect(safeDivide(null, 2)).toBe(0);
      expect(safeDivide(100, null)).toBe(0); // Dividing by 0 (null becomes 0)
    });
  });

  describe('safePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(safePercentage(25, 100)).toBe(25);
      expect(safePercentage(50, 200)).toBe(25);
      expect(safePercentage(1, 3)).toBeCloseTo(33.33, 1);
    });

    it('should handle 100%', () => {
      expect(safePercentage(100, 100)).toBe(100);
    });

    it('should handle zero total', () => {
      expect(safePercentage(50, 0)).toBe(0);
    });

    it('should handle over 100%', () => {
      expect(safePercentage(150, 100)).toBe(150);
    });

    it('should respect decimal places option', () => {
      expect(safePercentage(1, 3, 0)).toBe(33);
      expect(safePercentage(1, 3, 4)).toBeCloseTo(33.3333, 3);
    });
  });

  describe('safePercentageChange', () => {
    it('should calculate positive change correctly', () => {
      expect(safePercentageChange(100, 150)).toBe(50);
      expect(safePercentageChange(100, 200)).toBe(100);
    });

    it('should calculate negative change correctly', () => {
      expect(safePercentageChange(100, 50)).toBe(-50);
      expect(safePercentageChange(100, 75)).toBe(-25);
    });

    it('should handle zero old value', () => {
      expect(safePercentageChange(0, 100)).toBe(100);
      expect(safePercentageChange(0, 0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(safePercentageChange(-100, -50)).toBe(50); // Loss decreased
    });
  });

  describe('safeSum', () => {
    it('should sum array of numbers', () => {
      expect(safeSum([100, 200, 300])).toBe(600);
      expect(safeSum([10.50, 20.25, 30.75])).toBe(61.5);
    });

    it('should handle floating-point accumulation', () => {
      // This would have precision issues without cent-based math
      expect(safeSum([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])).toBe(1);
    });

    it('should sum object array by key', () => {
      const transactions = [
        { amount: 100, type: 'income' },
        { amount: 200, type: 'income' },
        { amount: 50, type: 'expense' }
      ];
      expect(safeSum(transactions, 'amount')).toBe(350);
    });

    it('should handle empty array', () => {
      expect(safeSum([])).toBe(0);
    });

    it('should handle non-array input', () => {
      expect(safeSum(null)).toBe(0);
      expect(safeSum(undefined)).toBe(0);
      expect(safeSum('not an array')).toBe(0);
    });

    it('should handle mixed valid/invalid values', () => {
      expect(safeSum([100, null, 200, undefined, 300])).toBe(600);
    });
  });

  describe('safeAverage', () => {
    it('should calculate average correctly', () => {
      expect(safeAverage([100, 200, 300])).toBe(200);
      expect(safeAverage([10, 20, 30, 40])).toBe(25);
    });

    it('should handle empty array', () => {
      expect(safeAverage([])).toBe(0);
    });

    it('should average object array by key', () => {
      const items = [
        { value: 10 },
        { value: 20 },
        { value: 30 }
      ];
      expect(safeAverage(items, 'value')).toBe(20);
    });
  });

  describe('safeAbs', () => {
    it('should return absolute value', () => {
      expect(safeAbs(-100)).toBe(100);
      expect(safeAbs(100)).toBe(100);
      expect(safeAbs(0)).toBe(0);
    });

    it('should handle string inputs', () => {
      expect(safeAbs('-$100')).toBe(100);
    });

    it('should handle invalid inputs', () => {
      expect(safeAbs(null)).toBe(0);
      expect(safeAbs(undefined)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(-50, 0, 100)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(clamp(100, 100, 100)).toBe(100);
      expect(clamp(null, 0, 100)).toBe(0);
    });
  });

  describe('isValidAmount', () => {
    it('should return true for valid amounts', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(-50)).toBe(true);
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('$1,234.56')).toBe(true);
    });

    it('should return false for invalid amounts', () => {
      expect(isValidAmount(null)).toBe(false);
      expect(isValidAmount(undefined)).toBe(false);
      expect(isValidAmount('')).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
    });
  });

  describe('formatAmount', () => {
    it('should format as USD currency by default', () => {
      expect(formatAmount(1234.56)).toBe('$1,234.56');
      expect(formatAmount(100)).toBe('$100.00');
    });

    it('should handle negative amounts', () => {
      const formatted = formatAmount(-500);
      expect(formatted).toContain('500');
    });

    it('should handle zero', () => {
      expect(formatAmount(0)).toBe('$0.00');
    });

    it('should handle invalid inputs', () => {
      expect(formatAmount(null)).toBe('$0.00');
      expect(formatAmount('invalid')).toBe('$0.00');
    });

    it('should respect decimals option', () => {
      const result = formatAmount(100.5, { decimals: 0 });
      expect(result).toContain('101') || expect(result).toContain('100');
    });
  });

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin correctly', () => {
      expect(calculateProfitMargin(1000, 600)).toBe(40);
      expect(calculateProfitMargin(1000, 1000)).toBe(0);
    });

    it('should handle loss', () => {
      expect(calculateProfitMargin(1000, 1200)).toBe(-20);
    });

    it('should handle zero income', () => {
      expect(calculateProfitMargin(0, 100)).toBe(0);
    });

    it('should handle string inputs', () => {
      expect(calculateProfitMargin('1000', '600')).toBe(40);
    });
  });

  describe('calculateNetIncome', () => {
    it('should calculate net income correctly', () => {
      expect(calculateNetIncome(5000, 3000)).toBe(2000);
      expect(calculateNetIncome(3000, 5000)).toBe(-2000);
    });

    it('should handle floating-point precision', () => {
      expect(calculateNetIncome(100.10, 50.05)).toBe(50.05);
    });

    it('should handle string inputs', () => {
      expect(calculateNetIncome('$5,000', '$3,000')).toBe(2000);
    });
  });

  describe('Edge Cases for Financial Calculations', () => {
    it('should handle very large numbers', () => {
      const large = 999999999.99;
      expect(safeAdd(large, 0.01)).toBe(1000000000);
      expect(isValidAmount(large)).toBe(true);
    });

    it('should handle very small amounts', () => {
      expect(safeAdd(0.01, 0.01)).toBe(0.02);
      expect(roundTo(0.001)).toBe(0);
    });

    it('should not lose precision in cumulative calculations', () => {
      // Simulate summing many small transactions
      const transactions = Array(1000).fill(0.01);
      expect(safeSum(transactions)).toBe(10);
    });

    it('should handle mixed positive and negative in sum', () => {
      const values = [100, -50, 200, -75, 300];
      expect(safeSum(values)).toBe(475);
    });
  });
});
