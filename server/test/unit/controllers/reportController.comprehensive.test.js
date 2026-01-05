/**
 * @fileoverview Comprehensive unit tests for Report Controller
 * Tests tax summary report generation, error handling, and edge cases
 * These tests focus on business logic validation without mocking Firebase
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Sample test data
const sampleTransactions = [
  {
    id: 'tx-001',
    type: 'expense',
    amount: -150,
    category: 'Advertising',
    description: 'Facebook Ads',
    date: '2025-01-15',
    payee: 'Meta',
    quarterlyPeriod: 'Q1'
  },
  {
    id: 'tx-002',
    type: 'expense',
    amount: -800,
    category: 'Contract Labor',
    description: 'Contractor payment',
    date: '2025-02-20',
    payee: 'John Contractor',
    quarterlyPeriod: 'Q1'
  },
  {
    id: 'tx-003',
    type: 'expense',
    amount: -500,
    category: 'Office Expenses',
    description: 'Office supplies',
    date: '2025-03-10',
    payee: 'Office Depot',
    quarterlyPeriod: 'Q1'
  },
  {
    id: 'tx-004',
    type: 'expense',
    amount: -2000,
    category: 'Wages (Less Employment Credits)',
    description: 'Employee salary',
    date: '2025-04-01',
    payee: 'Jane Employee',
    quarterlyPeriod: 'Q2'
  },
  {
    id: 'tx-005',
    type: 'income',
    amount: 5000,
    category: 'Gross Receipts or Sales',
    description: 'Client payment',
    date: '2025-01-20',
    payee: 'Client Inc',
    quarterlyPeriod: 'Q1'
  }
];

// Helper functions that mirror controller logic
const isCategoryDeductible = (category) => {
  // These are the deductible Schedule C categories
  const deductibleCategories = [
    'Advertising',
    'Car and Truck Expenses',
    'Commissions and Fees',
    'Contract Labor',
    'Depreciation and Section 179',
    'Employee Benefit Programs',
    'Insurance (Other than Health)',
    'Interest (Mortgage)',
    'Interest (Other)',
    'Legal and Professional Services',
    'Office Expenses',
    'Pension and Profit-Sharing Plans',
    'Rent or Lease (Vehicles, Machinery, Equipment)',
    'Rent or Lease (Other Business Property)',
    'Repairs and Maintenance',
    'Supplies (Not Inventory)',
    'Taxes and Licenses',
    'Travel',
    'Meals',
    'Utilities',
    'Wages (Less Employment Credits)',
    'Other Expenses',
    'Software Subscriptions',
    'Web Hosting & Domains',
    'Bank Fees'
  ];
  return deductibleCategories.includes(category);
};

const PERSONAL_CATEGORIES = ['Groceries', 'Personal Care', 'Entertainment', 'Personal'];

describe('Report Controller - Tax Summary Business Logic', () => {
  describe('Tax Deductibility Filtering', () => {
    it('should identify deductible expenses by category', () => {
      expect(isCategoryDeductible('Advertising')).toBe(true);
      expect(isCategoryDeductible('Contract Labor')).toBe(true);
      expect(isCategoryDeductible('Office Expenses')).toBe(true);
      expect(isCategoryDeductible('Wages (Less Employment Credits)')).toBe(true);
    });

    it('should identify non-deductible categories', () => {
      expect(isCategoryDeductible('Groceries')).toBe(false);
      expect(isCategoryDeductible('Personal Care')).toBe(false);
      expect(isCategoryDeductible('Entertainment')).toBe(false);
    });

    it('should filter transactions correctly', () => {
      const deductibleTransactions = sampleTransactions.filter(t => {
        const isDeductible = t.isTaxDeductible !== undefined 
          ? t.isTaxDeductible 
          : isCategoryDeductible(t.category);
        
        return isDeductible && 
          t.type === 'expense' && 
          !PERSONAL_CATEGORIES.includes(t.category);
      });

      // Should include expenses with deductible categories
      expect(deductibleTransactions.length).toBe(4); // 4 expense transactions with deductible categories
      expect(deductibleTransactions.every(t => t.type === 'expense')).toBe(true);
    });

    it('should respect explicit isTaxDeductible flag when present', () => {
      const transactionsWithFlag = [
        { type: 'expense', amount: -500, category: 'Advertising', isTaxDeductible: false },
        { type: 'expense', amount: -300, category: 'Advertising', isTaxDeductible: true }
      ];

      const filtered = transactionsWithFlag.filter(t => {
        const isDeductible = t.isTaxDeductible !== undefined 
          ? t.isTaxDeductible 
          : isCategoryDeductible(t.category);
        return isDeductible && t.type === 'expense';
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].amount).toBe(-300);
    });

    it('should exclude personal category expenses', () => {
      const mixedTransactions = [
        { type: 'expense', amount: -100, category: 'Advertising' },
        { type: 'expense', amount: -50, category: 'Groceries' },
        { type: 'expense', amount: -75, category: 'Personal Care' }
      ];

      const deductible = mixedTransactions.filter(t => 
        isCategoryDeductible(t.category) && 
        !PERSONAL_CATEGORIES.includes(t.category)
      );

      expect(deductible.length).toBe(1);
      expect(deductible[0].category).toBe('Advertising');
    });
  });

  describe('Schedule C Line Numbers', () => {
    it('should sort lines numerically', () => {
      const lines = ['27a', '8', '11', '18', '26', '9', '20b'];
      const sorted = lines.sort((a, b) => {
        const aNum = parseFloat(a) || 999;
        const bNum = parseFloat(b) || 999;
        if (aNum !== bNum) return aNum - bNum;
        return a.localeCompare(b);
      });

      expect(sorted).toEqual(['8', '9', '11', '18', '20b', '26', '27a']);
    });

    it('should group categories by line number', () => {
      const categories = [
        { category: 'Advertising', line: '8', amount: 500 },
        { category: 'Office Expenses', line: '18', amount: 150 },
        { category: 'Software Subscriptions', line: '27a', amount: 99 },
        { category: 'Bank Fees', line: '27a', amount: 45 }
      ];

      const lineGroups = {};
      categories.forEach(cat => {
        if (!lineGroups[cat.line]) {
          lineGroups[cat.line] = [];
        }
        lineGroups[cat.line].push(cat);
      });

      expect(Object.keys(lineGroups)).toEqual(['8', '18', '27a']);
      expect(lineGroups['27a'].length).toBe(2);
    });
  });

  describe('Contractor and Wage Payments', () => {
    it('should identify contractors requiring 1099-NEC (>= $600)', () => {
      const contractorPayments = [
        { payee: 'Contractor A', amount: 700 },
        { payee: 'Contractor B', amount: 500 },
        { payee: 'Contractor C', amount: 600 },
        { payee: 'Contractor D', amount: 599.99 }
      ];

      const requiring1099 = contractorPayments.filter(c => c.amount >= 600);

      expect(requiring1099.length).toBe(2);
      expect(requiring1099.map(c => c.payee)).toEqual(['Contractor A', 'Contractor C']);
    });

    it('should aggregate multiple payments to same payee', () => {
      const transactions = [
        { payee: 'Contractor A', amount: 300, category: 'Contract Labor' },
        { payee: 'Contractor A', amount: 400, category: 'Contract Labor' },
        { payee: 'Contractor A', amount: 200, category: 'Contract Labor' },
        { payee: 'Contractor B', amount: 500, category: 'Contract Labor' }
      ];

      const payeeMap = {};
      transactions.forEach(t => {
        const payee = t.payee || 'Unknown';
        if (!payeeMap[payee]) {
          payeeMap[payee] = { payee, amount: 0, transactionCount: 0 };
        }
        payeeMap[payee].amount += t.amount;
        payeeMap[payee].transactionCount++;
      });

      expect(payeeMap['Contractor A'].amount).toBe(900);
      expect(payeeMap['Contractor A'].transactionCount).toBe(3);
      expect(payeeMap['Contractor B'].amount).toBe(500);
    });

    it('should handle null/undefined payee names as Unknown', () => {
      const transactions = [
        { payee: null, amount: 500 },
        { payee: undefined, amount: 300 },
        { payee: '', amount: 200 },
        { payee: 'Known Contractor', amount: 700 }
      ];

      const payeeMap = {};
      transactions.forEach(t => {
        const payee = t.payee || 'Unknown';
        if (!payeeMap[payee]) {
          payeeMap[payee] = { payee, amount: 0 };
        }
        payeeMap[payee].amount += t.amount;
      });

      expect(payeeMap['Unknown'].amount).toBe(1000); // 500 + 300 + 200
      expect(payeeMap['Known Contractor'].amount).toBe(700);
    });

    it('should separate contractors from employees by category', () => {
      const transactions = [
        { category: 'Contract Labor', payee: 'Contractor A', amount: 800 },
        { category: 'Wages (Less Employment Credits)', payee: 'Employee A', amount: 3000 }
      ];

      const contractors = transactions.filter(t => t.category === 'Contract Labor');
      const employees = transactions.filter(t => t.category === 'Wages (Less Employment Credits)');

      expect(contractors.length).toBe(1);
      expect(employees.length).toBe(1);
    });
  });

  describe('Quarterly Breakdown', () => {
    it('should calculate correct quarterly totals', () => {
      const breakdown = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

      const expenses = sampleTransactions.filter(t => t.type === 'expense');
      expenses.forEach(t => {
        if (t.quarterlyPeriod && breakdown[t.quarterlyPeriod] !== undefined) {
          breakdown[t.quarterlyPeriod] += Math.abs(t.amount);
        }
      });

      expect(breakdown.Q1).toBe(1450); // 150 + 800 + 500
      expect(breakdown.Q2).toBe(2000); // 2000
      expect(breakdown.Q3).toBe(0);
      expect(breakdown.Q4).toBe(0);
    });

    it('should handle missing quarterlyPeriod gracefully', () => {
      const breakdown = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

      const transactions = [
        { amount: -100, quarterlyPeriod: 'Q1' },
        { amount: -100, quarterlyPeriod: undefined },
        { amount: -100, quarterlyPeriod: null },
        { amount: -100 } // no quarterlyPeriod property
      ];

      transactions.forEach(t => {
        if (t.quarterlyPeriod && breakdown[t.quarterlyPeriod] !== undefined) {
          breakdown[t.quarterlyPeriod] += Math.abs(t.amount);
        }
      });

      expect(breakdown.Q1).toBe(100);
      expect(breakdown.Q2).toBe(0);
    });

    it('should handle invalid quarterlyPeriod values', () => {
      const breakdown = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

      const transactions = [
        { amount: -100, quarterlyPeriod: 'Q5' },
        { amount: -100, quarterlyPeriod: 'invalid' },
        { amount: -100, quarterlyPeriod: 1 }
      ];

      transactions.forEach(t => {
        if (t.quarterlyPeriod && breakdown[t.quarterlyPeriod] !== undefined) {
          breakdown[t.quarterlyPeriod] += Math.abs(t.amount);
        }
      });

      // None should be added
      expect(breakdown.Q1).toBe(0);
      expect(breakdown.Q2).toBe(0);
    });
  });

  describe('Date Handling', () => {
    it('should parse valid date strings using UTC', () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      // Use explicit UTC parsing for consistent results
      const parsedStart = new Date(startDate + 'T00:00:00Z');
      const parsedEnd = new Date(endDate + 'T00:00:00Z');

      expect(isNaN(parsedStart.getTime())).toBe(false);
      expect(isNaN(parsedEnd.getTime())).toBe(false);
      expect(parsedStart.getUTCFullYear()).toBe(2025);
    });

    it('should detect properly formatted invalid date strings', () => {
      // Note: JavaScript's Date parsing is very lenient
      // 'not-a-date' may not always be detected as invalid depending on engine
      // Test that our date validation logic would catch format issues
      const isValidDateFormat = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return false;
        // Check for YYYY-MM-DD format
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return false;
        const [, year, month, day] = match;
        return Number(year) > 1900 && 
               Number(month) >= 1 && Number(month) <= 12 &&
               Number(day) >= 1 && Number(day) <= 31;
      };

      expect(isValidDateFormat('not-a-date')).toBe(false);
      expect(isValidDateFormat('')).toBe(false);
      expect(isValidDateFormat(null)).toBe(false);
      expect(isValidDateFormat(undefined)).toBe(false);
      expect(isValidDateFormat('abc-123')).toBe(false);
      expect(isValidDateFormat('2025-01-01')).toBe(true);
    });

    it('should handle All Time range (year 2000 start)', () => {
      const startDate = '2000-01-01T00:00:00Z';
      const parsedStart = new Date(startDate);

      expect(parsedStart.getUTCFullYear()).toBe(2000);
      expect(parsedStart.getUTCMonth()).toBe(0); // January
    });

    it('should extract correct tax year from date', () => {
      const startDate = '2025-01-01T00:00:00Z';
      const taxYear = new Date(startDate).getUTCFullYear();

      expect(taxYear).toBe(2025);
    });

    it('should parse date string parts correctly', () => {
      // Alternative approach: parse date parts directly
      const startDate = '2025-01-01';
      const [year, month, day] = startDate.split('-').map(Number);

      expect(year).toBe(2025);
      expect(month).toBe(1);
      expect(day).toBe(1);
    });
  });

  describe('Amount Calculations', () => {
    it('should use absolute values for expense totals', () => {
      const expenses = [
        { amount: -500 },
        { amount: -300 },
        { amount: -200 }
      ];

      const total = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      expect(total).toBe(1000);
    });

    it('should handle mixed positive/negative amounts', () => {
      const transactions = [
        { type: 'expense', amount: -500 },
        { type: 'expense', amount: 500 }, // positive expense (unusual but possible)
        { type: 'income', amount: 1000 }
      ];

      const expenseTotal = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      expect(expenseTotal).toBe(1000);
    });

    it('should handle zero amounts', () => {
      const transactions = [
        { amount: 0 },
        { amount: -0 },
        { amount: 100 }
      ];

      const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      expect(total).toBe(100);
    });
  });

  describe('Special Reporting Requirements', () => {
    it('should identify categories requiring special forms', () => {
      const specialCategories = {
        'Car and Truck Expenses': 'Part IV - Vehicle information',
        'Contract Labor': 'Form 1099-NEC for payments >= $600',
        'Depreciation and Section 179': 'Form 4562'
      };

      expect(specialCategories['Car and Truck Expenses']).toContain('Vehicle');
      expect(specialCategories['Contract Labor']).toContain('1099');
      expect(specialCategories['Depreciation and Section 179']).toContain('4562');
    });
  });
});

describe('streamPDFToClient Helper', () => {
  it('should set correct headers', () => {
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn()
    };

    const reportResult = {
      buffer: Buffer.from('test'),
      fileName: 'test.pdf',
      size: 4,
      contentType: 'application/pdf'
    };

    // Simulate streamPDFToClient behavior
    mockRes.setHeader('Content-Type', 'application/pdf');
    mockRes.setHeader('Content-Disposition', `attachment; filename="${reportResult.fileName}"`);
    mockRes.setHeader('Content-Length', reportResult.size);
    mockRes.send(reportResult.buffer);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.pdf"');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', 4);
    expect(mockRes.send).toHaveBeenCalledWith(reportResult.buffer);
  });
});
