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
  is1099Required: false, // True if need to send 1099 at year end
  
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

export default {
  PayeeSchema,
  PAYEE_TYPES,
  EMPLOYEE_STATUS
};
