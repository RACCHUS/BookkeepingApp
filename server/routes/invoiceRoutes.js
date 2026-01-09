/**
 * Invoice Routes
 * 
 * @author BookkeepingApp Team
 */

import express from 'express';
import {
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
} from '../controllers/invoiceController.js';

const router = express.Router();

// Summary statistics
router.get('/summary', getSummary);

// List invoices
router.get('/', invoiceValidation.list, getInvoices);

// Get single invoice
router.get('/:id', invoiceValidation.getById, getInvoice);

// Create invoice
router.post('/', invoiceValidation.create, createInvoice);

// Create from quote
router.post('/from-quote/:quoteId', createFromQuote);

// Update invoice
router.put('/:id', invoiceValidation.update, updateInvoice);

// Delete/void invoice
router.delete('/:id', invoiceValidation.getById, deleteInvoice);

// Record payment
router.post('/:id/payments', invoiceValidation.payment, recordPayment);

// Delete payment
router.delete('/:id/payments/:paymentId', invoiceValidation.deletePayment, deletePayment);

// Download PDF
router.get('/:id/pdf', downloadPDF);

// Send email
router.post('/:id/send', sendEmail);

export default router;
