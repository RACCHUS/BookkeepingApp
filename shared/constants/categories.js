// IRS Tax Categories for Business Expenses and Income
export const IRS_CATEGORIES = {
  // Business Expenses (Schedule C)
  ADVERTISING: 'Advertising',
  CAR_TRUCK_EXPENSES: 'Car and Truck Expenses',
  COMMISSIONS_FEES: 'Commissions and Fees',
  CONTRACT_LABOR: 'Contract Labor',
  DEPLETION: 'Depletion',
  DEPRECIATION: 'Depreciation and Section 179',
  EMPLOYEE_BENEFIT_PROGRAMS: 'Employee Benefit Programs',
  INSURANCE_OTHER: 'Insurance (Other than Health)',
  INTEREST_MORTGAGE: 'Interest (Mortgage)',
  INTEREST_OTHER: 'Interest (Other)',
  LEGAL_PROFESSIONAL: 'Legal and Professional Services',
  OFFICE_EXPENSES: 'Office Expenses',
  PENSION_PROFIT_SHARING: 'Pension and Profit-Sharing Plans',
  RENT_LEASE_VEHICLES: 'Rent or Lease (Vehicles, Machinery, Equipment)',
  RENT_LEASE_OTHER: 'Rent or Lease (Other Business Property)',
  REPAIRS_MAINTENANCE: 'Repairs and Maintenance',
  SUPPLIES: 'Supplies (Not Inventory)',
  TAXES_LICENSES: 'Taxes and Licenses',
  TRAVEL: 'Travel',
  MEALS_ENTERTAINMENT: 'Meals and Entertainment',
  UTILITIES: 'Utilities',
  WAGES: 'Wages (Less Employment Credits)',
  OTHER_EXPENSES: 'Other Expenses',
  
  // Business Income
  GROSS_RECEIPTS: 'Gross Receipts or Sales',
  RETURNS_ALLOWANCES: 'Returns and Allowances',
  OTHER_INCOME: 'Other Income',
  
  // Employee-related (for payroll tracking)
  EMPLOYEE_WAGES: 'Employee Wages',
  PAYROLL_TAXES: 'Payroll Taxes',
  WORKER_COMPENSATION: 'Worker Compensation',
  HEALTH_INSURANCE: 'Health Insurance',
  RETIREMENT_CONTRIBUTIONS: 'Retirement Contributions',
  
  // Personal (to exclude from business)
  PERSONAL_EXPENSE: 'Personal Expense',
  PERSONAL_TRANSFER: 'Personal Transfer',
  
  // Uncategorized
  UNCATEGORIZED: 'Uncategorized'
};

// Category groups for easier organization
export const CATEGORY_GROUPS = {
  INCOME: [
    IRS_CATEGORIES.GROSS_RECEIPTS,
    IRS_CATEGORIES.OTHER_INCOME
  ],
  DEDUCTIONS: [
    IRS_CATEGORIES.RETURNS_ALLOWANCES
  ],
  OPERATING_EXPENSES: [
    IRS_CATEGORIES.ADVERTISING,
    IRS_CATEGORIES.OFFICE_EXPENSES,
    IRS_CATEGORIES.SUPPLIES,
    IRS_CATEGORIES.RENT_LEASE_OTHER,
    IRS_CATEGORIES.UTILITIES,
    IRS_CATEGORIES.REPAIRS_MAINTENANCE
  ],
  VEHICLE_EXPENSES: [
    IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
    IRS_CATEGORIES.RENT_LEASE_VEHICLES
  ],
  PROFESSIONAL_SERVICES: [
    IRS_CATEGORIES.LEGAL_PROFESSIONAL,
    IRS_CATEGORIES.COMMISSIONS_FEES,
    IRS_CATEGORIES.CONTRACT_LABOR
  ],
  EMPLOYEE_COSTS: [
    IRS_CATEGORIES.WAGES,
    IRS_CATEGORIES.EMPLOYEE_WAGES,
    IRS_CATEGORIES.PAYROLL_TAXES,
    IRS_CATEGORIES.EMPLOYEE_BENEFIT_PROGRAMS,
    IRS_CATEGORIES.PENSION_PROFIT_SHARING,
    IRS_CATEGORIES.WORKER_COMPENSATION,
    IRS_CATEGORIES.HEALTH_INSURANCE,
    IRS_CATEGORIES.RETIREMENT_CONTRIBUTIONS
  ],
  FINANCIAL: [
    IRS_CATEGORIES.INTEREST_MORTGAGE,
    IRS_CATEGORIES.INTEREST_OTHER,
    IRS_CATEGORIES.INSURANCE_OTHER,
    IRS_CATEGORIES.TAXES_LICENSES
  ],
  TRAVEL_MEALS: [
    IRS_CATEGORIES.TRAVEL,
    IRS_CATEGORIES.MEALS_ENTERTAINMENT
  ],
  DEPRECIATION: [
    IRS_CATEGORIES.DEPRECIATION,
    IRS_CATEGORIES.DEPLETION
  ],
  PERSONAL: [
    IRS_CATEGORIES.PERSONAL_EXPENSE,
    IRS_CATEGORIES.PERSONAL_TRANSFER
  ],
  OTHER: [
    IRS_CATEGORIES.OTHER_EXPENSES,
    IRS_CATEGORIES.UNCATEGORIZED
  ]
};

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CHECK: 'check',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  PAYPAL: 'paypal',
  VENMO: 'venmo',
  ZELLE: 'zelle',
  OTHER_ELECTRONIC: 'other_electronic',
  OTHER: 'other'
};

// File upload constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
  ALLOWED_EXTENSIONS: ['.pdf', '.csv', '.xls', '.xlsx']
};

export default {
  IRS_CATEGORIES,
  CATEGORY_GROUPS,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  FILE_UPLOAD
};
