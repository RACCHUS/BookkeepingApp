/**
 * @fileoverview Monthly Summary Report Generator
 * @description Generates month-by-month financial summary with income and expense breakdowns
 * @version 1.0.0
 */

import { BaseReportGenerator } from './BaseReportGenerator.js';
import { CATEGORY_GROUPS } from '../../../shared/constants/categories.js';

/**
 * Monthly Summary Report Generator
 * Groups transactions by month with income subcategories and expense subcategories
 */
class MonthlySummaryReport extends BaseReportGenerator {
  constructor() {
    super();
    this.reportType = 'monthly-summary';
  }

  /**
   * Generate monthly summary report data (JSON format for charts)
   * @param {Array} transactions - Transaction list
   * @param {Object} options - Report options
   * @returns {Object} Monthly summary data
   */
  generateData(transactions, options = {}) {
    const { startDate, endDate } = options;

    if (!transactions || transactions.length === 0) {
      return {
        months: [],
        totals: {
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
          totalTransactions: 0
        },
        incomeCategories: {},
        expenseCategories: {},
        period: { startDate, endDate }
      };
    }

    // Process transactions into monthly buckets
    const monthlyData = this.processTransactionsByMonth(transactions);

    // Calculate totals and category breakdowns
    const totals = this.calculateTotals(monthlyData);
    const incomeCategories = this.aggregateCategoriesByType(transactions, 'income');
    const expenseCategories = this.aggregateCategoriesByType(transactions, 'expense');

    return {
      months: monthlyData,
      totals,
      incomeCategories,
      expenseCategories,
      period: { startDate, endDate }
    };
  }

  /**
   * Process transactions into monthly buckets
   * @param {Array} transactions - Transaction list
   * @returns {Array} Monthly data array
   */
  processTransactionsByMonth(transactions) {
    const monthlyMap = new Map();

    transactions.forEach(transaction => {
      const date = this.parseDate(transaction.date);
      if (!date) return;

      // Use UTC methods to avoid timezone issues
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthLabel = this.formatMonthLabel(date);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          monthLabel,
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          income: {
            total: 0,
            categories: {}
          },
          expenses: {
            total: 0,
            categories: {}
          },
          netIncome: 0,
          transactionCount: 0
        });
      }

      const monthData = monthlyMap.get(monthKey);
      const amount = Math.abs(parseFloat(transaction.amount) || 0);
      const category = transaction.category || 'Uncategorized';
      const isIncome = transaction.type === 'income' || this.isIncomeCategory(category);

      if (isIncome) {
        monthData.income.total += amount;
        monthData.income.categories[category] = (monthData.income.categories[category] || 0) + amount;
      } else {
        monthData.expenses.total += amount;
        monthData.expenses.categories[category] = (monthData.expenses.categories[category] || 0) + amount;
      }

      monthData.netIncome = monthData.income.total - monthData.expenses.total;
      monthData.transactionCount++;
    });

    // Sort by month key and return as array
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }

  /**
   * Calculate overall totals from monthly data
   * @param {Array} monthlyData - Monthly data array
   * @returns {Object} Totals
   */
  calculateTotals(monthlyData) {
    return monthlyData.reduce((totals, month) => {
      return {
        totalIncome: totals.totalIncome + month.income.total,
        totalExpenses: totals.totalExpenses + month.expenses.total,
        netIncome: totals.netIncome + month.netIncome,
        totalTransactions: totals.totalTransactions + month.transactionCount
      };
    }, {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      totalTransactions: 0
    });
  }

  /**
   * Aggregate categories by transaction type across all transactions
   * @param {Array} transactions - Transaction list
   * @param {string} type - 'income' or 'expense'
   * @returns {Object} Category totals
   */
  aggregateCategoriesByType(transactions, type) {
    const categories = {};

    transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const isIncome = transaction.type === 'income' || this.isIncomeCategory(category);
      const amount = Math.abs(parseFloat(transaction.amount) || 0);

      if ((type === 'income' && isIncome) || (type === 'expense' && !isIncome)) {
        categories[category] = (categories[category] || 0) + amount;
      }
    });

    // Sort by amount descending
    return Object.fromEntries(
      Object.entries(categories).sort(([, a], [, b]) => b - a)
    );
  }

  /**
   * Check if a category is an income category
   * @param {string} category - Category name
   * @returns {boolean}
   */
  isIncomeCategory(category) {
    return CATEGORY_GROUPS.INCOME?.includes(category) || false;
  }

  /**
   * Parse date from various formats
   * @param {*} date - Date value
   * @returns {Date|null}
   */
  parseDate(date) {
    if (!date) return null;

    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }

    // Handle Date object
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle string
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Handle timestamp number
    if (typeof date === 'number') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  /**
   * Format month label for display
   * @param {Date} date - Date object
   * @returns {string} Formatted month label (e.g., "Jan 2025")
   */
  formatMonthLabel(date) {
    // Use UTC to avoid timezone shifts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }

  /**
   * Generate PDF report
   * @param {Array} transactions - Transaction list
   * @param {Object} summary - Pre-calculated summary (optional)
   * @param {Object} options - Report options
   * @returns {Promise<Object>} PDF buffer and metadata
   */
  async generate(transactions, summary, options = {}) {
    const {
      title = 'Monthly Financial Summary',
      dateRange = null,
      userId = 'user'
    } = options;

    const monthlyData = this.generateData(transactions, options);
    const fileName = `monthly-summary-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title,
      dateRange,
      transactions,
      summary: monthlyData,
      includeDetails: true
    });
  }

  /**
   * Add report content to PDF document
   * @param {PDFDocument} doc - PDF document
   * @param {Array} transactions - Transaction list
   * @param {Object} summary - Summary data
   * @param {Object} options - Options
   */
  addReportContent(doc, transactions, summary, options = {}) {
    const monthlyData = summary.months || this.processTransactionsByMonth(transactions);
    const totals = summary.totals || this.calculateTotals(monthlyData);

    // Overall Summary Section
    this.addOverallSummary(doc, totals);

    // Monthly Breakdown
    this.addMonthlyBreakdown(doc, monthlyData);

    // Income Categories Summary
    this.addCategorySummary(doc, 'Income Categories', summary.incomeCategories || {});

    // Expense Categories Summary
    this.addCategorySummary(doc, 'Expense Categories', summary.expenseCategories || {});
  }

  /**
   * Add overall summary section
   */
  addOverallSummary(doc, totals) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Overall Summary', { underline: true });

    doc.moveDown(0.5);

    const summaryItems = [
      { label: 'Total Income:', value: this.formatCurrency(totals.totalIncome) },
      { label: 'Total Expenses:', value: this.formatCurrency(totals.totalExpenses) },
      { label: 'Net Income:', value: this.formatCurrency(totals.netIncome) },
      { label: 'Total Transactions:', value: (totals.totalTransactions || 0).toString() }
    ];

    doc.fontSize(11).font('Helvetica');
    summaryItems.forEach(item => {
      doc.text(`${item.label} ${item.value}`);
    });

    doc.moveDown(1);
  }

  /**
   * Add monthly breakdown table
   */
  addMonthlyBreakdown(doc, monthlyData) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Monthly Breakdown', { underline: true });

    doc.moveDown(0.5);

    if (monthlyData.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No data available for the selected period.');
      doc.moveDown(1);
      return;
    }

    // Table headers
    const tableTop = doc.y;
    const colWidths = { month: 100, income: 100, expenses: 100, net: 100 };

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Month', 50, tableTop);
    doc.text('Income', 150, tableTop);
    doc.text('Expenses', 260, tableTop);
    doc.text('Net Income', 370, tableTop);

    doc.moveTo(50, tableTop + 15)
       .lineTo(500, tableTop + 15)
       .stroke();

    // Table rows
    let yPos = tableTop + 25;
    doc.fontSize(10).font('Helvetica');

    monthlyData.forEach(month => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      doc.text(month.monthLabel, 50, yPos);
      doc.text(this.formatCurrency(month.income.total), 150, yPos);
      doc.text(this.formatCurrency(month.expenses.total), 260, yPos);
      
      // Color code net income
      const netColor = month.netIncome >= 0 ? 'green' : 'red';
      doc.fillColor(netColor).text(this.formatCurrency(month.netIncome), 370, yPos);
      doc.fillColor('black');

      yPos += 18;
    });

    doc.y = yPos + 10;
    doc.moveDown(1);
  }

  /**
   * Add category summary section
   */
  addCategorySummary(doc, title, categories) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(title, { underline: true });

    doc.moveDown(0.5);

    const categoryEntries = Object.entries(categories);
    if (categoryEntries.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No data available.');
      doc.moveDown(1);
      return;
    }

    doc.fontSize(10).font('Helvetica');
    categoryEntries.slice(0, 15).forEach(([category, amount]) => {
      doc.text(`${category}: ${this.formatCurrency(amount)}`);
    });

    if (categoryEntries.length > 15) {
      doc.text(`... and ${categoryEntries.length - 15} more categories`);
    }

    doc.moveDown(1);
  }

  /**
   * Format currency value
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

export const monthlySummaryReport = new MonthlySummaryReport();
export default MonthlySummaryReport;
