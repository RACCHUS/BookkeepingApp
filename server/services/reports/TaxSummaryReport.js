import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Tax Summary Report Generator
 * Generates IRS-category optimized tax reports
 */
export class TaxSummaryReport extends BaseReportGenerator {
  
  async generate(transactions, summary, taxYear, options = {}) {
    const {
      userId = 'user',
      includeTransactionDetails = false
    } = options;

    const fileName = `tax-summary-${taxYear}-${userId}-${Date.now()}.pdf`;
    const title = `Tax Summary Report - ${taxYear}`;

    return this.generatePDF({
      fileName,
      title,
      dateRange: null,
      transactions,
      summary,
      taxYear,
      includeTransactionDetails
    });
  }

  addReportContent(doc, transactions, summary, options = {}) {
    const { taxYear, includeTransactionDetails } = options;
    
    // Build tax categories from transactions
    const taxCategories = this.buildTaxCategories(transactions, includeTransactionDetails);

    // Add tax summary section
    this.addTaxSummarySection(doc, taxCategories, summary);

    // Add transaction details by category if requested
    if (includeTransactionDetails) {
      this.addTaxTransactionDetails(doc, taxCategories);
    }
  }

  buildTaxCategories(transactions, includeTransactionDetails = false) {
    const taxCategories = {};

    transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      if (!taxCategories[category]) {
        taxCategories[category] = {
          totalAmount: 0,
          transactionCount: 0,
          transactions: []
        };
      }
      
      // Use transaction type to determine sign for proper categorization
      const amount = transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
      taxCategories[category].totalAmount += amount;
      taxCategories[category].transactionCount++;
      
      if (includeTransactionDetails) {
        taxCategories[category].transactions.push(transaction);
      }
    });

    return taxCategories;
  }

  addTaxSummarySection(doc, taxCategories, summary) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Tax Summary by IRS Category', { underline: true });

    doc.moveDown(0.5);

    // Separate income and expenses
    const incomeCategories = {};
    const expenseCategories = {};

    Object.entries(taxCategories).forEach(([category, data]) => {
      if (data.totalAmount > 0) {
        incomeCategories[category] = data;
      } else {
        expenseCategories[category] = data;
      }
    });

    // Income section
    if (Object.keys(incomeCategories).length > 0) {
      this.addIncomeCategoriesSection(doc, incomeCategories);
    }

    // Expense section
    if (Object.keys(expenseCategories).length > 0) {
      this.addExpenseCategoriesSection(doc, expenseCategories);
    }

    doc.moveDown(1);
  }

  addIncomeCategoriesSection(doc, incomeCategories) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Income Categories:', { underline: true });
    
    doc.moveDown(0.3);

    Object.entries(incomeCategories).forEach(([category, data]) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });
      
      doc.fillColor('#059669')
         .font('Helvetica-Bold')
         .text(`$${Math.abs(data.totalAmount).toLocaleString()}`, { align: 'right' });
      
      doc.fillColor('black')
         .font('Helvetica')
         .text(`(${data.transactionCount} transactions)`, 70, doc.y, { width: 400 });
      
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
  }

  addExpenseCategoriesSection(doc, expenseCategories) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Expense Categories:', { underline: true });
    
    doc.moveDown(0.3);

    Object.entries(expenseCategories).forEach(([category, data]) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });
      
      doc.fillColor('#DC2626')
         .font('Helvetica-Bold')
         .text(`$${Math.abs(data.totalAmount).toLocaleString()}`, { align: 'right' });
      
      doc.fillColor('black')
         .font('Helvetica')
         .text(`(${data.transactionCount} transactions)`, 70, doc.y, { width: 400 });
      
      doc.moveDown(0.3);
    });
  }

  addTaxTransactionDetails(doc, taxCategories) {
    Object.entries(taxCategories).forEach(([category, data]) => {
      if (data.transactions.length === 0) return;

      // Check if we need a new page
      this.checkPageBreak(doc, 150);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(category, { underline: true });

      doc.moveDown(0.3);

      data.transactions.forEach(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        const isIncome = transaction.type === 'income';
        const amount = `${isIncome ? '+' : '-'}$${Math.abs(transaction.amount).toLocaleString()}`;
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(`${date}: ${transaction.description || 'N/A'}`, 70, doc.y, { continued: true, width: 350 });
        
        doc.fillColor(isIncome ? '#059669' : '#DC2626')
           .font('Helvetica-Bold')
           .text(amount, { align: 'right' });
        
        doc.fillColor('black');
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);
    });
  }
}

export default TaxSummaryReport;
