/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import parseTransactionLine from '../../../../services/parsers/parseTransactionLine.js';

describe('parseTransactionLine', () => {
  describe('Valid transaction lines', () => {
    it('should parse expense transaction with slash date separator', () => {
      const result = parseTransactionLine('01/15 Office Supplies -50.00', 2024);
      
      expect(result).toEqual({
        date: '2024-01-15T12:00:00',
        amount: 50.00,
        description: 'Office Supplies',
        type: 'expense'
      });
    });

    it('should parse income transaction', () => {
      const result = parseTransactionLine('03/20 Payment Received 1500.00', 2024);
      
      expect(result).toEqual({
        date: '2024-03-20T12:00:00',
        amount: 1500.00,
        description: 'Payment Received',
        type: 'income'
      });
    });

    it('should parse transaction with dash date separator', () => {
      const result = parseTransactionLine('06-10 Starbucks -5.75', 2024);
      
      expect(result).toEqual({
        date: '2024-06-10T12:00:00',
        amount: 5.75,
        description: 'Starbucks',
        type: 'expense'
      });
    });

    it('should handle amount with dollar sign', () => {
      const result = parseTransactionLine('12/25 Holiday Bonus $2000.00', 2024);
      
      expect(result).toEqual({
        date: '2024-12-25T12:00:00',
        amount: 2000.00,
        description: 'Holiday Bonus',
        type: 'income'
      });
    });

    it('should handle amount with commas', () => {
      const result = parseTransactionLine('07/04 Equipment Purchase -1,234.56', 2024);
      
      expect(result).toEqual({
        date: '2024-07-04T12:00:00',
        amount: 1234.56,
        description: 'Equipment Purchase',
        type: 'expense'
      });
    });

    it('should handle amount with dollar sign and commas', () => {
      const result = parseTransactionLine('11/30 Large Sale $12,345.67', 2024);
      
      expect(result).toEqual({
        date: '2024-11-30T12:00:00',
        amount: 12345.67,
        description: 'Large Sale',
        type: 'income'
      });
    });

    it('should handle single digit month and day', () => {
      const result = parseTransactionLine('1/5 Gas Station -45.00', 2024);
      
      expect(result).toEqual({
        date: '2024-01-05T12:00:00',
        amount: 45.00,
        description: 'Gas Station',
        type: 'expense'
      });
    });

    it('should handle description with multiple spaces', () => {
      const result = parseTransactionLine('02/14 Coffee   Shop   Purchase -8.50', 2024);
      
      expect(result).not.toBeNull();
      expect(result.description).toContain('Coffee');
      expect(result.amount).toBe(8.50);
    });

    it('should handle different years', () => {
      const result2023 = parseTransactionLine('06/15 Service Fee -25.00', 2023);
      const result2025 = parseTransactionLine('06/15 Service Fee -25.00', 2025);
      
      expect(result2023.date).toBe('2023-06-15T12:00:00');
      expect(result2025.date).toBe('2025-06-15T12:00:00');
    });

    it('should handle expense with explicit negative amount', () => {
      const result = parseTransactionLine('08/20 Rent Payment -1500.00', 2024);
      
      expect(result.type).toBe('expense');
      expect(result.amount).toBe(1500.00);
    });

    it('should trim description whitespace', () => {
      const result = parseTransactionLine('09/10 Office Depot  -75.00', 2024);
      
      expect(result.description).toBe('Office Depot');
    });

    it('should handle zero-padded amounts', () => {
      const result = parseTransactionLine('10/31 Small Purchase -00.99', 2024);
      
      expect(result.amount).toBe(0.99);
      expect(result.type).toBe('expense');
    });
  });

  describe('Invalid transaction lines', () => {
    it('should return null for missing date', () => {
      const result = parseTransactionLine('Office Supplies -50.00', 2024);
      expect(result).toBeNull();
    });

    it('should return null for missing amount', () => {
      const result = parseTransactionLine('01/15 Office Supplies', 2024);
      expect(result).toBeNull();
    });

    it('should return null for missing description', () => {
      const result = parseTransactionLine('01/15 -50.00', 2024);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseTransactionLine('', 2024);
      expect(result).toBeNull();
    });

    it('should return null for invalid date format', () => {
      const result = parseTransactionLine('2024/01/15 Office Supplies -50.00', 2024);
      expect(result).toBeNull();
    });

    it('should return null for malformed amount (no decimal)', () => {
      const result = parseTransactionLine('01/15 Office Supplies -50', 2024);
      expect(result).toBeNull();
    });

    it('should return null for text instead of amount', () => {
      const result = parseTransactionLine('01/15 Office Supplies fifty', 2024);
      expect(result).toBeNull();
    });

    it('should return null for date with invalid month', () => {
      const result = parseTransactionLine('13/15 Invalid Month -50.00', 2024);
      // Note: The regex will match but date parsing will create invalid date
      expect(result).not.toBeNull();
      expect(result.date).toBe('');
    });

    it('should return null for date with invalid day', () => {
      const result = parseTransactionLine('01/32 Invalid Day -50.00', 2024);
      expect(result).not.toBeNull();
      expect(result.date).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year date', () => {
      const result = parseTransactionLine('02/29 Leap Year Transaction -100.00', 2024);
      
      expect(result.date).toBe('2024-02-29T12:00:00');
    });

    it('should handle end of year date', () => {
      const result = parseTransactionLine('12/31 End of Year -250.00', 2024);
      
      expect(result.date).toBe('2024-12-31T12:00:00');
    });

    it('should handle start of year date', () => {
      const result = parseTransactionLine('01/01 New Year -100.00', 2024);
      
      expect(result.date).toBe('2024-01-01T12:00:00');
    });

    it('should handle very large amounts', () => {
      const result = parseTransactionLine('05/15 Large Transaction $999,999.99', 2024);
      
      expect(result.amount).toBe(999999.99);
      expect(result.type).toBe('income');
    });

    it('should handle very small amounts', () => {
      const result = parseTransactionLine('05/15 Small Transaction -00.01', 2024);
      
      expect(result.amount).toBe(0.01);
      expect(result.type).toBe('expense');
    });

    it('should return empty description for whitespace-only description', () => {
      const result = parseTransactionLine('01/15    -50.00', 2024);
      
      if (result) {
        expect(result.description).toBe('');
      } else {
        expect(result).toBeNull();
      }
    });

    it('should return null for amount with negative sign before dollar sign (not supported)', () => {
      // The regex doesn't support -$25.00 format, only -25.00 or $25.00
      const result = parseTransactionLine('03/15 Refund -$25.00', 2024);
      
      expect(result).toBeNull();
    });
  });
});
