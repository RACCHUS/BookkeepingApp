import PDFDocument from 'pdfkit';

/**
 * Base class for all PDF report generators
 * Provides common functionality like header, footer, and streaming PDF generation
 * PDFs are streamed directly to client - no server-side storage
 * 
 * Performance optimizations:
 * - Compression enabled for smaller file sizes
 * - Configurable transaction limits to prevent oversized PDFs
 * - Page break detection for proper pagination
 * - Font caching for faster rendering
 */
export class BaseReportGenerator {
  constructor() {
    // Configuration for PDF optimization
    this.config = {
      // Maximum transactions to include in detail view (prevents huge PDFs)
      maxTransactionDetails: 500,
      // Show warning when transactions exceed this threshold
      transactionWarningThreshold: 200,
      // Default page margins
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      // Font sizes
      fonts: {
        title: 18,
        heading: 14,
        subheading: 12,
        body: 10,
        small: 8
      },
      // Colors
      colors: {
        income: '#059669',
        expense: '#DC2626',
        primary: '#1E40AF',
        secondary: '#6B7280',
        light: '#F3F4F6'
      }
    };
  }

  /**
   * Generate a PDF report and return as buffer
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Report result with buffer and filename
   */
  async generatePDF(options = {}) {
    const {
      fileName,
      title,
      dateRange,
      transactions = [],
      summary = {}
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.config.margins.top,
          // Enable compression for smaller file sizes
          compress: true,
          // Optimize for smaller file size
          pdfVersion: '1.5',
          // Document info for better organization
          info: {
            Title: title || 'Financial Report',
            Author: 'Bookkeeping App',
            Creator: 'PDFKit',
            CreationDate: new Date()
          },
          // Auto-add first page
          autoFirstPage: true,
          // Buffer pages for better memory management with large reports
          bufferPages: true
        });

        // Collect PDF data into buffer
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            fileName,
            size: buffer.length,
            contentType: 'application/pdf'
          });
        });
        doc.on('error', reject);

        // Add header
        this.addReportHeader(doc, title, dateRange);

        // Add report-specific content (implemented by subclasses)
        this.addReportContent(doc, transactions, summary, options);

        // Add footer
        this.addReportFooter(doc);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add standard report header
   */
  addReportHeader(doc, title, dateRange) {
    // Title
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(title, { align: 'center' });

    // Date range - handle both string and object formats
    if (dateRange) {
      let dateRangeText;
      if (typeof dateRange === 'string') {
        dateRangeText = `Period: ${dateRange}`;
      } else if (dateRange.start && dateRange.end) {
        dateRangeText = `Period: ${dateRange.start} to ${dateRange.end}`;
      }
      
      if (dateRangeText) {
        doc.moveDown(0.5)
           .fontSize(12)
           .font('Helvetica')
           .text(dateRangeText, { align: 'center' });
      }
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

  /**
   * Add standard report footer with page numbers
   */
  addReportFooter(doc) {
    // Add page numbers to all pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Save current position
      const currentY = doc.y;
      
      // Add footer at bottom of page
      const footerY = doc.page.height - this.config.margins.bottom + 10;
      
      doc.fontSize(this.config.fonts.small)
         .fillColor(this.config.colors.secondary)
         .text(
           `Page ${i + 1} of ${pageCount}`,
           this.config.margins.left,
           footerY,
           { align: 'center', width: doc.page.width - this.config.margins.left - this.config.margins.right }
         );
      
      doc.fillColor('black');
    }
  }

  /**
   * Add a new page if needed based on current Y position
   */
  checkPageBreak(doc, requiredSpace = 100) {
    if (doc.y > (doc.page.height - requiredSpace - this.config.margins.bottom)) {
      doc.addPage();
      doc.moveDown(1);
      return true;
    }
    return false;
  }

  /**
   * Truncate transactions if they exceed the maximum limit
   * Returns truncated array and whether truncation occurred
   * @param {Array} transactions - Full transaction list
   * @returns {Object} { transactions, wasTruncated, originalCount }
   */
  limitTransactions(transactions) {
    const originalCount = transactions.length;
    const wasTruncated = originalCount > this.config.maxTransactionDetails;
    
    if (wasTruncated) {
      console.log(`⚠️ Truncating transaction details: ${originalCount} -> ${this.config.maxTransactionDetails}`);
    }
    
    return {
      transactions: wasTruncated 
        ? transactions.slice(0, this.config.maxTransactionDetails)
        : transactions,
      wasTruncated,
      originalCount
    };
  }

  /**
   * Add a truncation warning to the PDF
   * @param {PDFDocument} doc - PDF document
   * @param {number} shownCount - Number of transactions shown
   * @param {number} totalCount - Total number of transactions
   */
  addTruncationWarning(doc, shownCount, totalCount) {
    doc.moveDown(0.5);
    doc.fontSize(this.config.fonts.small)
       .fillColor('#D97706') // Warning orange
       .font('Helvetica-Oblique')
       .text(
         `Note: Showing ${shownCount.toLocaleString()} of ${totalCount.toLocaleString()} transactions. ` +
         `Export to CSV for complete transaction details.`,
         { align: 'center' }
       );
    doc.fillColor('black')
       .font('Helvetica');
    doc.moveDown(0.5);
  }

  /**
   * Format currency amount with proper sign and color
   */
  addCurrencyText(doc, amount, isIncome, options = {}) {
    const { align = 'left', fontSize = 10 } = options;
    const displayAmount = `${isIncome ? '+' : '-'}$${Math.abs(amount).toLocaleString()}`;
    
    doc.fillColor(isIncome ? this.config.colors.income : this.config.colors.expense)
       .fontSize(fontSize)
       .font('Helvetica-Bold')
       .text(displayAmount, { align });
    
    doc.fillColor('black'); // Reset color
    return this;
  }

  /**
   * Abstract method to be implemented by subclasses
   * @param {PDFDocument} doc - PDF document
   * @param {Array} transactions - Transaction data
   * @param {Object} summary - Summary data
   * @param {Object} options - Additional options
   */
  addReportContent(doc, transactions, summary, options = {}) {
    throw new Error('addReportContent must be implemented by subclasses');
  }
}

export default BaseReportGenerator;
