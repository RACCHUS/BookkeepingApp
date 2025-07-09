import express from 'express';
import { body } from 'express-validator';

import {
  classifyTransaction,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  getUncategorizedTransactions
} from '../controllers/classificationController.js';

const router = express.Router();

// Only rule-based classification endpoint remains
router.post('/classify', classifyTransaction);

// Rule management endpoints (needed for Classification page)
router.get('/rules', (req, res) => res.json({ rules: [] })); // TODO: Implement real rule storage
router.post('/rules', createClassificationRule);
router.put('/rules/:id', updateClassificationRule);
router.delete('/rules/:id', deleteClassificationRule);

// Get uncategorized transactions
router.get('/uncategorized', getUncategorizedTransactions);

export default router;
