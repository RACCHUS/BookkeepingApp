/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import ChaseSummary from '../../../../services/parsers/ChaseSummary.js';

describe('ChaseSummary', () => {
  describe('generate', () => {
    describe('Basic functionality', () => {
      it('should generate summary for empty transactions', () => {
        const result = ChaseSummary.generate([]);
        
        expect(result.totalTransactions).toBe(0);
        expect(result.totalIncome).toBe(0);
        expect(result.totalExpenses).toBe(0);
        expect(result.netIncome).toBe(0);
        expect(result.categorySummary).toEqual({});
        expect(result.needsReview).toBe(0);
      });

      it('should generate summary for single income transaction', () => {
        const transactions = [
          {
            amount: 1000,
            type: 'income',
            category: 'Sales',
            needsReview: false
          }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalTransactions).toBe(1);
        expect(result.totalIncome).toBe(1000);
        expect(result.totalExpenses).toBe(0);
        expect(result.netIncome).toBe(1000);
        expect(result.needsReview).toBe(0);
      });

      it('should generate summary for single expense transaction', () => {
        const transactions = [
          {
            amount: 500,
            type: 'expense',
            category: 'Office Supplies',
            needsReview: false
          }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalTransactions).toBe(1);
        expect(result.totalIncome).toBe(0);
        expect(result.totalExpenses).toBe(500);
        expect(result.netIncome).toBe(-500);
        expect(result.needsReview).toBe(0);
      });

      it('should generate summary for multiple transactions', () => {
        const transactions = [
          { amount: 1000, type: 'income', category: 'Sales', needsReview: false },
          { amount: 500, type: 'expense', category: 'Rent', needsReview: false },
          { amount: 200, type: 'expense', category: 'Utilities', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalTransactions).toBe(3);
        expect(result.totalIncome).toBe(1000);
        expect(result.totalExpenses).toBe(700);
        expect(result.netIncome).toBe(300);
      });
    });

    describe('Category summary', () => {
      it('should group transactions by category', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'Office', needsReview: false },
          { amount: 200, type: 'expense', category: 'Office', needsReview: false },
          { amount: 300, type: 'expense', category: 'Travel', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary).toHaveProperty('Office');
        expect(result.categorySummary.Office.total).toBe(300);
        expect(result.categorySummary.Office.count).toBe(2);
        expect(result.categorySummary.Office.type).toBe('expense');
        
        expect(result.categorySummary).toHaveProperty('Travel');
        expect(result.categorySummary.Travel.total).toBe(300);
        expect(result.categorySummary.Travel.count).toBe(1);
      });

      it('should handle single transaction per category', () => {
        const transactions = [
          { amount: 100, type: 'income', category: 'Sales', needsReview: false },
          { amount: 50, type: 'expense', category: 'Fees', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(Object.keys(result.categorySummary).length).toBe(2);
        expect(result.categorySummary.Sales.count).toBe(1);
        expect(result.categorySummary.Fees.count).toBe(1);
      });

      it('should accumulate amounts for same category', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'Office', needsReview: false },
          { amount: 150, type: 'expense', category: 'Office', needsReview: false },
          { amount: 250, type: 'expense', category: 'Office', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary.Office.total).toBe(500);
        expect(result.categorySummary.Office.count).toBe(3);
      });

      it('should handle many different categories', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'Cat1', needsReview: false },
          { amount: 100, type: 'expense', category: 'Cat2', needsReview: false },
          { amount: 100, type: 'expense', category: 'Cat3', needsReview: false },
          { amount: 100, type: 'expense', category: 'Cat4', needsReview: false },
          { amount: 100, type: 'expense', category: 'Cat5', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(Object.keys(result.categorySummary).length).toBe(5);
        expect(result.totalExpenses).toBe(500);
      });

      it('should preserve type in category summary', () => {
        const transactions = [
          { amount: 500, type: 'income', category: 'Revenue', needsReview: false },
          { amount: 200, type: 'expense', category: 'Costs', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary.Revenue.type).toBe('income');
        expect(result.categorySummary.Costs.type).toBe('expense');
      });
    });

    describe('Needs review tracking', () => {
      it('should count transactions needing review', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'Office', needsReview: true },
          { amount: 200, type: 'expense', category: 'Travel', needsReview: true },
          { amount: 300, type: 'expense', category: 'Food', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.needsReview).toBe(2);
      });

      it('should handle all transactions needing review', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'A', needsReview: true },
          { amount: 200, type: 'expense', category: 'B', needsReview: true }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.needsReview).toBe(2);
      });

      it('should handle no transactions needing review', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'A', needsReview: false },
          { amount: 200, type: 'expense', category: 'B', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.needsReview).toBe(0);
      });

      it('should handle missing needsReview property', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'A' }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        // Falsy value means not counted
        expect(result.needsReview).toBe(0);
      });
    });

    describe('Net income calculation', () => {
      it('should calculate positive net income', () => {
        const transactions = [
          { amount: 1000, type: 'income', category: 'Sales', needsReview: false },
          { amount: 300, type: 'expense', category: 'Costs', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.netIncome).toBe(700);
      });

      it('should calculate negative net income', () => {
        const transactions = [
          { amount: 500, type: 'income', category: 'Sales', needsReview: false },
          { amount: 800, type: 'expense', category: 'Costs', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.netIncome).toBe(-300);
      });

      it('should calculate zero net income', () => {
        const transactions = [
          { amount: 500, type: 'income', category: 'Sales', needsReview: false },
          { amount: 500, type: 'expense', category: 'Costs', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.netIncome).toBe(0);
      });

      it('should handle multiple income and expense transactions', () => {
        const transactions = [
          { amount: 1000, type: 'income', category: 'Sales', needsReview: false },
          { amount: 500, type: 'income', category: 'Revenue', needsReview: false },
          { amount: 200, type: 'expense', category: 'Rent', needsReview: false },
          { amount: 100, type: 'expense', category: 'Utils', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalIncome).toBe(1500);
        expect(result.totalExpenses).toBe(300);
        expect(result.netIncome).toBe(1200);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero amounts', () => {
        const transactions = [
          { amount: 0, type: 'income', category: 'None', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalIncome).toBe(0);
        expect(result.categorySummary.None.total).toBe(0);
      });

      it('should handle very large amounts', () => {
        const transactions = [
          { amount: 999999999, type: 'income', category: 'Huge', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalIncome).toBe(999999999);
        expect(result.netIncome).toBe(999999999);
      });

      it('should handle decimal amounts', () => {
        const transactions = [
          { amount: 10.50, type: 'expense', category: 'Small', needsReview: false },
          { amount: 20.75, type: 'expense', category: 'Small', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalExpenses).toBe(31.25);
        expect(result.categorySummary.Small.total).toBe(31.25);
      });

      it('should handle transactions with same category different types', () => {
        const transactions = [
          { amount: 100, type: 'income', category: 'Mixed', needsReview: false },
          { amount: 50, type: 'expense', category: 'Mixed', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        // First transaction sets the type for the category
        expect(result.categorySummary.Mixed.type).toBe('income');
        expect(result.categorySummary.Mixed.total).toBe(150);
        expect(result.categorySummary.Mixed.count).toBe(2);
      });

      it('should handle empty category name', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: '', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary['']).toBeDefined();
        expect(result.categorySummary[''].total).toBe(100);
      });

      it('should handle category with special characters', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'R&D / Research', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary['R&D / Research']).toBeDefined();
        expect(result.categorySummary['R&D / Research'].total).toBe(100);
      });

      it('should handle very long category names', () => {
        const longCategory = 'A'.repeat(200);
        const transactions = [
          { amount: 100, type: 'expense', category: longCategory, needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary[longCategory]).toBeDefined();
        expect(result.categorySummary[longCategory].total).toBe(100);
      });

      it('should handle many transactions efficiently', () => {
        const transactions = Array(1000).fill(null).map((_, i) => ({
          amount: 1,
          type: i % 2 === 0 ? 'income' : 'expense',
          category: `Cat${i % 10}`,
          needsReview: i % 3 === 0
        }));
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.totalTransactions).toBe(1000);
        expect(result.totalIncome).toBe(500);
        expect(result.totalExpenses).toBe(500);
        expect(result.netIncome).toBe(0);
        expect(Object.keys(result.categorySummary).length).toBe(10);
      });
    });

    describe('Return structure', () => {
      it('should always return all required fields', () => {
        const result = ChaseSummary.generate([]);
        
        expect(result).toHaveProperty('totalTransactions');
        expect(result).toHaveProperty('totalIncome');
        expect(result).toHaveProperty('totalExpenses');
        expect(result).toHaveProperty('netIncome');
        expect(result).toHaveProperty('categorySummary');
        expect(result).toHaveProperty('needsReview');
      });

      it('should return category summary with correct structure', () => {
        const transactions = [
          { amount: 100, type: 'expense', category: 'Test', needsReview: false }
        ];
        
        const result = ChaseSummary.generate(transactions);
        
        expect(result.categorySummary.Test).toHaveProperty('total');
        expect(result.categorySummary.Test).toHaveProperty('count');
        expect(result.categorySummary.Test).toHaveProperty('type');
      });

      it('should return numeric values for financial fields', () => {
        const result = ChaseSummary.generate([]);
        
        expect(typeof result.totalTransactions).toBe('number');
        expect(typeof result.totalIncome).toBe('number');
        expect(typeof result.totalExpenses).toBe('number');
        expect(typeof result.netIncome).toBe('number');
        expect(typeof result.needsReview).toBe('number');
      });

      it('should return object for categorySummary', () => {
        const result = ChaseSummary.generate([]);
        
        expect(typeof result.categorySummary).toBe('object');
        expect(Array.isArray(result.categorySummary)).toBe(false);
      });
    });
  });
});
