/**
 * @fileoverview Inventory Validation - Validation schemas for inventory endpoints
 * @description Express-validator middleware for inventory operations
 * @version 1.0.0
 */

import { body, param, query } from 'express-validator';

/**
 * Inventory transaction types
 */
const INVENTORY_TRANSACTION_TYPES = ['purchase', 'sale', 'adjustment', 'return', 'damaged', 'correction'];

/**
 * Inventory item validation constants
 */
const INVENTORY_CONSTANTS = {
  LIMITS: {
    SKU_MAX: 50,
    NAME_MAX: 200,
    DESCRIPTION_MAX: 1000,
    CATEGORY_MAX: 100,
    UNIT_MAX: 50,
    SUPPLIER_MAX: 200,
    NOTES_MAX: 500
  }
};

/**
 * Validation for creating an inventory item
 */
export const createItemValidation = [
  body('sku')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.SKU_MAX })
    .withMessage(`SKU must be less than ${INVENTORY_CONSTANTS.LIMITS.SKU_MAX} characters`),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.NAME_MAX })
    .withMessage(`Name must be less than ${INVENTORY_CONSTANTS.LIMITS.NAME_MAX} characters`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.DESCRIPTION_MAX })
    .withMessage(`Description must be less than ${INVENTORY_CONSTANTS.LIMITS.DESCRIPTION_MAX} characters`),
  body('category')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.CATEGORY_MAX })
    .withMessage(`Category must be less than ${INVENTORY_CONSTANTS.LIMITS.CATEGORY_MAX} characters`),
  body('unitCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a positive number'),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('reorderLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reorder level must be a non-negative integer'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.UNIT_MAX })
    .withMessage(`Unit must be less than ${INVENTORY_CONSTANTS.LIMITS.UNIT_MAX} characters`),
  body('supplier')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.SUPPLIER_MAX })
    .withMessage(`Supplier must be less than ${INVENTORY_CONSTANTS.LIMITS.SUPPLIER_MAX} characters`),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID')
];

/**
 * Validation for updating an inventory item
 */
export const updateItemValidation = [
  param('id')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  body('sku')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('SKU cannot be empty')
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.SKU_MAX })
    .withMessage(`SKU must be less than ${INVENTORY_CONSTANTS.LIMITS.SKU_MAX} characters`),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.NAME_MAX })
    .withMessage(`Name must be less than ${INVENTORY_CONSTANTS.LIMITS.NAME_MAX} characters`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.DESCRIPTION_MAX })
    .withMessage(`Description must be less than ${INVENTORY_CONSTANTS.LIMITS.DESCRIPTION_MAX} characters`),
  body('category')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.CATEGORY_MAX })
    .withMessage(`Category must be less than ${INVENTORY_CONSTANTS.LIMITS.CATEGORY_MAX} characters`),
  body('unitCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a positive number'),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  body('reorderLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reorder level must be a non-negative integer'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.UNIT_MAX })
    .withMessage(`Unit must be less than ${INVENTORY_CONSTANTS.LIMITS.UNIT_MAX} characters`),
  body('supplier')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.SUPPLIER_MAX })
    .withMessage(`Supplier must be less than ${INVENTORY_CONSTANTS.LIMITS.SUPPLIER_MAX} characters`),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID')
];

/**
 * Validation for stock adjustment
 */
export const stockAdjustmentValidation = [
  param('id')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt()
    .withMessage('Quantity must be an integer'),
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(INVENTORY_TRANSACTION_TYPES)
    .withMessage(`Type must be one of: ${INVENTORY_TRANSACTION_TYPES.join(', ')}`),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: INVENTORY_CONSTANTS.LIMITS.NOTES_MAX })
    .withMessage(`Notes must be less than ${INVENTORY_CONSTANTS.LIMITS.NOTES_MAX} characters`),
  body('unitCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a positive number')
];

/**
 * Validation for recording a sale
 */
export const recordSaleValidation = [
  param('id')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('transactionId')
    .optional()
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
];

/**
 * Validation for recording a purchase
 */
export const recordPurchaseValidation = [
  param('id')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('unitCost')
    .notEmpty()
    .withMessage('Unit cost is required')
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a positive number'),
  body('transactionId')
    .optional()
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
];

/**
 * Validation for item ID parameter
 */
export const itemIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Item ID must be a valid UUID')
];

/**
 * Validation for query parameters
 */
export const queryValidation = [
  query('companyId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  query('category')
    .optional({ values: 'falsy' })
    .trim(),
  query('search')
    .optional({ values: 'falsy' })
    .trim(),
  query('lowStock')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('lowStock must be a boolean'),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query('offset')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

/**
 * Validation for transaction query parameters
 */
export const transactionQueryValidation = [
  query('itemId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  query('companyId')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  query('type')
    .optional({ values: 'falsy' })
    .isIn(INVENTORY_TRANSACTION_TYPES)
    .withMessage(`Type must be one of: ${INVENTORY_TRANSACTION_TYPES.join(', ')}`),
  query('startDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query('offset')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export { INVENTORY_CONSTANTS, INVENTORY_TRANSACTION_TYPES };
