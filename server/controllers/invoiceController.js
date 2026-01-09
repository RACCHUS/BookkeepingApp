/**
 * Invoice Controller
 * 
 * HTTP request handlers for invoice management
 * 
 * @author BookkeepingApp Team
 */

import { validationResult, body, param, query } from 'express-validator';
import invoiceService from '../services/invoicing/invoiceService.js';
import { generateInvoicePDF } from '../services/invoicing/pdfGenerator.js';
import { sendInvoiceEmail, sendPaymentReceiptEmail, isEmailConfigured } from '../services/invoicing/emailService.js';
import logger from '../config/logger.js';
import { INVOICE_STATUS, PAYMENT_METHODS, PAYMENT_TERMS } from '../../shared/constants/invoicingConstants.js';

/**
 * Validation rules for invoices
 */
export const invoiceValidation = {
  create: [
    body('client_id').optional().isUUID().withMessage('Invalid client ID'),
    body('company_id').optional().isUUID().withMessage('Invalid company ID'),
    body('quote_id').optional().isUUID().withMessage('Invalid quote ID'),
    body('issue_date').optional().isISO8601().withMessage('Invalid issue date'),
    body('due_date').optional().isISO8601().withMessage('Invalid due date'),
    body('payment_terms').optional().isIn(Object.values(PAYMENT_TERMS)),
    body('discount_amount').optional().isFloat({ min: 0 }),
    body('discount_type').optional().isIn(['fixed', 'percentage']),
    body('notes').optional().trim().isLength({ max: 2000 }),
    body('terms').optional().trim().isLength({ max: 2000 }),
    body('line_items').isArray({ min: 1 }).withMessage('At least one line item required'),
    body('line_items.*.description').trim().notEmpty(),
    body('line_items.*.quantity').isFloat({ min: 0.01 }),
    body('line_items.*.unit_price').isFloat({ min: 0 }),
    body('line_items.*.tax_rate').optional().isFloat({ min: 0, max: 100 })
  ],
  update: [
    param('id').isUUID().withMessage('Invalid invoice ID'),
    body('client_id').optional().isUUID(),
    body('company_id').optional().isUUID(),
    body('issue_date').optional().isISO8601(),
    body('due_date').optional().isISO8601(),
    body('payment_terms').optional().isIn(Object.values(PAYMENT_TERMS)),
    body('discount_amount').optional().isFloat({ min: 0 }),
    body('discount_type').optional().isIn(['fixed', 'percentage']),
    body('notes').optional().trim().isLength({ max: 2000 }),
    body('terms').optional().trim().isLength({ max: 2000 }),
    body('line_items').optional().isArray({ min: 1 })
  ],
  getById: [
    param('id').isUUID().withMessage('Invalid invoice ID')
  ],
  list: [
    query('companyId').optional().isUUID(),
    query('clientId').optional().isUUID(),
    query('status').optional().isIn(Object.values(INVOICE_STATUS)),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('overdue').optional().isBoolean()
  ],
  payment: [
    param('id').isUUID().withMessage('Invalid invoice ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('payment_date').optional().isISO8601(),
    body('payment_method').optional().isIn(Object.values(PAYMENT_METHODS)),
    body('reference').optional().trim().isLength({ max: 100 }),
    body('transaction_id').optional().isUUID(),
    body('notes').optional().trim().isLength({ max: 500 })
  ],
  deletePayment: [
    param('id').isUUID().withMessage('Invalid invoice ID'),
    param('paymentId').isUUID().withMessage('Invalid payment ID')
  ]
};

/**
 * Get all invoices
 */
export async function getInvoices(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const invoices = await invoiceService.getInvoices(userId, req.query);

    res.json({ invoices, count: invoices.length });
  } catch (error) {
    logger.error('Error in getInvoices:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
}

/**
 * Get a single invoice
 */
export async function getInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const invoice = await invoiceService.getInvoice(userId, req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    logger.error('Error in getInvoice:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const invoice = await invoiceService.createInvoice(userId, req.body);

    res.status(201).json(invoice);
  } catch (error) {
    logger.error('Error in createInvoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
}

/**
 * Create invoice from quote
 */
export async function createFromQuote(req, res) {
  try {
    const userId = req.user?.uid || 'dev-user';
    const paymentTerms = req.body.payment_terms || 'net_30';
    
    const invoice = await invoiceService.createInvoiceFromQuote(userId, req.params.quoteId, paymentTerms);

    res.status(201).json(invoice);
  } catch (error) {
    logger.error('Error in createFromQuote:', error);
    if (error.message.includes('not found') || error.message.includes('Only accepted')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create invoice from quote' });
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const invoice = await invoiceService.updateInvoice(userId, req.params.id, req.body);

    res.json(invoice);
  } catch (error) {
    logger.error('Error in updateInvoice:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot edit')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update invoice' });
  }
}

/**
 * Delete/void an invoice
 */
export async function deleteInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const permanent = req.query.permanent === 'true';
    
    const result = await invoiceService.deleteInvoice(userId, req.params.id, permanent);

    if (permanent) {
      res.json({ message: 'Invoice permanently deleted' });
    } else {
      res.json({ message: 'Invoice voided', invoice: result });
    }
  } catch (error) {
    logger.error('Error in deleteInvoice:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
}

/**
 * Record a payment
 */
export async function recordPayment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const invoice = await invoiceService.recordPayment(userId, req.params.id, req.body);

    res.json(invoice);
  } catch (error) {
    logger.error('Error in recordPayment:', error);
    if (error.message.includes('not found') || error.message.includes('void') || error.message.includes('exceeds')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to record payment' });
  }
}

/**
 * Delete a payment
 */
export async function deletePayment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const invoice = await invoiceService.deletePayment(userId, req.params.id, req.params.paymentId);

    res.json(invoice);
  } catch (error) {
    logger.error('Error in deletePayment:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete payment' });
  }
}

/**
 * Get invoice summary statistics
 */
export async function getSummary(req, res) {
  try {
    const userId = req.user?.uid || 'dev-user';
    const summary = await invoiceService.getInvoiceSummary(userId, req.query);

    res.json(summary);
  } catch (error) {
    logger.error('Error in getSummary:', error);
    res.status(500).json({ error: 'Failed to get invoice summary' });
  }
}

/**
 * Download invoice as PDF
 */
export async function downloadPDF(req, res) {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoice(id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get company info if available (you can extend this)
    const companyInfo = {
      name: 'Your Company Name',
      address: '123 Business St, City, State 12345',
      phone: '(555) 123-4567',
      email: 'billing@yourcompany.com'
    };

    const pdfBytes = await generateInvoicePDF(invoice, companyInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    logger.error('Error in downloadPDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

/**
 * Send invoice via email
 */
export async function sendEmail(req, res) {
  try {
    if (!isEmailConfigured()) {
      return res.status(400).json({ 
        error: 'Email not configured. Set SMTP_USER and SMTP_PASS environment variables.' 
      });
    }

    const { id } = req.params;
    const invoice = await invoiceService.getInvoice(id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.client_email) {
      return res.status(400).json({ error: 'Client email is required to send invoice' });
    }

    const companyInfo = {
      name: 'Your Company Name',
      address: '123 Business St, City, State 12345',
      phone: '(555) 123-4567',
      email: 'billing@yourcompany.com'
    };

    await sendInvoiceEmail(invoice, companyInfo, req.body);

    // Update invoice status to sent
    if (invoice.status === 'draft') {
      await invoiceService.updateInvoice(id, { status: 'sent' });
    }

    res.json({ success: true, message: 'Invoice sent successfully' });
  } catch (error) {
    logger.error('Error in sendEmail:', error);
    res.status(500).json({ error: 'Failed to send invoice email' });
  }
}

export default {
  invoiceValidation,
  getInvoices,
  getInvoice,
  createInvoice,
  createFromQuote,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  deletePayment,
  getSummary,
  downloadPDF,
  sendEmail
};
