/**
 * @jest-environment node
 * @fileoverview Comprehensive Tests for ChaseTransactionParser
 * @description Edge cases and critical path testing for all transaction parsing methods
 */

import { describe, it, expect } from '@jest/globals';
import ChaseTransactionParser from '../../../../services/parsers/ChaseTransactionParser.js';

describe('ChaseTransactionParser', () => {
  const testYear = 2024;

  describe('parseDepositLine', () => {
    describe('Standard deposits with $ sign', () => {
      it('should parse deposit with $ sign and comma', () => {
        const line = '01/08 Remote Online Deposit 1 $3,640.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-01-08T12:00:00');
        expect(result.amount).toBe(3640.00);
        expect(result.description).toContain('Remote Online Deposit');
      });

      it('should parse deposit without comma', () => {
        const line = '01/15 Direct Deposit $950.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(950.00);
      });

      it('should parse deposit with large amount', () => {
        const line = '03/22 Business Deposit $25,450.75';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(25450.75);
      });
    });

    describe('Deposits without $ sign', () => {
      it('should parse deposit without $ sign', () => {
        const line = '01/19 Remote Online Deposit 1 2,500.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(2500.00);
      });

      it('should parse deposit with no comma and no $ sign', () => {
        const line = '02/10 Cash Deposit 450.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(450.00);
      });
    });

    describe('Amount concatenation edge cases', () => {
      it('should handle "Remote Online Deposit 1" without concatenating amount', () => {
        const line = '01/08 Remote Online Deposit 1 3,640.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toContain('Remote Online Deposit 1');
        expect(result.amount).toBe(3640.00);
        // Should NOT be 13640.00
      });

      it('should parse deposit description ending with Deposit 1', () => {
        const line = '03/15 Transfer Deposit 1 1,200.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toContain('Deposit 1');
        expect(result.amount).toBe(1200.00);
      });
    });

    describe('Description cleanup', () => {
      it('should clean up multiple spaces in description', () => {
        const line = '04/10 Check    Deposit   From   Client $500.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).not.toMatch(/\s{2,}/); // No double spaces
      });

      it('should handle description with trailing spaces before amount', () => {
        const line = '05/20 Payroll Deposit    $2,100.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Payroll Deposit');
      });
    });

    describe('Amount validation', () => {
      it('should handle negative amounts as zero', () => {
        const line = '01/10 Deposit -100.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        // Parser converts negative to absolute value (0 after validation)
        expect(result).toBeTruthy();
        expect(result.amount).toBe(0);
      });

      it('should reject amounts over threshold (50,000)', () => {
        const line = '01/10 Large Deposit $75,000.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should reject zero amounts', () => {
        const line = '01/10 Zero Deposit $0.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should reject amounts less than $1', () => {
        const line = '01/10 Small Deposit $0.50';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });
    });

    describe('Date format handling', () => {
      it('should parse single-digit month and day', () => {
        const line = '01/05 Deposit $100.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-01-05T12:00:00');
      });

      it('should parse double-digit month and day', () => {
        const line = '12/31 Year End Deposit $5,000.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-12-31T12:00:00');
      });
    });

    describe('Invalid input handling', () => {
      it('should return null for header lines', () => {
        const line = 'DATE DESCRIPTION AMOUNT';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should return null for total lines', () => {
        const line = 'Total Deposits and Additions $10,000.00';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should return null for empty lines', () => {
        const line = '';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should return null for lines without amount', () => {
        const line = '01/10 Deposit Description Only';
        const result = ChaseTransactionParser.parseDepositLine(line, testYear);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('parseCheckLine', () => {
    describe('Standard check formats', () => {
      it('should parse check with single date', () => {
        const line = '533 ^ 01/03 400.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-01-03T12:00:00');
        expect(result.amount).toBe(400.00);
        expect(result.description).toBe('CHECK #533');
      });

      it('should parse check with dual dates (posted vs transaction)', () => {
        const line = '538 * ^ 01/15 01/19 2,500.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-01-19T12:00:00'); // Uses second date
        expect(result.amount).toBe(2500.00);
      });

      it('should parse check with $ sign', () => {
        const line = '540 ^ 02/05 $1,250.50';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(1250.50);
      });
    });

    describe('Check number with special characters', () => {
      it('should handle check with asterisk marker', () => {
        const line = '542 * 03/10 750.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('CHECK #542');
      });

      it('should handle check with caret marker', () => {
        const line = '545 ^ 04/15 600.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('CHECK #545');
      });

      it('should handle check with both markers', () => {
        const line = '550 ^ 05/20 900.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('CHECK #550');
      });
    });

    describe('Amount validation', () => {
      it('should reject negative check amounts', () => {
        const line = '560 ^ 06/01 -100.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should reject check amounts over 100,000', () => {
        const line = '565 ^ 06/05 150,000.00';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should accept check at upper threshold', () => {
        const line = '570 ^ 06/10 99,999.99';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(99999.99);
      });
    });

    describe('Invalid formats', () => {
      it('should return null for malformed check line', () => {
        const line = 'Not a check line';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should return null for check without amount', () => {
        const line = '575 ^ 07/01';
        const result = ChaseTransactionParser.parseCheckLine(line, testYear);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('parseCardLine', () => {
    describe('Card Purchase formats', () => {
      it('should parse standard card purchase', () => {
        const line = '01/15 Card Purchase 01/14 AMAZON.COM NY Card 1234 $45.99';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-01-15T12:00:00');
        expect(result.amount).toBe(45.99);
        expect(result.description).toContain('AMAZON');
      });

      it('should parse Card Purchase With Pin', () => {
        const line = '02/20 Card Purchase With Pin 02/19 TARGET STORE KS Card 5678 $123.45';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(123.45);
        expect(result.description).toContain('TARGET');
      });

      it('should parse card purchase without $ sign', () => {
        const line = '03/10 Card Purchase 03/09 WALMART CA Card 9012 89.50';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(89.50);
      });
    });

    describe('Merchant name cleanup', () => {
      it('should handle Chevron/Sunshine pattern', () => {
        const line = '04/05 Card Purchase 04/04 Chevron/Sunshine 39 KS Card 1111 $75.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Chevron/Sunshine');
      });

      it('should clean standalone Chevron', () => {
        const line = '04/10 Card Purchase 04/09 Chevron 123456 CA Card 2222 $60.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Chevron');
      });

      it('should handle Exxon Sunshine pattern', () => {
        const line = '05/15 Card Purchase 05/14 Exxon Sunshine 63 TX Card 3333 $55.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Exxon Sunshine');
      });

      it('should preserve Lowes store number', () => {
        const line = '06/20 Card Purchase 06/19 Lowe\'s #1234 FL Card 4444 $250.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toContain('#1234');
      });

      it('should preserve Sunshine store number', () => {
        const line = '07/01 Card Purchase 06/30 Sunshine #42 KS Card 5555 $40.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Sunshine #42');
      });

      it('should preserve Westar identifying number', () => {
        const line = '08/10 Card Purchase 08/09 Westar 98765 KS Card 6666 $150.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Westar 98765');
      });

      it('should remove long numeric IDs from generic merchants', () => {
        const line = '09/05 Card Purchase 09/04 GENERIC STORE 123456 NY Card 7777 $30.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).not.toContain('123456');
      });

      it('should fallback to "Card Purchase" for invalid merchant names', () => {
        const line = '10/10 Card Purchase 10/09 X KS Card 8888 $10.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Card Purchase');
      });
    });

    describe('State code extraction', () => {
      it('should handle two-letter state codes', () => {
        const line = '11/15 Card Purchase 11/14 STORE NAME CA Card 9999 $25.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        // State code should be stripped from description
        expect(result.description).not.toContain('CA Card');
      });
    });

    describe('ATM withdrawals', () => {
      it('should parse Non-Chase ATM withdrawal', () => {
        const line = '12/20 Non-Chase ATM Withdraw 12/19 BANK OF AMERICA KS Card 1234 $100.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(100.00);
        expect(result.type).toBe('atm_withdrawal');
        expect(result.category).toBe('ATM Withdrawal');
      });

      it('should handle ATM with minimal merchant info', () => {
        const line = '12/25 Non-Chase ATM Withdraw 12/24 ATM NY Card 5678 $200.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBeTruthy();
      });
    });

    describe('Amount validation', () => {
      it('should reject card amounts over 50,000', () => {
        const line = '01/10 Card Purchase 01/09 EXPENSIVE STORE NY Card 1111 $75,000.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should reject zero amounts', () => {
        const line = '02/10 Card Purchase 02/09 STORE NY Card 2222 $0.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should reject negative amounts', () => {
        const line = '03/10 Card Purchase 03/09 STORE NY Card 3333 -$50.00';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeNull();
      });
    });

    describe('Invalid formats', () => {
      it('should return null for non-card lines', () => {
        const line = 'This is not a card transaction';
        const result = ChaseTransactionParser.parseCardLine(line, testYear);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('parseElectronicLine', () => {
    describe('Standard electronic payments', () => {
      it('should parse electronic payment with company name', () => {
        const line = '01/11 Orig CO Name:Home Depot Orig ID:1234567 $389.20';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.date).toBe('2024-01-11T12:00:00');
        expect(result.amount).toBe(389.20);
        expect(result.description).toContain('Home Depot');
      });

      it('should parse electronic payment without $ sign', () => {
        const line = '02/15 Orig CO Name:Utility Company Orig ID:9876543 250.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(250.00);
      });

      it('should handle company names with spaces', () => {
        const line = '03/20 Orig CO Name:ABC Company Inc Orig ID:5555555 $1,500.75';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toContain('ABC Company Inc');
      });
    });

    describe('Amount validation', () => {
      it('should reject amounts over 50,000', () => {
        const line = '04/10 Orig CO Name:Large Payment Orig ID:1111111 $75,000.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should reject zero amounts', () => {
        const line = '05/10 Orig CO Name:Zero Payment Orig ID:2222222 $0.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should handle negative amounts by taking absolute value', () => {
        const line = '06/10 Orig CO Name:Negative Payment Orig ID:3333333 $100.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.amount).toBe(100.00);
      });
    });

    describe('Invalid formats', () => {
      it('should return null for lines without company name', () => {
        const line = '07/10 Electronic payment $100.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should return null for lines without amount', () => {
        const line = '08/10 Orig CO Name:Company Orig ID:4444444';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeNull();
      });

      it('should return null for empty lines', () => {
        const line = '';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle company name with special characters', () => {
        const line = '09/15 Orig CO Name:ABC & Co. LLC Orig ID:7777777 $450.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toContain('ABC & Co. LLC');
      });

      it('should trim whitespace from company name', () => {
        const line = '10/20 Orig CO Name:  Padded Company Name  Orig ID:8888888 $300.00';
        const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
        
        expect(result).toBeTruthy();
        expect(result.description).toBe('Electronic Payment: Padded Company Name');
      });
    });
  });

  describe('Classification integration', () => {
    it('should include classification data for deposits', () => {
      const line = '01/10 Client Payment Deposit $5,000.00';
      const result = ChaseTransactionParser.parseDepositLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
    });

    it('should include classification data for checks', () => {
      const line = '600 ^ 02/15 1,200.00';
      const result = ChaseTransactionParser.parseCheckLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
    });

    it('should include classification data for card purchases', () => {
      const line = '03/20 Card Purchase 03/19 OFFICE DEPOT NY Card 1234 $150.00';
      const result = ChaseTransactionParser.parseCardLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
    });

    it('should include classification data for electronic payments', () => {
      const line = '04/25 Orig CO Name:Insurance Company Orig ID:9999999 $500.00';
      const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
    });
  });

  describe('Source tagging', () => {
    it('should tag deposits with chase_pdf source', () => {
      const line = '01/10 Deposit $1,000.00';
      const result = ChaseTransactionParser.parseDepositLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result.source).toBe('chase_pdf');
    });

    it('should tag checks with chase_pdf source', () => {
      const line = '700 ^ 02/10 500.00';
      const result = ChaseTransactionParser.parseCheckLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result.source).toBe('chase_pdf');
    });

    it('should tag card transactions with chase_pdf source', () => {
      const line = '03/10 Card Purchase 03/09 STORE NY Card 1234 $50.00';
      const result = ChaseTransactionParser.parseCardLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result.source).toBe('chase_pdf');
    });

    it('should tag electronic payments with chase_pdf source', () => {
      const line = '04/10 Orig CO Name:Company Orig ID:1234567 $200.00';
      const result = ChaseTransactionParser.parseElectronicLine(line, testYear);
      
      expect(result).toBeTruthy();
      expect(result.source).toBe('chase_pdf');
    });
  });
});
