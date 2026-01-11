/**
 * @file currencyUtils.test.js
 * @description Comprehensive tests for shared currency utility functions
 * Tests all currency formatting, parsing, and calculation operations
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseCurrency,
  addCurrency,
  subtractCurrency,
  multiplyCurrency,
  divideCurrency,
  roundCurrency,
  calculatePercentage,
  getPercentageOf,
  formatPercentage,
  calculateTax,
  addTax,
  removeTax,
  sumCurrency,
  absCurrency,
  isNegativeAmount,
  isPositiveAmount,
  isZeroAmount,
  toCents,
  fromCents
} from '../../../../shared/utils/currencyUtils';

describe('currencyUtils', () => {
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

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle invalid inputs', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
      expect(formatCurrency('invalid')).toBe('$0.00');
    });

    it('should handle very large numbers', () => {
      const result = formatCurrency(1000000000);
      expect(result).toContain('1,000,000,000');
    });

    it('should handle very small decimals', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
    });

    it('should support showSign option', () => {
      const result = formatCurrency(100, { showSign: true });
      expect(result).toContain('+') || expect(result).toContain('100');
    });
  });

  describe('parseCurrency', () => {
    it('should parse standard currency strings', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
      expect(parseCurrency('$100.00')).toBe(100);
      expect(parseCurrency('$0.99')).toBe(0.99);
    });

    it('should parse negative amounts', () => {
      expect(parseCurrency('-$500')).toBe(-500);
    });

    it('should parse amounts in parentheses as negative', () => {
      expect(parseCurrency('($500)')).toBe(-500);
      expect(parseCurrency('($1,234.56)')).toBe(-1234.56);
    });

    it('should handle plain numbers', () => {
      expect(parseCurrency('100')).toBe(100);
      expect(parseCurrency('50.25')).toBe(50.25);
    });

    it('should return 0 for invalid inputs', () => {
      expect(parseCurrency(null)).toBe(0);
      expect(parseCurrency(undefined)).toBe(0);
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('invalid')).toBe(0);
      expect(parseCurrency(123)).toBe(0); // Non-string
    });
  });

  describe('addCurrency', () => {
    it('should add amounts correctly', () => {
      expect(addCurrency(100, 50)).toBe(150);
      expect(addCurrency(10.50, 20.25)).toBe(30.75);
    });

    it('should handle floating-point precision', () => {
      // 0.1 + 0.2 would normally be 0.30000000000000004
      expect(addCurrency(0.1, 0.2)).toBe(0.3);
    });

    it('should handle null/undefined', () => {
      expect(addCurrency(100, null)).toBe(100);
      expect(addCurrency(null, 50)).toBe(50);
      expect(addCurrency(null, null)).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(addCurrency(100, -50)).toBe(50);
      expect(addCurrency(-100, -50)).toBe(-150);
    });
  });

  describe('subtractCurrency', () => {
    it('should subtract amounts correctly', () => {
      expect(subtractCurrency(100, 30)).toBe(70);
      expect(subtractCurrency(50.75, 25.25)).toBe(25.5);
    });

    it('should handle floating-point precision', () => {
      expect(subtractCurrency(1.0, 0.9)).toBe(0.1);
    });

    it('should handle negative results', () => {
      expect(subtractCurrency(50, 100)).toBe(-50);
    });
  });

  describe('multiplyCurrency', () => {
    it('should multiply amounts correctly', () => {
      expect(multiplyCurrency(100, 2)).toBe(200);
      expect(multiplyCurrency(50, 1.5)).toBe(75);
    });

    it('should handle decimal multipliers', () => {
      expect(multiplyCurrency(100, 0.1)).toBe(10);
      expect(multiplyCurrency(100, 0.15)).toBe(15);
    });

    it('should handle zero', () => {
      expect(multiplyCurrency(100, 0)).toBe(0);
      expect(multiplyCurrency(0, 100)).toBe(0);
    });
  });

  describe('divideCurrency', () => {
    it('should divide amounts correctly', () => {
      expect(divideCurrency(100, 2)).toBe(50);
      expect(divideCurrency(100, 4)).toBe(25);
    });

    it('should throw error for division by zero', () => {
      expect(() => divideCurrency(100, 0)).toThrow('Cannot divide by zero');
    });

    it('should handle decimal results', () => {
      expect(divideCurrency(100, 3)).toBeCloseTo(33.33, 1);
    });
  });

  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(10.126)).toBe(10.13);
      expect(roundCurrency(10.124)).toBe(10.12);
      expect(roundCurrency(10.125)).toBe(10.13); // Banker's rounding or round half up
    });

    it('should handle null/undefined', () => {
      expect(roundCurrency(null)).toBe(0);
      expect(roundCurrency(undefined)).toBe(0);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage of amount', () => {
      expect(calculatePercentage(100, 15)).toBe(15);
      expect(calculatePercentage(200, 8.25)).toBe(16.5);
    });

    it('should handle zero', () => {
      expect(calculatePercentage(100, 0)).toBe(0);
      expect(calculatePercentage(0, 15)).toBe(0);
    });
  });

  describe('getPercentageOf', () => {
    it('should calculate what percentage part is of total', () => {
      expect(getPercentageOf(25, 100)).toBe(25);
      expect(getPercentageOf(50, 200)).toBe(25);
    });

    it('should handle zero total', () => {
      expect(getPercentageOf(50, 0)).toBe(0);
    });

    it('should handle values > 100%', () => {
      expect(getPercentageOf(150, 100)).toBe(150);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(25)).toContain('25');
      expect(formatPercentage(25)).toContain('%');
    });

    it('should handle decimals', () => {
      const result = formatPercentage(25.5);
      expect(result).toContain('25.5') || expect(result).toContain('25');
    });

    it('should handle invalid inputs', () => {
      expect(formatPercentage(null)).toBe('0.0%');
      expect(formatPercentage(NaN)).toBe('0.0%');
    });

    it('should handle negative percentages', () => {
      const result = formatPercentage(-10);
      expect(result).toContain('10');
      expect(result).toContain('-');
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax amount', () => {
      expect(calculateTax(100, 8)).toBe(8);
      expect(calculateTax(100, 8.25)).toBe(8.25);
    });
  });

  describe('addTax', () => {
    it('should add tax to amount', () => {
      expect(addTax(100, 10)).toBe(110);
      expect(addTax(100, 8.25)).toBe(108.25);
    });
  });

  describe('removeTax', () => {
    it('should remove tax from amount', () => {
      expect(removeTax(110, 10)).toBeCloseTo(100, 1);
      expect(removeTax(108.25, 8.25)).toBeCloseTo(100, 1);
    });
  });

  describe('sumCurrency', () => {
    it('should sum array of amounts', () => {
      expect(sumCurrency([100, 200, 300])).toBe(600);
      expect(sumCurrency([10.50, 20.25, 30.75])).toBe(61.5);
    });

    it('should handle empty array', () => {
      expect(sumCurrency([])).toBe(0);
    });

    it('should handle non-array input', () => {
      expect(sumCurrency(null)).toBe(0);
      expect(sumCurrency(undefined)).toBe(0);
    });

    it('should handle floating-point accumulation', () => {
      const values = Array(10).fill(0.1);
      expect(sumCurrency(values)).toBe(1);
    });
  });

  describe('absCurrency', () => {
    it('should return absolute value', () => {
      expect(absCurrency(-100)).toBe(100);
      expect(absCurrency(100)).toBe(100);
      expect(absCurrency(0)).toBe(0);
    });

    it('should handle null/undefined', () => {
      expect(absCurrency(null)).toBe(0);
      expect(absCurrency(undefined)).toBe(0);
    });
  });

  describe('isNegativeAmount', () => {
    it('should identify negative amounts', () => {
      expect(isNegativeAmount(-100)).toBe(true);
      expect(isNegativeAmount(-0.01)).toBe(true);
      expect(isNegativeAmount(100)).toBe(false);
      expect(isNegativeAmount(0)).toBe(false);
    });

    it('should handle null/undefined as zero', () => {
      expect(isNegativeAmount(null)).toBe(false);
      expect(isNegativeAmount(undefined)).toBe(false);
    });
  });

  describe('isPositiveAmount', () => {
    it('should identify positive amounts', () => {
      expect(isPositiveAmount(100)).toBe(true);
      expect(isPositiveAmount(0.01)).toBe(true);
      expect(isPositiveAmount(-100)).toBe(false);
      expect(isPositiveAmount(0)).toBe(false);
    });
  });

  describe('isZeroAmount', () => {
    it('should identify zero amounts', () => {
      expect(isZeroAmount(0)).toBe(true);
      expect(isZeroAmount(0.0001)).toBe(true); // Within default tolerance
      expect(isZeroAmount(100)).toBe(false);
    });

    it('should respect tolerance parameter', () => {
      expect(isZeroAmount(0.005, 0.01)).toBe(true);
      expect(isZeroAmount(0.05, 0.01)).toBe(false);
    });
  });

  describe('toCents', () => {
    it('should convert dollars to cents', () => {
      expect(toCents(1)).toBe(100);
      expect(toCents(10.50)).toBe(1050);
      expect(toCents(0.99)).toBe(99);
    });

    it('should handle rounding', () => {
      expect(toCents(10.999)).toBe(1100);
      expect(toCents(10.994)).toBe(1099);
    });

    it('should handle null/undefined', () => {
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
    });
  });

  describe('fromCents', () => {
    it('should convert cents to dollars', () => {
      expect(fromCents(100)).toBe(1);
      expect(fromCents(1050)).toBe(10.5);
      expect(fromCents(99)).toBe(0.99);
    });

    it('should handle null/undefined', () => {
      expect(fromCents(null)).toBe(0);
      expect(fromCents(undefined)).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const large = 999999999.99;
      expect(formatCurrency(large)).toContain('999,999,999.99');
      expect(addCurrency(large, 0.01)).toBe(1000000000);
    });

    it('should handle cumulative floating-point operations', () => {
      // Simulate many small additions
      let total = 0;
      for (let i = 0; i < 1000; i++) {
        total = addCurrency(total, 0.01);
      }
      expect(total).toBe(10);
    });

    it('should handle mixed operations correctly', () => {
      // income - expense calculation
      const income = 5000.50;
      const expense = 3250.75;
      const net = subtractCurrency(income, expense);
      expect(net).toBe(1749.75);
    });

    it('should calculate tax correctly on real-world amounts', () => {
      // Common sales tax calculation
      const subtotal = 99.99;
      const taxRate = 8.25;
      const tax = calculateTax(subtotal, taxRate);
      const total = addTax(subtotal, taxRate);
      
      expect(tax).toBeCloseTo(8.25, 1);
      expect(total).toBeCloseTo(108.24, 1);
    });
  });
});
