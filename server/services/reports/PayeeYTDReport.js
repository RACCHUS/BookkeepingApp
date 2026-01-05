import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Payee Year-To-Date Report Generator
 * Tracks YTD totals for all payees with 1099 threshold warnings
 */
export class PayeeYTDReport extends BaseReportGenerator {
  constructor() {
    super();
    this.threshold1099 = 600; // IRS 1099-NEC threshold
    this.warningThreshold = 500; // Warn when approaching threshold
  }

  /**
   * Process transactions to create payee YTD summary
   * @param {Array} transactions - All transactions
   * @param {Array} payees - Payee records
   * @param {Object} options - Processing options
   * @returns {Object} Processed payee YTD data
   */
  processPayeeYTD(transactions, payees = [], options = {}) {
    const { taxYear = new Date().getFullYear() } = options;

    // Input validation - return empty result if invalid input
    if (!Array.isArray(transactions)) {
      console.warn('PayeeYTDReport: transactions is not an array, returning empty result');
      return this._emptyResult();
    }

    // Filter to only valid transactions with valid amounts
    const validTransactions = transactions.filter(t => 
      t && typeof t.amount === 'number' && !isNaN(t.amount)
    );

    // Build payee lookup map (null-safe)
    const payeeLookup = {};
    const safePayees = Array.isArray(payees) ? payees : [];
    safePayees.forEach(payee => {
      if (payee && payee.id) {
        payeeLookup[payee.id] = payee;
      }
    });

    // Group payments by payee
    const payeeYTD = {};
    
    validTransactions.forEach(transaction => {
      // Only count expense transactions
      if (transaction.type !== 'expense') return;
      
      // Get transaction date (null-safe)
      let txDate;
      try {
        txDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
        if (isNaN(txDate.getTime())) return; // Skip invalid dates
      } catch (e) {
        return; // Skip transactions with unparseable dates
      }
      const txYear = txDate.getFullYear();
      
      // Only count transactions from the tax year
      if (txYear !== taxYear) return;
      
      // Determine payee key
      const payeeKey = transaction.payeeId || transaction.payee || transaction.description || 'Unknown';
      const payeeRecord = transaction.payeeId ? payeeLookup[transaction.payeeId] : null;
      
      if (!payeeYTD[payeeKey]) {
        payeeYTD[payeeKey] = {
          payeeId: transaction.payeeId || null,
          payeeName: payeeRecord?.name || transaction.payee || transaction.description || 'Unknown',
          payeeType: payeeRecord?.type || (transaction.isContractorPayment ? 'contractor' : 'unknown'),
          is1099Required: payeeRecord?.is1099Required || false,
          isContractor: transaction.isContractorPayment || payeeRecord?.type === 'contractor',
          taxId: payeeRecord?.taxId || '',
          taxIdType: payeeRecord?.taxIdType || '',
          ytdTotal: 0,
          transactionCount: 0,
          monthlyBreakdown: {},
          quarterlyBreakdown: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          firstPaymentDate: null,
          lastPaymentDate: null,
          categories: {}
        };
      }

      const parsedAmount = parseFloat(transaction.amount);
      const amount = isNaN(parsedAmount) ? 0 : Math.abs(parsedAmount);
      const payee = payeeYTD[payeeKey];
      
      payee.ytdTotal += amount;
      payee.transactionCount += 1;
      
      // Monthly breakdown
      const monthKey = txDate.toISOString().substring(0, 7); // YYYY-MM
      payee.monthlyBreakdown[monthKey] = (payee.monthlyBreakdown[monthKey] || 0) + amount;
      
      // Quarterly breakdown
      const quarter = Math.ceil((txDate.getMonth() + 1) / 3);
      payee.quarterlyBreakdown[`Q${quarter}`] += amount;
      
      // Track date range
      if (!payee.firstPaymentDate || txDate < payee.firstPaymentDate) {
        payee.firstPaymentDate = txDate;
      }
      if (!payee.lastPaymentDate || txDate > payee.lastPaymentDate) {
        payee.lastPaymentDate = txDate;
      }
      
      // Track categories
      const category = transaction.category || 'uncategorized';
      payee.categories[category] = (payee.categories[category] || 0) + amount;
    });

    // Calculate status for each payee
    const payeeList = Object.values(payeeYTD).map(payee => {
      let status = 'ok';
      let statusMessage = '';
      
      if (payee.isContractor || payee.is1099Required) {
        if (payee.ytdTotal >= this.threshold1099) {
          status = 'requires_1099';
          statusMessage = `Requires 1099-NEC (paid $${payee.ytdTotal.toFixed(2)})`;
          if (!payee.taxId) {
            status = 'missing_tax_id';
            statusMessage = 'Requires 1099 but missing Tax ID!';
          }
        } else if (payee.ytdTotal >= this.warningThreshold) {
          status = 'approaching_threshold';
          statusMessage = `Approaching 1099 threshold ($${(this.threshold1099 - payee.ytdTotal).toFixed(2)} remaining)`;
        }
      }
      
      return {
        ...payee,
        status,
        statusMessage,
        meetsThreshold: payee.ytdTotal >= this.threshold1099,
        approachingThreshold: payee.ytdTotal >= this.warningThreshold && payee.ytdTotal < this.threshold1099,
        categories: Object.entries(payee.categories)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
      };
    });

    // Sort by YTD total descending
    payeeList.sort((a, b) => b.ytdTotal - a.ytdTotal);

    // Categorize payees
    const contractors = payeeList.filter(p => p.isContractor);
    const requiring1099 = contractors.filter(p => p.meetsThreshold);
    const approaching1099 = contractors.filter(p => p.approachingThreshold);
    const missingTaxId = requiring1099.filter(p => !p.taxId);

    // Calculate totals
    const totalPaid = payeeList.reduce((sum, p) => sum + p.ytdTotal, 0);
    const contractorTotal = contractors.reduce((sum, p) => sum + p.ytdTotal, 0);

    return {
      payees: payeeList,
      contractors,
      requiring1099,
      approaching1099,
      missingTaxId,
      summary: {
        taxYear,
        totalPayees: payeeList.length,
        totalContractors: contractors.length,
        totalPaid,
        contractorTotal,
        requiring1099Count: requiring1099.length,
        approaching1099Count: approaching1099.length,
        missingTaxIdCount: missingTaxId.length,
        threshold: this.threshold1099,
        warningThreshold: this.warningThreshold
      }
    };
  }

  /**
   * Generate payee YTD report data (JSON format)
   * @param {Array} transactions - All transactions
   * @param {Array} payees - Payee records
   * @param {Object} options - Report options
   * @returns {Object} Report data
   */
  generateReportData(transactions, payees, options = {}) {
    const data = this.processPayeeYTD(transactions, payees, options);

    return {
      type: 'payee_ytd',
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
    const { payees = [] } = options;
    const data = this.processPayeeYTD(transactions, payees, options);
    
    // Summary section
    doc.fontSize(14).font('Helvetica-Bold').text('Year-To-Date Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Tax Year: ${data.summary.taxYear}`);
    doc.text(`Total Payees: ${data.summary.totalPayees}`);
    doc.text(`Total Contractors: ${data.summary.totalContractors}`);
    doc.text(`Total Paid: $${data.summary.totalPaid.toFixed(2)}`);
    doc.text(`Contractor Total: $${data.summary.contractorTotal.toFixed(2)}`);
    doc.moveDown(0.5);
    
    // 1099 Status
    doc.font('Helvetica-Bold').text('1099 Status:');
    doc.font('Helvetica');
    doc.text(`  Requiring 1099: ${data.summary.requiring1099Count}`);
    
    if (data.summary.approaching1099Count > 0) {
      doc.fillColor('orange');
      doc.text(`  ⚠ Approaching Threshold: ${data.summary.approaching1099Count}`);
      doc.fillColor('black');
    }
    
    if (data.summary.missingTaxIdCount > 0) {
      doc.fillColor('red');
      doc.text(`  ⛔ Missing Tax ID: ${data.summary.missingTaxIdCount}`);
      doc.fillColor('black');
    }
    doc.moveDown();

    // Contractors requiring 1099
    if (data.requiring1099.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Contractors Requiring 1099-NEC', { underline: true });
      doc.moveDown(0.5);
      this.addPayeeTable(doc, data.requiring1099);
      doc.moveDown();
    }

    // Contractors approaching threshold
    if (data.approaching1099.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Approaching 1099 Threshold', { underline: true });
      doc.moveDown(0.5);
      this.addPayeeTable(doc, data.approaching1099);
      doc.moveDown();
    }

    // All other payees
    const otherPayees = data.payees.filter(p => 
      !p.meetsThreshold && !p.approachingThreshold
    ).slice(0, 20);
    
    if (otherPayees.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Other Payees (Top 20)', { underline: true });
      doc.moveDown(0.5);
      this.addPayeeTable(doc, otherPayees);
    }
  }

  /**
   * Add payee table to PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Array} payees - Payees to display
   */
  addPayeeTable(doc, payees) {
    const tableTop = doc.y;
    const col1 = 50, col2 = 180, col3 = 250, col4 = 320, col5 = 400;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Payee Name', col1, tableTop);
    doc.text('Type', col2, tableTop);
    doc.text('Transactions', col3, tableTop);
    doc.text('YTD Total', col4, tableTop);
    doc.text('Status', col5, tableTop);
    
    doc.moveTo(col1, tableTop + 12).lineTo(550, tableTop + 12).stroke();
    
    let y = tableTop + 17;
    doc.fontSize(8).font('Helvetica');
    
    payees.forEach(payee => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(payee.payeeName.substring(0, 25), col1, y);
      doc.text(payee.payeeType, col2, y);
      doc.text(payee.transactionCount.toString(), col3, y);
      doc.text(`$${payee.ytdTotal.toFixed(2)}`, col4, y);
      
      if (payee.status === 'missing_tax_id') {
        doc.fillColor('red').text('Need Tax ID!', col5, y);
      } else if (payee.status === 'requires_1099') {
        doc.fillColor('green').text('1099 Ready', col5, y);
      } else if (payee.status === 'approaching_threshold') {
        doc.fillColor('orange').text('Approaching', col5, y);
      } else {
        doc.fillColor('gray').text('Under $600', col5, y);
      }
      doc.fillColor('black');
      
      y += 13;
    });
  }

  /**
   * Generate Payee YTD PDF
   * @param {Array} transactions - Transactions
   * @param {Array} payees - Payee records
   * @param {Object} options - Report options
   * @returns {Promise<Object>} PDF result
   */
  async generatePayeeYTDPDF(transactions, payees, options = {}) {
    const { userId, taxYear = new Date().getFullYear() } = options;
    const fileName = `payee-ytd-${taxYear}-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title: `Payee Year-To-Date Report - ${taxYear}`,
      dateRange: { start: `01/01/${taxYear}`, end: `12/31/${taxYear}` },
      transactions,
      summary: {},
      payees,
      taxYear
    });
  }

  /**
   * Return empty result structure for error cases
   * @returns {Object} Empty payee YTD result
   */
  _emptyResult() {
    return {
      payees: [],
      contractors: [],
      summary: {
        totalPayees: 0,
        totalContractors: 0,
        totalPayments: 0,
        requires1099Count: 0,
        approachingThresholdCount: 0,
        missingTaxIdCount: 0,
        threshold1099: this.threshold1099,
        warningThreshold: this.warningThreshold
      }
    };
  }
}

// Export singleton instance
const payeeYTDReport = new PayeeYTDReport();
export default payeeYTDReport;
