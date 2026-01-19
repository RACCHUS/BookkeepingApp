/**
 * Recurring Invoice API Service
 * 
 * API client for recurring invoice schedule operations using Supabase directly
 * 
 * @author BookkeepingApp Team
 */

import { supabase } from './supabase';
import { auth } from './firebase';

/**
 * Get current Firebase user ID
 */
async function getUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
}

/**
 * Transform database row to camelCase
 * DB columns: id, user_id, company_id, client_id, name, frequency, day_of_month, 
 *             day_of_week, start_date, end_date, max_occurrences, occurrences_generated,
 *             next_run_date, auto_send, is_active, template_data
 */
function transformSchedule(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    clientId: row.client_id,
    name: row.name,
    frequency: row.frequency,
    dayOfMonth: row.day_of_month,
    dayOfWeek: row.day_of_week,
    startDate: row.start_date,
    endDate: row.end_date,
    maxOccurrences: row.max_occurrences,
    occurrencesGenerated: row.occurrences_generated,
    nextRunDate: row.next_run_date,
    autoSend: row.auto_send,
    isActive: row.is_active,
    templateData: row.template_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // snake_case aliases for component compatibility
    client_id: row.client_id,
    start_date: row.start_date,
    end_date: row.end_date,
    next_run_date: row.next_run_date,
    is_active: row.is_active,
    template_data: row.template_data,
    max_occurrences: row.max_occurrences,
    occurrences_count: row.occurrences_generated || 0, // Alias for component
    // Construct invoice object from template_data if available
    invoice: row.template_data ? {
      id: row.template_data.invoice_id,
      invoice_number: row.name, // Use schedule name as invoice reference
      client_name: null, // Would need to join with clients table
      total: row.template_data.total,
    } : null,
  };
}

/**
 * Get all recurring schedules
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Schedules list
 */
export async function getRecurringSchedules(params = {}) {
  const userId = await getUserId();
  
  console.log('[recurringService] getRecurringSchedules called:', { userId, params });
  
  let query = supabase
    .from('recurring_schedules')
    .select('*')
    .eq('user_id', userId)
    .order('next_run_date');
  
  if (params.companyId) {
    query = query.eq('company_id', params.companyId);
  }
  if (params.activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  console.log('[recurringService] getRecurringSchedules result:', { 
    count: data?.length, 
    error: error?.message,
    first: data?.[0]?.id 
  });
  
  if (error) {
    console.error('[recurringService] getRecurringSchedules error:', error);
    throw error;
  }
  
  return {
    success: true,
    data: {
      schedules: (data || []).map(transformSchedule)
    }
  };
}

/**
 * Get a single recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Schedule details
 */
export async function getRecurringSchedule(id) {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('recurring_schedules')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: transformSchedule(data)
  };
}

/**
 * Create a new recurring schedule
 * @param {Object} scheduleData - Schedule data
 * @returns {Promise<Object>} Created schedule
 */
export async function createRecurringSchedule(scheduleData) {
  const userId = await getUserId();
  
  // name is required - generate one if not provided
  const name = scheduleData.name || 
    `Recurring ${scheduleData.frequency || 'monthly'} - ${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`;
  
  console.log('[recurringService] Creating schedule:', {
    name,
    frequency: scheduleData.frequency,
    startDate: scheduleData.startDate || scheduleData.start_date,
  });
  
  const { data, error } = await supabase
    .from('recurring_schedules')
    .insert({
      user_id: userId,
      company_id: scheduleData.companyId || scheduleData.company_id || null,
      client_id: scheduleData.clientId || scheduleData.client_id || null,
      name: name,
      frequency: scheduleData.frequency,
      day_of_month: scheduleData.dayOfMonth || scheduleData.day_of_month || null,
      day_of_week: scheduleData.dayOfWeek || scheduleData.day_of_week || null,
      start_date: scheduleData.startDate || scheduleData.start_date,
      end_date: scheduleData.endDate || scheduleData.end_date || null,
      max_occurrences: scheduleData.maxOccurrences || scheduleData.max_occurrences || null,
      next_run_date: scheduleData.nextRunDate || scheduleData.next_run_date || scheduleData.startDate || scheduleData.start_date,
      auto_send: scheduleData.autoSend || scheduleData.auto_send || false,
      is_active: true,
      template_data: scheduleData.templateData || scheduleData.template_data || {},
    })
    .select()
    .single();
  
  if (error) {
    console.error('[recurringService] Create error:', error);
    throw error;
  }
  
  console.log('[recurringService] Created schedule:', data?.id);
  return {
    success: true,
    data: transformSchedule(data)
  };
}

/**
 * Create recurring schedule from existing invoice
 * @param {string} invoiceId - Source invoice ID
 * @param {Object} options - Schedule options
 * @returns {Promise<Object>} Created schedule and invoice
 */
export async function createFromInvoice(invoiceId, options) {
  const userId = await getUserId();
  
  console.log('[recurringService] createFromInvoice called:', { invoiceId, options });
  
  // Get the invoice to use as template
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .single();
  
  if (invoiceError) {
    console.error('[recurringService] Get invoice error:', invoiceError);
    throw invoiceError;
  }
  
  console.log('[recurringService] Found invoice:', invoice?.id);
  
  // Generate name from invoice
  const name = `Recurring from ${invoice.invoice_number || 'Invoice'} - ${options.frequency || 'monthly'}`;
  
  console.log('[recurringService] Creating from invoice:', {
    invoiceId,
    name,
    frequency: options.frequency,
    startDate: options.startDate || options.start_date,
  });
  
  // Create the recurring schedule with correct column names
  const { data, error } = await supabase
    .from('recurring_schedules')
    .insert({
      user_id: userId,
      company_id: invoice.company_id,
      client_id: invoice.client_id,
      name: name,
      frequency: options.frequency,
      day_of_month: options.dayOfMonth || options.day_of_month || null,
      day_of_week: options.dayOfWeek || options.day_of_week || null,
      start_date: options.startDate || options.start_date,
      end_date: options.endDate || options.end_date || null,
      max_occurrences: options.maxOccurrences || options.max_occurrences || null,
      next_run_date: options.startDate || options.start_date,
      auto_send: options.autoSend || options.auto_send || false,
      is_active: true,
      template_data: {
        invoice_id: invoice.id,
        subtotal: invoice.subtotal,
        tax_total: invoice.tax_total,
        discount_amount: invoice.discount_amount,
        discount_type: invoice.discount_type,
        total: invoice.total,
        notes: invoice.notes,
        terms: invoice.terms,
      },
    })
    .select()
    .single();
  
  if (error) {
    console.error('[recurringService] Create from invoice error:', error);
    throw error;
  }
  
  console.log('[recurringService] Created schedule from invoice:', data?.id);
  return {
    success: true,
    data: {
      schedule: transformSchedule(data),
      invoice
    }
  };
}

/**
 * Update a recurring schedule
 * @param {string} id - Schedule ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated schedule
 */
export async function updateRecurringSchedule(id, updates) {
  const userId = await getUserId();
  
  // Transform camelCase to snake_case (support both formats)
  const updateData = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.clientId !== undefined || updates.client_id !== undefined) 
    updateData.client_id = updates.clientId || updates.client_id;
  if (updates.companyId !== undefined || updates.company_id !== undefined) 
    updateData.company_id = updates.companyId || updates.company_id;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.dayOfMonth !== undefined || updates.day_of_month !== undefined) 
    updateData.day_of_month = updates.dayOfMonth || updates.day_of_month;
  if (updates.dayOfWeek !== undefined || updates.day_of_week !== undefined) 
    updateData.day_of_week = updates.dayOfWeek || updates.day_of_week;
  if (updates.startDate !== undefined || updates.start_date !== undefined) 
    updateData.start_date = updates.startDate || updates.start_date;
  if (updates.endDate !== undefined || updates.end_date !== undefined) 
    updateData.end_date = updates.endDate || updates.end_date;
  if (updates.maxOccurrences !== undefined || updates.max_occurrences !== undefined) 
    updateData.max_occurrences = updates.maxOccurrences || updates.max_occurrences;
  if (updates.nextRunDate !== undefined || updates.next_run_date !== undefined) 
    updateData.next_run_date = updates.nextRunDate || updates.next_run_date;
  if (updates.autoSend !== undefined || updates.auto_send !== undefined) 
    updateData.auto_send = updates.autoSend || updates.auto_send;
  if (updates.isActive !== undefined || updates.is_active !== undefined) 
    updateData.is_active = updates.isActive ?? updates.is_active;
  if (updates.templateData !== undefined || updates.template_data !== undefined) 
    updateData.template_data = updates.templateData || updates.template_data;
  
  console.log('[recurringService] Updating schedule:', id, updateData);
  
  const { data, error } = await supabase
    .from('recurring_schedules')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('[recurringService] Update error:', error);
    throw error;
  }
  
  return {
    success: true,
    data: transformSchedule(data)
  };
}

/**
 * Delete a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteRecurringSchedule(id) {
  const userId = await getUserId();
  
  const { error } = await supabase
    .from('recurring_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) throw error;
  
  return { success: true };
}

/**
 * Pause a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function pauseRecurringSchedule(id) {
  return updateRecurringSchedule(id, { status: 'paused', isActive: false });
}

/**
 * Resume a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function resumeRecurringSchedule(id) {
  return updateRecurringSchedule(id, { status: 'active', isActive: true });
}

/**
 * Manually trigger processing of due recurring invoices
 * Note: This is typically done via a server-side cron job or Edge Function
 * @returns {Promise<Object>} Processing results
 */
export async function processRecurringInvoices() {
  // This would typically be handled by a Supabase Edge Function
  // For now, we return a placeholder
  console.warn('processRecurringInvoices should be handled by an Edge Function');
  return { 
    success: true, 
    data: { 
      processed: 0, 
      message: 'Processing should be done via scheduled Edge Function' 
    } 
  };
}

export default {
  getRecurringSchedules,
  getRecurringSchedule,
  createRecurringSchedule,
  createFromInvoice,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  pauseRecurringSchedule,
  resumeRecurringSchedule,
  processRecurringInvoices
};
