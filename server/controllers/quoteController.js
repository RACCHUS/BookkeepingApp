/**
 * Quote Controller
 * 
 * HTTP request handlers for quote management
 * 
 * @author BookkeepingApp Team
 */

import { validationResult, body, param, query } from 'express-validator';
import quoteService from '../services/invoicing/quoteService.js';
import { generateQuotePDF } from '../services/invoicing/pdfGenerator.js';
import { sendQuoteEmail, isEmailConfigured } from '../services/invoicing/emailService.js';
import logger from '../config/logger.js';
import { QUOTE_STATUS } from '../../shared/constants/invoicingConstants.js';

/**
 * Validation rules for quotes
 */
export const quoteValidation = {
  create: [
    body('client_id').optional().isUUID().withMessage('Invalid client ID'),
    body('company_id').optional().isUUID().withMessage('Invalid company ID'),
    body('issue_date').optional().isISO8601().withMessage('Invalid issue date'),
    body('expiry_date').optional().isISO8601().withMessage('Invalid expiry date'),
    body('discount_amount').optional().isFloat({ min: 0 }).withMessage('Discount must be positive'),
    body('discount_type').optional().isIn(['fixed', 'percentage']).withMessage('Invalid discount type'),
    body('notes').optional().trim().isLength({ max: 2000 }),
    body('terms').optional().trim().isLength({ max: 2000 }),
    body('line_items').isArray({ min: 1 }).withMessage('At least one line item required'),
    body('line_items.*.description').trim().notEmpty().withMessage('Description required'),
    body('line_items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
    body('line_items.*.unit_price').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('line_items.*.tax_rate').optional().isFloat({ min: 0, max: 100 })
  ],
  update: [
    param('id').isUUID().withMessage('Invalid quote ID'),
    body('client_id').optional().isUUID().withMessage('Invalid client ID'),
    body('company_id').optional().isUUID().withMessage('Invalid company ID'),
    body('issue_date').optional().isISO8601().withMessage('Invalid issue date'),
    body('expiry_date').optional().isISO8601().withMessage('Invalid expiry date'),
    body('discount_amount').optional().isFloat({ min: 0 }),
    body('discount_type').optional().isIn(['fixed', 'percentage']),
    body('notes').optional().trim().isLength({ max: 2000 }),
    body('terms').optional().trim().isLength({ max: 2000 }),
    body('line_items').optional().isArray({ min: 1 }),
    body('line_items.*.description').optional().trim().notEmpty(),
    body('line_items.*.quantity').optional().isFloat({ min: 0.01 }),
    body('line_items.*.unit_price').optional().isFloat({ min: 0 }),
    body('line_items.*.tax_rate').optional().isFloat({ min: 0, max: 100 })
  ],
  getById: [
    param('id').isUUID().withMessage('Invalid quote ID')
  ],
  list: [
    query('companyId').optional().isUUID(),
    query('clientId').optional().isUUID(),
    query('status').optional().isIn(Object.values(QUOTE_STATUS)),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  updateStatus: [
    param('id').isUUID().withMessage('Invalid quote ID'),
    body('status').isIn(Object.values(QUOTE_STATUS)).withMessage('Invalid status')
  ]
};

/**
 * Get all quotes
 */
export async function getQuotes(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const quotes = await quoteService.getQuotes(userId, req.query);

    res.json({ quotes, count: quotes.length });
  } catch (error) {
    logger.error('Error in getQuotes:', error);
    res.status(500).json({ error: 'Failed to get quotes' });
  }
}

/**
 * Get a single quote
 */
export async function getQuote(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const quote = await quoteService.getQuote(userId, req.params.id);
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(quote);
  } catch (error) {
    logger.error('Error in getQuote:', error);
    res.status(500).json({ error: 'Failed to get quote' });
  }
}

/**
 * Create a new quote
 */
export async function createQuote(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const quote = await quoteService.createQuote(userId, req.body);

    res.status(201).json(quote);
  } catch (error) {
    logger.error('Error in createQuote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
}

/**
 * Update a quote
 */
export async function updateQuote(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const quote = await quoteService.updateQuote(userId, req.params.id, req.body);

    res.json(quote);
  } catch (error) {
    logger.error('Error in updateQuote:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update quote' });
  }
}

/**
 * Delete a quote
 */
export async function deleteQuote(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    await quoteService.deleteQuote(userId, req.params.id);

    res.json({ message: 'Quote deleted' });
  } catch (error) {
    logger.error('Error in deleteQuote:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete quote' });
  }
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const quote = await quoteService.updateQuoteStatus(userId, req.params.id, req.body.status);

    res.json(quote);
  } catch (error) {
    logger.error('Error in updateQuoteStatus:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update quote status' });
  }
}

/**
 * Convert quote to invoice
 */
export async function convertToInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const paymentTerms = req.body.payment_terms || 'net_30';
    
    const invoiceData = await quoteService.convertQuoteToInvoiceData(userId, req.params.id, paymentTerms);

    res.json({ invoiceData, message: 'Quote converted. Create invoice with this data.' });
  } catch (error) {
    logger.error('Error in convertToInvoice:', error);
    if (error.message.includes('not found') || error.message.includes('Only accepted')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to convert quote' });
  }
}

/**
 * Duplicate a quote
 */
export async function duplicateQuote(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const quote = await quoteService.duplicateQuote(userId, req.params.id);

    res.status(201).json(quote);
  } catch (error) {
    logger.error('Error in duplicateQuote:', error);
    if (error.message === 'Quote not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to duplicate quote' });
  }
}

/**
 * Download quote as PDF
 */
export async function downloadPDF(req, res) {
  try {
    const { id } = req.params;
    const quote = await quoteService.getQuote(id);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const companyInfo = {
      name: 'Your Company Name',
      address: '123 Business St, City, State 12345',
      phone: '(555) 123-4567',
      email: 'sales@yourcompany.com'
    };

    const pdfBytes = await generateQuotePDF(quote, companyInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quote_${quote.quote_number}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    logger.error('Error in downloadPDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

/**
 * Send quote via email
 */
export async function sendEmail(req, res) {
  try {
    if (!isEmailConfigured()) {
      return res.status(400).json({ 
        error: 'Email not configured. Set SMTP_USER and SMTP_PASS environment variables.' 
      });
    }

    const { id } = req.params;
    const quote = await quoteService.getQuote(id);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!quote.client_email) {
      return res.status(400).json({ error: 'Client email is required to send quote' });
    }

    const companyInfo = {
      name: 'Your Company Name',
      address: '123 Business St, City, State 12345',
      phone: '(555) 123-4567',
      email: 'sales@yourcompany.com'
    };

    await sendQuoteEmail(quote, companyInfo, req.body);

    // Update quote status to sent
    if (quote.status === 'draft') {
      await quoteService.updateQuoteStatus(id, 'sent');
    }

    res.json({ success: true, message: 'Quote sent successfully' });
  } catch (error) {
    logger.error('Error in sendEmail:', error);
    res.status(500).json({ error: 'Failed to send quote email' });
  }
}

export default {
  quoteValidation,
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  updateQuoteStatus,
  convertToInvoice,
  duplicateQuote,
  downloadPDF,
  sendEmail
};
