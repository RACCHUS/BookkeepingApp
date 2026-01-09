/**
 * Recurring Invoice Service
 * 
 * Manages recurring invoice schedules and automatic invoice generation
 * 
 * @author BookkeepingApp Team
 */

import { getDatabaseAdapter } from '../adapters/index.js';
import logger from '../../config/logger.js';
import invoiceService from './invoiceService.js';

/**
 * Get initialized database adapter
 * @returns {Promise<Object>} Initialized database adapter
 */
async function getDb() {
  const db = getDatabaseAdapter();
  if (!db.supabase) {
    await db.initialize();
  }
  return db;
}

/**
 * Create a new recurring schedule
 * @param {Object} scheduleData - The schedule data
 * @returns {Promise<Object>} Created schedule
 */
export async function createRecurringSchedule(scheduleData) {
  try {
    const db = await getDb();
    
    const schedule = {
      user_id: scheduleData.user_id,
      company_id: scheduleData.company_id,
      client_id: scheduleData.client_id || null,
      name: scheduleData.name || 'Recurring Invoice',
      frequency: scheduleData.frequency || 'monthly',
      day_of_month: scheduleData.day_of_month || null,
      day_of_week: scheduleData.day_of_week || null,
      start_date: scheduleData.start_date || new Date().toISOString().split('T')[0],
      next_run_date: scheduleData.start_date || new Date().toISOString().split('T')[0],
      end_date: scheduleData.end_date || null,
      max_occurrences: scheduleData.max_occurrences || null,
      occurrences_generated: 0,
      auto_send: scheduleData.auto_send || false,
      is_active: true,
      template_data: scheduleData.template_data || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db.supabase
      .from('recurring_schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Created recurring schedule ${data.id} - ${data.name}`);
    return data;
  } catch (error) {
    logger.error('Error creating recurring schedule:', error);
    throw error;
  }
}

/**
 * Get recurring schedule by ID
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Schedule with client details
 */
export async function getRecurringSchedule(id) {
  try {
    const db = await getDb();
    
    const { data, error } = await db.supabase
      .from('recurring_schedules')
      .select(`
        *,
        client:payees(id, name, email, address)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching recurring schedule:', error);
    throw error;
  }
}

/**
 * Get all recurring schedules for a company
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Schedules list
 */
export async function getRecurringSchedules(filters = {}) {
  try {
    const db = await getDb();
    
    let query = db.supabase
      .from('recurring_schedules')
      .select(`
        *,
        client:payees(id, name)
      `)
      .order('next_run_date', { ascending: true });

    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters.activeOnly !== false) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { schedules: data };
  } catch (error) {
    logger.error('Error fetching recurring schedules:', error);
    throw error;
  }
}

/**
 * Update a recurring schedule
 * @param {string} id - Schedule ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated schedule
 */
export async function updateRecurringSchedule(id, updates) {
  try {
    const db = await getDb();
    
    const allowedFields = [
      'name', 'frequency', 'day_of_month', 'day_of_week',
      'next_run_date', 'end_date', 'max_occurrences', 
      'auto_send', 'is_active', 'template_data'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await db.supabase
      .from('recurring_schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Updated recurring schedule ${id}`);
    return data;
  } catch (error) {
    logger.error('Error updating recurring schedule:', error);
    throw error;
  }
}

/**
 * Delete a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteRecurringSchedule(id) {
  try {
    const db = await getDb();
    
    const { error } = await db.supabase
      .from('recurring_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Deleted recurring schedule ${id}`);
    return true;
  } catch (error) {
    logger.error('Error deleting recurring schedule:', error);
    throw error;
  }
}

/**
 * Pause a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function pauseRecurringSchedule(id) {
  return updateRecurringSchedule(id, { is_active: false });
}

/**
 * Resume a recurring schedule
 * @param {string} id - Schedule ID
 * @returns {Promise<Object>} Updated schedule
 */
export async function resumeRecurringSchedule(id) {
  return updateRecurringSchedule(id, { is_active: true });
}

/**
 * Calculate next run date based on frequency
 * @param {Date} currentDate - Current run date
 * @param {string} frequency - Frequency type
 * @param {number} intervalCount - Number of intervals
 * @returns {Date} Next run date
 */
export function calculateNextRunDate(currentDate, frequency, intervalCount = 1) {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + intervalCount);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * intervalCount));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + (14 * intervalCount));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + intervalCount);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + (3 * intervalCount));
      break;
    case 'semi_annual':
      date.setMonth(date.getMonth() + (6 * intervalCount));
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + intervalCount);
      break;
    default:
      date.setMonth(date.getMonth() + intervalCount);
  }
  
  return date;
}

/**
 * Process due recurring invoices
 * Creates new invoices for schedules that are due
 * @returns {Promise<Object>} Processing results
 */
export async function processDueRecurringInvoices() {
  try {
    const db = await getDb();
    const now = new Date();
    const results = { processed: 0, created: [], errors: [] };

    // Get all active schedules that are due
    const { data: dueSchedules, error } = await db.supabase
      .from('recurring_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_date', now.toISOString());

    if (error) throw error;

    for (const schedule of dueSchedules || []) {
      try {
        // Check if max occurrences reached
        if (schedule.max_occurrences && schedule.occurrences_generated >= schedule.max_occurrences) {
          await updateRecurringSchedule(schedule.id, { is_active: false });
          continue;
        }

        // Check if end date passed
        if (schedule.end_date && new Date(schedule.end_date) < now) {
          await updateRecurringSchedule(schedule.id, { is_active: false });
          continue;
        }

        // Get template data from the schedule
        const templateData = schedule.template_data;
        if (!templateData) {
          logger.warn(`No template data found for schedule ${schedule.id}`);
          continue;
        }

        // Prepare new invoice data from template
        const newInvoiceData = {
          user_id: schedule.user_id,
          company_id: schedule.company_id,
          client_id: schedule.client_id,
          client_name: templateData.client_name,
          client_email: templateData.client_email,
          client_address: templateData.client_address,
          invoice_date: now.toISOString().split('T')[0],
          payment_terms: templateData.payment_terms || 'net_30',
          title: templateData.title,
          notes: templateData.notes,
          terms: templateData.terms,
          discount_type: templateData.discount_type,
          discount_value: templateData.discount_value,
          line_items: (templateData.line_items || []).map(item => ({
            catalogue_item_id: item.catalogue_item_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            unit: item.unit
          })),
          recurring_schedule_id: schedule.id,
          is_recurring: true
        };

        // Create the invoice
        const newInvoice = await invoiceService.createInvoice(newInvoiceData);
        results.created.push(newInvoice);

        // Update schedule
        const nextRunDate = calculateNextRunDate(
          schedule.next_run_date,
          schedule.frequency,
          schedule.interval_count
        );

        await db.supabase
          .from('recurring_schedules')
          .update({
            next_run_date: nextRunDate.toISOString(),
            last_run_date: now.toISOString(),
            occurrences_generated: schedule.occurrences_generated + 1,
            updated_at: now.toISOString()
          })
          .eq('id', schedule.id);

        results.processed++;
        logger.info(`Created recurring invoice ${newInvoice.id} from schedule ${schedule.id}`);

      } catch (scheduleError) {
        logger.error(`Error processing schedule ${schedule.id}:`, scheduleError);
        results.errors.push({ scheduleId: schedule.id, error: scheduleError.message });
      }
    }

    logger.info(`Processed ${results.processed} recurring invoices`);
    return results;
  } catch (error) {
    logger.error('Error processing recurring invoices:', error);
    throw error;
  }
}

/**
 * Create recurring schedule from an existing invoice
 * @param {string} invoiceId - Source invoice ID
 * @param {Object} scheduleOptions - Schedule configuration
 * @returns {Promise<Object>} Created schedule
 */
export async function createRecurringFromInvoice(invoiceId, scheduleOptions) {
  try {
    // Get the invoice to use as template
    const invoice = await invoiceService.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Create template_data from the invoice
    const templateData = {
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      client_address: invoice.client_address,
      payment_terms: invoice.payment_terms,
      title: invoice.title,
      notes: invoice.notes,
      terms: invoice.terms,
      discount_type: invoice.discount_type,
      discount_value: invoice.discount_value,
      line_items: invoice.line_items || []
    };

    const schedule = await createRecurringSchedule({
      user_id: invoice.user_id,
      company_id: invoice.company_id,
      client_id: invoice.client_id,
      name: scheduleOptions.name || `Recurring: ${invoice.invoice_number || 'Invoice'}`,
      frequency: scheduleOptions.frequency || 'monthly',
      day_of_month: scheduleOptions.day_of_month,
      day_of_week: scheduleOptions.day_of_week,
      start_date: scheduleOptions.start_date,
      end_date: scheduleOptions.end_date,
      max_occurrences: scheduleOptions.max_occurrences,
      auto_send: scheduleOptions.auto_send || false,
      template_data: templateData
    });

    return { schedule, invoice };
  } catch (error) {
    logger.error('Error creating recurring from invoice:', error);
    throw error;
  }
}

export const recurringService = {
  createRecurringSchedule,
  getRecurringSchedule,
  getRecurringSchedules,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  pauseRecurringSchedule,
  resumeRecurringSchedule,
  processDueRecurringInvoices,
  createRecurringFromInvoice,
  calculateNextRunDate
};

export default recurringService;
