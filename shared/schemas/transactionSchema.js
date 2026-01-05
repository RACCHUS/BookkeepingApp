import { IRS_CATEGORIES, TRANSACTION_TYPES, PAYMENT_METHODS } from '../constants/categories.js';

// Base transaction schema
export const TransactionSchema = {
  // Required fields
  id: '', // Unique identifier
  userId: '', // User who owns this transaction
  date: null, // Date object or ISO string
  amount: 0, // Number (positive for income, negative for expenses)
  description: '', // Transaction description
  
  // Classification fields
  category: IRS_CATEGORIES.UNCATEGORIZED,
  subcategory: '', // Optional subcategory
  type: TRANSACTION_TYPES.EXPENSE, // income, expense, transfer
  
  // Payee/Source information
  payee: '', // Who was paid or who paid (text description)
  payeeId: '', // Link to PayeeSchema record (for 1099/tax tracking)
  payeeAddress: '', // Optional address
  payeePhone: '', // Optional phone
  payeeEmail: '', // Optional email
  
  // Vendor information
  vendorId: '', // Link to vendor record (business you purchase from)
  vendorName: '', // Vendor business name for display
  
  // Contractor/1099 tracking
  isContractorPayment: false, // Flag for 1099-NEC tracking
  
  // Payment information
  paymentMethod: PAYMENT_METHODS.OTHER,
  checkNumber: '', // If paid by check
  referenceNumber: '', // Reference or confirmation number
  
  // Source information
  source: 'manual', // manual, pdf_import, csv_import, bank_sync
  sourceFile: '', // Original file name if imported
  sourceFileId: '', // Firebase Storage file ID
  originalData: {}, // Raw data from import source
  
  // Statement section information (for PDF imports)
  section: '', // Full section name (e.g., "DEPOSITS AND ADDITIONS")
  sectionCode: '', // Short code (e.g., "deposits", "checks", "card", "electronic", "manual")
  
  // Business context
  businessPurpose: '', // Required for business expenses
  clientProject: '', // If related to specific client/project
  isReimbursable: false, // If this should be reimbursed
  reimbursementStatus: 'not_applicable', // pending, approved, paid, not_applicable
  
  // Company information
  companyId: '', // ID of the company this transaction belongs to
  companyName: '', // Company name for easy filtering/display
  
  // Employee information (if applicable)
  employeeId: '', // If this is an employee expense/payment
  employeeName: '', // Employee name
  
  // Location information
  location: '', // Where transaction occurred
  coordinates: null, // GPS coordinates if available
  
  // Receipt/Documentation
  receiptUrl: '', // Firebase Storage URL for receipt image
  receiptFileId: '', // Firebase Storage file ID
  notes: '', // Additional notes
  
  // Tax information
  isTaxDeductible: true, // Whether this is tax deductible
  taxYear: new Date().getFullYear(), // Tax year this applies to
  quarterlyPeriod: 'Q1', // Q1, Q2, Q3, Q4
  
  // Classification confidence and learning
  classificationConfidence: 0, // 0-1 confidence in auto-classification
  isManuallyReviewed: false, // Whether user has reviewed/confirmed
  isTrainingData: false, // Whether to use for future classification training
  
  // Audit trail
  createdAt: null, // Creation timestamp
  updatedAt: null, // Last update timestamp
  createdBy: '', // User ID who created
  lastModifiedBy: '', // User ID who last modified
  
  // Flags and status
  isRecurring: false, // Whether this is a recurring transaction
  recurringId: '', // ID of recurring transaction template
  isDisputed: false, // Whether this transaction is disputed
  isSplit: false, // Whether this transaction is split across categories
  splitTransactions: [], // Array of split transaction objects
  
  // Integration fields
  bankTransactionId: '', // Bank's transaction ID if synced
  quickbooksId: '', // QuickBooks ID if synced
  
  // Validation
  isValid: true, // Whether transaction passes validation
  validationErrors: [], // Array of validation error messages
};

// Employee schema for payroll tracking
export const EmployeeSchema = {
  id: '',
  userId: '', // Business owner's user ID
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  },
  
  // Employment details
  hireDate: null,
  terminationDate: null,
  isActive: true,
  position: '',
  department: '',
  
  // Compensation
  payType: 'hourly', // hourly, salary, commission, contractor
  hourlyRate: 0,
  annualSalary: 0,
  payFrequency: 'biweekly', // weekly, biweekly, monthly, quarterly
  
  // Tax information
  taxId: '', // SSN or ITIN
  w4Information: {},
  isContractor: false, // True for 1099 contractors
  
  // Benefits
  benefits: {
    healthInsurance: false,
    dentalInsurance: false,
    visionInsurance: false,
    retirement401k: false,
    paidTimeOff: false
  },
  
  // Banking for direct deposit
  bankAccount: {
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking' // checking, savings
  },
  
  // Audit trail
  createdAt: null,
  updatedAt: null
};

// Recurring transaction template schema
export const RecurringTransactionSchema = {
  id: '',
  userId: '',
  templateName: '',
  
  // Transaction template (based on TransactionSchema)
  transactionTemplate: {
    amount: 0,
    description: '',
    category: IRS_CATEGORIES.UNCATEGORIZED,
    payee: '',
    paymentMethod: PAYMENT_METHODS.OTHER,
    businessPurpose: ''
  },
  
  // Recurrence pattern
  frequency: 'monthly', // daily, weekly, biweekly, monthly, quarterly, annually
  startDate: null,
  endDate: null, // null for indefinite
  dayOfMonth: 1, // For monthly/quarterly
  dayOfWeek: 1, // For weekly (1=Monday)
  monthOfYear: 1, // For annual
  
  // Status
  isActive: true,
  nextDueDate: null,
  lastGeneratedDate: null,
  
  // Audit trail
  createdAt: null,
  updatedAt: null
};

// Classification rule schema for learning
export const ClassificationRuleSchema = {
  id: '',
  userId: '',
  
  // Rule criteria
  ruleName: '',
  description: '',
  
  // Matching criteria
  payeeContains: [],
  descriptionContains: [],
  amountRange: { min: null, max: null },
  
  // Classification result
  targetCategory: '',
  targetSubcategory: '',
  targetType: '',
  confidence: 1.0,
  
  // Learning data
  trainingCount: 0, // How many times this rule was confirmed
  successRate: 1.0, // Success rate of this rule
  
  // Status
  isActive: true,
  isSystemGenerated: false, // vs user-created
  
  createdAt: null,
  updatedAt: null
};

// Report configuration schema
export const ReportConfigSchema = {
  id: '',
  userId: '',
  reportName: '',
  reportType: 'profit_loss', // profit_loss, expense_summary, employee_summary, tax_summary
  
  // Date range
  dateRange: {
    startDate: null,
    endDate: null,
    period: 'custom' // custom, current_month, current_quarter, current_year, last_month, last_quarter, last_year
  },
  
  // Filters
  filters: {
    categories: [], // Include specific categories
    employees: [], // Include specific employees
    paymentMethods: [],
    amountRange: { min: null, max: null },
    includePersonal: false
  },
  
  // Grouping and sorting
  groupBy: 'category', // category, employee, month, quarter
  sortBy: 'amount', // amount, date, category, payee
  sortOrder: 'desc', // asc, desc
  
  // Export settings
  exportFormat: 'pdf', // pdf, csv, excel
  includeCharts: true,
  includeDetails: true,
  
  createdAt: null,
  updatedAt: null
};

export default {
  TransactionSchema,
  EmployeeSchema,
  RecurringTransactionSchema,
  ClassificationRuleSchema,
  ReportConfigSchema
};
