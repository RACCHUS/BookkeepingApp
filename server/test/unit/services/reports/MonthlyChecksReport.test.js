/**
 * @fileoverview Unit tests for MonthlyChecksReport
 * Tests month-by-month check payment summary generation
 */

import MonthlyChecksReport from '../../../../services/reports/MonthlyChecksReport.js';

describe('MonthlyChecksReport', () => {
  let report;

  beforeEach(() => {
    report = new MonthlyChecksReport();
  });

  describe('constructor', () => {
    it('should create an instance of MonthlyChecksReport', () => {
      expect(report).toBeInstanceOf(MonthlyChecksReport);
      expect(report.reportType).toBe('monthly-checks');
    });
  });

  describe('generateData', () => {
    describe('empty data handling', () => {
      it('should handle empty checks array', () => {
        const result = report.generateData([], { startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(result).toEqual({
          months: [],
          totals: {
            totalChecks: 0,
            totalAmount: 0,
            totalIncome: 0,
            totalExpense: 0,
            incomeCount: 0,
            expenseCount: 0
          },
          period: { startDate: '2025-01-01', endDate: '2025-12-31' }
        });
      });

      it('should handle null checks', () => {
        const result = report.generateData(null, { startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(result.months).toEqual([]);
        expect(result.totals.totalChecks).toBe(0);
        expect(result.totals.totalAmount).toBe(0);
      });

      it('should handle undefined checks', () => {
        const result = report.generateData(undefined, {});

        expect(result.months).toEqual([]);
        expect(result.totals.totalChecks).toBe(0);
      });
    });

    describe('monthly grouping', () => {
      it('should group checks by month', () => {
        const checks = [
          { date: '2025-01-15', amount: 100, type: 'expense' },
          { date: '2025-01-20', amount: 50, type: 'expense' },
          { date: '2025-02-10', amount: 200, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months).toHaveLength(2);
        expect(result.months[0].monthKey).toBe('2025-01');
        expect(result.months[1].monthKey).toBe('2025-02');
      });

      it('should calculate correct monthly totals', () => {
        const checks = [
          { date: '2025-01-15', amount: 1000, type: 'income' },
          { date: '2025-01-20', amount: 200, type: 'expense' },
          { date: '2025-01-25', amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months).toHaveLength(1);
        expect(result.months[0].income.amount).toBe(1000);
        expect(result.months[0].income.count).toBe(1);
        expect(result.months[0].expense.amount).toBe(300);
        expect(result.months[0].expense.count).toBe(2);
        expect(result.months[0].totalChecks).toBe(3);
        expect(result.months[0].totalAmount).toBe(1300);
      });

      it('should sort months chronologically', () => {
        const checks = [
          { date: '2025-03-01', amount: 100, type: 'expense' },
          { date: '2025-01-01', amount: 100, type: 'expense' },
          { date: '2025-02-01', amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months[0].monthKey).toBe('2025-01');
        expect(result.months[1].monthKey).toBe('2025-02');
        expect(result.months[2].monthKey).toBe('2025-03');
      });
    });

    describe('income and expense categorization', () => {
      it('should correctly categorize income checks', () => {
        const checks = [
          { date: '2025-01-15', amount: 1000, type: 'income' },
          { date: '2025-01-20', amount: 500, type: 'income' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months[0].income.amount).toBe(1500);
        expect(result.months[0].income.count).toBe(2);
        expect(result.months[0].expense.amount).toBe(0);
        expect(result.months[0].expense.count).toBe(0);
      });

      it('should correctly categorize expense checks', () => {
        const checks = [
          { date: '2025-01-15', amount: 200, type: 'expense' },
          { date: '2025-01-20', amount: 300, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months[0].expense.amount).toBe(500);
        expect(result.months[0].expense.count).toBe(2);
        expect(result.months[0].income.amount).toBe(0);
        expect(result.months[0].income.count).toBe(0);
      });
    });

    describe('status tracking', () => {
      it('should track checks by status', () => {
        const checks = [
          { date: '2025-01-15', amount: 100, type: 'expense', status: 'pending' },
          { date: '2025-01-16', amount: 100, type: 'expense', status: 'cleared' },
          { date: '2025-01-17', amount: 100, type: 'expense', status: 'cleared' },
          { date: '2025-01-18', amount: 100, type: 'expense', status: 'bounced' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months[0].byStatus.pending).toBe(1);
        expect(result.months[0].byStatus.cleared).toBe(2);
        expect(result.months[0].byStatus.bounced).toBe(1);
        expect(result.months[0].byStatus.voided).toBe(0);
      });

      it('should handle missing status as pending', () => {
        const checks = [
          { date: '2025-01-15', amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months[0].byStatus.pending).toBe(1);
      });
    });

    describe('overall totals', () => {
      it('should calculate correct overall totals', () => {
        const checks = [
          { date: '2025-01-15', amount: 1000, type: 'income' },
          { date: '2025-01-20', amount: 200, type: 'expense' },
          { date: '2025-02-10', amount: 500, type: 'income' },
          { date: '2025-02-15', amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.totals.totalChecks).toBe(4);
        expect(result.totals.totalAmount).toBe(1800);
        expect(result.totals.totalIncome).toBe(1500);
        expect(result.totals.totalExpense).toBe(300);
        expect(result.totals.incomeCount).toBe(2);
        expect(result.totals.expenseCount).toBe(2);
      });
    });

    describe('date handling', () => {
      it('should handle Date objects', () => {
        const checks = [
          { date: new Date('2025-01-15'), amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months).toHaveLength(1);
        expect(result.months[0].monthKey).toBe('2025-01');
      });

      it('should handle Firestore Timestamp-like objects', () => {
        const checks = [
          { date: { toDate: () => new Date('2025-01-15') }, amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months).toHaveLength(1);
        expect(result.months[0].monthKey).toBe('2025-01');
      });

      it('should skip checks with invalid dates', () => {
        const checks = [
          { date: 'invalid-date', amount: 100, type: 'expense' },
          { date: '2025-01-15', amount: 50, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months).toHaveLength(1);
        expect(result.totals.totalChecks).toBe(1);
      });

      it('should handle null dates', () => {
        const checks = [
          { date: null, amount: 100, type: 'expense' },
          { date: '2025-01-15', amount: 50, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months).toHaveLength(1);
      });
    });

    describe('month label formatting', () => {
      it('should format month labels correctly', () => {
        const checks = [
          { date: '2025-01-15', amount: 100, type: 'expense' },
          { date: '2025-12-15', amount: 100, type: 'expense' }
        ];

        const result = report.generateData(checks, {});

        expect(result.months[0].monthLabel).toContain('Jan');
        expect(result.months[0].monthLabel).toContain('2025');
        expect(result.months[1].monthLabel).toContain('Dec');
      });
    });
  });

  describe('generate (PDF)', () => {
    it('should generate PDF buffer', async () => {
      const checks = [
        { date: '2025-01-15', amount: 1000, type: 'income', payee: 'Customer A' },
        { date: '2025-01-20', amount: 200, type: 'expense', payee: 'Vendor B' }
      ];

      const result = await report.generate(checks, {}, { userId: 'test-user' });

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('fileName');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.fileName).toContain('monthly-checks');
    });

    it('should handle empty checks for PDF', async () => {
      const result = await report.generate([], {}, { userId: 'test-user' });

      expect(result).toHaveProperty('buffer');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should include custom title in PDF', async () => {
      const checks = [
        { date: '2025-01-15', amount: 100, type: 'expense' }
      ];

      const result = await report.generate(checks, {}, {
        userId: 'test-user',
        title: 'Custom Checks Report'
      });

      expect(result).toHaveProperty('buffer');
    });
  });

  describe('processChecksByMonth', () => {
    it('should return empty array for empty input', () => {
      const result = report.processChecksByMonth([]);

      expect(result).toEqual([]);
    });

    it('should include year and month numbers in output', () => {
      const checks = [
        { date: '2025-03-15', amount: 100, type: 'expense' }
      ];

      const result = report.processChecksByMonth(checks);

      expect(result[0].year).toBe(2025);
      expect(result[0].month).toBe(3);
    });
  });

  describe('calculateTotals', () => {
    it('should calculate correct totals from monthly data', () => {
      const monthlyData = [
        { 
          totalChecks: 5, 
          totalAmount: 1000, 
          income: { amount: 800, count: 2 }, 
          expense: { amount: 200, count: 3 }
        },
        { 
          totalChecks: 3, 
          totalAmount: 500, 
          income: { amount: 300, count: 1 }, 
          expense: { amount: 200, count: 2 }
        }
      ];

      const result = report.calculateTotals(monthlyData);

      expect(result.totalChecks).toBe(8);
      expect(result.totalAmount).toBe(1500);
      expect(result.totalIncome).toBe(1100);
      expect(result.totalExpense).toBe(400);
      expect(result.incomeCount).toBe(3);
      expect(result.expenseCount).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle checks with zero amounts', () => {
      const checks = [
        { date: '2025-01-15', amount: 0, type: 'expense' }
      ];

      const result = report.generateData(checks, {});

      expect(result.months).toHaveLength(1);
      expect(result.months[0].totalAmount).toBe(0);
      expect(result.months[0].totalChecks).toBe(1);
    });

    it('should handle checks spanning multiple years', () => {
      const checks = [
        { date: '2024-12-15', amount: 100, type: 'expense' },
        { date: '2025-01-15', amount: 100, type: 'expense' }
      ];

      const result = report.generateData(checks, {});

      expect(result.months).toHaveLength(2);
      expect(result.months[0].year).toBe(2024);
      expect(result.months[1].year).toBe(2025);
    });

    it('should handle negative amounts correctly', () => {
      const checks = [
        { date: '2025-01-15', amount: -100, type: 'expense' },
        { date: '2025-01-15', amount: 100, type: 'expense' }
      ];

      const result = report.generateData(checks, {});

      // Math.abs should be applied to all amounts
      expect(result.months[0].totalAmount).toBe(200);
    });

    it('should handle missing type as expense', () => {
      const checks = [
        { date: '2025-01-15', amount: 100 }
      ];

      const result = report.generateData(checks, {});

      expect(result.months[0].expense.count).toBe(1);
      expect(result.months[0].expense.amount).toBe(100);
    });
  });
});
