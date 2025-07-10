import PDFDocument from 'pdfkit';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base class for all PDF report generators
 * Provides common functionality like header, footer, and file management
 */
export class BaseReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../../reports');
  }

  async ensureReportsDirectory() {
    try {
      await fsPromises.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.log('Reports directory already exists or created');
    }
  }

  /**
   * Generate a PDF report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Report result with file info
   */
  async generatePDF(options = {}) {
    await this.ensureReportsDirectory();
    
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
          margin: 50
        });

        const filePath = path.join(this.reportsDir, fileName);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add header
        this.addReportHeader(doc, title, dateRange);

        // Add report-specific content (implemented by subclasses)
        this.addReportContent(doc, transactions, summary, options);

        // Add footer
        this.addReportFooter(doc);

        doc.end();

        stream.on('finish', async () => {
          try {
            const stats = await fsPromises.stat(filePath);
            resolve({
              filePath,
              fileName,
              size: stats.size
            });
          } catch (error) {
            resolve({
              filePath,
              fileName,
              size: 0
            });
          }
        });

        stream.on('error', reject);

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

  /**
   * Add standard report footer
   */
  addReportFooter(doc) {
    // Temporarily disable footer to avoid page switching issues
    // TODO: Fix page switching logic for PDFKit
    console.log('Skipping footer addition due to page switching issues');
    return;
  }

  /**
   * Add a new page if needed based on current Y position
   */
  checkPageBreak(doc, requiredSpace = 100) {
    if (doc.y > (doc.page.height - requiredSpace)) {
      doc.addPage();
      doc.moveDown(1);
    }
  }

  /**
   * Format currency amount with proper sign and color
   */
  addCurrencyText(doc, amount, isIncome, options = {}) {
    const { align = 'left', fontSize = 10 } = options;
    const displayAmount = `${isIncome ? '+' : '-'}$${Math.abs(amount).toLocaleString()}`;
    
    doc.fillColor(isIncome ? '#059669' : '#DC2626')
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
