/**
 * @fileoverview Unit tests for Form1099Report
 * Tests 1099-NEC processing logic, threshold calculations, and edge cases
 */

import { Form1099Report } from '../../../../services/reports/Form1099Report.js';

describe('Form1099Report', () => {
  let report;

  beforeEach(() => {
    report = new Form1099Report();
  });

  describe('constructor', () => {
    it('should set threshold to 600', () => {
      expect(report.threshold).toBe(600);
    });
  });

  describe('process1099Transactions', () => {
    describe('input validation', () => {
      it('should return empty result for null transactions', () => {
        const result = report.process1099Transactions(null, []);
        
        expect(result.overThreshold).toEqual([]);
        expect(result.underThreshold).toEqual([]);
        expect(result.summary.total1099Recipients).toBe(0);
        expect(result.summary.totalContractorPayments).toBe(0);
      });

      it('should return empty result for undefined transactions', () => {
        const result = report.process1099Transactions(undefined, []);
        
        expect(result.overThreshold).toEqual([]);
        expect(result.summary.totalPayees).toBe(0);
      });

      it('should return empty result for non-array transactions', () => {
        const result = report.process1099Transactions('not an array', []);
        
        expect(result.overThreshold).toEqual([]);
        expect(result.underThreshold).toEqual([]);
      });

      it('should handle null payees array', () => {
        const transactions = [
          { type: 'expense', amount: -700, isContractorPayment: true, payee: 'John' }
        ];
        
        const result = report.process1099Transactions(transactions, null);
        
        expect(result.overThreshold.length).toBe(1);
      });

      it('should filter out transactions with invalid amounts', () => {
        const transactions = [
          { type: 'expense', amount: 'invalid', isContractorPayment: true, payee: 'Bad' },
          { type: 'expense', amount: NaN, isContractorPayment: true, payee: 'NaN' },
          { type: 'expense', amount: -700, isContractorPayment: true, payee: 'Good' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        // Only the valid transaction should be counted
        expect(result.summary.totalPayees).toBe(1);
        expect(result.overThreshold[0].payeeName).toBe('Good');
      });
    });

    describe('threshold calculations', () => {
      it('should identify payees at or above $600 threshold', () => {
        const transactions = [
          { type: 'expense', amount: -600, isContractorPayment: true, payee: 'Contractor A' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold.length).toBe(1);
        expect(result.overThreshold[0].payeeName).toBe('Contractor A');
        expect(result.overThreshold[0].totalPaid).toBe(600);
        expect(result.overThreshold[0].meetsThreshold).toBe(true);
      });

      it('should identify payees below $600 threshold', () => {
        const transactions = [
          { type: 'expense', amount: -500, isContractorPayment: true, payee: 'Contractor B' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.underThreshold.length).toBe(1);
        expect(result.underThreshold[0].payeeName).toBe('Contractor B');
        expect(result.underThreshold[0].totalPaid).toBe(500);
        expect(result.underThreshold[0].meetsThreshold).toBe(false);
      });

      it('should aggregate multiple payments to same payee', () => {
        const transactions = [
          { type: 'expense', amount: -300, isContractorPayment: true, payee: 'Contractor C' },
          { type: 'expense', amount: -400, isContractorPayment: true, payee: 'Contractor C' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold.length).toBe(1);
        expect(result.overThreshold[0].totalPaid).toBe(700);
        expect(result.overThreshold[0].transactionCount).toBe(2);
      });
    });

    describe('contractor identification', () => {
      it('should identify contractors by isContractorPayment flag', () => {
        const transactions = [
          { type: 'expense', amount: -800, isContractorPayment: true, payee: 'Contractor' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold.length).toBe(1);
      });

      it('should identify contractors by category contract_labor', () => {
        const transactions = [
          { type: 'expense', amount: -800, category: 'contract_labor', payee: 'Contractor' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold.length).toBe(1);
      });

      it('should identify contractors by payee record type', () => {
        const payees = [
          { id: 'payee1', name: 'Contractor X', type: 'contractor' }
        ];
        const transactions = [
          { type: 'expense', amount: -800, payeeId: 'payee1' }
        ];
        
        const result = report.process1099Transactions(transactions, payees);
        
        expect(result.overThreshold.length).toBe(1);
        expect(result.overThreshold[0].payeeName).toBe('Contractor X');
      });

      it('should not include non-contractor expenses', () => {
        const transactions = [
          { type: 'expense', amount: -800, category: 'utilities', payee: 'Electric Co' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold.length).toBe(0);
        expect(result.underThreshold.length).toBe(0);
      });

      it('should not include income transactions', () => {
        const transactions = [
          { type: 'income', amount: 800, isContractorPayment: true, payee: 'Customer' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold.length).toBe(0);
      });
    });

    describe('missing tax ID tracking', () => {
      it('should flag payees over threshold missing tax ID', () => {
        const transactions = [
          { type: 'expense', amount: -700, isContractorPayment: true, payee: 'No Tax ID' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold[0].missingTaxId).toBe(true);
        expect(result.summary.missingTaxIdCount).toBe(1);
      });

      it('should not flag payees with tax ID', () => {
        const payees = [
          { id: 'payee1', name: 'Has Tax ID', type: 'contractor', taxId: '123-45-6789' }
        ];
        const transactions = [
          { type: 'expense', amount: -700, payeeId: 'payee1', isContractorPayment: true }
        ];
        
        const result = report.process1099Transactions(transactions, payees);
        
        expect(result.overThreshold[0].missingTaxId).toBe(false);
        expect(result.summary.missingTaxIdCount).toBe(0);
      });
    });

    describe('summary calculations', () => {
      it('should calculate correct summary totals', () => {
        const transactions = [
          { type: 'expense', amount: -800, isContractorPayment: true, payee: 'A' },
          { type: 'expense', amount: -700, isContractorPayment: true, payee: 'B' },
          { type: 'expense', amount: -400, isContractorPayment: true, payee: 'C' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.summary.total1099Recipients).toBe(2); // A and B
        expect(result.summary.totalUnderThreshold).toBe(1); // C
        expect(result.summary.totalContractorPayments).toBe(1900);
        expect(result.summary.totalPayees).toBe(3);
        expect(result.summary.threshold).toBe(600);
      });

      it('should sort by total paid descending', () => {
        const transactions = [
          { type: 'expense', amount: -600, isContractorPayment: true, payee: 'Small' },
          { type: 'expense', amount: -1000, isContractorPayment: true, payee: 'Large' },
          { type: 'expense', amount: -800, isContractorPayment: true, payee: 'Medium' }
        ];
        
        const result = report.process1099Transactions(transactions, []);
        
        expect(result.overThreshold[0].payeeName).toBe('Large');
        expect(result.overThreshold[1].payeeName).toBe('Medium');
        expect(result.overThreshold[2].payeeName).toBe('Small');
      });
    });
  });

  describe('_emptyResult', () => {
    it('should return correct empty structure', () => {
      const result = report._emptyResult();
      
      expect(result.overThreshold).toEqual([]);
      expect(result.underThreshold).toEqual([]);
      expect(result.summary.total1099Recipients).toBe(0);
      expect(result.summary.totalContractorPayments).toBe(0);
      expect(result.summary.threshold).toBe(600);
    });
  });
});
