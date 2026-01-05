/**
 * @fileoverview Unit tests for VendorPaymentReport
 * Tests vendor grouping, category breakdown, and edge cases
 */

import { VendorPaymentReport } from '../../../../services/reports/VendorPaymentReport.js';

describe('VendorPaymentReport', () => {
  let report;

  beforeEach(() => {
    report = new VendorPaymentReport();
  });

  describe('processVendorPayments', () => {
    describe('input validation', () => {
      it('should return empty result for null transactions', () => {
        const result = report.processVendorPayments(null);
        
        expect(result.vendors).toEqual([]);
        expect(result.summary.totalVendors).toBe(0);
        expect(result.summary.totalPayments).toBe(0);
      });

      it('should return empty result for undefined transactions', () => {
        const result = report.processVendorPayments(undefined);
        
        expect(result.vendors).toEqual([]);
        expect(result.summary.totalTransactions).toBe(0);
      });

      it('should return empty result for non-array transactions', () => {
        const result = report.processVendorPayments('not an array');
        
        expect(result.vendors).toEqual([]);
      });

      it('should filter out transactions with invalid amounts', () => {
        const transactions = [
          { type: 'expense', amount: 'invalid', payee: 'Bad' },
          { type: 'expense', amount: NaN, payee: 'NaN' },
          { type: 'expense', amount: -500, payee: 'Good' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.summary.totalVendors).toBe(1);
        expect(result.vendors[0].vendorName).toBe('Good');
      });

      it('should handle empty transactions array', () => {
        const result = report.processVendorPayments([]);
        
        expect(result.vendors).toEqual([]);
        expect(result.summary.totalVendors).toBe(0);
        expect(result.summary.averagePerVendor).toBe(0);
      });
    });

    describe('vendor grouping', () => {
      it('should group transactions by vendorId', () => {
        const transactions = [
          { type: 'expense', amount: -100, vendorId: 'vendor1', vendorName: 'Acme Corp' },
          { type: 'expense', amount: -200, vendorId: 'vendor1', vendorName: 'Acme Corp' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.vendors.length).toBe(1);
        expect(result.vendors[0].vendorName).toBe('Acme Corp');
        expect(result.vendors[0].totalPaid).toBe(300);
        expect(result.vendors[0].transactionCount).toBe(2);
      });

      it('should group by payee when vendorId is missing', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Coffee Shop' },
          { type: 'expense', amount: -50, payee: 'Coffee Shop' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.vendors.length).toBe(1);
        expect(result.vendors[0].totalPaid).toBe(150);
      });

      it('should use description as fallback for vendor name', () => {
        const transactions = [
          { type: 'expense', amount: -100, description: 'Office supplies from store' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.vendors[0].vendorName).toBe('Office supplies from store');
      });
    });

    describe('category tracking', () => {
      it('should track categories per vendor', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Vendor A', category: 'utilities' },
          { type: 'expense', amount: -200, payee: 'Vendor A', category: 'supplies' },
          { type: 'expense', amount: -150, payee: 'Vendor A', category: 'utilities' }
        ];
        
        const result = report.processVendorPayments(transactions);
        const vendor = result.vendors[0];
        
        expect(vendor.categories.length).toBe(2);
        expect(vendor.primaryCategory).toBe('utilities'); // Highest amount
      });

      it('should handle missing category as uncategorized', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Vendor A' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.vendors[0].primaryCategory).toBe('uncategorized');
      });
    });

    describe('payment method tracking', () => {
      it('should track payment methods per vendor', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Vendor A', paymentMethod: 'check' },
          { type: 'expense', amount: -200, payee: 'Vendor A', paymentMethod: 'ach' },
          { type: 'expense', amount: -50, payee: 'Vendor A', paymentMethod: 'check' }
        ];
        
        const result = report.processVendorPayments(transactions);
        const vendor = result.vendors[0];
        
        expect(vendor.paymentMethods.length).toBe(2);
        // ACH should be first (200 total) since it's sorted by amount descending
        expect(vendor.paymentMethods[0].name).toBe('ach');
        expect(vendor.paymentMethods[0].amount).toBe(200);
        expect(vendor.paymentMethods[1].name).toBe('check');
        expect(vendor.paymentMethods[1].amount).toBe(150);
      });
    });

    describe('date range tracking', () => {
      it('should track first and last payment dates', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Vendor A', date: '2025-03-15' },
          { type: 'expense', amount: -200, payee: 'Vendor A', date: '2025-01-10' },
          { type: 'expense', amount: -150, payee: 'Vendor A', date: '2025-06-20' }
        ];
        
        const result = report.processVendorPayments(transactions);
        const vendor = result.vendors[0];
        
        expect(vendor.firstPaymentDate.getMonth()).toBe(0); // January
        expect(vendor.lastPaymentDate.getMonth()).toBe(5); // June
      });

      it('should handle invalid dates gracefully', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Vendor A', date: 'invalid-date' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.vendors[0].firstPaymentDate).toBeNull();
        expect(result.vendors[0].lastPaymentDate).toBeNull();
      });
    });

    describe('summary calculations', () => {
      it('should calculate correct summary totals', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'Vendor A', category: 'utilities' },
          { type: 'expense', amount: -300, payee: 'Vendor B', category: 'supplies' },
          { type: 'expense', amount: -200, payee: 'Vendor C', category: 'utilities' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.summary.totalVendors).toBe(3);
        expect(result.summary.totalPayments).toBe(1000);
        expect(result.summary.totalTransactions).toBe(3);
        expect(result.summary.averagePerVendor).toBeCloseTo(333.33, 1);
      });

      it('should identify top vendor', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'Big Vendor' },
          { type: 'expense', amount: -100, payee: 'Small Vendor' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.summary.topVendor.vendorName).toBe('Big Vendor');
      });

      it('should sort vendors by total paid descending', () => {
        const transactions = [
          { type: 'expense', amount: -100, payee: 'Small' },
          { type: 'expense', amount: -500, payee: 'Large' },
          { type: 'expense', amount: -300, payee: 'Medium' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.vendors[0].vendorName).toBe('Large');
        expect(result.vendors[1].vendorName).toBe('Medium');
        expect(result.vendors[2].vendorName).toBe('Small');
      });

      it('should calculate category breakdown across all vendors', () => {
        const transactions = [
          { type: 'expense', amount: -300, payee: 'A', category: 'utilities' },
          { type: 'expense', amount: -200, payee: 'B', category: 'utilities' },
          { type: 'expense', amount: -400, payee: 'C', category: 'supplies' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.summary.categoryBreakdown.length).toBe(2);
        // Utilities should be first (500 total)
        expect(result.summary.categoryBreakdown[0].name).toBe('utilities');
        expect(result.summary.categoryBreakdown[0].amount).toBe(500);
      });
    });

    describe('transaction type filtering', () => {
      it('should only include expense transactions', () => {
        const transactions = [
          { type: 'expense', amount: -500, payee: 'Vendor A' },
          { type: 'income', amount: 1000, payee: 'Customer' }
        ];
        
        const result = report.processVendorPayments(transactions);
        
        expect(result.summary.totalVendors).toBe(1);
        expect(result.summary.totalPayments).toBe(500);
      });
    });
  });

  describe('_emptyResult', () => {
    it('should return correct empty structure', () => {
      const result = report._emptyResult();
      
      expect(result.vendors).toEqual([]);
      expect(result.summary.totalVendors).toBe(0);
      expect(result.summary.totalPayments).toBe(0);
      expect(result.summary.averagePerVendor).toBe(0);
      expect(result.summary.topVendor).toBeNull();
    });
  });
});
