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
  findCompanyByName,
  getTransactionsWithoutCompany,
  bulkAssignCompany
} from '../controllers/companyController.js';
import { 
  handleValidationErrors,
  validateObjectId,
  requestSizeLimit,
  apiRateLimit
} from '../middlewares/index.js';
import { 
  COMPANY_CONSTANTS, 
  COMMON_VALIDATION, 
  REQUEST_LIMITS 
} from './routeConstants.js';

const router = express.Router();

// Apply rate limiting to all company routes
router.use(apiRateLimit);

// Validation schemas
const createCompanyValidation = [
  body('name')
    .isLength({ 
      min: COMPANY_CONSTANTS.LIMITS.NAME_MIN, 
      max: COMPANY_CONSTANTS.LIMITS.NAME_MAX 
    })
    .withMessage(`Company name is required and must be less than ${COMPANY_CONSTANTS.LIMITS.NAME_MAX} characters`),
  body('legalName')
    .optional()
    .isLength({ max: COMPANY_CONSTANTS.LIMITS.LEGAL_NAME_MAX })
    .withMessage(`Legal name must be less than ${COMPANY_CONSTANTS.LIMITS.LEGAL_NAME_MAX} characters`),
  body('businessType')
    .optional()
    .isIn(COMPANY_CONSTANTS.BUSINESS_TYPES)
    .withMessage(`Business type must be one of: ${COMPANY_CONSTANTS.BUSINESS_TYPES.join(', ')}`),
  body('taxId')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.TAX_ID)
    .withMessage('Tax ID must be in format XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN)'),
  body('address.street')
    .optional()
    .isLength({ max: COMPANY_CONSTANTS.LIMITS.STREET_MAX })
    .withMessage(`Street address must be less than ${COMPANY_CONSTANTS.LIMITS.STREET_MAX} characters`),
  body('address.city')
    .optional()
    .isLength({ max: COMPANY_CONSTANTS.LIMITS.CITY_MAX })
    .withMessage(`City must be less than ${COMPANY_CONSTANTS.LIMITS.CITY_MAX} characters`),
  body('address.state')
    .optional()
    .isLength({ 
      min: COMPANY_CONSTANTS.LIMITS.STATE_LENGTH, 
      max: COMPANY_CONSTANTS.LIMITS.STATE_LENGTH 
    })
    .withMessage(`State must be a ${COMPANY_CONSTANTS.LIMITS.STATE_LENGTH}-letter state code`),
  body('address.zipCode')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.ZIP_CODE)
    .withMessage('Zip code must be in format XXXXX or XXXXX-XXXX'),
  body('phone')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.PHONE)
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
    .isLength({ max: COMPANY_CONSTANTS.LIMITS.INDUSTRY_MAX })
    .withMessage(`Industry must be less than ${COMPANY_CONSTANTS.LIMITS.INDUSTRY_MAX} characters`),
  body('fiscalYearEnd')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.FISCAL_YEAR_END)
    .withMessage('Fiscal year end must be in MM/DD format'),
  body('accountingMethod')
    .optional()
    .isIn(COMPANY_CONSTANTS.ACCOUNTING_METHODS)
    .withMessage(`Accounting method must be one of: ${COMPANY_CONSTANTS.ACCOUNTING_METHODS.join(', ')}`),
  handleValidationErrors
];

const updateCompanyValidation = [
  param('id').isLength({ min: 1 }).withMessage(`Company ${COMMON_VALIDATION.OBJECT_ID_MESSAGE}`),
  body('name')
    .optional()
    .isLength({ 
      min: COMPANY_CONSTANTS.LIMITS.NAME_MIN, 
      max: COMPANY_CONSTANTS.LIMITS.NAME_MAX 
    })
    .withMessage(`Company name must be less than ${COMPANY_CONSTANTS.LIMITS.NAME_MAX} characters`),
  body('legalName')
    .optional()
    .isLength({ max: COMPANY_CONSTANTS.LIMITS.LEGAL_NAME_MAX })
    .withMessage(`Legal name must be less than ${COMPANY_CONSTANTS.LIMITS.LEGAL_NAME_MAX} characters`),
  body('ein')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.TAX_ID)
    .withMessage('EIN must be in XX-XXXXXXX format'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('phone')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.PHONE)
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
    .isLength({ max: COMPANY_CONSTANTS.LIMITS.INDUSTRY_MAX })
    .withMessage(`Industry must be less than ${COMPANY_CONSTANTS.LIMITS.INDUSTRY_MAX} characters`),
  body('businessType')
    .optional()
    .isIn(['llc', 'corporation', 'partnership', 'sole_proprietorship', 'other'])
    .withMessage('Business type must be valid'),
  body('fiscalYearEnd')
    .optional()
    .matches(COMPANY_CONSTANTS.PATTERNS.FISCAL_YEAR_END)
    .withMessage('Fiscal year end must be in MM/DD format'),
  body('accountingMethod')
    .optional()
    .isIn(COMPANY_CONSTANTS.ACCOUNTING_METHODS)
    .withMessage(`Accounting method must be one of: ${COMPANY_CONSTANTS.ACCOUNTING_METHODS.join(', ')}`),
  handleValidationErrors
];

const extractPDFValidation = [
  body('pdfText')
    .isLength({ min: 10 })
    .withMessage('PDF text is required and must contain at least 10 characters'),
  requestSizeLimit(REQUEST_LIMITS.SIZE.SMALL),
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
 * @route GET /api/companies/transactions/unassigned
 * @desc Get transactions without a company assigned
 * @access Private
 */
router.get('/transactions/unassigned', getTransactionsWithoutCompany);

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
 * @route POST /api/companies/:id/assign-transactions
 * @desc Bulk assign company to transactions
 * @access Private
 */
router.post('/:id/assign-transactions', validateObjectId('id'), bulkAssignCompany);

/**
 * @route DELETE /api/companies/:id
 * @desc Delete company
 * @access Private
 */
router.delete('/:id', validateObjectId('id'), deleteCompany);

export default router;
