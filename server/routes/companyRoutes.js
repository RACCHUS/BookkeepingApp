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
import { 
  handleValidationErrors,
  validateObjectId,
  requestSizeLimit,
  apiRateLimit
} from '../middlewares/index.js';

const router = express.Router();

// Apply rate limiting to all company routes
router.use(apiRateLimit);

// Validation schemas
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
    .withMessage('Accounting method must be cash or accrual'),
  handleValidationErrors
];

const updateCompanyValidation = [
  param('id').isLength({ min: 1 }).withMessage('Company ID is required'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Company name must be less than 200 characters'),
  body('legalName')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Legal name must be less than 200 characters'),
  body('ein')
    .optional()
    .matches(/^\d{2}-\d{7}$/)
    .withMessage('EIN must be in XX-XXXXXXX format'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Phone number format is invalid'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('industry')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters'),
  body('businessType')
    .optional()
    .isIn(['llc', 'corporation', 'partnership', 'sole_proprietorship', 'other'])
    .withMessage('Business type must be valid'),
  body('fiscalYearEnd')
    .optional()
    .matches(/^\d{2}\/\d{2}$/)
    .withMessage('Fiscal year end must be in MM/DD format'),
  body('accountingMethod')
    .optional()
    .isIn(['cash', 'accrual'])
    .withMessage('Accounting method must be cash or accrual'),
  handleValidationErrors
];

const extractPDFValidation = [
  body('pdfText')
    .isLength({ min: 10 })
    .withMessage('PDF text is required and must contain at least 10 characters'),
  requestSizeLimit('500kb'),
  handleValidationErrors
];

const findByNameValidation = [
  query('name')
    .isLength({ min: 1 })
    .withMessage('Company name is required for search'),
  handleValidationErrors
];

// Enhanced Company Routes with comprehensive validation

/**
 * @route GET /api/companies
 * @desc Get all companies for authenticated user
 * @access Private
 */
router.get('/', getCompanies);

/**
 * @route GET /api/companies/default
 * @desc Get user's default company
 * @access Private
 */
router.get('/default', getDefaultCompany);

/**
 * @route GET /api/companies/search
 * @desc Find company by name
 * @access Private
 */
router.get('/search', findByNameValidation, findCompanyByName);

/**
 * @route GET /api/companies/:id
 * @desc Get specific company by ID
 * @access Private
 */
router.get('/:id', validateObjectId('id'), getCompanyById);

/**
 * @route POST /api/companies
 * @desc Create new company
 * @access Private
 */
router.post('/', createCompanyValidation, createCompany);

/**
 * @route POST /api/companies/extract-from-pdf
 * @desc Extract company information from PDF text
 * @access Private
 */
router.post('/extract-from-pdf', extractPDFValidation, extractCompanyFromPDF);

/**
 * @route PUT /api/companies/:id
 * @desc Update company information
 * @access Private
 */
router.put('/:id', updateCompanyValidation, updateCompany);

/**
 * @route PUT /api/companies/:id/set-default
 * @desc Set company as user's default
 * @access Private
 */
router.put('/:id/set-default', validateObjectId('id'), setDefaultCompany);

/**
 * @route DELETE /api/companies/:id
 * @desc Delete company
 * @access Private
 */
router.delete('/:id', validateObjectId('id'), deleteCompany);

export default router;
