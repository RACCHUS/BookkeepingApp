import express from 'express';
import { body } from 'express-validator';
import {
  classifyTransaction,
  trainClassifier,
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  testClassification,
  bulkReclassify,
  getClassificationStats,
  getUncategorizedTransactions
} from '../controllers/classificationController.js';

const router = express.Router();

// Routes
router.post('/classify', classifyTransaction);
router.post('/test', testClassification);
router.post('/train', trainClassifier);
router.post('/bulk-reclassify', bulkReclassify);
router.get('/stats', getClassificationStats);
router.get('/uncategorized', getUncategorizedTransactions);
router.get('/rules', getClassificationRules);
router.post('/rules', createClassificationRule);
router.put('/rules/:id', updateClassificationRule);
router.delete('/rules/:id', deleteClassificationRule);

export default router;
