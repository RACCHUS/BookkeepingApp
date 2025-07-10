import TransactionSummaryReport from './reports/TransactionSummaryReport.js';
import TaxSummaryReport from './reports/TaxSummaryReport.js';
import CategoryBreakdownReport from './reports/CategoryBreakdownReport.js';
import ChecksPaidReport from './reports/ChecksPaidReport.js';
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
   * Generate a tax summary report optimized for IRS categories
   */
  async generateTaxSummaryPDF(transactions, summary, taxYear, options = {}) {
    console.log('📊 Generating Tax Summary PDF...');
    return this.taxSummaryReport.generate(transactions, summary, taxYear, options);
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
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }
}

export default new ReportService();
