/**
 * Quote API Service - Supabase Version
 * 
 * @author BookkeepingApp Team
 */

import { supabase } from './supabase';
import { auth } from './firebase';

/**
 * Get current user ID - waits for auth state if needed
 */
const getUserId = async () => {
  // If user is already available, return immediately
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  // Wait for auth state to be determined (handles token refresh)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Authentication timeout - please refresh the page'));
    }, 5000);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        reject(new Error('User not authenticated'));
      }
    });
  });
};

/**
 * Transform database row to frontend format
 * Actual DB columns: id, user_id, company_id, client_id, quote_number, status,
 * issue_date, expiry_date, subtotal, tax_total, discount_amount, discount_type, total, notes, terms
 */
const transformQuote = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    quote_number: row.quote_number,
    clientId: row.client_id,
    client_id: row.client_id,
    companyId: row.company_id,
    company_id: row.company_id,
    status: row.status,
    // Map issue_date to both issueDate and quote_date for compatibility
    issueDate: row.issue_date,
    issue_date: row.issue_date,
    quoteDate: row.issue_date,
    quote_date: row.issue_date,
    // Map expiry_date to both expiryDate and valid_until for compatibility
    expiryDate: row.expiry_date,
    expiry_date: row.expiry_date,
    validUntil: row.expiry_date,
    valid_until: row.expiry_date,
    subtotal: parseFloat(row.subtotal) || 0,
    // tax_total is the actual column, map to taxAmount for compatibility
    taxTotal: parseFloat(row.tax_total) || 0,
    tax_total: parseFloat(row.tax_total) || 0,
    taxAmount: parseFloat(row.tax_total) || 0,
    tax_amount: parseFloat(row.tax_total) || 0,
    // discount_amount and discount_type are actual columns
    discountAmount: parseFloat(row.discount_amount) || 0,
    discount_amount: parseFloat(row.discount_amount) || 0,
    discount: parseFloat(row.discount_amount) || 0,
    discountType: row.discount_type || 'fixed',
    discount_type: row.discount_type || 'fixed',
    total: parseFloat(row.total) || 0,
    notes: row.notes,
    terms: row.terms,
    convertedToInvoiceId: row.converted_to_invoice_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export async function getQuotes(options = {}) {
  const userId = await getUserId();
  
  let query = supabase
    .from('quotes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (options.companyId) query = query.eq('company_id', options.companyId);
  if (options.clientId) query = query.eq('client_id', options.clientId);
  if (options.status) query = query.eq('status', options.status);
  if (options.startDate) query = query.gte('issue_date', options.startDate);
  if (options.endDate) query = query.lte('issue_date', options.endDate);
  
  const { data, error, count } = await query;
  if (error) throw error;
  
  return {
    success: true,
    data: (data || []).map(transformQuote),
    total: count || 0,
  };
}

export async function getQuote(id) {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return { success: true, data: transformQuote(data) };
}

export async function createQuote(quoteData) {
  const userId = await getUserId();
  
  console.log('createQuote called with:', quoteData);
  console.log('userId:', userId);
  
  // Generate quote number
  const { count, error: countError } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (countError) {
    console.error('Error counting quotes:', countError);
  }
  
  const quoteNumber = `Q-${String((count || 0) + 1).padStart(5, '0')}`;
  
  // Build the insert data object
  // Actual DB columns: user_id, company_id, client_id, quote_number, status, 
  // issue_date, expiry_date, subtotal, tax_total, discount_amount, discount_type, total, notes, terms
  const insertData = {
    user_id: userId,
    quote_number: quoteData.quoteNumber || quoteData.quote_number || quoteNumber,
    client_id: quoteData.clientId || quoteData.client_id || null,
    company_id: quoteData.companyId || quoteData.company_id || null,
    status: quoteData.status || 'draft',
    issue_date: quoteData.issueDate || quoteData.issue_date || quoteData.quoteDate || quoteData.quote_date || new Date().toISOString().split('T')[0],
    expiry_date: quoteData.expiryDate || quoteData.expiry_date || quoteData.validUntil || quoteData.valid_until || null,
    subtotal: quoteData.subtotal || 0,
    tax_total: quoteData.taxTotal || quoteData.tax_total || quoteData.taxAmount || quoteData.tax_amount || 0,
    discount_amount: quoteData.discountAmount || quoteData.discount_amount || quoteData.discount || 0,
    discount_type: quoteData.discountType || quoteData.discount_type || 'fixed',
    total: quoteData.total || 0,
    notes: quoteData.notes || null,
    terms: quoteData.terms || null,
  };
  
  console.log('Inserting quote data:', insertData);
  
  // Accept both camelCase and snake_case input
  // Map to actual database columns: issue_date, expiry_date
  const { data, error } = await supabase
    .from('quotes')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Quote insert error:', error);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('Error code:', error.code);
    throw error;
  }
  
  console.log('Quote created successfully:', data);
  return { success: true, data: transformQuote(data) };
}

export async function updateQuote(id, updates) {
  const userId = await getUserId();
  
  // Accept both camelCase and snake_case input
  // Actual DB columns: client_id, company_id, status, issue_date, expiry_date,
  // subtotal, tax_total, discount_amount, discount_type, total, notes, terms
  const dbUpdates = {};
  if (updates.clientId !== undefined || updates.client_id !== undefined) 
    dbUpdates.client_id = updates.clientId || updates.client_id;
  if (updates.companyId !== undefined || updates.company_id !== undefined) 
    dbUpdates.company_id = updates.companyId || updates.company_id;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  // Map quote_date/quoteDate/issueDate to issue_date (actual DB column)
  if (updates.issueDate !== undefined || updates.issue_date !== undefined || 
      updates.quoteDate !== undefined || updates.quote_date !== undefined) 
    dbUpdates.issue_date = updates.issueDate || updates.issue_date || updates.quoteDate || updates.quote_date;
  // Map valid_until/validUntil/expiryDate to expiry_date (actual DB column)
  if (updates.expiryDate !== undefined || updates.expiry_date !== undefined ||
      updates.validUntil !== undefined || updates.valid_until !== undefined) 
    dbUpdates.expiry_date = updates.expiryDate || updates.expiry_date || updates.validUntil || updates.valid_until;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  // Map tax fields to tax_total
  if (updates.taxTotal !== undefined || updates.tax_total !== undefined ||
      updates.taxAmount !== undefined || updates.tax_amount !== undefined) 
    dbUpdates.tax_total = updates.taxTotal || updates.tax_total || updates.taxAmount || updates.tax_amount;
  // Map discount fields to discount_amount
  if (updates.discountAmount !== undefined || updates.discount_amount !== undefined ||
      updates.discount !== undefined) 
    dbUpdates.discount_amount = updates.discountAmount || updates.discount_amount || updates.discount;
  if (updates.discountType !== undefined || updates.discount_type !== undefined)
    dbUpdates.discount_type = updates.discountType || updates.discount_type;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.terms !== undefined) dbUpdates.terms = updates.terms;
  
  const { data, error } = await supabase
    .from('quotes')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, data: transformQuote(data) };
}

export async function deleteQuote(id) {
  const userId = await getUserId();
  
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) throw error;
  return { success: true };
}

export async function updateQuoteStatus(id, status) {
  return updateQuote(id, { status });
}

export async function convertQuoteToInvoice(id, paymentTerms = 'net_30') {
  const userId = await getUserId();
  
  // Get the quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (quoteError) throw quoteError;
  
  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
  
  // Calculate due date
  const issueDate = new Date();
  const daysMap = { net_15: 15, net_30: 30, net_45: 45, net_60: 60, due_on_receipt: 0 };
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + (daysMap[paymentTerms] || 30));
  
  // Create invoice from quote
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: invoiceNumber,
      client_id: quote.client_id,
      client_name: quote.client_name,
      company_id: quote.company_id,
      quote_id: id,
      status: 'draft',
      issue_date: issueDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      payment_terms: paymentTerms,
      subtotal: quote.subtotal,
      tax_rate: quote.tax_rate,
      tax_amount: quote.tax_amount,
      discount: quote.discount,
      total: quote.total,
      notes: quote.notes,
      terms: quote.terms,
      line_items: quote.line_items,
    })
    .select()
    .single();
  
  if (invoiceError) throw invoiceError;
  
  // Update quote status
  await supabase
    .from('quotes')
    .update({ status: 'converted' })
    .eq('id', id)
    .eq('user_id', userId);
  
  return { success: true, data: { invoice } };
}

export async function duplicateQuote(id) {
  const userId = await getUserId();
  
  // Get original quote
  const { data: original, error: origError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (origError) throw origError;
  
  // Generate new quote number
  const { count } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const quoteNumber = `Q-${String((count || 0) + 1).padStart(5, '0')}`;
  
  // Create duplicate
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      user_id: userId,
      quote_number: quoteNumber,
      client_id: original.client_id,
      client_name: original.client_name,
      company_id: original.company_id,
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: original.expiry_date,
      subtotal: original.subtotal,
      tax_rate: original.tax_rate,
      tax_amount: original.tax_amount,
      discount: original.discount,
      total: original.total,
      notes: original.notes,
      terms: original.terms,
      line_items: original.line_items,
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, data: transformQuote(data) };
}

export async function downloadQuotePDF(id) {
  throw new Error('PDF generation requires server-side processing. Export data as JSON instead.');
}

export async function sendQuoteEmail(id, emailData) {
  throw new Error('Email sending requires server-side processing.');
}

// Default export for compatibility
export default {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  updateQuoteStatus,
  convertQuoteToInvoice,
  duplicateQuote,
  downloadQuotePDF,
  sendQuoteEmail,
};
