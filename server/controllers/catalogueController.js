/**
 * Catalogue Controller
 * 
 * HTTP request handlers for catalogue item management
 * 
 * @author BookkeepingApp Team
 */

import { validationResult, body, param, query } from 'express-validator';
import catalogueService from '../services/invoicing/catalogueService.js';
import logger from '../config/logger.js';

/**
 * Validation rules for catalogue items
 */
export const catalogueValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('SKU must be 50 characters or less'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Category must be 100 characters or less'),
    body('unit_price')
      .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('unit')
      .optional()
      .isIn(['each', 'hour', 'day', 'week', 'month', 'year', 'sqft', 'linear_ft', 'unit', 'project', 'service'])
      .withMessage('Invalid unit type'),
    body('tax_rate')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active must be a boolean'),
    body('company_id')
      .optional()
      .isUUID().withMessage('Invalid company ID')
  ],
  update: [
    param('id').isUUID().withMessage('Invalid item ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 200 }).withMessage('Name must be 200 characters or less'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or less'),
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('SKU must be 50 characters or less'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Category must be 100 characters or less'),
    body('unit_price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('unit')
      .optional()
      .isIn(['each', 'hour', 'day', 'week', 'month', 'year', 'sqft', 'linear_ft', 'unit', 'project', 'service'])
      .withMessage('Invalid unit type'),
    body('tax_rate')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active must be a boolean'),
    body('company_id')
      .optional()
      .isUUID().withMessage('Invalid company ID')
  ],
  getById: [
    param('id').isUUID().withMessage('Invalid item ID')
  ],
  list: [
    query('companyId').optional().isUUID().withMessage('Invalid company ID'),
    query('category').optional().trim(),
    query('activeOnly').optional().isBoolean().withMessage('activeOnly must be a boolean'),
    query('search').optional().trim()
  ]
};

/**
 * Get all catalogue items
 * GET /api/catalogue
 */
export async function getItems(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const { companyId, category, activeOnly, search } = req.query;
    
    const items = await catalogueService.getCatalogueItems(userId, {
      companyId,
      category,
      activeOnly: activeOnly !== 'false',
      search
    });

    res.json({ items, count: items.length });
  } catch (error) {
    logger.error('Error in getItems:', error);
    res.status(500).json({ error: 'Failed to get catalogue items' });
  }
}

/**
 * Get a single catalogue item
 * GET /api/catalogue/:id
 */
export async function getItem(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const { id } = req.params;
    
    const item = await catalogueService.getCatalogueItem(userId, id);
    
    if (!item) {
      return res.status(404).json({ error: 'Catalogue item not found' });
    }

    res.json(item);
  } catch (error) {
    logger.error('Error in getItem:', error);
    res.status(500).json({ error: 'Failed to get catalogue item' });
  }
}

/**
 * Create a new catalogue item
 * POST /api/catalogue
 */
export async function createItem(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const item = await catalogueService.createCatalogueItem(userId, req.body);

    res.status(201).json(item);
  } catch (error) {
    logger.error('Error in createItem:', error);
    res.status(500).json({ error: 'Failed to create catalogue item' });
  }
}

/**
 * Update a catalogue item
 * PUT /api/catalogue/:id
 */
export async function updateItem(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const { id } = req.params;
    
    const item = await catalogueService.updateCatalogueItem(userId, id, req.body);

    res.json(item);
  } catch (error) {
    logger.error('Error in updateItem:', error);
    if (error.message === 'Catalogue item not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update catalogue item' });
  }
}

/**
 * Delete a catalogue item (soft delete)
 * DELETE /api/catalogue/:id
 */
export async function deleteItem(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true for permanent delete
    
    if (hard === 'true') {
      await catalogueService.hardDeleteCatalogueItem(userId, id);
      res.json({ message: 'Catalogue item permanently deleted' });
    } else {
      await catalogueService.deleteCatalogueItem(userId, id);
      res.json({ message: 'Catalogue item deactivated' });
    }
  } catch (error) {
    logger.error('Error in deleteItem:', error);
    if (error.message === 'Catalogue item not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete catalogue item' });
  }
}

/**
 * Get unique categories
 * GET /api/catalogue/categories
 */
export async function getCategories(req, res) {
  try {
    const userId = req.user?.uid || 'dev-user';
    const { companyId } = req.query;
    
    const categories = await catalogueService.getCategories(userId, companyId);

    res.json({ categories });
  } catch (error) {
    logger.error('Error in getCategories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
}

/**
 * Duplicate a catalogue item
 * POST /api/catalogue/:id/duplicate
 */
export async function duplicateItem(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.uid || 'dev-user';
    const { id } = req.params;
    
    const item = await catalogueService.duplicateCatalogueItem(userId, id);

    res.status(201).json(item);
  } catch (error) {
    logger.error('Error in duplicateItem:', error);
    if (error.message === 'Catalogue item not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to duplicate catalogue item' });
  }
}

export default {
  catalogueValidation,
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getCategories,
  duplicateItem
};
