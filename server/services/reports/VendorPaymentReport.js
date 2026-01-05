import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Vendor Payment Summary Report Generator
 * Groups all payments by vendor with YTD totals
 */
export class VendorPaymentReport extends BaseReportGenerator {
  constructor() {
    super();
  }

  /**
   * Process transactions to create vendor payment summary
   * @param {Array} transactions - All transactions
   * @param {Object} options - Processing options
   * @returns {Object} Processed vendor payment data
   */
  processVendorPayments(transactions, options = {}) {
    const { includeAllPayees = true } = options;
    
    // Input validation - return empty result if invalid input
    if (!Array.isArray(transactions)) {
      console.warn('VendorPaymentReport: transactions is not an array, returning empty result');
      return this._emptyResult();
    }

    // Filter to only valid transactions with valid amounts
    const validTransactions = transactions.filter(t => 
      t && typeof t.amount === 'number' && !isNaN(t.amount)
    );

    // Group payments by vendor
    const vendorPayments = {};
    
    validTransactions.forEach(transaction => {
      // Only count expense transactions
      if (transaction.type !== 'expense') return;
      
      // Determine vendor key - prefer vendorId, then payee text
      const vendorKey = transaction.vendorId || transaction.vendorName || transaction.payee || transaction.description || 'Unknown Vendor';
      
      if (!vendorPayments[vendorKey]) {
        vendorPayments[vendorKey] = {
          vendorId: transaction.vendorId || null,
          vendorName: transaction.vendorName || transaction.payee || transaction.description || 'Unknown',
          totalPaid: 0,
          transactionCount: 0,
          transactions: [],
          categories: {},
          paymentMethods: {},
          firstPaymentDate: null,
          lastPaymentDate: null
        };
      }

      const parsedAmount = parseFloat(transaction.amount);
      const amount = isNaN(parsedAmount) ? 0 : Math.abs(parsedAmount);
      const vendor = vendorPayments[vendorKey];
      
      vendor.totalPaid += amount;
      vendor.transactionCount += 1;
      
      // Track categories
      const category = transaction.category || 'uncategorized';
      vendor.categories[category] = (vendor.categories[category] || 0) + amount;
      
      // Track payment methods
      const method = transaction.paymentMethod || 'other';
      vendor.paymentMethods[method] = (vendor.paymentMethods[method] || 0) + amount;
      
      // Track date range (null-safe)
      let txDate;
      try {
        txDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
        if (isNaN(txDate.getTime())) txDate = null;
      } catch (e) {
        txDate = null;
      }
      if (txDate) {
        if (!vendor.firstPaymentDate || txDate < vendor.firstPaymentDate) {
          vendor.firstPaymentDate = txDate;
        }
        if (!vendor.lastPaymentDate || txDate > vendor.lastPaymentDate) {
          vendor.lastPaymentDate = txDate;
        }
      }
      
      vendor.transactions.push({
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        checkNumber: transaction.checkNumber || ''
      });
    });

    // Convert to array and calculate summaries
    const vendors = Object.values(vendorPayments)
      .map(vendor => ({
        ...vendor,
        categories: Object.entries(vendor.categories)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        paymentMethods: Object.entries(vendor.paymentMethods)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        primaryCategory: Object.entries(vendor.categories)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'uncategorized',
        averagePayment: vendor.transactionCount > 0 
          ? vendor.totalPaid / vendor.transactionCount 
          : 0
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Calculate overall summary
    const totalPayments = vendors.reduce((sum, v) => sum + v.totalPaid, 0);
    const totalTransactions = vendors.reduce((sum, v) => sum + v.transactionCount, 0);
    
    // Category breakdown across all vendors
    const overallCategories = {};
    vendors.forEach(vendor => {
      vendor.categories.forEach(cat => {
        overallCategories[cat.name] = (overallCategories[cat.name] || 0) + cat.amount;
      });
    });

    return {
      vendors,
      summary: {
        totalVendors: vendors.length,
        totalPayments,
        totalTransactions,
        averagePerVendor: vendors.length > 0 ? totalPayments / vendors.length : 0,
        topVendor: vendors[0] || null,
        categoryBreakdown: Object.entries(overallCategories)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
      }
    };
  }

  /**
   * Generate vendor payment report data (JSON format)
   * @param {Array} transactions - All transactions
   * @param {Object} options - Report options
   * @returns {Object} Report data
   */
  generateReportData(transactions, options = {}) {
    const { startDate, endDate, companyId } = options;
    const data = this.processVendorPayments(transactions, options);

    return {
      type: 'vendor_payment_summary',
      period: {
        startDate: startDate?.toISOString?.() || startDate,
        endDate: endDate?.toISOString?.() || endDate
      },
      companyId: companyId || null,
      ...data,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Add report-specific content to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Array} transactions - Transactions
   * @param {Object} summary - Summary data
   * @param {Object} options - Options
   */
  addReportContent(doc, transactions, summary, options = {}) {
    const data = this.processVendorPayments(transactions, options);
    
    // Summary section
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Vendors: ${data.summary.totalVendors}`);
    doc.text(`Total Payments: $${data.summary.totalPayments.toFixed(2)}`);
    doc.text(`Total Transactions: ${data.summary.totalTransactions}`);
    doc.text(`Average Per Vendor: $${data.summary.averagePerVendor.toFixed(2)}`);
    
    if (data.summary.topVendor) {
      doc.text(`Top Vendor: ${data.summary.topVendor.vendorName} ($${data.summary.topVendor.totalPaid.toFixed(2)})`);
    }
    doc.moveDown();

    // Category breakdown
    if (data.summary.categoryBreakdown.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Spending by Category', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      
      data.summary.categoryBreakdown.slice(0, 10).forEach(cat => {
        const percentage = ((cat.amount / data.summary.totalPayments) * 100).toFixed(1);
        doc.text(`${cat.name}: $${cat.amount.toFixed(2)} (${percentage}%)`);
      });
      doc.moveDown();
    }

    // Vendor details
    doc.fontSize(12).font('Helvetica-Bold').text('Vendor Details', { underline: true });
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const col1 = 50, col2 = 200, col3 = 280, col4 = 350, col5 = 430;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Vendor Name', col1, tableTop);
    doc.text('Category', col2, tableTop);
    doc.text('Transactions', col3, tableTop);
    doc.text('Total Paid', col4, tableTop);
    doc.text('Last Payment', col5, tableTop);
    
    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let y = tableTop + 20;
    doc.fontSize(9).font('Helvetica');
    
    data.vendors.forEach(vendor => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(vendor.vendorName.substring(0, 30), col1, y);
      doc.text(vendor.primaryCategory.substring(0, 15), col2, y);
      doc.text(vendor.transactionCount.toString(), col3, y);
      doc.text(`$${vendor.totalPaid.toFixed(2)}`, col4, y);
      
      const lastDate = vendor.lastPaymentDate 
        ? new Date(vendor.lastPaymentDate).toLocaleDateString() 
        : 'N/A';
      doc.text(lastDate, col5, y);
      
      y += 15;
    });
  }

  /**
   * Generate Vendor Payment Summary PDF
   * @param {Array} transactions - Transactions
   * @param {Object} options - Report options
   * @returns {Promise<Object>} PDF result
   */
  async generateVendorPDF(transactions, options = {}) {
    const { userId, dateRange } = options;
    const fileName = `vendor-summary-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title: 'Vendor Payment Summary',
      dateRange: dateRange || { start: 'N/A', end: 'N/A' },
      transactions,
      summary: {}
    });
  }

  /**
   * Return empty result structure for error cases
   * @returns {Object} Empty vendor result
   */
  _emptyResult() {
    return {
      vendors: [],
      summary: {
        totalVendors: 0,
        totalPayments: 0,
        totalTransactions: 0,
        averagePerVendor: 0,
        topVendor: null,
        categoryBreakdown: []
      }
    };
  }
}

// Export singleton instance
const vendorPaymentReport = new VendorPaymentReport();
export default vendorPaymentReport;
