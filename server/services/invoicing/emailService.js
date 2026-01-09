/**
 * Email Service for Invoicing
 * 
 * Sends invoice and quote emails using nodemailer
 * 
 * @author BookkeepingApp Team
 */

import nodemailer from 'nodemailer';
import logger from '../../config/logger.js';
import { generateInvoicePDF, generateQuotePDF } from './pdfGenerator.js';

// Email transporter configuration
let transporter = null;

/**
 * Initialize email transporter
 * Uses environment variables for configuration
 */
function getTransporter() {
  if (transporter) return transporter;

  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Only create transporter if credentials are configured
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
    logger.info('Email transporter initialized');
  } else {
    logger.warn('Email not configured - SMTP_USER and SMTP_PASS required');
  }

  return transporter;
}

/**
 * Send an email with optional PDF attachment
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Send result
 */
async function sendEmail(options) {
  const transport = getTransporter();
  
  if (!transport) {
    throw new Error('Email not configured. Set SMTP_USER and SMTP_PASS environment variables.');
  }

  const mailOptions = {
    from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments || []
  };

  try {
    const result = await transport.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return result;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send invoice email to client
 * @param {Object} invoice - Invoice data with line items
 * @param {Object} companyInfo - Company information
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Send result
 */
export async function sendInvoiceEmail(invoice, companyInfo = {}, options = {}) {
  if (!invoice.client_email) {
    throw new Error('Client email is required to send invoice');
  }

  // Generate PDF
  const pdfBytes = await generateInvoicePDF(invoice, companyInfo);

  const companyName = companyInfo.name || 'Your Company';
  const invoiceNumber = invoice.invoice_number || 'INV';
  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'upon receipt';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const subject = options.subject || `Invoice ${invoiceNumber} from ${companyName}`;
  
  const html = options.html || `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a56db; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Invoice ${invoiceNumber}</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9fafb;">
        <p>Dear ${invoice.client_name || 'Valued Customer'},</p>
        
        <p>Please find attached your invoice from ${companyName}.</p>
        
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1a56db; font-size: 1.25em;">
                ${formatCurrency(invoice.total - (invoice.amount_paid || 0))}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dueDate}</td>
            </tr>
          </table>
        </div>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        
        <p>Thank you for your business!</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${companyName}</strong>
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
        <p>This invoice was sent by ${companyName}</p>
        ${companyInfo.email ? `<p>Email: ${companyInfo.email}</p>` : ''}
        ${companyInfo.phone ? `<p>Phone: ${companyInfo.phone}</p>` : ''}
      </div>
    </div>
  `;

  const text = options.text || `
Invoice ${invoiceNumber} from ${companyName}

Dear ${invoice.client_name || 'Valued Customer'},

Please find attached your invoice from ${companyName}.

Invoice Number: ${invoiceNumber}
Amount Due: ${formatCurrency(invoice.total - (invoice.amount_paid || 0))}
Due Date: ${dueDate}

If you have any questions about this invoice, please don't hesitate to contact us.

Thank you for your business!

Best regards,
${companyName}
  `;

  return sendEmail({
    to: invoice.client_email,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf'
      }
    ]
  });
}

/**
 * Send quote email to client
 * @param {Object} quote - Quote data with line items
 * @param {Object} companyInfo - Company information
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Send result
 */
export async function sendQuoteEmail(quote, companyInfo = {}, options = {}) {
  if (!quote.client_email) {
    throw new Error('Client email is required to send quote');
  }

  // Generate PDF
  const pdfBytes = await generateQuotePDF(quote, companyInfo);

  const companyName = companyInfo.name || 'Your Company';
  const quoteNumber = quote.quote_number || 'QTE';
  const validUntil = quote.valid_until 
    ? new Date(quote.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const subject = options.subject || `Quote ${quoteNumber} from ${companyName}`;
  
  const html = options.html || `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a56db; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Quote ${quoteNumber}</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9fafb;">
        <p>Dear ${quote.client_name || 'Valued Customer'},</p>
        
        <p>Thank you for your interest! Please find attached our quote for your review.</p>
        
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Quote Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${quoteNumber}</td>
            </tr>
            ${quote.title ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Project:</td>
              <td style="padding: 8px 0; text-align: right;">${quote.title}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Total:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1a56db; font-size: 1.25em;">
                ${formatCurrency(quote.total)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Valid Until:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${validUntil}</td>
            </tr>
          </table>
        </div>
        
        <p>If you have any questions or would like to proceed, please don't hesitate to contact us.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${companyName}</strong>
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
        <p>This quote was sent by ${companyName}</p>
        ${companyInfo.email ? `<p>Email: ${companyInfo.email}</p>` : ''}
        ${companyInfo.phone ? `<p>Phone: ${companyInfo.phone}</p>` : ''}
      </div>
    </div>
  `;

  const text = options.text || `
Quote ${quoteNumber} from ${companyName}

Dear ${quote.client_name || 'Valued Customer'},

Thank you for your interest! Please find attached our quote for your review.

Quote Number: ${quoteNumber}
${quote.title ? `Project: ${quote.title}` : ''}
Total: ${formatCurrency(quote.total)}
Valid Until: ${validUntil}

If you have any questions or would like to proceed, please don't hesitate to contact us.

Best regards,
${companyName}
  `;

  return sendEmail({
    to: quote.client_email,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `Quote_${quoteNumber}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf'
      }
    ]
  });
}

/**
 * Send payment receipt email
 * @param {Object} invoice - Invoice with payment info
 * @param {Object} payment - Payment details
 * @param {Object} companyInfo - Company information
 * @returns {Promise<Object>} Send result
 */
export async function sendPaymentReceiptEmail(invoice, payment, companyInfo = {}) {
  if (!invoice.client_email) {
    throw new Error('Client email is required to send receipt');
  }

  const companyName = companyInfo.name || 'Your Company';
  const invoiceNumber = invoice.invoice_number || 'INV';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const balance = invoice.total - (invoice.amount_paid || 0);

  const subject = `Payment Received - Invoice ${invoiceNumber}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Payment Received</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9fafb;">
        <p>Dear ${invoice.client_name || 'Valued Customer'},</p>
        
        <p>Thank you for your payment! This email confirms we have received your payment.</p>
        
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Payment Date:</td>
              <td style="padding: 8px 0; text-align: right;">${formatDate(payment.payment_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Payment Amount:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #059669; font-size: 1.25em;">
                ${formatCurrency(payment.amount)}
              </td>
            </tr>
            ${payment.reference_number ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Reference:</td>
              <td style="padding: 8px 0; text-align: right;">${payment.reference_number}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="padding: 12px 0 8px; color: #6b7280;">Remaining Balance:</td>
              <td style="padding: 12px 0 8px; text-align: right; font-weight: bold;">
                ${balance > 0 ? formatCurrency(balance) : 'PAID IN FULL'}
              </td>
            </tr>
          </table>
        </div>
        
        <p>Thank you for your business!</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>${companyName}</strong>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: invoice.client_email,
    subject,
    html,
    text: `Payment Received for Invoice ${invoiceNumber}\n\nAmount: ${formatCurrency(payment.amount)}\nRemaining Balance: ${balance > 0 ? formatCurrency(balance) : 'PAID IN FULL'}`
  });
}

/**
 * Check if email is configured
 * @returns {boolean} True if email is configured
 */
export function isEmailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export default {
  sendEmail,
  sendInvoiceEmail,
  sendQuoteEmail,
  sendPaymentReceiptEmail,
  isEmailConfigured
};
