import express from 'express';
import { body } from 'express-validator';

import {
  classifyTransaction
} from '../controllers/classificationController.js';

const router = express.Router();


// Only rule-based classification endpoint remains
router.post('/classify', classifyTransaction);

export default router;
