/**
 * @fileoverview Monthly Checks Report Generator
 * @description Generates month-by-month check payment summary
 * @version 1.0.0
 */

import { BaseReportGenerator } from './BaseReportGenerator.js';
import { CHECK_TYPES } from '../../../shared/schemas/checkSchema.js';

/**
 * Monthly Checks Report Generator
 * Groups check payments by month with totals and counts
 */
class MonthlyChecksReport extends BaseReportGenerator {
  constructor() {
    super();
    this.reportType = 'monthly-checks';
  }

  /**
   * Generate monthly checks report data (JSON format for charts)
   * @param {Array} checks - Check records list
   * @param {Object} options - Report options
   * @returns {Object} Monthly checks data
   */
  generateData(checks, options = {}) {
    const { startDate, endDate } = options;

    if (!checks || checks.length === 0) {
      return {
        months: [],
        totals: {
          totalChecks: 0,
          totalAmount: 0,
          totalIncome: 0,
          totalExpense: 0,
          incomeCount: 0,
          expenseCount: 0
        },
        period: { startDate, endDate }
      };
    }

    // Process checks into monthly buckets
    const monthlyData = this.processChecksByMonth(checks);

    // Calculate totals
    const totals = this.calculateTotals(monthlyData);

    return {
      months: monthlyData,
      totals,
      period: { startDate, endDate }
    };
  }

  /**
   * Process checks into monthly buckets
   * @param {Array} checks - Check records
   * @returns {Array} Monthly data array
   */
  processChecksByMonth(checks) {
    const monthlyMap = new Map();

    checks.forEach(check => {
      const date = this.parseDate(check.date);
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
          totalChecks: 0,
          totalAmount: 0,
          income: {
            count: 0,
            amount: 0,
            byPayee: {}
          },
          expense: {
            count: 0,
            amount: 0,
            byPayee: {}
          },
          byStatus: {
            pending: 0,
            cleared: 0,
            bounced: 0,
            voided: 0
          }
        });
      }

      const monthData = monthlyMap.get(monthKey);
      const amount = Math.abs(parseFloat(check.amount) || 0);
      const isIncome = check.type === CHECK_TYPES.INCOME || check.type === 'income';
      const payee = check.payee || check.description || 'Unknown';

      monthData.totalChecks++;
      monthData.totalAmount += amount;

      if (isIncome) {
        monthData.income.count++;
        monthData.income.amount += amount;
        monthData.income.byPayee[payee] = (monthData.income.byPayee[payee] || 0) + amount;
      } else {
        monthData.expense.count++;
        monthData.expense.amount += amount;
        monthData.expense.byPayee[payee] = (monthData.expense.byPayee[payee] || 0) + amount;
      }

      // Track by status
      const status = (check.status || 'pending').toLowerCase();
      if (monthData.byStatus[status] !== undefined) {
        monthData.byStatus[status]++;
      }
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
        totalChecks: totals.totalChecks + month.totalChecks,
        totalAmount: totals.totalAmount + month.totalAmount,
        totalIncome: totals.totalIncome + month.income.amount,
        totalExpense: totals.totalExpense + month.expense.amount,
        incomeCount: totals.incomeCount + month.income.count,
        expenseCount: totals.expenseCount + month.expense.count
      };
    }, {
      totalChecks: 0,
      totalAmount: 0,
      totalIncome: 0,
      totalExpense: 0,
      incomeCount: 0,
      expenseCount: 0
    });
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
   * @param {Array} checks - Check records
   * @param {Object} summary - Pre-calculated summary (optional)
   * @param {Object} options - Report options
   * @returns {Promise<Object>} PDF buffer and metadata
   */
  async generate(checks, summary, options = {}) {
    const {
      title = 'Monthly Checks Report',
      dateRange = null,
      userId = 'user'
    } = options;

    const monthlyData = this.generateData(checks, options);
    const fileName = `monthly-checks-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title,
      dateRange,
      transactions: checks,
      summary: monthlyData,
      includeDetails: true
    });
  }

  /**
   * Add report content to PDF document
   * @param {PDFDocument} doc - PDF document
   * @param {Array} checks - Check records
   * @param {Object} summary - Summary data
   * @param {Object} options - Options
   */
  addReportContent(doc, checks, summary, options = {}) {
    const monthlyData = summary.months || this.processChecksByMonth(checks);
    const totals = summary.totals || this.calculateTotals(monthlyData);

    // Overall Summary Section
    this.addOverallSummary(doc, totals);

    // Monthly Breakdown
    this.addMonthlyBreakdown(doc, monthlyData);
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
      { label: 'Total Checks:', value: totals.totalChecks.toString() },
      { label: 'Total Amount:', value: this.formatCurrency(totals.totalAmount) },
      { label: 'Income Checks:', value: `${totals.incomeCount} (${this.formatCurrency(totals.totalIncome)})` },
      { label: 'Expense Checks:', value: `${totals.expenseCount} (${this.formatCurrency(totals.totalExpense)})` }
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
      doc.fontSize(11).font('Helvetica').text('No checks recorded for the selected period.');
      doc.moveDown(1);
      return;
    }

    // Table headers
    const tableTop = doc.y;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Month', 50, tableTop);
    doc.text('# Checks', 130, tableTop);
    doc.text('Income', 200, tableTop);
    doc.text('Expense', 290, tableTop);
    doc.text('Total', 380, tableTop);

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
      doc.text(month.totalChecks.toString(), 130, yPos);
      doc.text(this.formatCurrency(month.income.amount), 200, yPos);
      doc.text(this.formatCurrency(month.expense.amount), 290, yPos);
      doc.text(this.formatCurrency(month.totalAmount), 380, yPos);

      yPos += 18;
    });

    doc.y = yPos + 10;
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

export const monthlyChecksReport = new MonthlyChecksReport();
export default MonthlyChecksReport;
