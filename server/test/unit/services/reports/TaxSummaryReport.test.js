/**
 * @fileoverview Unit tests for TaxSummaryReport
 * Tests Schedule C categorization, line number mapping, and labor payment breakdowns
 */

import { TaxSummaryReport } from '../../../../services/reports/TaxSummaryReport.js';

describe('TaxSummaryReport', () => {
  let report;

  beforeEach(() => {
    report = new TaxSummaryReport();
  });

  describe('constructor', () => {
    it('should create an instance of TaxSummaryReport', () => {
      expect(report).toBeInstanceOf(TaxSummaryReport);
    });
  });

  describe('generate', () => {
    describe('input validation', () => {
      it('should handle empty report data', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: {
            totalDeductibleExpenses: 0,
            totalTransactions: 0,
            quarterlyBreakdown: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
            totalContractorPayments: 0,
            totalWagePayments: 0,
            contractorsRequiring1099: 0
          },
          scheduleC: [],
          laborPayments: {
            contractors: { line: '11', payees: [], total: 0 },
            wages: { line: '26', payees: [], total: 0 }
          },
          specialReporting: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
        expect(result).toHaveProperty('fileName');
        expect(result.fileName).toContain('schedule-c-tax-summary');
        expect(result.fileName).toContain('2025');
      });

      it('should handle null period gracefully', async () => {
        const reportData = {
          taxYear: 2025,
          period: null,
          summary: {
            totalDeductibleExpenses: 0,
            totalTransactions: 0,
            quarterlyBreakdown: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
          },
          scheduleC: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
        expect(result.buffer).toBeInstanceOf(Buffer);
      });

      it('should handle undefined period dates', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: undefined, endDate: undefined },
          summary: {
            totalDeductibleExpenses: 0,
            totalTransactions: 0,
            quarterlyBreakdown: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
          },
          scheduleC: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });

      it('should default to current year if taxYear not provided', async () => {
        const reportData = {
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: { totalDeductibleExpenses: 0 },
          scheduleC: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result.fileName).toContain(String(new Date().getFullYear()));
      });
    });

    describe('schedule C categories', () => {
      it('should include line numbers in output', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: {
            totalDeductibleExpenses: 1500,
            totalTransactions: 3,
            quarterlyBreakdown: { Q1: 500, Q2: 500, Q3: 250, Q4: 250 },
            totalContractorPayments: 0,
            totalWagePayments: 0
          },
          scheduleC: [
            {
              line: '8',
              categories: [
                { category: 'Advertising', amount: 500, transactionCount: 2, line: '8' }
              ]
            },
            {
              line: '18',
              categories: [
                { category: 'Office Expenses', amount: 1000, transactionCount: 1, line: '18' }
              ]
            }
          ],
          laborPayments: {
            contractors: { line: '11', payees: [], total: 0 },
            wages: { line: '26', payees: [], total: 0 }
          }
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
        expect(result.buffer.length).toBeGreaterThan(0);
      });
    });

    describe('labor payments', () => {
      it('should handle contractor payments with 1099 threshold', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: {
            totalDeductibleExpenses: 1500,
            totalContractorPayments: 1500,
            totalWagePayments: 0,
            contractorsRequiring1099: 2,
            quarterlyBreakdown: { Q1: 500, Q2: 500, Q3: 250, Q4: 250 }
          },
          scheduleC: [
            {
              line: '11',
              categories: [
                { category: 'Contract Labor', amount: 1500, transactionCount: 3, line: '11' }
              ]
            }
          ],
          laborPayments: {
            contractors: {
              line: '11',
              lineDescription: 'Contract Labor',
              total: 1500,
              payees: [
                { payee: 'John Contractor', amount: 800, requires1099: true, transactionCount: 2 },
                { payee: 'Jane Freelancer', amount: 700, requires1099: true, transactionCount: 1 }
              ],
              note: 'Must issue Form 1099-NEC for payments ≥ $600'
            },
            wages: { line: '26', payees: [], total: 0 }
          }
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
        expect(result.fileName).toContain('schedule-c');
      });

      it('should handle wage payments', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: {
            totalDeductibleExpenses: 5000,
            totalContractorPayments: 0,
            totalWagePayments: 5000,
            quarterlyBreakdown: { Q1: 1250, Q2: 1250, Q3: 1250, Q4: 1250 }
          },
          scheduleC: [
            {
              line: '26',
              categories: [
                { category: 'Wages (Less Employment Credits)', amount: 5000, transactionCount: 12, line: '26' }
              ]
            }
          ],
          laborPayments: {
            contractors: { line: '11', payees: [], total: 0 },
            wages: {
              line: '26',
              lineDescription: 'Wages (Less Employment Credits)',
              total: 5000,
              payees: [
                { payee: 'Employee A', amount: 3000, transactionCount: 6, requiresW2: true },
                { payee: 'Employee B', amount: 2000, transactionCount: 6, requiresW2: true }
              ],
              note: 'Must issue Form W-2 for all employees'
            }
          }
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });

      it('should handle empty payee lists', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: { totalDeductibleExpenses: 0, quarterlyBreakdown: {} },
          scheduleC: [],
          laborPayments: {
            contractors: { line: '11', payees: [], total: 0 },
            wages: { line: '26', payees: [], total: 0 }
          }
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });
    });

    describe('special reporting', () => {
      it('should include special reporting requirements', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: { totalDeductibleExpenses: 1000, quarterlyBreakdown: {} },
          scheduleC: [],
          laborPayments: {
            contractors: { line: '11', payees: [], total: 0 },
            wages: { line: '26', payees: [], total: 0 }
          },
          specialReporting: [
            {
              category: 'Car and Truck Expenses',
              line: '9',
              amount: 1000,
              requirement: 'Part IV - Must complete vehicle information and choose mileage vs actual method'
            }
          ]
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });

      it('should handle empty special reporting array', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: { totalDeductibleExpenses: 0, quarterlyBreakdown: {} },
          scheduleC: [],
          specialReporting: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });
    });

    describe('quarterly breakdown', () => {
      it('should handle complete quarterly breakdown', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: {
            totalDeductibleExpenses: 4000,
            totalTransactions: 40,
            quarterlyBreakdown: {
              Q1: 1000,
              Q2: 1200,
              Q3: 800,
              Q4: 1000
            }
          },
          scheduleC: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });

      it('should handle missing quarterly breakdown', async () => {
        const reportData = {
          taxYear: 2025,
          period: { startDate: '2025-01-01', endDate: '2025-12-31' },
          summary: {
            totalDeductibleExpenses: 1000,
            totalTransactions: 10
          },
          scheduleC: []
        };

        const result = await report.generate(reportData, { userId: 'test-user' });

        expect(result).toHaveProperty('buffer');
      });
    });
  });

  describe('PDF output', () => {
    it('should return proper content type', async () => {
      const reportData = {
        taxYear: 2025,
        summary: { totalDeductibleExpenses: 0, quarterlyBreakdown: {} },
        scheduleC: []
      };

      const result = await report.generate(reportData, { userId: 'test-user' });

      expect(result.contentType).toBe('application/pdf');
    });

    it('should return buffer with content', async () => {
      const reportData = {
        taxYear: 2025,
        summary: { totalDeductibleExpenses: 100, quarterlyBreakdown: { Q1: 100 } },
        scheduleC: [
          { line: '18', categories: [{ category: 'Office Expenses', amount: 100, transactionCount: 1 }] }
        ]
      };

      const result = await report.generate(reportData, { userId: 'test-user' });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(0);
      expect(result.size).toBe(result.buffer.length);
    });

    it('should include userId in filename', async () => {
      const reportData = {
        taxYear: 2025,
        summary: { totalDeductibleExpenses: 0, quarterlyBreakdown: {} },
        scheduleC: []
      };

      const result = await report.generate(reportData, { userId: 'my-user-id' });

      expect(result.fileName).toContain('my-user-id');
    });
  });
});
