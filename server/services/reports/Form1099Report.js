import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Form 1099-NEC Summary Report Generator
 * Identifies contractors paid $600+ for IRS 1099-NEC filing requirements
 */
export class Form1099Report extends BaseReportGenerator {
  constructor() {
    super();
    this.threshold = 600; // IRS 1099-NEC threshold
  }

  /**
   * Process transactions to identify 1099-eligible payments
   * @param {Array} transactions - All transactions
   * @param {Array} payees - All payee records
   * @returns {Object} Processed 1099 data
   */
  process1099Transactions(transactions, payees = []) {
    // Input validation - return empty result if invalid input
    if (!Array.isArray(transactions)) {
      console.warn('Form1099Report: transactions is not an array, returning empty result');
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
    const payeePayments = {};
    
    validTransactions.forEach(transaction => {
      // Only count expense transactions
      if (transaction.type !== 'expense') return;
      
      // Identify contractor payments by:
      // 1. isContractorPayment flag
      // 2. payeeId links to a contractor payee record
      // 3. Category is CONTRACT_LABOR
      const isContractor = 
        transaction.isContractorPayment ||
        (transaction.payeeId && payeeLookup[transaction.payeeId]?.type === 'contractor') ||
        transaction.category === 'contract_labor';
      
      if (!isContractor) return;

      // Determine payee key
      const payeeKey = transaction.payeeId || transaction.payee || 'Unknown Payee';
      const payeeRecord = transaction.payeeId ? payeeLookup[transaction.payeeId] : null;
      
      if (!payeePayments[payeeKey]) {
        payeePayments[payeeKey] = {
          payeeId: transaction.payeeId || null,
          payeeName: payeeRecord?.name || transaction.payee || 'Unknown',
          businessName: payeeRecord?.businessName || '',
          taxId: payeeRecord?.taxId || '',
          taxIdType: payeeRecord?.taxIdType || '',
          address: payeeRecord?.address || {
            street: transaction.payeeAddress || '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA'
          },
          is1099Required: payeeRecord?.is1099Required || false,
          totalPaid: 0,
          transactionCount: 0,
          transactions: [],
          categories: new Set()
        };
      }

      const parsedAmount = parseFloat(transaction.amount);
      const amount = isNaN(parsedAmount) ? 0 : Math.abs(parsedAmount);
      payeePayments[payeeKey].totalPaid += amount;
      payeePayments[payeeKey].transactionCount += 1;
      payeePayments[payeeKey].categories.add(transaction.category);
      payeePayments[payeeKey].transactions.push({
        date: transaction.date,
        description: transaction.description,
        amount,
        checkNumber: transaction.checkNumber || '',
        paymentMethod: transaction.paymentMethod || ''
      });
    });

    // Separate into over and under threshold
    const overThreshold = [];
    const underThreshold = [];
    let totalContractorPayments = 0;

    Object.entries(payeePayments).forEach(([key, data]) => {
      totalContractorPayments += data.totalPaid;
      const entry = {
        ...data,
        categories: Array.from(data.categories),
        meetsThreshold: data.totalPaid >= this.threshold,
        missingTaxId: !data.taxId && data.totalPaid >= this.threshold
      };

      if (data.totalPaid >= this.threshold) {
        overThreshold.push(entry);
      } else {
        underThreshold.push(entry);
      }
    });

    // Sort by total paid descending
    overThreshold.sort((a, b) => b.totalPaid - a.totalPaid);
    underThreshold.sort((a, b) => b.totalPaid - a.totalPaid);

    return {
      overThreshold,
      underThreshold,
      summary: {
        total1099Recipients: overThreshold.length,
        totalUnderThreshold: underThreshold.length,
        totalContractorPayments,
        totalPayees: Object.keys(payeePayments).length,
        missingTaxIdCount: overThreshold.filter(p => p.missingTaxId).length,
        threshold: this.threshold
      }
    };
  }

  /**
   * Generate 1099 summary report data (JSON format)
   * @param {Array} transactions - All transactions
   * @param {Array} payees - All payee records
   * @param {Object} options - Report options
   * @returns {Object} Report data
   */
  generateReportData(transactions, payees, options = {}) {
    const { startDate, endDate, companyId, taxYear } = options;
    const data = this.process1099Transactions(transactions, payees);

    return {
      type: '1099_summary',
      taxYear: taxYear || new Date().getFullYear(),
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
    const { payees = [] } = options;
    const data = this.process1099Transactions(transactions, payees);
    
    // Summary section
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`1099-NEC Threshold: $${this.threshold.toFixed(2)}`);
    doc.text(`Total Recipients Requiring 1099: ${data.summary.total1099Recipients}`);
    doc.text(`Total Contractor Payments: $${data.summary.totalContractorPayments.toFixed(2)}`);
    
    if (data.summary.missingTaxIdCount > 0) {
      doc.fillColor('red');
      doc.text(`⚠ Missing Tax ID: ${data.summary.missingTaxIdCount} payees need SSN/EIN`);
      doc.fillColor('black');
    }
    doc.moveDown();

    // Recipients requiring 1099
    if (data.overThreshold.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Recipients Requiring 1099-NEC', { underline: true });
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const col1 = 50, col2 = 180, col3 = 280, col4 = 350, col5 = 450;
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Payee Name', col1, tableTop);
      doc.text('Tax ID', col2, tableTop);
      doc.text('Transactions', col3, tableTop);
      doc.text('Total Paid', col4, tableTop);
      doc.text('Status', col5, tableTop);
      
      doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      let y = tableTop + 20;
      doc.fontSize(9).font('Helvetica');
      
      data.overThreshold.forEach(payee => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        const safeName = (payee.payeeName || 'Unknown').substring(0, 25);
        const safeTaxId = payee.taxId && payee.taxId.length >= 4 
          ? `***-**-${payee.taxId.slice(-4)}` 
          : (payee.taxId ? payee.taxId : 'MISSING');
        const safeTotal = typeof payee.totalPaid === 'number' ? payee.totalPaid.toFixed(2) : '0.00';
        
        doc.text(safeName, col1, y);
        doc.text(safeTaxId, col2, y);
        doc.text((payee.transactionCount || 0).toString(), col3, y);
        doc.text(`$${safeTotal}`, col4, y);
        
        if (payee.missingTaxId) {
          doc.fillColor('red').text('Need Tax ID', col5, y);
          doc.fillColor('black');
        } else {
          doc.fillColor('green').text('Ready', col5, y);
          doc.fillColor('black');
        }
        
        y += 15;
      });
      
      doc.moveDown(2);
    }

    // Recipients under threshold
    if (data.underThreshold.length > 0) {
      doc.y = Math.max(doc.y, 50);
      doc.fontSize(12).font('Helvetica-Bold').text('Other Contractors (Under Threshold)', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      
      data.underThreshold.forEach(payee => {
        doc.text(`${payee.payeeName}: $${payee.totalPaid.toFixed(2)} (${payee.transactionCount} transactions)`);
      });
    }
  }

  /**
   * Generate 1099 Summary PDF
   * @param {Array} transactions - Transactions
   * @param {Array} payees - Payee records
   * @param {Object} options - Report options
   * @returns {Promise<Object>} PDF result
   */
  async generate1099PDF(transactions, payees, options = {}) {
    const { userId, taxYear, dateRange } = options;
    const year = taxYear || new Date().getFullYear();
    const fileName = `1099-summary-${year}-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title: `1099-NEC Summary Report - Tax Year ${year}`,
      dateRange: dateRange || { start: `01/01/${year}`, end: `12/31/${year}` },
      transactions,
      summary: {},
      payees
    });
  }

  /**
   * Return empty result structure for error cases
   * @returns {Object} Empty 1099 result
   */
  _emptyResult() {
    return {
      overThreshold: [],
      underThreshold: [],
      summary: {
        total1099Recipients: 0,
        totalUnderThreshold: 0,
        totalContractorPayments: 0,
        totalPayees: 0,
        missingTaxIdCount: 0,
        threshold: this.threshold
      }
    };
  }
}

// Export singleton instance
const form1099Report = new Form1099Report();
export default form1099Report;
