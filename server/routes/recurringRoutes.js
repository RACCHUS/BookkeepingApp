/**
 * Recurring Invoice Routes
 * 
 * API routes for recurring invoice schedule management
 * 
 * @author BookkeepingApp Team
 */

import express from 'express';
import recurringController from '../controllers/recurringController.js';

const router = express.Router();

// Get all recurring schedules
router.get('/', recurringController.getRecurringSchedules);

// Process due recurring invoices (cron endpoint)
router.post('/process', recurringController.processRecurringInvoices);

// Get single schedule
router.get('/:id', recurringController.getRecurringSchedule);

// Create new schedule
router.post(
  '/',
  recurringController.recurringValidation.create,
  recurringController.createRecurringSchedule
);

// Create schedule from existing invoice
router.post(
  '/from-invoice',
  recurringController.recurringValidation.create,
  recurringController.createFromInvoice
);

// Update schedule
router.put(
  '/:id',
  recurringController.recurringValidation.update,
  recurringController.updateRecurringSchedule
);

// Delete schedule
router.delete('/:id', recurringController.deleteRecurringSchedule);

// Pause schedule
router.post('/:id/pause', recurringController.pauseRecurringSchedule);

// Resume schedule
router.post('/:id/resume', recurringController.resumeRecurringSchedule);

export default router;
