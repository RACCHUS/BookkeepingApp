/**
 * Invoice Service
 * 
 * Manages invoices for clients
 * 
 * @author BookkeepingApp Team
 */

import { getDatabaseAdapter } from '../adapters/index.js';
import logger from '../../config/logger.js';
import { calculateDocumentTotals, calculateDueDate } from '../../../shared/schemas/invoicingSchema.js';
import { INVOICE_STATUS, QUOTE_STATUS, NUMBER_PREFIXES } from '../../../shared/constants/invoicingConstants.js';
import quoteService from './quoteService.js';

const INVOICES_TABLE = 'invoices';
const LINE_ITEMS_TABLE = 'invoice_line_items';
const PAYMENTS_TABLE = 'invoice_payments';

/**
 * Generate invoice number
 * @param {string} userId - User ID
 * @param {number} year - Year
 * @returns {Promise<string>}
 */
async function generateInvoiceNumber(userId, year) {
  try {
    const db = getDatabaseAdapter();
    const invoices = await db.query(INVOICES_TABLE, { user_id: userId });
    
    const yearInvoices = invoices.filter(inv => {
      const invYear = new Date(inv.created_at).getFullYear();
      return invYear === year;
    });
    
    const count = yearInvoices.length + 1;
    return `${NUMBER_PREFIXES.INVOICE}-${year}-${String(count).padStart(4, '0')}`;
  } catch (error) {
    logger.error('Error generating invoice number:', error);
    return `${NUMBER_PREFIXES.INVOICE}-${Date.now()}`;
  }
}

/**
 * Get all invoices for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getInvoices(userId, options = {}) {
  try {
    const db = getDatabaseAdapter();
    const { companyId, clientId, status, startDate, endDate, overdue } = options;
    
    let query = { user_id: userId };
    
    if (companyId) query.company_id = companyId;
    if (clientId) query.client_id = clientId;
    if (status) query.status = status;
    
    let invoices = await db.query(INVOICES_TABLE, query);
    
    // Date filtering
    if (startDate || endDate) {
      invoices = invoices.filter(inv => {
        const date = new Date(inv.issue_date);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Check for overdue invoices and update status
    const now = new Date();
    for (const invoice of invoices) {
      if ([INVOICE_STATUS.SENT, INVOICE_STATUS.VIEWED, INVOICE_STATUS.PARTIAL].includes(invoice.status)) {
        if (new Date(invoice.due_date) < now) {
          await db.update(INVOICES_TABLE, invoice.id, { status: INVOICE_STATUS.OVERDUE });
          invoice.status = INVOICE_STATUS.OVERDUE;
        }
      }
    }
    
    // Filter overdue only
    if (overdue) {
      invoices = invoices.filter(inv => inv.status === INVOICE_STATUS.OVERDUE);
    }
    
    // Sort by date descending
    invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return invoices;
  } catch (error) {
    logger.error('Error getting invoices:', error);
    throw error;
  }
}

/**
 * Get a single invoice with line items and payments
 * @param {string} userId - User ID
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object|null>}
 */
export async function getInvoice(userId, invoiceId) {
  try {
    const db = getDatabaseAdapter();
    const invoice = await db.getById(INVOICES_TABLE, invoiceId);
    
    if (!invoice || invoice.user_id !== userId) {
      return null;
    }
    
    // Get line items
    const lineItems = await db.query(LINE_ITEMS_TABLE, { invoice_id: invoiceId });
    lineItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // Get payments
    const payments = await db.query(PAYMENTS_TABLE, { invoice_id: invoiceId });
    payments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    
    return {
      ...invoice,
      line_items: lineItems,
      payments: payments
    };
  } catch (error) {
    logger.error('Error getting invoice:', error);
    throw error;
  }
}

/**
 * Create a new invoice
 * @param {string} userId - User ID
 * @param {Object} invoiceData - Invoice data with line items
 * @returns {Promise<Object>}
 */
export async function createInvoice(userId, invoiceData) {
  try {
    const db = getDatabaseAdapter();
    
    const year = new Date(invoiceData.issue_date || new Date()).getFullYear();
    const invoiceNumber = await generateInvoiceNumber(userId, year);
    
    // Calculate totals
    const totals = calculateDocumentTotals(
      invoiceData.line_items,
      invoiceData.discount_amount || 0,
      invoiceData.discount_type || 'fixed'
    );
    
    // Calculate due date if not provided
    let dueDate = invoiceData.due_date;
    if (!dueDate) {
      const issueDate = new Date(invoiceData.issue_date || new Date());
      dueDate = calculateDueDate(issueDate, invoiceData.payment_terms || 'net_30').toISOString().split('T')[0];
    }
    
    const invoice = {
      user_id: userId,
      company_id: invoiceData.company_id || null,
      client_id: invoiceData.client_id || null,
      quote_id: invoiceData.quote_id || null,
      invoice_number: invoiceNumber,
      status: invoiceData.status || INVOICE_STATUS.DRAFT,
      issue_date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
      due_date: dueDate,
      payment_terms: invoiceData.payment_terms || 'net_30',
      subtotal: totals.subtotal,
      tax_total: totals.taxTotal,
      discount_amount: totals.discountAmount,
      discount_type: invoiceData.discount_type || 'fixed',
      total: totals.total,
      amount_paid: 0,
      balance_due: totals.total,
      notes: invoiceData.notes || null,
      terms: invoiceData.terms || null,
      is_recurring: invoiceData.is_recurring || false,
      recurring_schedule_id: invoiceData.recurring_schedule_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const createdInvoice = await db.create(INVOICES_TABLE, invoice);
    
    // Create line items
    const lineItems = [];
    for (let i = 0; i < invoiceData.line_items.length; i++) {
      const item = invoiceData.line_items[i];
      const lineTotal = item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100);
      
      const lineItem = await db.create(LINE_ITEMS_TABLE, {
        invoice_id: createdInvoice.id,
        catalogue_item_id: item.catalogue_item_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0,
        line_total: Math.round(lineTotal * 100) / 100,
        sort_order: i
      });
      lineItems.push(lineItem);
    }
    
    // If created from a quote, update the quote with the invoice reference
    if (invoiceData.quote_id) {
      await db.update('quotes', invoiceData.quote_id, {
        converted_to_invoice_id: createdInvoice.id,
        updated_at: new Date().toISOString()
      });
    }
    
    logger.info(`Created invoice: ${createdInvoice.id} - ${invoiceNumber}`);
    
    return {
      ...createdInvoice,
      line_items: lineItems,
      payments: []
    };
  } catch (error) {
    logger.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Create invoice from accepted quote
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @param {string} paymentTerms - Payment terms
 * @returns {Promise<Object>}
 */
export async function createInvoiceFromQuote(userId, quoteId, paymentTerms = 'net_30') {
  try {
    const invoiceData = await quoteService.convertQuoteToInvoiceData(userId, quoteId, paymentTerms);
    return await createInvoice(userId, invoiceData);
  } catch (error) {
    logger.error('Error creating invoice from quote:', error);
    throw error;
  }
}

/**
 * Update an invoice
 * @param {string} userId - User ID
 * @param {string} invoiceId - Invoice ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateInvoice(userId, invoiceId, updates) {
  try {
    const db = getDatabaseAdapter();
    
    const existing = await getInvoice(userId, invoiceId);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    
    // Can't edit paid or void invoices
    if ([INVOICE_STATUS.PAID, INVOICE_STATUS.VOID].includes(existing.status)) {
      throw new Error('Cannot edit paid or void invoices');
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Update basic fields
    if (updates.client_id !== undefined) updateData.client_id = updates.client_id || null;
    if (updates.company_id !== undefined) updateData.company_id = updates.company_id || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.issue_date !== undefined) updateData.issue_date = updates.issue_date;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.payment_terms !== undefined) updateData.payment_terms = updates.payment_terms;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.terms !== undefined) updateData.terms = updates.terms;
    if (updates.discount_amount !== undefined) updateData.discount_amount = updates.discount_amount;
    if (updates.discount_type !== undefined) updateData.discount_type = updates.discount_type;
    
    // If line items are provided, recalculate and replace
    if (updates.line_items) {
      // Delete existing line items
      for (const item of existing.line_items) {
        await db.delete(LINE_ITEMS_TABLE, item.id);
      }
      
      // Calculate new totals
      const totals = calculateDocumentTotals(
        updates.line_items,
        updates.discount_amount ?? existing.discount_amount ?? 0,
        updates.discount_type ?? existing.discount_type ?? 'fixed'
      );
      
      updateData.subtotal = totals.subtotal;
      updateData.tax_total = totals.taxTotal;
      updateData.discount_amount = totals.discountAmount;
      updateData.total = totals.total;
      updateData.balance_due = totals.total - existing.amount_paid;
      
      // Create new line items
      for (let i = 0; i < updates.line_items.length; i++) {
        const item = updates.line_items[i];
        const lineTotal = item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100);
        
        await db.create(LINE_ITEMS_TABLE, {
          invoice_id: invoiceId,
          catalogue_item_id: item.catalogue_item_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          line_total: Math.round(lineTotal * 100) / 100,
          sort_order: i
        });
      }
    }
    
    await db.update(INVOICES_TABLE, invoiceId, updateData);
    
    logger.info(`Updated invoice: ${invoiceId}`);
    
    return await getInvoice(userId, invoiceId);
  } catch (error) {
    logger.error('Error updating invoice:', error);
    throw error;
  }
}

/**
 * Record a payment on an invoice
 * @param {string} userId - User ID
 * @param {string} invoiceId - Invoice ID
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>}
 */
export async function recordPayment(userId, invoiceId, paymentData) {
  try {
    const db = getDatabaseAdapter();
    
    const invoice = await getInvoice(userId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    if (invoice.status === INVOICE_STATUS.VOID) {
      throw new Error('Cannot add payments to void invoices');
    }
    
    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
    
    if (amount > invoice.balance_due) {
      throw new Error('Payment amount exceeds balance due');
    }
    
    // Create payment record
    const payment = await db.create(PAYMENTS_TABLE, {
      invoice_id: invoiceId,
      amount: amount,
      payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      payment_method: paymentData.payment_method || null,
      reference: paymentData.reference || null,
      transaction_id: paymentData.transaction_id || null,
      notes: paymentData.notes || null,
      created_at: new Date().toISOString()
    });
    
    // Update invoice amounts
    const newAmountPaid = invoice.amount_paid + amount;
    const newBalanceDue = invoice.total - newAmountPaid;
    
    let newStatus = invoice.status;
    if (newBalanceDue <= 0) {
      newStatus = INVOICE_STATUS.PAID;
    } else if (newAmountPaid > 0) {
      newStatus = INVOICE_STATUS.PARTIAL;
    }
    
    await db.update(INVOICES_TABLE, invoiceId, {
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      updated_at: new Date().toISOString()
    });
    
    logger.info(`Recorded payment on invoice: ${invoiceId} - $${amount}`);
    
    return await getInvoice(userId, invoiceId);
  } catch (error) {
    logger.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Delete a payment from an invoice
 * @param {string} userId - User ID
 * @param {string} invoiceId - Invoice ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>}
 */
export async function deletePayment(userId, invoiceId, paymentId) {
  try {
    const db = getDatabaseAdapter();
    
    const invoice = await getInvoice(userId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const payment = invoice.payments.find(p => p.id === paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Delete payment
    await db.delete(PAYMENTS_TABLE, paymentId);
    
    // Update invoice amounts
    const newAmountPaid = invoice.amount_paid - payment.amount;
    const newBalanceDue = invoice.total - newAmountPaid;
    
    let newStatus = invoice.status;
    if (newAmountPaid <= 0) {
      newStatus = new Date(invoice.due_date) < new Date() 
        ? INVOICE_STATUS.OVERDUE 
        : INVOICE_STATUS.SENT;
    } else if (newBalanceDue > 0) {
      newStatus = INVOICE_STATUS.PARTIAL;
    }
    
    await db.update(INVOICES_TABLE, invoiceId, {
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      updated_at: new Date().toISOString()
    });
    
    logger.info(`Deleted payment from invoice: ${invoiceId}`);
    
    return await getInvoice(userId, invoiceId);
  } catch (error) {
    logger.error('Error deleting payment:', error);
    throw error;
  }
}

/**
 * Delete/void an invoice
 * @param {string} userId - User ID
 * @param {string} invoiceId - Invoice ID
 * @param {boolean} permanent - Permanently delete if true, void if false
 * @returns {Promise<void|Object>}
 */
export async function deleteInvoice(userId, invoiceId, permanent = false) {
  try {
    const db = getDatabaseAdapter();
    
    const existing = await getInvoice(userId, invoiceId);
    if (!existing) {
      throw new Error('Invoice not found');
    }
    
    if (permanent) {
      // Delete payments
      for (const payment of existing.payments) {
        await db.delete(PAYMENTS_TABLE, payment.id);
      }
      
      // Delete line items
      for (const item of existing.line_items) {
        await db.delete(LINE_ITEMS_TABLE, item.id);
      }
      
      // Delete invoice
      await db.delete(INVOICES_TABLE, invoiceId);
      
      logger.info(`Permanently deleted invoice: ${invoiceId}`);
      return;
    }
    
    // Void the invoice instead
    await db.update(INVOICES_TABLE, invoiceId, {
      status: INVOICE_STATUS.VOID,
      updated_at: new Date().toISOString()
    });
    
    logger.info(`Voided invoice: ${invoiceId}`);
    return await getInvoice(userId, invoiceId);
  } catch (error) {
    logger.error('Error deleting invoice:', error);
    throw error;
  }
}

/**
 * Get invoice summary statistics
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>}
 */
export async function getInvoiceSummary(userId, options = {}) {
  try {
    const invoices = await getInvoices(userId, options);
    
    const summary = {
      total_count: invoices.length,
      draft_count: 0,
      sent_count: 0,
      overdue_count: 0,
      paid_count: 0,
      total_outstanding: 0,
      total_overdue: 0,
      total_paid: 0
    };
    
    for (const invoice of invoices) {
      switch (invoice.status) {
        case INVOICE_STATUS.DRAFT:
          summary.draft_count++;
          break;
        case INVOICE_STATUS.SENT:
        case INVOICE_STATUS.VIEWED:
        case INVOICE_STATUS.PARTIAL:
          summary.sent_count++;
          summary.total_outstanding += invoice.balance_due;
          break;
        case INVOICE_STATUS.OVERDUE:
          summary.overdue_count++;
          summary.total_outstanding += invoice.balance_due;
          summary.total_overdue += invoice.balance_due;
          break;
        case INVOICE_STATUS.PAID:
          summary.paid_count++;
          summary.total_paid += invoice.total;
          break;
      }
    }
    
    return summary;
  } catch (error) {
    logger.error('Error getting invoice summary:', error);
    throw error;
  }
}

export default {
  getInvoices,
  getInvoice,
  createInvoice,
  createInvoiceFromQuote,
  updateInvoice,
  recordPayment,
  deletePayment,
  deleteInvoice,
  getInvoiceSummary
};
