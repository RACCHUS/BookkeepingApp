import { PAYMENT_METHODS } from '../constants/categories.js';

// Payee schema for managing employees and vendors
export const PayeeSchema = {
  // Required fields
  id: '', // Unique identifier
  userId: '', // User who owns this payee
  
  // Basic information
  name: '', // Full name
  type: 'vendor', // 'employee', 'vendor', 'contractor', 'customer'
  businessName: '', // Business/company name (if different from name)
  
  // Contact information
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  },
  
  // Tax information
  taxId: '', // SSN for employees, EIN for vendors
  taxIdType: '', // 'SSN' or 'EIN'
  is1099Required: false, // True if need to send 1099 at year end
  total1099Payments: 0, // Calculated YTD for 1099 threshold tracking
  
  // Tax Form Generation Fields
  taxFormInfo: {
    // Name parsing (IRS requires separate fields)
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '', // Jr, Sr, III, etc.
    
    // Account tracking
    accountNumber: '', // Payer's account number for recipient (1099 Box)
    
    // Withholding tracking (for W-2 and backup withholding)
    federalWithholding: 0,
    stateWithholding: 0,
    localWithholding: 0,
    
    // Social Security & Medicare (W-2 specific)
    socialSecurityWages: 0,
    socialSecurityTax: 0,
    medicareWages: 0,
    medicareTax: 0,
    
    // State info
    stateId: '', // State employer ID
    stateTaxInfo: [] // Array of { stateCode, stateIncome, stateTaxWithheld }
  },
  
  // W-4 Information (for employees)
  w4Info: {
    filingStatus: 'single', // single, married, head_of_household
    allowances: 0,
    additionalWithholding: 0,
    exempt: false,
    effectiveDate: null
  },
  
  // Employee-specific fields
  employeeId: '', // Employee number
  position: '',
  department: '',
  hireDate: null,
  isActive: true,
  
  // Payment preferences
  preferredPaymentMethod: PAYMENT_METHODS.CHECK,
  bankAccount: {
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking'
  },
  
  // Vendor-specific fields
  vendorId: '', // Vendor number
  category: '', // Type of services/products
  defaultExpenseCategory: '', // IRS category for expenses
  
  // Financial tracking
  ytdPaid: 0, // Year-to-date amount paid
  lastPaymentDate: null,
  lastPaymentAmount: 0,
  
  // Notes and tags
  notes: '',
  tags: [], // Array of custom tags
  
  // Company association
  companyId: '', // Which company this payee belongs to
  companyName: '', // Cached company name
  
  // Audit trail
  createdAt: null,
  updatedAt: null,
  createdBy: '',
  lastModifiedBy: ''
};

// Filing status constants for W-4
export const FILING_STATUS = {
  SINGLE: 'single',
  MARRIED: 'married',
  HEAD_OF_HOUSEHOLD: 'head_of_household'
};

// Payee type constants
export const PAYEE_TYPES = {
  EMPLOYEE: 'employee',
  VENDOR: 'vendor',
  CONTRACTOR: 'contractor',
  CUSTOMER: 'customer'
};

// Employee status constants
export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TERMINATED: 'terminated'
};

// 1099 filing threshold
export const FORM_1099_THRESHOLD = 600;

// Tax form types
export const TAX_FORM_TYPES = {
  FORM_1099_NEC: '1099-NEC',
  FORM_1099_MISC: '1099-MISC',
  FORM_W2: 'W-2'
};

export default {
  PayeeSchema,
  PAYEE_TYPES,
  EMPLOYEE_STATUS,
  FILING_STATUS,
  FORM_1099_THRESHOLD,
  TAX_FORM_TYPES
};
