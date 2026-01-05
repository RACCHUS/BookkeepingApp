/**
 * @fileoverview Unit tests for PayeeYTDReport
 * Tests quarterly breakdown, 1099 threshold warnings, and edge cases
 */

import { PayeeYTDReport } from '../../../../services/reports/PayeeYTDReport.js';

describe('PayeeYTDReport', () => {
  let report;

  beforeEach(() => {
    report = new PayeeYTDReport();
  });

  describe('constructor', () => {
    it('should set threshold1099 to 600', () => {
      expect(report.threshold1099).toBe(600);
    });

    it('should set warningThreshold to 500', () => {
      expect(report.warningThreshold).toBe(500);
    });
  });

  describe('processPayeeYTD', () => {
    describe('input validation', () => {
      it('should return empty result for null transactions', () => {
        const result = report.processPayeeYTD(null, []);
        
        expect(result.payees).toEqual([]);
        expect(result.summary.totalPayees).toBe(0);
      });

      it('should return empty result for undefined transactions', () => {
        const result = report.processPayeeYTD(undefined, []);
        
        expect(result.payees).toEqual([]);
      });

      it('should return empty result for non-array transactions', () => {
        const result = report.processPayeeYTD('not an array', []);
        
        expect(result.payees).toEqual([]);
      });

      it('should handle null payees array', () => {
        const transactions = [
          { type: 'expense', amount: -700, payee: 'John', date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, null, { taxYear: 2025 });
        
        expect(result.payees.length).toBe(1);
      });

      it('should filter out transactions with invalid amounts', () => {
        const transactions = [
          { type: 'expense', amount: 'invalid', payee: 'Bad', date: '2026-06-15' },
          { type: 'expense', amount: NaN, payee: 'NaN', date: '2026-06-15' },
          { type: 'expense', amount: -700, payee: 'Good', date: '2026-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2026 });
        
        // Only valid amount transactions are processed
        expect(result.payees.length).toBe(1);
        expect(result.payees[0].payeeName).toBe('Good');
        expect(result.payees[0].ytdTotal).toBe(700);
      });

      it('should skip transactions with invalid dates', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'Bad Date', date: 'invalid-date' },
          { type: 'expense', amount: -500, payee: 'Good Date', date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees.length).toBe(1);
        expect(result.payees[0].payeeName).toBe('Good Date');
      });
    });

    describe('tax year filtering', () => {
      it('should only include transactions from specified tax year', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'A', date: '2025-06-15' },
          { type: 'expense', amount: -500, payee: 'B', date: '2024-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees.length).toBe(1);
        expect(result.payees[0].payeeName).toBe('A');
      });

      it('should default to current year if not specified', () => {
        const currentYear = new Date().getFullYear();
        const transactions = [
          { type: 'expense', amount: -500, payee: 'A', date: `${currentYear}-06-15` }
        ];
        
        const result = report.processPayeeYTD(transactions, []);
        
        expect(result.payees.length).toBe(1);
      });
    });

    describe('quarterly breakdown', () => {
      it('should calculate Q1 correctly (Jan-Mar)', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'A', date: '2025-01-15' },
          { type: 'expense', amount: -200, payee: 'A', date: '2025-02-20' },
          { type: 'expense', amount: -300, payee: 'A', date: '2025-03-25' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].quarterlyBreakdown.Q1).toBe(600);
      });

      it('should calculate Q2 correctly (Apr-Jun)', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'A', date: '2025-04-15' },
          { type: 'expense', amount: -200, payee: 'A', date: '2025-05-20' },
          { type: 'expense', amount: -300, payee: 'A', date: '2025-06-25' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].quarterlyBreakdown.Q2).toBe(600);
      });

      it('should calculate Q3 correctly (Jul-Sep)', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'A', date: '2025-07-15' },
          { type: 'expense', amount: -200, payee: 'A', date: '2025-08-20' },
          { type: 'expense', amount: -300, payee: 'A', date: '2025-09-25' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].quarterlyBreakdown.Q3).toBe(600);
      });

      it('should calculate Q4 correctly (Oct-Dec)', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'A', date: '2025-10-15' },
          { type: 'expense', amount: -200, payee: 'A', date: '2025-11-20' },
          { type: 'expense', amount: -300, payee: 'A', date: '2025-12-25' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].quarterlyBreakdown.Q4).toBe(600);
      });

      it('should track full year across all quarters', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'A', date: '2025-01-15' },
          { type: 'expense', amount: -200, payee: 'A', date: '2025-04-15' },
          { type: 'expense', amount: -300, payee: 'A', date: '2025-07-15' },
          { type: 'expense', amount: -400, payee: 'A', date: '2025-10-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        const payee = result.payees[0];
        
        expect(payee.quarterlyBreakdown.Q1).toBe(100);
        expect(payee.quarterlyBreakdown.Q2).toBe(200);
        expect(payee.quarterlyBreakdown.Q3).toBe(300);
        expect(payee.quarterlyBreakdown.Q4).toBe(400);
        expect(payee.ytdTotal).toBe(1000);
      });
    });

    describe('1099 status calculation', () => {
      it('should mark contractors at or above $600 as requires_1099', () => {
        const payees = [
          { id: 'payee1', name: 'Contractor', type: 'contractor', taxId: '123-45-6789' }
        ];
        const transactions = [
          { type: 'expense', amount: -600, payeeId: 'payee1', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, payees, { taxYear: 2025 });
        
        expect(result.payees[0].status).toBe('requires_1099');
        expect(result.payees[0].meetsThreshold).toBe(true);
      });

      it('should mark contractors between $500-$599 as approaching_threshold', () => {
        const transactions = [
          { type: 'expense', amount: -550, payee: 'Contractor', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].status).toBe('approaching_threshold');
        expect(result.payees[0].approachingThreshold).toBe(true);
      });

      it('should mark contractors below $500 as ok', () => {
        const transactions = [
          { type: 'expense', amount: -400, payee: 'Contractor', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].status).toBe('ok');
      });

      it('should flag missing tax ID for contractors over threshold', () => {
        const transactions = [
          { type: 'expense', amount: -700, payee: 'Contractor', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].status).toBe('missing_tax_id');
      });

      it('should not flag missing tax ID if payee has tax ID', () => {
        const payees = [
          { id: 'payee1', name: 'Contractor', type: 'contractor', taxId: '123-45-6789' }
        ];
        const transactions = [
          { type: 'expense', amount: -700, payeeId: 'payee1', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, payees, { taxYear: 2025 });
        
        expect(result.payees[0].status).toBe('requires_1099');
      });
    });

    describe('payee type detection', () => {
      it('should detect contractor from isContractorPayment flag', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'Worker', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].isContractor).toBe(true);
      });

      it('should detect contractor from payee record type', () => {
        const payees = [
          { id: 'payee1', name: 'Contractor X', type: 'contractor' }
        ];
        const transactions = [
          { type: 'expense', amount: -500, payeeId: 'payee1', date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, payees, { taxYear: 2025 });
        
        expect(result.payees[0].isContractor).toBe(true);
      });
    });

    describe('monthly breakdown', () => {
      it('should track monthly totals', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'A', date: '2025-01-15' },
          { type: 'expense', amount: -200, payee: 'A', date: '2025-01-20' },
          { type: 'expense', amount: -300, payee: 'A', date: '2025-02-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        const payee = result.payees[0];
        
        expect(payee.monthlyBreakdown['2025-01']).toBe(300);
        expect(payee.monthlyBreakdown['2025-02']).toBe(300);
      });
    });

    describe('summary calculations', () => {
      it('should calculate correct summary totals', () => {
        const payees = [
          { id: 'a', name: 'A', type: 'contractor', taxId: '111-11-1111' },
          { id: 'b', name: 'B', type: 'contractor', taxId: '222-22-2222' }
        ];
        const transactions = [
          { type: 'expense', amount: -700, payeeId: 'a', isContractorPayment: true, date: '2025-06-15' },
          { type: 'expense', amount: -550, payeeId: 'b', isContractorPayment: true, date: '2025-06-15' },
          { type: 'expense', amount: -400, payee: 'C', date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, payees, { taxYear: 2025 });
        
        expect(result.summary.totalPayees).toBe(3);
        expect(result.summary.totalContractors).toBe(2);
        // Check that contractors over threshold have correct status
        const contractorA = result.payees.find(p => p.payeeName === 'A');
        const contractorB = result.payees.find(p => p.payeeName === 'B');
        expect(contractorA.status).toBe('requires_1099');
        expect(contractorB.status).toBe('approaching_threshold');
        expect(result.summary.totalPaid).toBe(1650);
      });

      it('should count missing tax IDs correctly', () => {
        const transactions = [
          { type: 'expense', amount: -700, payee: 'A', isContractorPayment: true, date: '2025-06-15' },
          { type: 'expense', amount: -800, payee: 'B', isContractorPayment: true, date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.summary.missingTaxIdCount).toBe(2);
      });

      it('should sort payees by YTD total descending', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Small', date: '2025-06-15' },
          { type: 'expense', amount: -500, payee: 'Large', date: '2025-06-15' },
          { type: 'expense', amount: -300, payee: 'Medium', date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees[0].payeeName).toBe('Large');
        expect(result.payees[1].payeeName).toBe('Medium');
        expect(result.payees[2].payeeName).toBe('Small');
      });
    });

    describe('transaction type filtering', () => {
      it('should only include expense transactions', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'Vendor', date: '2025-06-15' },
          { type: 'income', amount: 1000, payee: 'Customer', date: '2025-06-15' }
        ];
        
        const result = report.processPayeeYTD(transactions, [], { taxYear: 2025 });
        
        expect(result.payees.length).toBe(1);
        expect(result.payees[0].payeeName).toBe('Vendor');
      });
    });
  });

  describe('_emptyResult', () => {
    it('should return correct empty structure', () => {
      const result = report._emptyResult();
      
      expect(result.payees).toEqual([]);
      expect(result.contractors).toEqual([]);
      expect(result.summary.totalPayees).toBe(0);
      expect(result.summary.totalContractors).toBe(0);
      expect(result.summary.threshold1099).toBe(600);
      expect(result.summary.warningThreshold).toBe(500);
    });
  });
});
