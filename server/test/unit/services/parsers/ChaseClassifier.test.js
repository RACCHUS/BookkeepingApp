/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import ChaseClassifier from '../../../../services/parsers/ChaseClassifier.js';

describe('ChaseClassifier', () => {
  describe('classify', () => {
    describe('Income classification', () => {
      it('should classify deposit as Business Income', () => {
        const result = ChaseClassifier.classify('DEPOSIT CHECK #1234', 500, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.type).toBe('income');
        expect(result.confidence).toBe(0.8);
        expect(result.needsReview).toBe(false);
        expect(result.payee).toBeDefined();
      });

      it('should handle lowercase deposit', () => {
        const result = ChaseClassifier.classify('deposit payment', 1000, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle mixed case deposit', () => {
        const result = ChaseClassifier.classify('Deposit From Customer', 750, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.confidence).toBe(0.8);
      });

      it('should classify non-deposit income as Uncategorized', () => {
        const result = ChaseClassifier.classify('Payment Received', 500, 'income');
        
        expect(result.category).toBe('Uncategorized');
        expect(result.confidence).toBe(0.3);
        expect(result.needsReview).toBe(true);
      });
    });

    describe('Expense classification', () => {
      it('should classify fee as Bank Service Charges', () => {
        const result = ChaseClassifier.classify('MONTHLY MAINTENANCE FEE', 25, 'expense');
        
        expect(result.category).toBe('Bank Service Charges');
        expect(result.type).toBe('expense');
        expect(result.confidence).toBe(0.8);
        expect(result.needsReview).toBe(false);
      });

      it('should handle lowercase fee', () => {
        const result = ChaseClassifier.classify('overdraft fee', 35, 'expense');
        
        expect(result.category).toBe('Bank Service Charges');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle mixed case fee', () => {
        const result = ChaseClassifier.classify('Service Fee', 10, 'expense');
        
        expect(result.category).toBe('Bank Service Charges');
        expect(result.confidence).toBe(0.8);
      });

      it('should classify non-fee expense as Uncategorized', () => {
        const result = ChaseClassifier.classify('Office Supplies', 100, 'expense');
        
        expect(result.category).toBe('Uncategorized');
        expect(result.confidence).toBe(0.3);
        expect(result.needsReview).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty description', () => {
        const result = ChaseClassifier.classify('', 100, 'income');
        
        expect(result.category).toBe('Uncategorized');
        expect(result.needsReview).toBe(true);
      });

      it('should handle zero amount', () => {
        const result = ChaseClassifier.classify('DEPOSIT', 0, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle negative amount with income type', () => {
        const result = ChaseClassifier.classify('DEPOSIT', -100, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.type).toBe('income');
      });

      it('should handle description with only whitespace', () => {
        const result = ChaseClassifier.classify('   ', 50, 'expense');
        
        expect(result.category).toBe('Uncategorized');
        expect(result.needsReview).toBe(true);
      });

      it('should handle very long descriptions', () => {
        const longDesc = 'DEPOSIT FROM ' + 'A'.repeat(200);
        const result = ChaseClassifier.classify(longDesc, 1000, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle special characters in description', () => {
        const result = ChaseClassifier.classify('FEE - $SPECIAL #CHARS!', 15, 'expense');
        
        expect(result.category).toBe('Bank Service Charges');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle description with deposit at end', () => {
        const result = ChaseClassifier.classify('CUSTOMER PAYMENT DEPOSIT', 500, 'income');
        
        expect(result.category).toBe('Business Income');
        expect(result.confidence).toBe(0.8);
      });

      it('should handle description with fee at end', () => {
        const result = ChaseClassifier.classify('LATE PAYMENT FEE', 20, 'expense');
        
        expect(result.category).toBe('Bank Service Charges');
        expect(result.confidence).toBe(0.8);
      });
    });

    describe('Return structure', () => {
      it('should always return category', () => {
        const result = ChaseClassifier.classify('Test', 100, 'income');
        expect(result).toHaveProperty('category');
      });

      it('should always return type', () => {
        const result = ChaseClassifier.classify('Test', 100, 'income');
        expect(result).toHaveProperty('type');
        expect(result.type).toBe('income');
      });

      it('should always return confidence', () => {
        const result = ChaseClassifier.classify('Test', 100, 'income');
        expect(result).toHaveProperty('confidence');
        expect(typeof result.confidence).toBe('number');
      });

      it('should always return needsReview', () => {
        const result = ChaseClassifier.classify('Test', 100, 'income');
        expect(result).toHaveProperty('needsReview');
        expect(typeof result.needsReview).toBe('boolean');
      });

      it('should always return payee', () => {
        const result = ChaseClassifier.classify('Test', 100, 'income');
        expect(result).toHaveProperty('payee');
      });
    });
  });

  describe('extractPayee', () => {
    describe('Check transactions', () => {
      it('should return null for check with uppercase CHECK', () => {
        const result = ChaseClassifier.extractPayee('CHECK #1234');
        expect(result).toBeNull();
      });

      it('should return null for check with lowercase check', () => {
        const result = ChaseClassifier.extractPayee('check #5678');
        expect(result).toBeNull();
      });

      it('should return null for check without hash symbol', () => {
        const result = ChaseClassifier.extractPayee('check 9012');
        expect(result).toBeNull();
      });

      it('should return null for check with mixed case', () => {
        const result = ChaseClassifier.extractPayee('Check #3456');
        expect(result).toBeNull();
      });

      it('should return null for check with whitespace', () => {
        const result = ChaseClassifier.extractPayee('  check #7890  ');
        expect(result).toBeNull();
      });

      it('should return null for check without space after check', () => {
        const result = ChaseClassifier.extractPayee('check#1111');
        expect(result).toBeNull();
      });
    });

    describe('Regular transactions', () => {
      it('should extract first word as payee', () => {
        const result = ChaseClassifier.extractPayee('STARBUCKS COFFEE SHOP');
        expect(result).toBe('STARBUCKS');
      });

      it('should extract single word payee', () => {
        const result = ChaseClassifier.extractPayee('WALMART');
        expect(result).toBe('WALMART');
      });

      it('should handle description with multiple spaces', () => {
        const result = ChaseClassifier.extractPayee('TARGET   STORE');
        expect(result).toBe('TARGET');
      });

      it('should handle description with leading spaces', () => {
        const result = ChaseClassifier.extractPayee('  AMAZON');
        expect(result).toBe('');
      });

      it('should handle empty string', () => {
        const result = ChaseClassifier.extractPayee('');
        expect(result).toBe('');
      });

      it('should handle single space', () => {
        const result = ChaseClassifier.extractPayee(' ');
        expect(result).toBe('');
      });

      it('should extract payee from deposit', () => {
        const result = ChaseClassifier.extractPayee('DEPOSIT FROM CUSTOMER');
        expect(result).toBe('DEPOSIT');
      });

      it('should extract payee from fee description', () => {
        const result = ChaseClassifier.extractPayee('MONTHLY MAINTENANCE FEE');
        expect(result).toBe('MONTHLY');
      });

      it('should handle lowercase description', () => {
        const result = ChaseClassifier.extractPayee('starbucks coffee');
        expect(result).toBe('starbucks');
      });

      it('should handle mixed case description', () => {
        const result = ChaseClassifier.extractPayee('Starbucks Coffee Shop');
        expect(result).toBe('Starbucks');
      });

      it('should handle description with numbers', () => {
        const result = ChaseClassifier.extractPayee('7ELEVEN STORE');
        expect(result).toBe('7ELEVEN');
      });

      it('should handle description with special characters', () => {
        const result = ChaseClassifier.extractPayee('AT&T WIRELESS');
        expect(result).toBe('AT&T');
      });

      it('should handle very long first word', () => {
        const longWord = 'A'.repeat(100);
        const result = ChaseClassifier.extractPayee(`${longWord} REST`);
        expect(result).toBe(longWord);
      });
    });

    describe('Edge cases', () => {
      it('should not extract payee from check #1', () => {
        const result = ChaseClassifier.extractPayee('CHECK #1');
        expect(result).toBeNull();
      });

      it('should not extract payee from check with large number', () => {
        const result = ChaseClassifier.extractPayee('check #999999');
        expect(result).toBeNull();
      });

      it('should handle description that looks like check but has extra text', () => {
        const result = ChaseClassifier.extractPayee('check #1234 payment');
        expect(result).toBe('check');
      });

      it('should handle whitespace-only description', () => {
        const result = ChaseClassifier.extractPayee('   ');
        expect(result).toBe('');
      });

      it('should handle newline in description (splits by space only)', () => {
        const result = ChaseClassifier.extractPayee('WALMART\nSTORE');
        // Implementation splits by space, so newline stays in first word
        expect(result).toBe('WALMART\nSTORE');
      });

      it('should handle tab in description (splits by space only)', () => {
        const result = ChaseClassifier.extractPayee('TARGET\tSTORE');
        // Implementation splits by space, so tab stays in first word
        expect(result).toBe('TARGET\tSTORE');
      });
    });
  });
});
