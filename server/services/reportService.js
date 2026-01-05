import TransactionSummaryReport from './reports/TransactionSummaryReport.js';
import TaxSummaryReport from './reports/TaxSummaryReport.js';
import CategoryBreakdownReport from './reports/CategoryBreakdownReport.js';
import ChecksPaidReport from './reports/ChecksPaidReport.js';
import form1099Report from './reports/Form1099Report.js';
import vendorPaymentReport from './reports/VendorPaymentReport.js';
import payeeYTDReport from './reports/PayeeYTDReport.js';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main Report Service
 * Orchestrates different types of report generation
 */
class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    
    // Initialize report generators
    this.transactionSummaryReport = new TransactionSummaryReport();
    this.taxSummaryReport = new TaxSummaryReport();
    this.categoryBreakdownReport = new CategoryBreakdownReport();
    this.checksPaidReport = new ChecksPaidReport();
    this.form1099Report = form1099Report;
    this.vendorPaymentReport = vendorPaymentReport;
    this.payeeYTDReport = payeeYTDReport;
  }

  async ensureReportsDirectory() {
    try {
      await fsPromises.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.log('Reports directory already exists or created');
    }
  }

  /**
   * Generate a transaction summary report as PDF
   */
  async generateTransactionSummaryPDF(transactions, summary, options = {}) {
    console.log('📊 Generating Transaction Summary PDF...');
    return this.transactionSummaryReport.generate(transactions, summary, options);
  }

  /**
   * Generate a tax summary report optimized for IRS Schedule C categories
   * @param {Object} reportData - Full report data object including scheduleC, laborPayments, etc.
   * @param {Object} options - Generation options
   */
  async generateTaxSummaryPDF(reportData, options = {}) {
    console.log('📊 Generating Tax Summary PDF...');
    return this.taxSummaryReport.generate(reportData, options);
  }

  /**
   * Generate a category breakdown report as PDF
   */
  async generateCategoryBreakdownPDF(transactions, summary, options = {}) {
    console.log('📊 Generating Category Breakdown PDF...');
    return this.categoryBreakdownReport.generate(transactions, summary, options);
  }

  /**
   * Generate a checks paid report as PDF
   */
  async generateChecksPaidPDF(transactions, summary, options = {}) {
    console.log('💳 Generating Checks Paid PDF...');
    return this.checksPaidReport.generate(transactions, summary, options);
  }

  /**
   * Generate a 1099-NEC summary report as PDF
   * Identifies contractors requiring 1099 filing ($600+ threshold)
   */
  async generate1099PDF(transactions, summary, options = {}) {
    console.log('📋 Generating 1099-NEC Summary PDF...');
    return this.form1099Report.generate1099PDF(transactions, [], options);
  }

  /**
   * Generate a vendor payment summary report as PDF
   * Shows all vendor payments with totals for the selected period
   */
  async generateVendorPDF(transactions, summary, options = {}) {
    console.log('🏢 Generating Vendor Payment Summary PDF...');
    return this.vendorPaymentReport.generateVendorPDF(transactions, options);
  }

  /**
   * Generate a payee summary report as PDF
   * Shows all payee payments for selected period with 1099 threshold warnings
   */
  async generatePayeeSummaryPDF(transactions, summary, options = {}) {
    console.log('👤 Generating Payee Summary Report PDF...');
    return this.payeeYTDReport.generatePayeeYTDPDF(transactions, [], options);
  }

  /**
   * Clean up old report files (older than 30 days)
   */
  async cleanupOldReports() {
    try {
      const files = await fsPromises.readdir(this.reportsDir);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const filePath = path.join(this.reportsDir, file);
          const stats = await fsPromises.stat(filePath);
          
          if (stats.mtime.getTime() < thirtyDaysAgo) {
            await fsPromises.unlink(filePath);
            console.log(`Cleaned up old report: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }

  /**
   * Get available report types
   */
  getAvailableReportTypes() {
    return {
      transactionSummary: {
        name: 'Transaction Summary',
        description: 'Comprehensive transaction report with summary and details',
        generator: 'transactionSummaryReport'
      },
      taxSummary: {
        name: 'Tax Summary',
        description: 'IRS-category optimized tax report',
        generator: 'taxSummaryReport'
      },
      categoryBreakdown: {
        name: 'Category Breakdown',
        description: 'Detailed category-focused financial report',
        generator: 'categoryBreakdownReport'
      },
      checksPaid: {
        name: 'Checks Paid',
        description: 'Report of check payments grouped by payee/vendor',
        generator: 'checksPaidReport'
      },
      form1099: {
        name: '1099-NEC Summary',
        description: 'Contractor payments requiring 1099-NEC filing ($600+ threshold)',
        generator: 'form1099Report'
      },
      vendorPayment: {
        name: 'Vendor Payment Summary',
        description: 'All vendor payments with YTD totals and category breakdown',
        generator: 'vendorPaymentReport'
      },
      payeeYTD: {
        name: 'Payee Year-to-Date',
        description: 'Payee payments with quarterly breakdown and 1099 threshold warnings',
        generator: 'payeeYTDReport'
      }
    };
  }

  /**
   * Generate any report type dynamically
   */
  async generateReport(reportType, transactions, summary, options = {}) {
    const reportTypes = this.getAvailableReportTypes();
    
    if (!reportTypes[reportType]) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    const generatorName = reportTypes[reportType].generator;
    const generator = this[generatorName];

    if (!generator) {
      throw new Error(`Report generator not found: ${generatorName}`);
    }

    console.log(`📊 Generating ${reportTypes[reportType].name} report...`);
    
    // Call the appropriate generate method based on report type
    switch (reportType) {
      case 'transactionSummary':
        return generator.generate(transactions, summary, options);
      case 'taxSummary':
        return generator.generate(transactions, summary, options.taxYear || new Date().getFullYear(), options);
      case 'categoryBreakdown':
        return generator.generate(transactions, summary, options);
      case 'checksPaid':
        return generator.generate(transactions, summary, options);
      case 'form1099':
        return generator.generate(transactions, summary, options);
      case 'vendorPayment':
        return generator.generate(transactions, summary, options);
      case 'payeeYTD':
        return generator.generate(transactions, summary, options);
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }
}

export default new ReportService();
