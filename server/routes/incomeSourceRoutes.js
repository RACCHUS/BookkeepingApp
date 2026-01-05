/**
 * Income Source Routes
 * API endpoints for managing income sources (customers, services, products)
 */

import express from 'express';
import incomeSourceController from '../controllers/incomeSourceController.js';

const router = express.Router();

// Note: Authentication is handled by optionalAuthMiddleware in server/index.js

// GET /api/income-sources - Get all income sources
router.get('/', incomeSourceController.getAllIncomeSources);

// GET /api/income-sources/:id - Get income source by ID
router.get('/:id', incomeSourceController.getIncomeSourceById);

// POST /api/income-sources - Create a new income source
router.post('/', incomeSourceController.createIncomeSource);

// PUT /api/income-sources/:id - Update an income source
router.put('/:id', incomeSourceController.updateIncomeSource);

// DELETE /api/income-sources/:id - Delete an income source
router.delete('/:id', incomeSourceController.deleteIncomeSource);

// GET /api/income-sources/:id/transactions - Get transactions for an income source
router.get('/:id/transactions', incomeSourceController.getTransactionsBySource);

// GET /api/income-sources/:id/summary - Get summary for an income source
router.get('/:id/summary', incomeSourceController.getSourceSummary);

export default router;
