import express from 'express';
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
import { 
  validateObjectId,
  apiRateLimit
} from '../middlewares/index.js';

const router = express.Router();

// Apply rate limiting to all payee routes
router.use(apiRateLimit);

// Enhanced Payee Routes with validation

/**
 * @route POST /api/payees
 * @desc Create new payee
 * @access Private
 */
router.post('/', createPayeeValidation, createPayee);

/**
 * @route GET /api/payees
 * @desc Get all payees with optional filtering
 * @access Private
 */
router.get('/', getPayeesValidation, getPayees);

/**
 * @route GET /api/payees/employees
 * @desc Get employee payees
 * @access Private
 */
router.get('/employees', getEmployees);

/**
 * @route GET /api/payees/vendors
 * @desc Get vendor payees
 * @access Private
 */
router.get('/vendors', getVendors);

/**
 * @route GET /api/payees/transactions-without-payees
 * @desc Get transactions that don't have assigned payees
 * @access Private
 */
router.get('/transactions-without-payees', getTransactionsWithoutPayees);

/**
 * @route GET /api/payees/:id
 * @desc Get specific payee by ID
 * @access Private
 */
router.get('/:id', validateObjectId('id'), getPayeeValidation, getPayeeById);

/**
 * @route PUT /api/payees/:id
 * @desc Update payee information
 * @access Private
 */
router.put('/:id', validateObjectId('id'), updatePayeeValidation, updatePayee);

/**
 * @route DELETE /api/payees/:id
 * @desc Delete payee
 * @access Private
 */
router.delete('/:id', validateObjectId('id'), deletePayee);
router.delete('/:id', getPayeeValidation, deletePayee);

export default router;
