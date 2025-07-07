import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createPayee,
  getPayees,
  getPayeeById,
  updatePayee,
  deletePayee,
  getTransactionsWithoutPayees,
  getEmployees,
  getVendors,
  createPayeeValidation,
  updatePayeeValidation,
  getPayeeValidation,
  getPayeesValidation
} from '../controllers/payeeController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Payee CRUD routes
router.post('/', createPayeeValidation, createPayee);
router.get('/', getPayeesValidation, getPayees);
router.get('/employees', getEmployees);
router.get('/vendors', getVendors);
router.get('/transactions-without-payees', getTransactionsWithoutPayees);
router.get('/:id', getPayeeValidation, getPayeeById);
router.put('/:id', updatePayeeValidation, updatePayee);
router.delete('/:id', getPayeeValidation, deletePayee);

export default router;
