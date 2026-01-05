/**
 * @fileoverview Unit tests for MonthlySummaryReport
 * Tests month-by-month financial summary with income/expense breakdowns
 */

import MonthlySummaryReport from '../../../../services/reports/MonthlySummaryReport.js';

describe('MonthlySummaryReport', () => {
  let report;

  beforeEach(() => {
    report = new MonthlySummaryReport();
  });

  describe('constructor', () => {
    it('should create an instance of MonthlySummaryReport', () => {
      expect(report).toBeInstanceOf(MonthlySummaryReport);
      expect(report.reportType).toBe('monthly-summary');
    });
  });

  describe('generateData', () => {
    describe('empty data handling', () => {
      it('should handle empty transactions array', () => {
        const result = report.generateData([], { startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(result).toEqual({
          months: [],
          totals: {
            totalIncome: 0,
            totalExpenses: 0,
            netIncome: 0,
            totalTransactions: 0
          },
          incomeCategories: {},
          expenseCategories: {},
          period: { startDate: '2025-01-01', endDate: '2025-12-31' }
        });
      });

      it('should handle null transactions', () => {
        const result = report.generateData(null, { startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(result.months).toEqual([]);
        expect(result.totals.totalIncome).toBe(0);
        expect(result.totals.totalExpenses).toBe(0);
      });

      it('should handle undefined transactions', () => {
        const result = report.generateData(undefined, {});

        expect(result.months).toEqual([]);
        expect(result.totals.netIncome).toBe(0);
      });
    });

    describe('monthly grouping', () => {
      it('should group transactions by month', () => {
        const transactions = [
          { date: '2025-01-15', amount: -100, category: 'Office Expenses', type: 'expense' },
          { date: '2025-01-20', amount: -50, category: 'Office Expenses', type: 'expense' },
          { date: '2025-02-10', amount: -200, category: 'Advertising', type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months).toHaveLength(2);
        expect(result.months[0].monthKey).toBe('2025-01');
        expect(result.months[1].monthKey).toBe('2025-02');
      });

      it('should calculate correct monthly totals', () => {
        const transactions = [
          { date: '2025-01-15', amount: 1000, category: 'Gross Receipts', type: 'income' },
          { date: '2025-01-20', amount: -200, category: 'Office Expenses', type: 'expense' },
          { date: '2025-01-25', amount: -100, category: 'Advertising', type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months).toHaveLength(1);
        expect(result.months[0].income.total).toBe(1000);
        expect(result.months[0].expenses.total).toBe(300);
        expect(result.months[0].netIncome).toBe(700);
        expect(result.months[0].transactionCount).toBe(3);
      });

      it('should sort months chronologically', () => {
        const transactions = [
          { date: '2025-03-01', amount: -100, type: 'expense' },
          { date: '2025-01-01', amount: -100, type: 'expense' },
          { date: '2025-02-01', amount: -100, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months[0].monthKey).toBe('2025-01');
        expect(result.months[1].monthKey).toBe('2025-02');
        expect(result.months[2].monthKey).toBe('2025-03');
      });
    });

    describe('income and expense categorization', () => {
      it('should correctly categorize income transactions', () => {
        const transactions = [
          { date: '2025-01-15', amount: 1000, category: 'Gross Receipts', type: 'income' },
          { date: '2025-01-20', amount: 500, category: 'Other Income', type: 'income' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months[0].income.total).toBe(1500);
        expect(result.months[0].income.categories['Gross Receipts']).toBe(1000);
        expect(result.months[0].income.categories['Other Income']).toBe(500);
        expect(result.months[0].expenses.total).toBe(0);
      });

      it('should correctly categorize expense transactions', () => {
        const transactions = [
          { date: '2025-01-15', amount: -200, category: 'Office Expenses', type: 'expense' },
          { date: '2025-01-20', amount: -300, category: 'Advertising', type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months[0].expenses.total).toBe(500);
        expect(result.months[0].expenses.categories['Office Expenses']).toBe(200);
        expect(result.months[0].expenses.categories['Advertising']).toBe(300);
        expect(result.months[0].income.total).toBe(0);
      });

      it('should handle uncategorized transactions', () => {
        const transactions = [
          { date: '2025-01-15', amount: -100, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months[0].expenses.categories['Uncategorized']).toBe(100);
      });
    });

    describe('overall totals', () => {
      it('should calculate correct overall totals', () => {
        const transactions = [
          { date: '2025-01-15', amount: 1000, type: 'income' },
          { date: '2025-01-20', amount: -200, type: 'expense' },
          { date: '2025-02-10', amount: 500, type: 'income' },
          { date: '2025-02-15', amount: -100, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.totals.totalIncome).toBe(1500);
        expect(result.totals.totalExpenses).toBe(300);
        expect(result.totals.netIncome).toBe(1200);
        expect(result.totals.totalTransactions).toBe(4);
      });
    });

    describe('category aggregation', () => {
      it('should aggregate income categories across all months', () => {
        const transactions = [
          { date: '2025-01-15', amount: 1000, category: 'Gross Receipts', type: 'income' },
          { date: '2025-02-15', amount: 500, category: 'Gross Receipts', type: 'income' },
          { date: '2025-03-15', amount: 200, category: 'Other Income', type: 'income' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.incomeCategories['Gross Receipts']).toBe(1500);
        expect(result.incomeCategories['Other Income']).toBe(200);
      });

      it('should aggregate expense categories across all months', () => {
        const transactions = [
          { date: '2025-01-15', amount: -300, category: 'Office Expenses', type: 'expense' },
          { date: '2025-02-15', amount: -200, category: 'Office Expenses', type: 'expense' },
          { date: '2025-03-15', amount: -100, category: 'Advertising', type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.expenseCategories['Office Expenses']).toBe(500);
        expect(result.expenseCategories['Advertising']).toBe(100);
      });

      it('should sort categories by amount descending', () => {
        const transactions = [
          { date: '2025-01-15', amount: -100, category: 'Small Expense', type: 'expense' },
          { date: '2025-01-20', amount: -500, category: 'Large Expense', type: 'expense' },
          { date: '2025-01-25', amount: -200, category: 'Medium Expense', type: 'expense' }
        ];

        const result = report.generateData(transactions, {});
        const categoryOrder = Object.keys(result.expenseCategories);

        expect(categoryOrder[0]).toBe('Large Expense');
        expect(categoryOrder[1]).toBe('Medium Expense');
        expect(categoryOrder[2]).toBe('Small Expense');
      });
    });

    describe('date handling', () => {
      it('should handle Date objects', () => {
        const transactions = [
          { date: new Date('2025-01-15'), amount: -100, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months).toHaveLength(1);
        expect(result.months[0].monthKey).toBe('2025-01');
      });

      it('should handle Firestore Timestamp-like objects', () => {
        const transactions = [
          { date: { toDate: () => new Date('2025-01-15') }, amount: -100, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months).toHaveLength(1);
        expect(result.months[0].monthKey).toBe('2025-01');
      });

      it('should skip transactions with invalid dates', () => {
        const transactions = [
          { date: 'invalid-date', amount: -100, type: 'expense' },
          { date: '2025-01-15', amount: -50, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months).toHaveLength(1);
        expect(result.totals.totalExpenses).toBe(50);
      });

      it('should handle null dates', () => {
        const transactions = [
          { date: null, amount: -100, type: 'expense' },
          { date: '2025-01-15', amount: -50, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months).toHaveLength(1);
      });
    });

    describe('month label formatting', () => {
      it('should format month labels correctly', () => {
        const transactions = [
          { date: '2025-01-15', amount: -100, type: 'expense' },
          { date: '2025-12-15', amount: -100, type: 'expense' }
        ];

        const result = report.generateData(transactions, {});

        expect(result.months[0].monthLabel).toContain('Jan');
        expect(result.months[0].monthLabel).toContain('2025');
        expect(result.months[1].monthLabel).toContain('Dec');
      });
    });
  });

  describe('generate (PDF)', () => {
    it('should generate PDF buffer', async () => {
      const transactions = [
        { date: '2025-01-15', amount: 1000, category: 'Gross Receipts', type: 'income' },
        { date: '2025-01-20', amount: -200, category: 'Office Expenses', type: 'expense' }
      ];

      const result = await report.generate(transactions, {}, { userId: 'test-user' });

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('fileName');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.fileName).toContain('monthly-summary');
    });

    it('should handle empty transactions for PDF', async () => {
      const result = await report.generate([], {}, { userId: 'test-user' });

      expect(result).toHaveProperty('buffer');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should include custom title in PDF', async () => {
      const transactions = [
        { date: '2025-01-15', amount: -100, type: 'expense' }
      ];

      const result = await report.generate(transactions, {}, {
        userId: 'test-user',
        title: 'Custom Monthly Report'
      });

      expect(result).toHaveProperty('buffer');
    });
  });

  describe('processTransactionsByMonth', () => {
    it('should return empty array for empty input', () => {
      const result = report.processTransactionsByMonth([]);

      expect(result).toEqual([]);
    });

    it('should include year and month numbers in output', () => {
      const transactions = [
        { date: '2025-03-15', amount: -100, type: 'expense' }
      ];

      const result = report.processTransactionsByMonth(transactions);

      expect(result[0].year).toBe(2025);
      expect(result[0].month).toBe(3);
    });
  });

  describe('calculateTotals', () => {
    it('should calculate correct totals from monthly data', () => {
      const monthlyData = [
        { income: { total: 1000 }, expenses: { total: 200 }, netIncome: 800, transactionCount: 5 },
        { income: { total: 500 }, expenses: { total: 100 }, netIncome: 400, transactionCount: 3 }
      ];

      const result = report.calculateTotals(monthlyData);

      expect(result.totalIncome).toBe(1500);
      expect(result.totalExpenses).toBe(300);
      expect(result.netIncome).toBe(1200);
      expect(result.totalTransactions).toBe(8);
    });
  });

  describe('edge cases', () => {
    it('should handle transactions with zero amounts', () => {
      const transactions = [
        { date: '2025-01-15', amount: 0, type: 'expense' }
      ];

      const result = report.generateData(transactions, {});

      expect(result.months).toHaveLength(1);
      expect(result.months[0].expenses.total).toBe(0);
    });

    it('should handle transactions spanning multiple years', () => {
      const transactions = [
        { date: '2024-12-15', amount: -100, type: 'expense' },
        { date: '2025-01-15', amount: -100, type: 'expense' }
      ];

      const result = report.generateData(transactions, {});

      expect(result.months).toHaveLength(2);
      expect(result.months[0].year).toBe(2024);
      expect(result.months[1].year).toBe(2025);
    });

    it('should handle negative and positive amounts correctly', () => {
      const transactions = [
        { date: '2025-01-15', amount: -100, type: 'expense' },  // Expense with negative
        { date: '2025-01-15', amount: 100, type: 'expense' }    // Expense with positive (unusual but valid)
      ];

      const result = report.generateData(transactions, {});

      // Both should be counted as positive expense amounts
      expect(result.months[0].expenses.total).toBe(200);
    });
  });
});
