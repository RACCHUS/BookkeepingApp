/**
 * Quote Routes
 * 
 * @author BookkeepingApp Team
 */

import express from 'express';
import {
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
} from '../controllers/quoteController.js';

const router = express.Router();

// List quotes
router.get('/', quoteValidation.list, getQuotes);

// Get single quote
router.get('/:id', quoteValidation.getById, getQuote);

// Create quote
router.post('/', quoteValidation.create, createQuote);

// Update quote
router.put('/:id', quoteValidation.update, updateQuote);

// Delete quote
router.delete('/:id', quoteValidation.getById, deleteQuote);

// Update status
router.put('/:id/status', quoteValidation.updateStatus, updateQuoteStatus);

// Convert to invoice
router.post('/:id/convert', quoteValidation.getById, convertToInvoice);

// Duplicate quote
router.post('/:id/duplicate', quoteValidation.getById, duplicateQuote);

// Download PDF
router.get('/:id/pdf', quoteValidation.getById, downloadPDF);

// Send email
router.post('/:id/send', quoteValidation.getById, sendEmail);

export default router;
