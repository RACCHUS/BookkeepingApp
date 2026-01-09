/**
 * Catalogue Routes
 * 
 * API routes for catalogue item management
 * 
 * @author BookkeepingApp Team
 */

import express from 'express';
import {
  catalogueValidation,
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getCategories,
  duplicateItem
} from '../controllers/catalogueController.js';

const router = express.Router();

/**
 * @route GET /api/catalogue
 * @desc Get all catalogue items
 * @access Private
 */
router.get('/', catalogueValidation.list, getItems);

/**
 * @route GET /api/catalogue/categories
 * @desc Get unique categories
 * @access Private
 */
router.get('/categories', getCategories);

/**
 * @route GET /api/catalogue/:id
 * @desc Get a single catalogue item
 * @access Private
 */
router.get('/:id', catalogueValidation.getById, getItem);

/**
 * @route POST /api/catalogue
 * @desc Create a new catalogue item
 * @access Private
 */
router.post('/', catalogueValidation.create, createItem);

/**
 * @route POST /api/catalogue/:id/duplicate
 * @desc Duplicate a catalogue item
 * @access Private
 */
router.post('/:id/duplicate', catalogueValidation.getById, duplicateItem);

/**
 * @route PUT /api/catalogue/:id
 * @desc Update a catalogue item
 * @access Private
 */
router.put('/:id', catalogueValidation.update, updateItem);

/**
 * @route DELETE /api/catalogue/:id
 * @desc Delete a catalogue item (soft delete by default)
 * @access Private
 */
router.delete('/:id', catalogueValidation.getById, deleteItem);

export default router;
