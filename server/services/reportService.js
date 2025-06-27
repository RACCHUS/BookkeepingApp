import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.log('Reports directory already exists or created');
    }
  }

  /**
   * Generate a transaction summary report as PDF
   */
  async generateTransactionSummaryPDF(transactions, summary, options = {}) {
    await this.ensureReportsDirectory();
    
    const {
      title = 'Transaction Summary Report',
      dateRange = null,
      userId = 'user',
      includeDetails = true
    } = options;

    const fileName = `transaction-summary-${userId}-${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        // Pipe to file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add header
        this.addReportHeader(doc, title, dateRange);

        // Add summary section
        this.addSummarySection(doc, summary);

        // Add category breakdown
        if (summary.categoryBreakdown) {
          this.addCategoryBreakdown(doc, summary.categoryBreakdown);
        }

        // Add transaction details if requested
        if (includeDetails && transactions.length > 0) {
          this.addTransactionDetails(doc, transactions);
        }

        // Add footer
        this.addReportFooter(doc);

        doc.end();

        stream.on('finish', () => {
          resolve({
            filePath,
            fileName,
            size: fs.stat(filePath).then(stats => stats.size)
          });
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  addReportHeader(doc, title, dateRange) {
    // Title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(title, { align: 'center' });

    // Date range
    if (dateRange) {
      doc.moveDown(0.5)
         .fontSize(12)
         .font('Helvetica')
         .text(`Period: ${dateRange.start} to ${dateRange.end}`, { align: 'center' });
    }

    // Generated date
    doc.moveDown(0.5)
       .fontSize(10)
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.moveDown(1);
    
    // Add line separator
    doc.moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();

    doc.moveDown(1);
  }

  addSummarySection(doc, summary) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Summary', { underline: true });

    doc.moveDown(0.5);

    const summaryData = [
      ['Total Transactions:', summary.transactionCount?.toLocaleString() || '0'],
      ['Total Income:', `$${Math.abs(summary.totalIncome || 0).toLocaleString()}`],
      ['Total Expenses:', `$${Math.abs(summary.totalExpenses || 0).toLocaleString()}`],
      ['Net Income:', `$${(summary.netIncome || 0).toLocaleString()}`, summary.netIncome >= 0 ? 'green' : 'red']
    ];

    summaryData.forEach(([label, value, color]) => {
      doc.fontSize(11)
         .font('Helvetica')
         .text(label, 70, doc.y, { continued: true, width: 200 });

      if (color) {
        doc.fillColor(color === 'green' ? '#059669' : '#DC2626');
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

    // Sort categories by absolute amount (descending)
    const sortedCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a));

    sortedCategories.forEach(([category, amount]) => {
      const isIncome = amount > 0;
      const displayAmount = `${isIncome ? '+' : '-'}$${Math.abs(amount).toLocaleString()}`;
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });

      doc.fillColor(isIncome ? '#059669' : '#DC2626')
         .font('Helvetica-Bold')
         .text(displayAmount, { align: 'right' });

      doc.fillColor('black'); // Reset color
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  addTransactionDetails(doc, transactions) {
    // Check if we need a new page
    if (doc.y > 600) {
      doc.addPage();
    }

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Transaction Details', { underline: true });

    doc.moveDown(0.5);

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
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    sortedTransactions.forEach((transaction, index) => {
      // Check if we need a new page
      if (doc.y > 750) {
        doc.addPage();
        doc.moveDown(1);
      }

      const isIncome = transaction.amount > 0;
      const displayAmount = `${isIncome ? '+' : '-'}$${Math.abs(transaction.amount).toLocaleString()}`;
      const date = new Date(transaction.date).toLocaleDateString();
      
      doc.fontSize(8)
         .font('Helvetica')
         .text(date, 70, doc.y, { width: 60 })
         .text(transaction.description?.substring(0, 40) || 'N/A', 135, doc.y, { width: 200 })
         .text(transaction.category || 'Uncategorized', 340, doc.y, { width: 120 });

      doc.fillColor(isIncome ? '#059669' : '#DC2626')
         .font('Helvetica-Bold')
         .text(displayAmount, 465, doc.y, { width: 80, align: 'right' });

      doc.fillColor('black'); // Reset color
      doc.moveDown(0.4);

      // Add subtle line every 5 rows
      if ((index + 1) % 5 === 0) {
        doc.strokeColor('#E5E5E5')
           .moveTo(70, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.strokeColor('black');
        doc.moveDown(0.2);
      }
    });
  }

  addReportFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Add page number at the bottom
      doc.fontSize(8)
         .font('Helvetica')
         .text(`Page ${i + 1} of ${pageCount}`, 
                50, 
                doc.page.height - 50, 
                { align: 'center', width: doc.page.width - 100 });
      
      // Add generation info
      doc.text('Generated by Bookkeeping App', 
               50, 
               doc.page.height - 35, 
               { align: 'center', width: doc.page.width - 100 });
    }
  }

  /**
   * Generate a tax summary report optimized for IRS categories
   */
  async generateTaxSummaryPDF(transactions, summary, taxYear, options = {}) {
    const {
      userId = 'user',
      includeTransactionDetails = false
    } = options;

    const fileName = `tax-summary-${taxYear}-${userId}-${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    // Group transactions by IRS categories
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
      
      taxCategories[category].totalAmount += transaction.amount;
      taxCategories[category].transactionCount++;
      
      if (includeTransactionDetails) {
        taxCategories[category].transactions.push(transaction);
      }
    });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add header
        this.addReportHeader(doc, `Tax Summary Report - ${taxYear}`, null);

        // Add tax summary
        this.addTaxSummarySection(doc, taxCategories, summary);

        // Add transaction details by category if requested
        if (includeTransactionDetails) {
          this.addTaxTransactionDetails(doc, taxCategories);
        }

        // Add footer
        this.addReportFooter(doc);

        doc.end();

        stream.on('finish', () => {
          resolve({
            filePath,
            fileName,
            size: fs.stat(filePath).then(stats => stats.size)
          });
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
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

    // Expense section
    if (Object.keys(expenseCategories).length > 0) {
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

    doc.moveDown(1);
  }

  addTaxTransactionDetails(doc, taxCategories) {
    Object.entries(taxCategories).forEach(([category, data]) => {
      if (data.transactions.length === 0) return;

      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(category, { underline: true });

      doc.moveDown(0.3);

      data.transactions.forEach(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        const amount = `${transaction.amount > 0 ? '+' : '-'}$${Math.abs(transaction.amount).toLocaleString()}`;
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(`${date}: ${transaction.description || 'N/A'}`, 70, doc.y, { continued: true, width: 350 });
        
        doc.fillColor(transaction.amount > 0 ? '#059669' : '#DC2626')
           .font('Helvetica-Bold')
           .text(amount, { align: 'right' });
        
        doc.fillColor('black');
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);
    });
  }

  /**
   * Clean up old report files (older than 30 days)
   */
  async cleanupOldReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const filePath = path.join(this.reportsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < thirtyDaysAgo) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old report: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }
}

export default new ReportService();
