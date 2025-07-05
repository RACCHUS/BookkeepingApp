import { IRS_CATEGORIES, TRANSACTION_TYPES, PAYMENT_METHODS } from '../constants/categories.js';

// Company schema for managing multiple businesses
export const CompanySchema = {
  id: '', // Unique identifier
  userId: '', // User who owns this company
  
  // Basic company information
  name: '',
  legalName: '', // Full legal business name
  businessType: 'LLC', // LLC, Corp, Partnership, Sole Proprietorship, etc.
  taxId: '', // EIN or SSN for sole proprietors
  
  // Address information
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  },
  
  // Contact information
  phone: '',
  email: '',
  website: '',
  
  // Business details
  industry: '', // Construction, Consulting, Retail, etc.
  description: '', // Brief description of business
  businessLicense: '', // License number if applicable
  
  // Financial settings
  fiscalYearEnd: '12/31', // MM/DD format
  accountingMethod: 'cash', // cash, accrual
  defaultCurrency: 'USD',
  
  // Bank account information (for matching PDF statements)
  bankAccounts: [], // Array of { bankName, accountNumber, accountType }
  
  // Logo and branding
  logoUrl: '', // Firebase Storage URL for logo
  primaryColor: '#0066cc', // Brand color for reports
  
  // Status and settings
  isActive: true,
  isDefault: false, // One company can be marked as default
  
  // PDF statement parsing settings
  statementParsingRules: {
    companyNamePatterns: [], // Regex patterns to identify this company in statements
    accountNumbers: [], // Account numbers associated with this company
    addressPatterns: [] // Address patterns to match
  },
  
  // Audit trail
  createdAt: null,
  updatedAt: null,
  createdBy: '',
  lastModifiedBy: ''
};

// Updated transaction schema to include company support
export const TransactionSchemaWithCompany = {
  // All existing transaction fields...
  id: '',
  userId: '',
  date: null,
  amount: 0,
  description: '',
  
  // Company association
  companyId: '', // Which company this transaction belongs to
  companyName: '', // Cached company name for quick access
  
  // Classification fields
  category: IRS_CATEGORIES.UNCATEGORIZED,
  subcategory: '',
  type: TRANSACTION_TYPES.EXPENSE,
  
  // Payee/Source information
  payee: '',
  payeeAddress: '',
  payeePhone: '',
  payeeEmail: '',
  
  // Payment information
  paymentMethod: PAYMENT_METHODS.OTHER,
  checkNumber: '',
  referenceNumber: '',
  
  // Source information
  source: 'manual', // manual, pdf_import, csv_import, bank_sync
  sourceFile: '',
  sourceFileId: '',
  originalData: {},
  
  // Statement section information (for PDF imports)
  section: '',
  sectionCode: '',
  
  // Business context (now company-specific)
  businessPurpose: '',
  clientProject: '',
  isReimbursable: false,
  reimbursementStatus: 'not_applicable',
  
  // Employee information (if applicable)
  employeeId: '',
  employeeName: '',
  
  // Location information
  location: '',
  coordinates: null,
  
  // Receipt/Documentation
  receiptUrl: '',
  receiptFileId: '',
  notes: '',
  
  // Tax information
  isTaxDeductible: true,
  taxYear: new Date().getFullYear(),
  quarterlyPeriod: 'Q1',
  
  // Classification confidence and learning
  classificationConfidence: 0,
  isManuallyReviewed: false,
  isTrainingData: false,
  classificationInfo: {},
  
  // Audit trail
  createdAt: null,
  updatedAt: null,
  createdBy: '',
  lastModifiedBy: '',
  
  // Flags and status
  isReconciled: false,
  isRecurring: false,
  recurringId: '',
  isDisputed: false,
  isSplit: false,
  splitTransactions: [],
  
  // Integration fields
  bankTransactionId: '',
  quickbooksId: '',
  
  // Validation
  isValid: true,
  validationErrors: []
};

// Company bank account schema
export const CompanyBankAccountSchema = {
  id: '',
  companyId: '',
  bankName: '', // Chase, Bank of America, etc.
  accountNumber: '', // Last 4 digits or masked number
  accountType: 'checking', // checking, savings, credit, business
  accountName: '', // Custom name for the account
  isActive: true,
  
  // For PDF parsing
  statementIdentifiers: {
    accountNumberPattern: '', // Regex to match account number in PDFs
    bankNamePattern: '', // Regex to match bank name
    routingNumber: '' // For identification
  },
  
  createdAt: null,
  updatedAt: null
};

// Company report configuration
export const CompanyReportConfigSchema = {
  id: '',
  userId: '',
  companyId: '', // Which company this report config is for
  reportName: '',
  reportType: 'profit_loss',
  
  // Date range
  dateRange: {
    startDate: null,
    endDate: null,
    period: 'custom'
  },
  
  // Company-specific filters
  filters: {
    categories: [],
    employees: [],
    paymentMethods: [],
    amountRange: { min: null, max: null },
    includePersonal: false,
    includeOtherCompanies: false // Whether to include transactions from other companies
  },
  
  // Grouping and sorting
  groupBy: 'category',
  sortBy: 'amount',
  sortOrder: 'desc',
  
  // Export settings
  exportFormat: 'pdf',
  includeCharts: true,
  includeDetails: true,
  includeCompanyLogo: true,
  
  createdAt: null,
  updatedAt: null
};

export default {
  CompanySchema,
  TransactionSchemaWithCompany,
  CompanyBankAccountSchema,
  CompanyReportConfigSchema
};
