import express from 'express';
import { body, query, param } from 'express-validator';
import {
  getCompanies,
  getCompanyById,
  getDefaultCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  setDefaultCompany,
  extractCompanyFromPDF,
  findCompanyByName
} from '../controllers/companyController.js';

const router = express.Router();

// Validation middleware
const createCompanyValidation = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Company name is required and must be less than 200 characters'),
  body('legalName')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Legal name must be less than 200 characters'),
  body('businessType')
    .optional()
    .isIn(['LLC', 'Corp', 'Partnership', 'Sole Proprietorship', 'S-Corp', 'Non-Profit', 'Other'])
    .withMessage('Invalid business type'),
  body('taxId')
    .optional()
    .matches(/^\d{2}-\d{7}$|^\d{3}-\d{2}-\d{4}$/)
    .withMessage('Tax ID must be in format XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN)'),
  body('address.street')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Street address must be less than 200 characters'),
  body('address.city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('address.state')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must be a 2-letter state code'),
  body('address.zipCode')
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Zip code must be in format XXXXX or XXXXX-XXXX'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)\.]+$/)
    .withMessage('Invalid phone number format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  body('industry')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters'),
  body('fiscalYearEnd')
    .optional()
    .matches(/^\d{2}\/\d{2}$/)
    .withMessage('Fiscal year end must be in MM/DD format'),
  body('accountingMethod')
    .optional()
    .isIn(['cash', 'accrual'])
    .withMessage('Accounting method must be cash or accrual')
];

const updateCompanyValidation = [
  param('id').isLength({ min: 1 }).withMessage('Company ID is required'),
  ...createCompanyValidation.map(validation => validation.optional())
];

const extractPDFValidation = [
  body('pdfText')
    .isLength({ min: 10 })
    .withMessage('PDF text is required and must contain at least 10 characters')
];

const findByNameValidation = [
  query('name')
    .isLength({ min: 1 })
    .withMessage('Company name is required for search')
];

// Routes

// GET /api/companies - Get all companies for user
router.get('/', getCompanies);

// GET /api/companies/default - Get default company
router.get('/default', getDefaultCompany);

// GET /api/companies/search - Find company by name
router.get('/search', findByNameValidation, findCompanyByName);

// GET /api/companies/:id - Get specific company
router.get('/:id', param('id').isLength({ min: 1 }).withMessage('Company ID is required'), getCompanyById);

// POST /api/companies - Create new company
router.post('/', createCompanyValidation, createCompany);

// POST /api/companies/extract-from-pdf - Extract company info from PDF
router.post('/extract-from-pdf', extractPDFValidation, extractCompanyFromPDF);

// PUT /api/companies/:id - Update company
router.put('/:id', updateCompanyValidation, updateCompany);

// PUT /api/companies/:id/set-default - Set as default company
router.put('/:id/set-default', param('id').isLength({ min: 1 }).withMessage('Company ID is required'), setDefaultCompany);

// DELETE /api/companies/:id - Delete company
router.delete('/:id', param('id').isLength({ min: 1 }).withMessage('Company ID is required'), deleteCompany);

export default router;
