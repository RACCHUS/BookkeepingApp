/**
 * Recurring Invoice Controller
 * 
 * HTTP handlers for recurring invoice schedule operations
 * 
 * @author BookkeepingApp Team
 */

import { recurringService } from '../services/invoicing/recurringService.js';
import logger from '../config/logger.js';
import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation rules for recurring schedules
 */
export const recurringValidation = {
  create: [
    body('invoice_id').isUUID().withMessage('Valid invoice ID is required'),
    body('frequency').isIn(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual'])
      .withMessage('Invalid frequency'),
    body('interval_count').optional().isInt({ min: 1 }).withMessage('Interval must be at least 1'),
    body('start_date').optional().isISO8601().withMessage('Invalid start date'),
    body('end_date').optional().isISO8601().withMessage('Invalid end date'),
    body('max_occurrences').optional().isInt({ min: 1 }).withMessage('Max occurrences must be at least 1')
  ],
  update: [
    param('id').isUUID().withMessage('Valid schedule ID is required'),
    body('frequency').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual'])
      .withMessage('Invalid frequency'),
    body('interval_count').optional().isInt({ min: 1 }).withMessage('Interval must be at least 1'),
    body('next_run_date').optional().isISO8601().withMessage('Invalid next run date'),
    body('end_date').optional().isISO8601().withMessage('Invalid end date'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ]
};

/**
 * Get all recurring schedules
 */
export async function getRecurringSchedules(req, res) {
  try {
    const { companyId, activeOnly } = req.query;
    
    const result = await recurringService.getRecurringSchedules({
      companyId,
      activeOnly: activeOnly !== 'false'
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Error fetching recurring schedules:', error);
    res.status(500).json({ error: 'Failed to fetch recurring schedules' });
  }
}

/**
 * Get a single recurring schedule
 */
export async function getRecurringSchedule(req, res) {
  try {
    const { id } = req.params;
    const schedule = await recurringService.getRecurringSchedule(id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Recurring schedule not found' });
    }
    
    res.json({ schedule });
  } catch (error) {
    logger.error('Error fetching recurring schedule:', error);
    res.status(500).json({ error: 'Failed to fetch recurring schedule' });
  }
}

/**
 * Create a new recurring schedule
 */
export async function createRecurringSchedule(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const schedule = await recurringService.createRecurringSchedule(req.body);
    res.status(201).json({ schedule });
  } catch (error) {
    logger.error('Error creating recurring schedule:', error);
    res.status(500).json({ error: 'Failed to create recurring schedule' });
  }
}

/**
 * Create recurring schedule from existing invoice
 */
export async function createFromInvoice(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invoice_id, ...scheduleOptions } = req.body;
    const result = await recurringService.createRecurringFromInvoice(invoice_id, scheduleOptions);
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating recurring from invoice:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: 'Failed to create recurring schedule' });
  }
}

/**
 * Update a recurring schedule
 */
export async function updateRecurringSchedule(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const schedule = await recurringService.updateRecurringSchedule(id, req.body);
    
    res.json({ schedule });
  } catch (error) {
    logger.error('Error updating recurring schedule:', error);
    res.status(500).json({ error: 'Failed to update recurring schedule' });
  }
}

/**
 * Delete a recurring schedule
 */
export async function deleteRecurringSchedule(req, res) {
  try {
    const { id } = req.params;
    await recurringService.deleteRecurringSchedule(id);
    
    res.json({ success: true, message: 'Recurring schedule deleted' });
  } catch (error) {
    logger.error('Error deleting recurring schedule:', error);
    res.status(500).json({ error: 'Failed to delete recurring schedule' });
  }
}

/**
 * Pause a recurring schedule
 */
export async function pauseRecurringSchedule(req, res) {
  try {
    const { id } = req.params;
    const schedule = await recurringService.pauseRecurringSchedule(id);
    
    res.json({ schedule, message: 'Recurring schedule paused' });
  } catch (error) {
    logger.error('Error pausing recurring schedule:', error);
    res.status(500).json({ error: 'Failed to pause recurring schedule' });
  }
}

/**
 * Resume a recurring schedule
 */
export async function resumeRecurringSchedule(req, res) {
  try {
    const { id } = req.params;
    const schedule = await recurringService.resumeRecurringSchedule(id);
    
    res.json({ schedule, message: 'Recurring schedule resumed' });
  } catch (error) {
    logger.error('Error resuming recurring schedule:', error);
    res.status(500).json({ error: 'Failed to resume recurring schedule' });
  }
}

/**
 * Manually trigger processing of due recurring invoices
 * This is typically called by a cron job
 */
export async function processRecurringInvoices(req, res) {
  try {
    const results = await recurringService.processDueRecurringInvoices();
    
    res.json({
      success: true,
      processed: results.processed,
      created: results.created.length,
      errors: results.errors.length,
      details: results
    });
  } catch (error) {
    logger.error('Error processing recurring invoices:', error);
    res.status(500).json({ error: 'Failed to process recurring invoices' });
  }
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
  processRecurringInvoices,
  recurringValidation
};
