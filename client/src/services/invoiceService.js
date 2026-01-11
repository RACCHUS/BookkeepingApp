/**
 * Invoice API Service - Supabase Version
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
 * DB columns: tax_total, discount_amount, discount_type, balance_due
 * Includes both camelCase and snake_case for component compatibility
 */
const transformInvoice = (row) => {
  if (!row) return null;
  const total = parseFloat(row.total) || 0;
  const amountPaid = parseFloat(row.amount_paid) || 0;
  
  return {
    id: row.id,
    // camelCase (preferred)
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    companyId: row.company_id,
    quoteId: row.quote_id,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    paymentTerms: row.payment_terms,
    subtotal: parseFloat(row.subtotal) || 0,
    taxTotal: parseFloat(row.tax_total) || 0,
    discountAmount: parseFloat(row.discount_amount) || 0,
    discountType: row.discount_type || 'fixed',
    total: total,
    amountPaid: amountPaid,
    balanceDue: parseFloat(row.balance_due) || (total - amountPaid),
    notes: row.notes,
    terms: row.terms,
    lineItems: [], // Loaded separately from invoice_line_items table
    payments: [], // Loaded separately from invoice_payments table
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // snake_case aliases for component compatibility
    invoice_number: row.invoice_number,
    client_id: row.client_id,
    company_id: row.company_id,
    quote_id: row.quote_id,
    issue_date: row.issue_date,
    invoice_date: row.issue_date, // Some components use invoice_date
    due_date: row.due_date,
    payment_terms: row.payment_terms,
    tax_total: parseFloat(row.tax_total) || 0,
    discount_amount: parseFloat(row.discount_amount) || 0,
    discount_type: row.discount_type || 'fixed',
    amount_paid: amountPaid,
    balance_due: parseFloat(row.balance_due) || (total - amountPaid),
    client_name: row.client?.name || null, // From joined client data if available
  };
};

export async function getInvoices(options = {}) {
  const userId = await getUserId();
  
  // Note: No FK relationship between invoices and clients, so can't join
  // Client info must be fetched separately if needed
  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (options.companyId) query = query.eq('company_id', options.companyId);
  if (options.clientId) query = query.eq('client_id', options.clientId);
  if (options.status) query = query.eq('status', options.status);
  if (options.startDate) query = query.gte('issue_date', options.startDate);
  if (options.endDate) query = query.lte('issue_date', options.endDate);
  
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  query = query.range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  if (error) {
    console.error('[invoiceService] getInvoices error:', error);
    throw error;
  }
  
  return {
    success: true,
    data: (data || []).map(transformInvoice),
    total: count || 0,
  };
}

export async function getInvoice(id) {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return { success: true, data: transformInvoice(data) };
}

export async function createInvoice(invoiceData) {
  const userId = await getUserId();
  
  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
  
  // Support both camelCase and snake_case input
  const clientId = invoiceData.clientId || invoiceData.client_id;
  const companyId = invoiceData.companyId || invoiceData.company_id;
  const issueDate = invoiceData.issueDate || invoiceData.issue_date || invoiceData.invoice_date || new Date().toISOString().split('T')[0];
  const dueDate = invoiceData.dueDate || invoiceData.due_date;
  const paymentTerms = invoiceData.paymentTerms || invoiceData.payment_terms || 'net_30';
  const discountType = invoiceData.discountType || invoiceData.discount_type || 'fixed';
  
  // Calculate totals from line_items if provided
  let subtotal = parseFloat(invoiceData.subtotal) || 0;
  let taxTotal = parseFloat(invoiceData.taxTotal || invoiceData.tax_total || invoiceData.taxAmount) || 0;
  let discountAmount = parseFloat(invoiceData.discountAmount || invoiceData.discount_amount || invoiceData.discount) || 0;
  
  // If line_items exist, calculate from them
  const lineItems = invoiceData.lineItems || invoiceData.line_items || [];
  if (lineItems.length > 0) {
    subtotal = lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || item.unitPrice || 0), 0);
    taxTotal = lineItems.reduce((sum, item) => {
      const lineTotal = (item.quantity || 0) * (item.unit_price || item.unitPrice || 0);
      return sum + lineTotal * ((item.tax_rate || item.taxRate || 0) / 100);
    }, 0);
  }
  
  // Apply discount
  const discountValue = parseFloat(invoiceData.discount_value || invoiceData.discountValue) || 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }
  
  const total = parseFloat(invoiceData.total) || (subtotal + taxTotal - discountAmount);
  const amountPaid = parseFloat(invoiceData.amountPaid || invoiceData.amount_paid) || 0;
  
  console.log('[invoiceService] Creating invoice with data:', {
    invoiceNumber: invoiceData.invoiceNumber || invoiceData.invoice_number || invoiceNumber,
    clientId,
    companyId,
    issueDate,
    dueDate,
    subtotal,
    taxTotal,
    total,
  });
  
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: invoiceData.invoiceNumber || invoiceData.invoice_number || invoiceNumber,
      client_id: clientId || null,
      company_id: companyId || null,
      quote_id: invoiceData.quoteId || invoiceData.quote_id || null,
      status: invoiceData.status || 'draft',
      issue_date: issueDate,
      due_date: dueDate,
      payment_terms: paymentTerms,
      subtotal: subtotal,
      tax_total: taxTotal,
      discount_amount: discountAmount,
      discount_type: discountType,
      total: total,
      amount_paid: amountPaid,
      balance_due: total - amountPaid,
      notes: invoiceData.notes || null,
      terms: invoiceData.terms || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[invoiceService] Create error:', error);
    throw error;
  }
  
  console.log('[invoiceService] Created invoice:', data?.id);
  return { success: true, data: transformInvoice(data) };
}

export async function updateInvoice(id, updates) {
  const userId = await getUserId();
  
  const dbUpdates = {};
  // Support both camelCase and snake_case
  if (updates.clientId !== undefined || updates.client_id !== undefined) 
    dbUpdates.client_id = updates.clientId || updates.client_id;
  if (updates.companyId !== undefined || updates.company_id !== undefined) 
    dbUpdates.company_id = updates.companyId || updates.company_id;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.issueDate !== undefined || updates.issue_date !== undefined || updates.invoice_date !== undefined) 
    dbUpdates.issue_date = updates.issueDate || updates.issue_date || updates.invoice_date;
  if (updates.dueDate !== undefined || updates.due_date !== undefined) 
    dbUpdates.due_date = updates.dueDate || updates.due_date;
  if (updates.paymentTerms !== undefined || updates.payment_terms !== undefined) 
    dbUpdates.payment_terms = updates.paymentTerms || updates.payment_terms;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  if (updates.taxTotal !== undefined || updates.tax_total !== undefined) 
    dbUpdates.tax_total = updates.taxTotal || updates.tax_total;
  if (updates.discountAmount !== undefined || updates.discount_amount !== undefined) 
    dbUpdates.discount_amount = updates.discountAmount || updates.discount_amount;
  if (updates.discountType !== undefined || updates.discount_type !== undefined) 
    dbUpdates.discount_type = updates.discountType || updates.discount_type;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.amountPaid !== undefined || updates.amount_paid !== undefined) 
    dbUpdates.amount_paid = updates.amountPaid || updates.amount_paid;
  if (updates.balanceDue !== undefined || updates.balance_due !== undefined) 
    dbUpdates.balance_due = updates.balanceDue || updates.balance_due;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.terms !== undefined) dbUpdates.terms = updates.terms;
  // Note: lineItems should be updated via invoice_line_items table, not here
  
  console.log('[invoiceService] Updating invoice:', id, dbUpdates);
  
  const { data, error } = await supabase
    .from('invoices')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('[invoiceService] Update error:', error);
    throw error;
  }
  return { success: true, data: transformInvoice(data) };
}

export async function deleteInvoice(id) {
  const userId = await getUserId();
  
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) throw error;
  return { success: true };
}

export async function updateInvoiceStatus(id, status) {
  return updateInvoice(id, { status });
}

export async function recordPayment(id, paymentData) {
  const userId = await getUserId();
  
  // Get current invoice
  const { data: invoice, error: getError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (getError) throw getError;
  
  const currentPayments = invoice.payments || [];
  const newPayment = {
    id: crypto.randomUUID(),
    date: paymentData.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(paymentData.amount) || 0,
    method: paymentData.method || 'other',
    reference: paymentData.reference,
    notes: paymentData.notes,
  };
  
  const updatedPayments = [...currentPayments, newPayment];
  const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.total - totalPaid;
  const newStatus = amountDue <= 0 ? 'paid' : 'partial';
  
  const { data, error } = await supabase
    .from('invoices')
    .update({
      payments: updatedPayments,
      amount_paid: totalPaid,
      amount_due: amountDue,
      status: newStatus,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, data: transformInvoice(data) };
}

export async function deletePayment(invoiceId, paymentId) {
  const userId = await getUserId();
  
  // Get current invoice
  const { data: invoice, error: getError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .single();
  
  if (getError) throw getError;
  
  const currentPayments = invoice.payments || [];
  const updatedPayments = currentPayments.filter(p => p.id !== paymentId);
  const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.total - totalPaid;
  
  let newStatus = invoice.status;
  if (amountDue <= 0) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = 'partial';
  } else if (invoice.status === 'paid' || invoice.status === 'partial') {
    newStatus = 'sent';
  }
  
  const { data, error } = await supabase
    .from('invoices')
    .update({
      payments: updatedPayments,
      amount_paid: totalPaid,
      amount_due: amountDue,
      status: newStatus,
    })
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, data: transformInvoice(data) };
}

export async function getInvoiceSummary(options = {}) {
  const userId = await getUserId();
  
  // DB column is balance_due, not amount_due
  let query = supabase
    .from('invoices')
    .select('status, total, amount_paid, balance_due')
    .eq('user_id', userId);
  
  if (options.companyId) query = query.eq('company_id', options.companyId);
  
  const { data, error } = await query;
  if (error) {
    console.error('[invoiceService] getInvoiceSummary error:', error);
    throw error;
  }
  
  const summary = {
    total: 0,
    paid: 0,
    outstanding: 0,
    overdue: 0,
    draft: 0,
    sent: 0,
    partial: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    paidThisMonth: 0,
    draftCount: 0,
    overdueCount: 0,
  };
  
  for (const inv of data || []) {
    summary.total += parseFloat(inv.total) || 0;
    summary.paid += parseFloat(inv.amount_paid) || 0;
    summary.outstanding += parseFloat(inv.balance_due) || 0;
    summary.totalOutstanding += parseFloat(inv.balance_due) || 0;
    
    if (inv.status === 'draft') {
      summary.draft++;
      summary.draftCount++;
    } else if (inv.status === 'sent') {
      summary.sent++;
    } else if (inv.status === 'partial') {
      summary.partial++;
    } else if (inv.status === 'overdue') {
      summary.overdue++;
      summary.overdueCount++;
      summary.totalOverdue += parseFloat(inv.balance_due) || 0;
    }
  }
  
  return { success: true, data: summary };
}

export async function downloadInvoicePDF(id) {
  throw new Error('PDF generation requires server-side processing. Export data as JSON instead.');
}

export async function sendInvoiceEmail(id, emailData) {
  throw new Error('Email sending requires server-side processing.');
}

export async function duplicateInvoice(id) {
  const userId = await getUserId();
  
  // Get original invoice
  const { data: original, error: origError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (origError) throw origError;
  
  // Generate new invoice number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;
  
  // Create duplicate
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      invoice_number: invoiceNumber,
      client_id: original.client_id,
      client_name: original.client_name,
      company_id: original.company_id,
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: original.due_date,
      payment_terms: original.payment_terms,
      subtotal: original.subtotal,
      tax_rate: original.tax_rate,
      tax_amount: original.tax_amount,
      discount: original.discount,
      total: original.total,
      amount_paid: 0,
      amount_due: original.total,
      notes: original.notes,
      terms: original.terms,
      line_items: original.line_items,
      payments: [],
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, data: transformInvoice(data) };
}


// Default export for compatibility
export default {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  recordPayment,
  deletePayment,
  getInvoiceSummary,
  downloadInvoicePDF,
  sendInvoiceEmail,
  duplicateInvoice,
};
