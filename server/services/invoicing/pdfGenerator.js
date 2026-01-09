/**
 * Invoice PDF Generator Service
 * 
 * Generates professional PDF invoices and quotes using pdf-lib
 * 
 * @author BookkeepingApp Team
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import logger from '../../config/logger.js';

// Color definitions
const COLORS = {
  primary: rgb(0.1, 0.4, 0.8),      // Blue
  secondary: rgb(0.4, 0.4, 0.4),    // Gray
  text: rgb(0.1, 0.1, 0.1),         // Dark gray
  lightText: rgb(0.5, 0.5, 0.5),    // Light gray
  success: rgb(0.1, 0.6, 0.3),      // Green
  warning: rgb(0.9, 0.6, 0.1),      // Orange
  danger: rgb(0.8, 0.2, 0.2),       // Red
  white: rgb(1, 1, 1),
  lightBg: rgb(0.96, 0.96, 0.96)
};

/**
 * Format currency amount
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

/**
 * Format date string
 */
function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Draw wrapped text and return new Y position
 */
function drawWrappedText(page, text, x, y, maxWidth, font, fontSize, color, lineHeight = 1.2) {
  const words = (text || '').split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font, color });
      line = word;
      currentY -= fontSize * lineHeight;
    } else {
      line = testLine;
    }
  }
  
  if (line) {
    page.drawText(line, { x, y: currentY, size: fontSize, font, color });
    currentY -= fontSize * lineHeight;
  }
  
  return currentY;
}

/**
 * Generate Invoice PDF
 * @param {Object} invoice - Invoice data with line items
 * @param {Object} companyInfo - Company information for header
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generateInvoicePDF(invoice, companyInfo = {}) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Header - Company Info
    if (companyInfo.name) {
      page.drawText(companyInfo.name, {
        x: margin,
        y,
        size: 20,
        font: fontBold,
        color: COLORS.primary
      });
      y -= 25;
    }

    if (companyInfo.address) {
      y = drawWrappedText(page, companyInfo.address, margin, y, 250, fontRegular, 10, COLORS.secondary);
    }

    if (companyInfo.phone) {
      page.drawText(companyInfo.phone, { x: margin, y, size: 10, font: fontRegular, color: COLORS.secondary });
      y -= 14;
    }

    if (companyInfo.email) {
      page.drawText(companyInfo.email, { x: margin, y, size: 10, font: fontRegular, color: COLORS.secondary });
      y -= 14;
    }

    // Invoice Title - Right Side
    const invoiceTitle = invoice.status === 'paid' ? 'INVOICE - PAID' : 'INVOICE';
    const titleWidth = fontBold.widthOfTextAtSize(invoiceTitle, 28);
    page.drawText(invoiceTitle, {
      x: width - margin - titleWidth,
      y: height - margin,
      size: 28,
      font: fontBold,
      color: invoice.status === 'paid' ? COLORS.success : COLORS.primary
    });

    // Invoice Number and Date - Right Side
    const rightColX = width - margin - 150;
    let rightY = height - margin - 40;

    page.drawText('Invoice #:', { x: rightColX, y: rightY, size: 10, font: fontBold, color: COLORS.text });
    page.drawText(invoice.invoice_number || '', { x: rightColX + 70, y: rightY, size: 10, font: fontRegular, color: COLORS.text });
    rightY -= 16;

    page.drawText('Date:', { x: rightColX, y: rightY, size: 10, font: fontBold, color: COLORS.text });
    page.drawText(formatDate(invoice.invoice_date), { x: rightColX + 70, y: rightY, size: 10, font: fontRegular, color: COLORS.text });
    rightY -= 16;

    page.drawText('Due Date:', { x: rightColX, y: rightY, size: 10, font: fontBold, color: COLORS.text });
    page.drawText(formatDate(invoice.due_date), { x: rightColX + 70, y: rightY, size: 10, font: fontRegular, color: COLORS.text });

    // Bill To Section
    y = height - margin - 120;
    page.drawText('Bill To:', { x: margin, y, size: 12, font: fontBold, color: COLORS.text });
    y -= 18;

    if (invoice.client_name) {
      page.drawText(invoice.client_name, { x: margin, y, size: 11, font: fontBold, color: COLORS.text });
      y -= 16;
    }

    if (invoice.client_address) {
      y = drawWrappedText(page, invoice.client_address, margin, y, 250, fontRegular, 10, COLORS.secondary);
    }

    if (invoice.client_email) {
      page.drawText(invoice.client_email, { x: margin, y, size: 10, font: fontRegular, color: COLORS.secondary });
      y -= 16;
    }

    // Line Items Table
    y = Math.min(y - 30, height - margin - 220);
    const tableTop = y;
    const colWidths = { desc: 250, qty: 60, price: 80, total: 80 };
    const tableWidth = colWidths.desc + colWidths.qty + colWidths.price + colWidths.total;

    // Table Header Background
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: tableWidth,
      height: 25,
      color: COLORS.primary
    });

    // Table Headers
    let colX = margin + 10;
    page.drawText('Description', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });
    colX += colWidths.desc;
    page.drawText('Qty', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });
    colX += colWidths.qty;
    page.drawText('Price', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });
    colX += colWidths.price;
    page.drawText('Total', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });

    y -= 30;

    // Line Items
    const lineItems = invoice.line_items || [];
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0);

      // Alternating row background
      if (i % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: y - 5,
          width: tableWidth,
          height: 20,
          color: COLORS.lightBg
        });
      }

      colX = margin + 10;
      
      // Description (truncate if too long)
      let desc = item.description || '';
      if (fontRegular.widthOfTextAtSize(desc, 9) > colWidths.desc - 20) {
        while (fontRegular.widthOfTextAtSize(desc + '...', 9) > colWidths.desc - 20 && desc.length > 0) {
          desc = desc.slice(0, -1);
        }
        desc += '...';
      }
      page.drawText(desc, { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });
      colX += colWidths.desc;

      page.drawText(String(item.quantity || 0), { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });
      colX += colWidths.qty;

      page.drawText(formatCurrency(item.unit_price), { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });
      colX += colWidths.price;

      page.drawText(formatCurrency(itemTotal), { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });

      y -= 20;
    }

    // Totals Section
    y -= 20;
    const totalsX = margin + colWidths.desc + colWidths.qty;

    // Subtotal
    page.drawText('Subtotal:', { x: totalsX, y, size: 10, font: fontRegular, color: COLORS.text });
    page.drawText(formatCurrency(invoice.subtotal), { x: totalsX + colWidths.price, y, size: 10, font: fontRegular, color: COLORS.text });
    y -= 16;

    // Tax
    if (invoice.tax_total > 0) {
      page.drawText('Tax:', { x: totalsX, y, size: 10, font: fontRegular, color: COLORS.text });
      page.drawText(formatCurrency(invoice.tax_total), { x: totalsX + colWidths.price, y, size: 10, font: fontRegular, color: COLORS.text });
      y -= 16;
    }

    // Discount
    if (invoice.discount_amount > 0) {
      page.drawText('Discount:', { x: totalsX, y, size: 10, font: fontRegular, color: COLORS.text });
      page.drawText(`-${formatCurrency(invoice.discount_amount)}`, { x: totalsX + colWidths.price, y, size: 10, font: fontRegular, color: COLORS.danger });
      y -= 16;
    }

    // Total line
    page.drawLine({
      start: { x: totalsX, y: y + 5 },
      end: { x: totalsX + colWidths.price + colWidths.total, y: y + 5 },
      thickness: 1,
      color: COLORS.secondary
    });

    // Total
    page.drawText('Total:', { x: totalsX, y: y - 10, size: 12, font: fontBold, color: COLORS.text });
    page.drawText(formatCurrency(invoice.total), { x: totalsX + colWidths.price, y: y - 10, size: 12, font: fontBold, color: COLORS.primary });
    y -= 30;

    // Amount Paid and Balance Due
    if (invoice.amount_paid > 0) {
      page.drawText('Amount Paid:', { x: totalsX, y, size: 10, font: fontRegular, color: COLORS.success });
      page.drawText(formatCurrency(invoice.amount_paid), { x: totalsX + colWidths.price, y, size: 10, font: fontRegular, color: COLORS.success });
      y -= 16;

      const balance = invoice.total - invoice.amount_paid;
      if (balance > 0) {
        page.drawText('Balance Due:', { x: totalsX, y, size: 12, font: fontBold, color: COLORS.danger });
        page.drawText(formatCurrency(balance), { x: totalsX + colWidths.price, y, size: 12, font: fontBold, color: COLORS.danger });
        y -= 20;
      }
    }

    // Notes Section
    if (invoice.notes) {
      y = Math.min(y - 20, 150);
      page.drawText('Notes:', { x: margin, y, size: 10, font: fontBold, color: COLORS.text });
      y -= 14;
      y = drawWrappedText(page, invoice.notes, margin, y, width - margin * 2, fontRegular, 9, COLORS.secondary);
    }

    // Terms Section
    if (invoice.terms) {
      y -= 10;
      page.drawText('Terms & Conditions:', { x: margin, y, size: 10, font: fontBold, color: COLORS.text });
      y -= 14;
      y = drawWrappedText(page, invoice.terms, margin, y, width - margin * 2, fontRegular, 9, COLORS.secondary);
    }

    // Footer
    page.drawText('Thank you for your business!', {
      x: width / 2 - 70,
      y: 40,
      size: 10,
      font: fontRegular,
      color: COLORS.secondary
    });

    const pdfBytes = await pdfDoc.save();
    logger.info(`Generated invoice PDF for ${invoice.invoice_number}`);
    return pdfBytes;

  } catch (error) {
    logger.error('Error generating invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate Quote PDF
 * @param {Object} quote - Quote data with line items
 * @param {Object} companyInfo - Company information for header
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generateQuotePDF(quote, companyInfo = {}) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Header - Company Info
    if (companyInfo.name) {
      page.drawText(companyInfo.name, {
        x: margin,
        y,
        size: 20,
        font: fontBold,
        color: COLORS.primary
      });
      y -= 25;
    }

    if (companyInfo.address) {
      y = drawWrappedText(page, companyInfo.address, margin, y, 250, fontRegular, 10, COLORS.secondary);
    }

    // Quote Title
    const quoteTitle = 'QUOTE';
    const titleWidth = fontBold.widthOfTextAtSize(quoteTitle, 28);
    page.drawText(quoteTitle, {
      x: width - margin - titleWidth,
      y: height - margin,
      size: 28,
      font: fontBold,
      color: COLORS.primary
    });

    // Quote Number and Dates
    const rightColX = width - margin - 150;
    let rightY = height - margin - 40;

    page.drawText('Quote #:', { x: rightColX, y: rightY, size: 10, font: fontBold, color: COLORS.text });
    page.drawText(quote.quote_number || '', { x: rightColX + 70, y: rightY, size: 10, font: fontRegular, color: COLORS.text });
    rightY -= 16;

    page.drawText('Date:', { x: rightColX, y: rightY, size: 10, font: fontBold, color: COLORS.text });
    page.drawText(formatDate(quote.quote_date), { x: rightColX + 70, y: rightY, size: 10, font: fontRegular, color: COLORS.text });
    rightY -= 16;

    page.drawText('Valid Until:', { x: rightColX, y: rightY, size: 10, font: fontBold, color: COLORS.text });
    page.drawText(formatDate(quote.valid_until), { x: rightColX + 70, y: rightY, size: 10, font: fontRegular, color: COLORS.text });

    // Prepared For Section
    y = height - margin - 120;
    page.drawText('Prepared For:', { x: margin, y, size: 12, font: fontBold, color: COLORS.text });
    y -= 18;

    if (quote.client_name) {
      page.drawText(quote.client_name, { x: margin, y, size: 11, font: fontBold, color: COLORS.text });
      y -= 16;
    }

    if (quote.client_address) {
      y = drawWrappedText(page, quote.client_address, margin, y, 250, fontRegular, 10, COLORS.secondary);
    }

    // Line Items (similar to invoice)
    y = Math.min(y - 30, height - margin - 220);
    const colWidths = { desc: 250, qty: 60, price: 80, total: 80 };
    const tableWidth = colWidths.desc + colWidths.qty + colWidths.price + colWidths.total;

    // Table Header
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: tableWidth,
      height: 25,
      color: COLORS.primary
    });

    let colX = margin + 10;
    page.drawText('Description', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });
    colX += colWidths.desc;
    page.drawText('Qty', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });
    colX += colWidths.qty;
    page.drawText('Price', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });
    colX += colWidths.price;
    page.drawText('Total', { x: colX, y: y + 5, size: 10, font: fontBold, color: COLORS.white });

    y -= 30;

    // Line Items
    const lineItems = quote.line_items || [];
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0);

      if (i % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: y - 5,
          width: tableWidth,
          height: 20,
          color: COLORS.lightBg
        });
      }

      colX = margin + 10;
      
      let desc = item.description || '';
      if (fontRegular.widthOfTextAtSize(desc, 9) > colWidths.desc - 20) {
        while (fontRegular.widthOfTextAtSize(desc + '...', 9) > colWidths.desc - 20 && desc.length > 0) {
          desc = desc.slice(0, -1);
        }
        desc += '...';
      }
      page.drawText(desc, { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });
      colX += colWidths.desc;

      page.drawText(String(item.quantity || 0), { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });
      colX += colWidths.qty;

      page.drawText(formatCurrency(item.unit_price), { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });
      colX += colWidths.price;

      page.drawText(formatCurrency(itemTotal), { x: colX, y: y, size: 9, font: fontRegular, color: COLORS.text });

      y -= 20;
    }

    // Total
    y -= 20;
    const totalsX = margin + colWidths.desc + colWidths.qty;

    page.drawLine({
      start: { x: totalsX, y: y + 5 },
      end: { x: totalsX + colWidths.price + colWidths.total, y: y + 5 },
      thickness: 1,
      color: COLORS.secondary
    });

    page.drawText('Total:', { x: totalsX, y: y - 10, size: 12, font: fontBold, color: COLORS.text });
    page.drawText(formatCurrency(quote.total), { x: totalsX + colWidths.price, y: y - 10, size: 12, font: fontBold, color: COLORS.primary });

    // Notes
    if (quote.notes) {
      y -= 50;
      page.drawText('Notes:', { x: margin, y, size: 10, font: fontBold, color: COLORS.text });
      y -= 14;
      y = drawWrappedText(page, quote.notes, margin, y, width - margin * 2, fontRegular, 9, COLORS.secondary);
    }

    // Terms
    if (quote.terms) {
      y -= 10;
      page.drawText('Terms & Conditions:', { x: margin, y, size: 10, font: fontBold, color: COLORS.text });
      y -= 14;
      y = drawWrappedText(page, quote.terms, margin, y, width - margin * 2, fontRegular, 9, COLORS.secondary);
    }

    // Footer
    page.drawText('This quote is valid until ' + formatDate(quote.valid_until), {
      x: width / 2 - 100,
      y: 40,
      size: 10,
      font: fontRegular,
      color: COLORS.secondary
    });

    const pdfBytes = await pdfDoc.save();
    logger.info(`Generated quote PDF for ${quote.quote_number}`);
    return pdfBytes;

  } catch (error) {
    logger.error('Error generating quote PDF:', error);
    throw error;
  }
}

export default {
  generateInvoicePDF,
  generateQuotePDF
};
