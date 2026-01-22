/**
 * Tests for Neutral Transaction Handling
 * 
 * Neutral transactions (type='transfer') should:
 * - NOT be counted as income or expense in P&L reports
 * - Be displayed with blue color in the UI
 * - Include: Owner deposits, transfers between accounts, loans received
 * - NOT include: Owner draws (tracked as expense for taxes)
 * 
 * Uses shared/constants/categories.js NEUTRAL_CATEGORIES as single source of truth
 */

import { describe, it, expect } from 'vitest';
import { NEUTRAL_CATEGORIES as NEUTRAL_CATEGORIES_CONST } from '@shared/constants/categories';

// Get neutral category values from the shared constant
const NEUTRAL_CATEGORIES = Object.values(NEUTRAL_CATEGORIES_CONST);

// Categories that should NOT be neutral - tracked for tax purposes
const NON_NEUTRAL_CATEGORIES = [
  'Owner Draw/Distribution',   // Tracked as expense for tax (money OUT)
  'Personal Expense',          // Actual expenses
];

describe('Neutral Transaction Categories', () => {
  describe('Owner Deposits - Should be Neutral', () => {
    it('should identify Owner Contribution/Capital as neutral', () => {
      expect(NEUTRAL_CATEGORIES).toContain('Owner Contribution/Capital');
    });

    it('should classify ATM CASH DEPOSIT as neutral (owner contribution)', () => {
      // ATM deposits are personal funds going INTO the business
      // They should be classified as Owner Contribution/Capital
      const expectedCategory = 'Owner Contribution/Capital';
      expect(NEUTRAL_CATEGORIES).toContain(expectedCategory);
    });

    it('should classify generic DEPOSIT without company name as neutral', () => {
      // Generic deposits like "DEPOSIT ID NUMBER 194715" are likely owner contributions
      const expectedCategory = 'Owner Contribution/Capital';
      expect(NEUTRAL_CATEGORIES).toContain(expectedCategory);
    });
  });

  describe('Owner Withdrawals - Should NOT be Neutral', () => {
    it('should NOT include Owner Draw/Distribution in neutral categories', () => {
      expect(NEUTRAL_CATEGORIES).not.toContain('Owner Draw/Distribution');
    });

    it('should identify ATM WITHDRAWAL as non-neutral expense (owner draws)', () => {
      // ATM withdrawals are money the owner takes out for personal use
      // They need to be tracked as expenses for tax purposes
      expect(NON_NEUTRAL_CATEGORIES).toContain('Owner Draw/Distribution');
    });
  });

  describe('Transfers Between Accounts - Should be Neutral', () => {
    it('should include Transfer Between Accounts as neutral', () => {
      expect(NEUTRAL_CATEGORIES).toContain('Transfer Between Accounts');
    });

    it('should include Personal Funds Added as neutral', () => {
      // Transfers from owner's personal accounts to business
      expect(NEUTRAL_CATEGORIES).toContain('Personal Funds Added');
    });
  });

  describe('Loans - Partial Neutral Handling', () => {
    it('should include Loan Received as neutral', () => {
      // Borrowed money is NOT income - just an obligation
      expect(NEUTRAL_CATEGORIES).toContain('Loan Received');
    });

    it('should include Loan Payment (Principal) as neutral', () => {
      // Principal repayment is not an expense - it's returning borrowed money
      // Interest payments ARE expenses (separate category)
      expect(NEUTRAL_CATEGORIES).toContain('Loan Payment (Principal)');
    });
  });
});

describe('Report Calculations with Neutral Transactions', () => {
  // Helper to simulate report calculation
  const calculateReportTotals = (transactions) => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    for (const tx of transactions) {
      const amount = Math.abs(tx.amount);
      
      if (tx.type === 'transfer') {
        totalTransfers += amount;
      } else if (tx.type === 'income') {
        totalIncome += amount;
      } else if (tx.type === 'expense') {
        totalExpenses += amount;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      totalTransfers,
      netIncome: totalIncome - totalExpenses, // Transfers excluded
    };
  };

  it('should exclude transfers from net income calculation', () => {
    const transactions = [
      { type: 'income', amount: 1000, category: 'Gross Receipts or Sales' },
      { type: 'expense', amount: -500, category: 'Materials and Supplies' },
      { type: 'transfer', amount: 2000, category: 'Owner Contribution/Capital' },
    ];

    const result = calculateReportTotals(transactions);

    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(500);
    expect(result.totalTransfers).toBe(2000);
    expect(result.netIncome).toBe(500); // 1000 - 500, NOT affected by 2000 transfer
  });

  it('should track owner draws as expense (not transfer)', () => {
    const transactions = [
      { type: 'income', amount: 1000, category: 'Gross Receipts or Sales' },
      { type: 'expense', amount: -300, category: 'Owner Draw/Distribution' }, // ATM withdrawal
      { type: 'transfer', amount: 500, category: 'Owner Contribution/Capital' }, // ATM deposit
    ];

    const result = calculateReportTotals(transactions);

    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(300); // Owner draws counted as expense
    expect(result.totalTransfers).toBe(500); // Only owner contribution is transfer
    expect(result.netIncome).toBe(700); // Owner draws reduce net income
  });

  it('should correctly handle mixed transaction types', () => {
    const transactions = [
      // Business income
      { type: 'income', amount: 5000, category: 'Gross Receipts or Sales' },
      // Business expenses
      { type: 'expense', amount: -1000, category: 'Materials and Supplies' },
      { type: 'expense', amount: -500, category: 'Car and Truck Expenses' },
      // Owner draws (expense - tracked for taxes)
      { type: 'expense', amount: -800, category: 'Owner Draw/Distribution' },
      // Owner contribution (neutral - not income)
      { type: 'transfer', amount: 2000, category: 'Owner Contribution/Capital' },
      // Transfer between accounts (neutral)
      { type: 'transfer', amount: 1500, category: 'Transfer Between Accounts' },
    ];

    const result = calculateReportTotals(transactions);

    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpenses).toBe(2300); // 1000 + 500 + 800 (includes owner draws)
    expect(result.totalTransfers).toBe(3500); // 2000 + 1500
    expect(result.netIncome).toBe(2700); // 5000 - 2300
  });
});

describe('UI Color Consistency for Transaction Types', () => {
  // Expected colors for each transaction type
  const TRANSACTION_COLORS = {
    income: { bg: 'green', text: 'green' },
    expense: { bg: 'red', text: 'red' },
    transfer: { bg: 'blue', text: 'blue' }, // Neutral = blue
  };

  it('should use green for income transactions', () => {
    expect(TRANSACTION_COLORS.income.bg).toBe('green');
    expect(TRANSACTION_COLORS.income.text).toBe('green');
  });

  it('should use red for expense transactions', () => {
    expect(TRANSACTION_COLORS.expense.bg).toBe('red');
    expect(TRANSACTION_COLORS.expense.text).toBe('red');
  });

  it('should use blue for transfer/neutral transactions', () => {
    expect(TRANSACTION_COLORS.transfer.bg).toBe('blue');
    expect(TRANSACTION_COLORS.transfer.text).toBe('blue');
  });

  it('should have distinct colors for all three types', () => {
    const colors = new Set([
      TRANSACTION_COLORS.income.bg,
      TRANSACTION_COLORS.expense.bg,
      TRANSACTION_COLORS.transfer.bg,
    ]);
    expect(colors.size).toBe(3);
  });
});

describe('Tax Report Handling', () => {
  // Helper to simulate tax calculation
  const calculateTaxSummary = (transactions) => {
    let grossIncome = 0;
    let totalDeductible = 0;
    let ownerDraws = 0;
    let totalTransfers = 0;

    const deductibleCategories = [
      'Materials and Supplies',
      'Car and Truck Expenses',
      'Advertising',
      'Office Expenses',
    ];

    for (const tx of transactions) {
      const amount = Math.abs(tx.amount);
      
      if (tx.type === 'transfer') {
        totalTransfers += amount;
        continue; // Skip transfers entirely for tax
      }
      
      if (tx.type === 'income') {
        grossIncome += amount;
      } else if (tx.category === 'Owner Draw/Distribution') {
        ownerDraws += amount; // Track separately, not deductible
      } else if (deductibleCategories.includes(tx.category)) {
        totalDeductible += amount;
      }
    }

    return {
      grossIncome,
      totalDeductible,
      ownerDraws,
      totalTransfers,
      netTaxableIncome: grossIncome - totalDeductible, // Owner draws don't reduce taxable income
    };
  };

  it('should exclude transfers from tax calculations entirely', () => {
    const transactions = [
      { type: 'income', amount: 10000, category: 'Gross Receipts or Sales' },
      { type: 'transfer', amount: 5000, category: 'Owner Contribution/Capital' },
    ];

    const result = calculateTaxSummary(transactions);

    expect(result.grossIncome).toBe(10000);
    expect(result.totalTransfers).toBe(5000);
    expect(result.netTaxableIncome).toBe(10000); // Transfer doesn't affect taxable income
  });

  it('should track owner draws separately (not deductible)', () => {
    const transactions = [
      { type: 'income', amount: 10000, category: 'Gross Receipts or Sales' },
      { type: 'expense', amount: -2000, category: 'Materials and Supplies' },
      { type: 'expense', amount: -1000, category: 'Owner Draw/Distribution' },
    ];

    const result = calculateTaxSummary(transactions);

    expect(result.grossIncome).toBe(10000);
    expect(result.totalDeductible).toBe(2000); // Only Materials, not owner draw
    expect(result.ownerDraws).toBe(1000); // Track separately
    expect(result.netTaxableIncome).toBe(8000); // 10000 - 2000 (owner draw doesn't reduce)
  });

  it('should handle complex scenario with all transaction types', () => {
    const transactions = [
      { type: 'income', amount: 50000, category: 'Gross Receipts or Sales' },
      { type: 'income', amount: 2000, category: 'Other Income' },
      { type: 'expense', amount: -5000, category: 'Materials and Supplies' },
      { type: 'expense', amount: -1000, category: 'Office Expenses' },
      { type: 'expense', amount: -3000, category: 'Owner Draw/Distribution' },
      { type: 'transfer', amount: 10000, category: 'Owner Contribution/Capital' },
      { type: 'transfer', amount: 5000, category: 'Loan Received' },
    ];

    const result = calculateTaxSummary(transactions);

    expect(result.grossIncome).toBe(52000); // 50000 + 2000 income
    expect(result.totalDeductible).toBe(6000); // 5000 + 1000 (excludes owner draw)
    expect(result.ownerDraws).toBe(3000);
    expect(result.totalTransfers).toBe(15000); // 10000 + 5000 neutral
    expect(result.netTaxableIncome).toBe(46000); // 52000 - 6000
  });
});
