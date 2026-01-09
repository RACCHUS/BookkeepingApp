/**
 * Quote Service
 * 
 * Manages quotes for clients
 * 
 * @author BookkeepingApp Team
 */

import { getDatabaseAdapter } from '../adapters/index.js';
import logger from '../../config/logger.js';
import { calculateDocumentTotals, calculateDueDate } from '../../../shared/schemas/invoicingSchema.js';
import { QUOTE_STATUS, DEFAULT_QUOTE_VALIDITY_DAYS, NUMBER_PREFIXES } from '../../../shared/constants/invoicingConstants.js';

const QUOTES_TABLE = 'quotes';
const LINE_ITEMS_TABLE = 'quote_line_items';

/**
 * Generate quote number
 * @param {string} userId - User ID
 * @param {number} year - Year
 * @returns {Promise<string>}
 */
async function generateQuoteNumber(userId, year) {
  try {
    const db = getDatabaseAdapter();
    const quotes = await db.query(QUOTES_TABLE, { user_id: userId });
    
    // Count quotes for this year
    const yearQuotes = quotes.filter(q => {
      const qYear = new Date(q.created_at).getFullYear();
      return qYear === year;
    });
    
    const count = yearQuotes.length + 1;
    return `${NUMBER_PREFIXES.QUOTE}-${year}-${String(count).padStart(4, '0')}`;
  } catch (error) {
    logger.error('Error generating quote number:', error);
    // Fallback to timestamp-based number
    return `${NUMBER_PREFIXES.QUOTE}-${Date.now()}`;
  }
}

/**
 * Get all quotes for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getQuotes(userId, options = {}) {
  try {
    const db = getDatabaseAdapter();
    const { companyId, clientId, status, startDate, endDate } = options;
    
    let query = { user_id: userId };
    
    if (companyId) query.company_id = companyId;
    if (clientId) query.client_id = clientId;
    if (status) query.status = status;
    
    let quotes = await db.query(QUOTES_TABLE, query);
    
    // Date filtering
    if (startDate || endDate) {
      quotes = quotes.filter(q => {
        const date = new Date(q.issue_date);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Check for expired quotes and update status
    const now = new Date();
    for (const quote of quotes) {
      if (quote.status === QUOTE_STATUS.SENT && quote.expiry_date) {
        if (new Date(quote.expiry_date) < now) {
          await db.update(QUOTES_TABLE, quote.id, { status: QUOTE_STATUS.EXPIRED });
          quote.status = QUOTE_STATUS.EXPIRED;
        }
      }
    }
    
    // Sort by date descending
    quotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return quotes;
  } catch (error) {
    logger.error('Error getting quotes:', error);
    throw error;
  }
}

/**
 * Get a single quote with line items
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @returns {Promise<Object|null>}
 */
export async function getQuote(userId, quoteId) {
  try {
    const db = getDatabaseAdapter();
    const quote = await db.getById(QUOTES_TABLE, quoteId);
    
    if (!quote || quote.user_id !== userId) {
      return null;
    }
    
    // Get line items
    const lineItems = await db.query(LINE_ITEMS_TABLE, { quote_id: quoteId });
    lineItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    return {
      ...quote,
      line_items: lineItems
    };
  } catch (error) {
    logger.error('Error getting quote:', error);
    throw error;
  }
}

/**
 * Create a new quote
 * @param {string} userId - User ID
 * @param {Object} quoteData - Quote data with line items
 * @returns {Promise<Object>}
 */
export async function createQuote(userId, quoteData) {
  try {
    const db = getDatabaseAdapter();
    
    const year = new Date(quoteData.issue_date || new Date()).getFullYear();
    const quoteNumber = await generateQuoteNumber(userId, year);
    
    // Calculate totals
    const totals = calculateDocumentTotals(
      quoteData.line_items,
      quoteData.discount_amount || 0,
      quoteData.discount_type || 'fixed'
    );
    
    // Calculate expiry date if not provided
    let expiryDate = quoteData.expiry_date;
    if (!expiryDate) {
      const issueDate = new Date(quoteData.issue_date || new Date());
      issueDate.setDate(issueDate.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS);
      expiryDate = issueDate.toISOString().split('T')[0];
    }
    
    const quote = {
      user_id: userId,
      company_id: quoteData.company_id || null,
      client_id: quoteData.client_id || null,
      quote_number: quoteNumber,
      status: quoteData.status || QUOTE_STATUS.DRAFT,
      issue_date: quoteData.issue_date || new Date().toISOString().split('T')[0],
      expiry_date: expiryDate,
      subtotal: totals.subtotal,
      tax_total: totals.taxTotal,
      discount_amount: totals.discountAmount,
      discount_type: quoteData.discount_type || 'fixed',
      total: totals.total,
      notes: quoteData.notes || null,
      terms: quoteData.terms || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const createdQuote = await db.create(QUOTES_TABLE, quote);
    
    // Create line items
    const lineItems = [];
    for (let i = 0; i < quoteData.line_items.length; i++) {
      const item = quoteData.line_items[i];
      const lineTotal = item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100);
      
      const lineItem = await db.create(LINE_ITEMS_TABLE, {
        quote_id: createdQuote.id,
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
    
    logger.info(`Created quote: ${createdQuote.id} - ${quoteNumber}`);
    
    return {
      ...createdQuote,
      line_items: lineItems
    };
  } catch (error) {
    logger.error('Error creating quote:', error);
    throw error;
  }
}

/**
 * Update a quote
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateQuote(userId, quoteId, updates) {
  try {
    const db = getDatabaseAdapter();
    
    // Verify ownership
    const existing = await getQuote(userId, quoteId);
    if (!existing) {
      throw new Error('Quote not found');
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Update basic fields
    if (updates.client_id !== undefined) updateData.client_id = updates.client_id || null;
    if (updates.company_id !== undefined) updateData.company_id = updates.company_id || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.issue_date !== undefined) updateData.issue_date = updates.issue_date;
    if (updates.expiry_date !== undefined) updateData.expiry_date = updates.expiry_date;
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
      
      // Create new line items
      for (let i = 0; i < updates.line_items.length; i++) {
        const item = updates.line_items[i];
        const lineTotal = item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100);
        
        await db.create(LINE_ITEMS_TABLE, {
          quote_id: quoteId,
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
    
    await db.update(QUOTES_TABLE, quoteId, updateData);
    
    logger.info(`Updated quote: ${quoteId}`);
    
    return await getQuote(userId, quoteId);
  } catch (error) {
    logger.error('Error updating quote:', error);
    throw error;
  }
}

/**
 * Delete a quote
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @returns {Promise<void>}
 */
export async function deleteQuote(userId, quoteId) {
  try {
    const db = getDatabaseAdapter();
    
    // Verify ownership
    const existing = await getQuote(userId, quoteId);
    if (!existing) {
      throw new Error('Quote not found');
    }
    
    // Delete line items first (cascade should handle this, but be explicit)
    for (const item of existing.line_items) {
      await db.delete(LINE_ITEMS_TABLE, item.id);
    }
    
    // Delete quote
    await db.delete(QUOTES_TABLE, quoteId);
    
    logger.info(`Deleted quote: ${quoteId}`);
  } catch (error) {
    logger.error('Error deleting quote:', error);
    throw error;
  }
}

/**
 * Update quote status
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @param {string} status - New status
 * @returns {Promise<Object>}
 */
export async function updateQuoteStatus(userId, quoteId, status) {
  try {
    if (!Object.values(QUOTE_STATUS).includes(status)) {
      throw new Error('Invalid status');
    }
    
    const db = getDatabaseAdapter();
    
    // Verify ownership
    const existing = await getQuote(userId, quoteId);
    if (!existing) {
      throw new Error('Quote not found');
    }
    
    await db.update(QUOTES_TABLE, quoteId, {
      status,
      updated_at: new Date().toISOString()
    });
    
    logger.info(`Updated quote status: ${quoteId} -> ${status}`);
    
    return await getQuote(userId, quoteId);
  } catch (error) {
    logger.error('Error updating quote status:', error);
    throw error;
  }
}

/**
 * Convert quote to invoice data
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @param {string} paymentTerms - Payment terms for invoice
 * @returns {Promise<Object>} Invoice data ready for creation
 */
export async function convertQuoteToInvoiceData(userId, quoteId, paymentTerms = 'net_30') {
  try {
    const quote = await getQuote(userId, quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }
    
    if (quote.status !== QUOTE_STATUS.ACCEPTED) {
      throw new Error('Only accepted quotes can be converted to invoices');
    }
    
    const issueDate = new Date();
    const dueDate = calculateDueDate(issueDate, paymentTerms);
    
    const invoiceData = {
      company_id: quote.company_id,
      client_id: quote.client_id,
      quote_id: quote.id,
      issue_date: issueDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      payment_terms: paymentTerms,
      discount_amount: quote.discount_amount,
      discount_type: quote.discount_type,
      notes: quote.notes,
      terms: quote.terms,
      line_items: quote.line_items.map(item => ({
        catalogue_item_id: item.catalogue_item_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate
      }))
    };
    
    return invoiceData;
  } catch (error) {
    logger.error('Error converting quote to invoice data:', error);
    throw error;
  }
}

/**
 * Duplicate a quote
 * @param {string} userId - User ID
 * @param {string} quoteId - Quote ID
 * @returns {Promise<Object>}
 */
export async function duplicateQuote(userId, quoteId) {
  try {
    const existing = await getQuote(userId, quoteId);
    if (!existing) {
      throw new Error('Quote not found');
    }
    
    const duplicateData = {
      company_id: existing.company_id,
      client_id: existing.client_id,
      issue_date: new Date().toISOString().split('T')[0],
      discount_amount: existing.discount_amount,
      discount_type: existing.discount_type,
      notes: existing.notes,
      terms: existing.terms,
      line_items: existing.line_items.map(item => ({
        catalogue_item_id: item.catalogue_item_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate
      }))
    };
    
    return await createQuote(userId, duplicateData);
  } catch (error) {
    logger.error('Error duplicating quote:', error);
    throw error;
  }
}

export default {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  updateQuoteStatus,
  convertQuoteToInvoiceData,
  duplicateQuote
};
