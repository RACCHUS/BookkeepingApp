import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Transaction Summary Report Generator
 * Generates comprehensive transaction reports with summary and details
 * 
 * Optimizations:
 * - Transaction details limited to prevent huge PDFs (configurable)
 * - Page breaks for proper pagination
 * - Compression enabled via base class
 */
export class TransactionSummaryReport extends BaseReportGenerator {
  constructor() {
    super();
    // Override defaults for transaction summary reports
    this.config.maxTransactionDetails = 500; // Max transactions in detail view
  }
  
  async generate(transactions, summary, options = {}) {
    const {
      title = 'Transaction Summary Report',
      dateRange = null,
      userId = 'user',
      includeDetails = true
    } = options;

    const fileName = `transaction-summary-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title,
      dateRange,
      transactions,
      summary,
      includeDetails
    });
  }

  addReportContent(doc, transactions, summary, options = {}) {
    // Add summary section
    this.addSummarySection(doc, summary);

    // Add category breakdown if available
    if (summary.categoryBreakdown) {
      this.addCategoryBreakdown(doc, summary.categoryBreakdown);
    }

    // Add transaction details if requested
    if (options.includeDetails && transactions.length > 0) {
      this.addTransactionDetails(doc, transactions);
    }
  }

  addSummarySection(doc, summary) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Summary', { underline: true });

    doc.moveDown(0.5);

    const summaryData = [
      ['Total Transactions:', summary.transactionCount?.toLocaleString() || '0'],
      ['Total Income:', `$${Math.abs(summary.totalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Total Expenses:', `$${Math.abs(summary.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Net Income:', `$${Math.abs(summary.netIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summary.netIncome >= 0 ? 'green' : 'red']
    ];
    
    // Add transfers line if present (neutral transactions)
    if (summary.totalTransfers && summary.totalTransfers > 0) {
      // Insert before Net Income
      summaryData.splice(3, 0, ['Total Transfers:', `$${Math.abs(summary.totalTransfers).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'blue']);
    }

    summaryData.forEach(([label, value, color]) => {
      doc.fontSize(11)
         .font('Helvetica')
         .text(label, 70, doc.y, { continued: true, width: 200 });

      if (color) {
        const colorMap = { green: '#059669', red: '#DC2626', blue: '#2563EB' };
        doc.fillColor(colorMap[color] || '#000000');
      }
      
      doc.font('Helvetica-Bold')
         .text(value, { align: 'right' });

      doc.fillColor('black'); // Reset color
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  addCategoryBreakdown(doc, categoryBreakdown) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Category Breakdown', { underline: true });

    doc.moveDown(0.5);

    // Handle both old format (number) and new format (object with income/expenses/transfers)
    const sortedCategories = Object.entries(categoryBreakdown)
      .map(([category, data]) => {
        // Support both old { category: amount } and new { category: { income, expenses, transfers } } format
        if (typeof data === 'number') {
          return { category, amount: data, type: data > 0 ? 'income' : 'expense' };
        } else if (typeof data === 'object') {
          const income = data.income || 0;
          const expenses = data.expenses || 0;
          const transfers = data.transfers || 0;
          // Determine primary type based on which has the highest value
          if (transfers > income && transfers > expenses) {
            return { category, amount: transfers, type: 'transfer' };
          } else if (income >= expenses) {
            return { category, amount: income - expenses, type: income > 0 ? 'income' : 'expense' };
          } else {
            return { category, amount: -(expenses - income), type: 'expense' };
          }
        }
        return { category, amount: 0, type: 'expense' };
      })
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    sortedCategories.forEach(({ category, amount, type }) => {
      let prefix = '';
      let color = '#DC2626'; // Default red for expenses
      
      if (type === 'transfer') {
        prefix = '↔';
        color = '#2563EB'; // Blue for transfers
      } else if (type === 'income' || amount > 0) {
        prefix = '+';
        color = '#059669'; // Green for income
      } else {
        prefix = '-';
      }
      
      const displayAmount = `${prefix}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });

      doc.fillColor(color)
         .font('Helvetica-Bold')
         .text(displayAmount, { align: 'right' });

      doc.fillColor('black'); // Reset color
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  addTransactionDetails(doc, transactions) {
    // Check if we need a new page
    this.checkPageBreak(doc, 200);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Transaction Details', { underline: true });

    doc.moveDown(0.5);

    // Limit transactions to prevent huge PDFs
    const { transactions: limitedTransactions, wasTruncated, originalCount } = 
      this.limitTransactions(transactions);

    if (wasTruncated) {
      this.addTruncationWarning(doc, limitedTransactions.length, originalCount);
    }

    // Table header
    const headerY = doc.y;
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Date', 70, headerY, { width: 60 })
       .text('Description', 135, headerY, { width: 200 })
       .text('Category', 340, headerY, { width: 120 })
       .text('Amount', 465, headerY, { width: 80, align: 'right' });

    doc.moveDown(0.3);

    // Add line under header
    doc.moveTo(70, doc.y)
       .lineTo(550, doc.y)
       .stroke();

    doc.moveDown(0.2);

    // Sort transactions by date (newest first)
    const sortedTransactions = [...limitedTransactions].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    sortedTransactions.forEach((transaction, index) => {
      // Check if we need a new page
      this.checkPageBreak(doc, 50);

      // Determine display formatting based on transaction type
      const isIncome = transaction.type === 'income';
      const isTransfer = transaction.type === 'transfer';
      let prefix = isIncome ? '+' : '-';
      let color = isIncome ? this.config.colors.income : this.config.colors.expense;
      
      if (isTransfer) {
        prefix = '↔';
        color = '#2563EB'; // Blue for transfers
      }
      
      const displayAmount = `${prefix}$${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const date = new Date(transaction.date).toLocaleDateString();
      const rowY = doc.y;
      
      doc.fontSize(8)
         .font('Helvetica')
         .text(date, 70, rowY, { width: 60 })
         .text(transaction.description?.substring(0, 40) || 'N/A', 135, rowY, { width: 200 })
         .text(transaction.category || 'Uncategorized', 340, rowY, { width: 120 });

      doc.fillColor(color)
         .font('Helvetica-Bold')
         .text(displayAmount, 465, rowY, { width: 80, align: 'right' });

      doc.fillColor('black'); // Reset color
      doc.moveDown(0.4);

      // Add subtle line every 10 rows for readability
      if ((index + 1) % 10 === 0) {
        doc.strokeColor('#E5E5E5')
           .moveTo(70, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.strokeColor('black');
        doc.moveDown(0.2);
      }
    });
  }
}

export default TransactionSummaryReport;
