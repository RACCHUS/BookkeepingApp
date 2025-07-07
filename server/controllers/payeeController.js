import { validationResult, body, query, param } from 'express-validator';
import payeeService from '../services/payeeService.js';

/**
 * Create a new payee (employee/vendor)
 */
export const createPayee = async (req, res) => {
  try {
    console.log('📋 Creating payee with data:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const payeeData = req.body;

    console.log('🔍 User ID:', userId);
    console.log('📄 Payee data after validation:', payeeData);

    const result = await payeeService.createPayee(userId, payeeData);

    console.log('✅ Payee created successfully:', result.id);

    res.status(201).json({
      success: true,
      message: 'Payee created successfully',
      ...result
    });

  } catch (error) {
    console.error('❌ Create payee error:', error);
    res.status(500).json({
      error: 'Failed to create payee',
      message: error.message
    });
  }
};

/**
 * Get all payees for user
 */
export const getPayees = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { type, companyId, isActive, search } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (companyId) filters.companyId = companyId;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    let payees;
    if (search) {
      payees = await payeeService.searchPayees(userId, search, filters);
    } else {
      payees = await payeeService.getPayees(userId, filters);
    }

    res.json({
      success: true,
      payees,
      count: payees.length
    });

  } catch (error) {
    console.error('Get payees error:', error);
    res.status(500).json({
      error: 'Failed to get payees',
      message: error.message
    });
  }
};

/**
 * Get specific payee by ID
 */
export const getPayeeById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;

    const payee = await payeeService.getPayeeById(userId, id);

    res.json({
      success: true,
      payee
    });

  } catch (error) {
    console.error('Get payee error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      error: 'Failed to get payee',
      message: error.message
    });
  }
};

/**
 * Update a payee
 */
export const updatePayee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const result = await payeeService.updatePayee(userId, id, updates);

    res.json({
      success: true,
      message: 'Payee updated successfully',
      ...result
    });

  } catch (error) {
    console.error('Update payee error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      error: 'Failed to update payee',
      message: error.message
    });
  }
};

/**
 * Delete a payee
 */
export const deletePayee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;

    const result = await payeeService.deletePayee(userId, id);

    res.json({
      success: true,
      message: 'Payee deleted successfully',
      ...result
    });

  } catch (error) {
    console.error('Delete payee error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Unauthorized') ? 403 : 500;
    res.status(status).json({
      error: 'Failed to delete payee',
      message: error.message
    });
  }
};

/**
 * Get transactions without assigned payees
 */
export const getTransactionsWithoutPayees = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { sectionCode = 'checks' } = req.query;

    const transactions = await payeeService.getTransactionsWithoutPayees(userId, sectionCode);

    res.json({
      success: true,
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Get transactions without payees error:', error);
    res.status(500).json({
      error: 'Failed to get transactions without payees',
      message: error.message
    });
  }
};

/**
 * Get employees (shortcut for type=employee)
 */
export const getEmployees = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { companyId } = req.query;

    const employees = await payeeService.getPayeesByType(userId, 'employee', companyId);

    res.json({
      success: true,
      employees,
      count: employees.length
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      error: 'Failed to get employees',
      message: error.message
    });
  }
};

/**
 * Get vendors (shortcut for type=vendor)
 */
export const getVendors = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { companyId } = req.query;

    const vendors = await payeeService.getPayeesByType(userId, 'vendor', companyId);

    res.json({
      success: true,
      vendors,
      count: vendors.length
    });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      error: 'Failed to get vendors',
      message: error.message
    });
  }
};

// Validation rules
export const createPayeeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(['employee', 'vendor', 'contractor', 'customer']).withMessage('Valid type is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('phone').optional({ checkFalsy: true }).matches(/^[\d\s\-\(\)\+\.x]+$/).withMessage('Valid phone number is required'),
  body('companyId').optional({ checkFalsy: true }).isString().withMessage('Company ID must be a string'),
  body('taxId').optional({ checkFalsy: true }).isString().withMessage('Tax ID must be a string'),
  body('preferredPaymentMethod').optional({ checkFalsy: true }).isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'other']).withMessage('Valid payment method is required')
];

export const updatePayeeValidation = [
  param('id').isString().notEmpty().withMessage('Valid payee ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('type').optional().isIn(['employee', 'vendor', 'contractor', 'customer']).withMessage('Valid type is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('phone').optional({ checkFalsy: true }).matches(/^[\d\s\-\(\)\+\.x]+$/).withMessage('Valid phone number is required'),
  body('companyId').optional({ checkFalsy: true }).isString().withMessage('Company ID must be a string')
];

export const getPayeeValidation = [
  param('id').isString().notEmpty().withMessage('Valid payee ID is required')
];

export const getPayeesValidation = [
  query('type').optional().isIn(['employee', 'vendor', 'contractor', 'customer']).withMessage('Valid type is required'),
  query('companyId').optional().isString().withMessage('Company ID must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('search').optional().isString().withMessage('Search must be a string')
];
