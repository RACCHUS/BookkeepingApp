// IRS Tax Categories for Business Expenses and Income (Schedule C Compliant)
export const IRS_CATEGORIES = {
  // === BUSINESS INCOME (Schedule C) ===
  GROSS_RECEIPTS: 'Gross Receipts or Sales',
  RETURNS_ALLOWANCES: 'Returns and Allowances',
  OTHER_INCOME: 'Other Income',
  
  // === COST OF GOODS SOLD (Part III) ===
  COST_OF_GOODS_SOLD: 'Cost of Goods Sold',
  INVENTORY_BEGINNING: 'Beginning Inventory',
  INVENTORY_PURCHASES: 'Inventory Purchases',
  COST_OF_LABOR: 'Cost of Labor (not wages)',
  MATERIALS_SUPPLIES: 'Materials and Supplies',
  OTHER_COSTS: 'Other Costs (shipping, packaging)',
  INVENTORY_ENDING: 'Ending Inventory',
  
  // === SCHEDULE C BUSINESS EXPENSES (Lines 8-27) ===
  // Line 8
  ADVERTISING: 'Advertising',
  
  // Line 9
  CAR_TRUCK_EXPENSES: 'Car and Truck Expenses',
  
  // Line 10
  COMMISSIONS_FEES: 'Commissions and Fees',
  
  // Line 11
  CONTRACT_LABOR: 'Contract Labor',
  
  // Line 12
  DEPLETION: 'Depletion',
  
  // Line 13
  DEPRECIATION: 'Depreciation and Section 179',
  
  // Line 14
  EMPLOYEE_BENEFIT_PROGRAMS: 'Employee Benefit Programs',
  
  // Line 15
  INSURANCE_OTHER: 'Insurance (Other than Health)',
  
  // Line 16a
  INTEREST_MORTGAGE: 'Interest (Mortgage)',
  
  // Line 16b
  INTEREST_OTHER: 'Interest (Other)',
  
  // Line 17
  LEGAL_PROFESSIONAL: 'Legal and Professional Services',
  
  // Line 18
  OFFICE_EXPENSES: 'Office Expenses',
  
  // Line 19
  PENSION_PROFIT_SHARING: 'Pension and Profit-Sharing Plans',
  
  // Line 20a
  RENT_LEASE_VEHICLES: 'Rent or Lease (Vehicles, Machinery, Equipment)',
  
  // Line 20b
  RENT_LEASE_OTHER: 'Rent or Lease (Other Business Property)',
  
  // Line 21
  REPAIRS_MAINTENANCE: 'Repairs and Maintenance',
  
  // Line 22
  SUPPLIES: 'Supplies (Not Inventory)',
  
  // Line 23
  TAXES_LICENSES: 'Taxes and Licenses',
  
  // Line 24a
  TRAVEL: 'Travel',
  
  // Line 24b
  MEALS: 'Meals',
  
  // Line 25
  UTILITIES: 'Utilities',
  
  // Line 26
  WAGES: 'Wages (Less Employment Credits)',
  
  // Line 27a - Other Expenses (Must be itemized)
  OTHER_EXPENSES: 'Other Expenses',
  SOFTWARE_SUBSCRIPTIONS: 'Software Subscriptions',
  WEB_HOSTING: 'Web Hosting & Domains',
  BANK_FEES: 'Bank Fees',
  BAD_DEBTS: 'Bad Debts',
  DUES_MEMBERSHIPS: 'Dues & Memberships',
  TRAINING_EDUCATION: 'Training & Education',
  TRADE_PUBLICATIONS: 'Trade Publications',
  SECURITY_SERVICES: 'Security Services',
  BUSINESS_GIFTS: 'Business Gifts',
  UNIFORMS_SAFETY: 'Uniforms & Safety Gear',
  TOOLS_EQUIPMENT: 'Tools (Under $2,500)',
  
  // === SPECIAL FORMS/SCHEDULES ===
  // Form 8829 - Business Use of Home
  BUSINESS_USE_HOME: 'Business Use of Home',
  
  // Form 4562 - Depreciation Detail
  DEPRECIATION_DETAIL: 'Depreciation Detail',
  
  // Part IV - Vehicle Detail
  VEHICLE_DETAIL: 'Vehicle Detail',
  
  // === PERSONAL (Non-Deductible) ===
  PERSONAL_EXPENSE: 'Personal Expense',
  PERSONAL_TRANSFER: 'Personal Transfer',
  OWNER_DRAWS: 'Owner Draws/Distributions',
  
  // === SPECIAL CATEGORIES ===
  UNCATEGORIZED: 'Uncategorized',
  SPLIT_TRANSACTION: 'Split Transaction'
};

// Detailed subcategories for each main category (Schedule C Compliant)
export const CATEGORY_SUBCATEGORIES = {
  // === INCOME SUBCATEGORIES ===
  [IRS_CATEGORIES.GROSS_RECEIPTS]: [
    'Product Sales',
    'Service Revenue',
    'Consulting Fees',
    'Subscription Revenue',
    'Retail Sales',
    'Wholesale Sales',
    'Online Sales',
    'Cash Sales',
    'Credit Sales'
  ],
  
  [IRS_CATEGORIES.OTHER_INCOME]: [
    'Interest Income',
    'Dividend Income',
    'Rental Income',
    'Royalty Income',
    'Refunds',
    'Insurance Proceeds',
    'Debt Forgiveness',
    'Miscellaneous Income'
  ],
  
  // === COST OF GOODS SOLD SUBCATEGORIES ===
  [IRS_CATEGORIES.INVENTORY_PURCHASES]: [
    'Raw Materials',
    'Finished Goods',
    'Work in Process',
    'Merchandise for Resale'
  ],
  
  [IRS_CATEGORIES.COST_OF_LABOR]: [
    'Direct Labor',
    'Manufacturing Labor',
    'Production Labor'
  ],
  
  [IRS_CATEGORIES.MATERIALS_SUPPLIES]: [
    'Manufacturing Materials',
    'Packaging Materials',
    'Production Supplies'
  ],
  
  [IRS_CATEGORIES.OTHER_COSTS]: [
    'Shipping to Customer',
    'Packaging Costs',
    'Import Duties',
    'Freight In'
  ],
  
  // === SCHEDULE C EXPENSE SUBCATEGORIES ===
  
  // Line 8 - Advertising
  [IRS_CATEGORIES.ADVERTISING]: [
    'Online Ads (Google, Facebook, etc.)',
    'Print Ads (newspapers, flyers)',
    'Business Cards',
    'Promotional Items (shirts, mugs, etc.)',
    'Sponsorships',
    'Website Development',
    'SEO Services',
    'Trade Show Expenses',
    'Radio/TV Advertising',
    'Directory Listings'
  ],
  
  // Line 9 - Car and Truck Expenses
  [IRS_CATEGORIES.CAR_TRUCK_EXPENSES]: [
    'Fuel/Gas',
    'Repairs & Maintenance',
    'Insurance',
    'Parking & Tolls',
    'Lease Payments',
    'Depreciation (also on Line 13)',
    'Registration',
    'Interest on Auto Loans',
    'Tires and Parts',
    'Car Washes'
  ],
  
  // Line 10 - Commissions and Fees
  [IRS_CATEGORIES.COMMISSIONS_FEES]: [
    'Sales Commissions',
    'Referral Fees',
    'Broker Fees',
    'Affiliate Payouts',
    'Finder\'s Fees'
  ],
  
  // Line 11 - Contract Labor
  [IRS_CATEGORIES.CONTRACT_LABOR]: [
    'Freelancers (graphic designers, writers)',
    'Independent Contractors',
    'Virtual Assistants',
    'Consultants',
    'Subcontractors',
    'Temporary Workers'
  ],
  
  // Line 12 - Depletion
  [IRS_CATEGORIES.DEPLETION]: [
    'Timber',
    'Oil and Gas',
    'Minerals',
    'Natural Resources'
  ],
  
  // Line 13 - Depreciation
  [IRS_CATEGORIES.DEPRECIATION]: [
    'Office Equipment',
    'Vehicles',
    'Furniture',
    'Capitalized Software',
    'Leasehold Improvements',
    'Machinery',
    'Buildings'
  ],
  
  // Line 14 - Employee Benefits
  [IRS_CATEGORIES.EMPLOYEE_BENEFIT_PROGRAMS]: [
    'Health Insurance',
    'Life & Disability Insurance',
    'Retirement Plans (not Line 19)',
    'Wellness Programs',
    'Employee Assistance Programs'
  ],
  
  // Line 15 - Insurance (Other)
  [IRS_CATEGORIES.INSURANCE_OTHER]: [
    'General Liability',
    'Workers\' Compensation',
    'Property Insurance',
    'Cyber Insurance',
    'Commercial Auto (if not Line 9)',
    'Errors & Omissions',
    'Professional Liability',
    'Business Interruption'
  ],
  
  // Line 16a - Mortgage Interest
  [IRS_CATEGORIES.INTEREST_MORTGAGE]: [
    'Business Property Mortgage',
    'Office Building Mortgage',
    'Warehouse Mortgage'
  ],
  
  // Line 16b - Other Interest
  [IRS_CATEGORIES.INTEREST_OTHER]: [
    'Business Loan Interest',
    'Credit Card Interest',
    'Equipment Loan Interest',
    'Line of Credit Interest',
    'SBA Loan Interest'
  ],
  
  // Line 17 - Legal and Professional
  [IRS_CATEGORIES.LEGAL_PROFESSIONAL]: [
    'Accounting & Tax Prep',
    'Legal Fees',
    'Consultants',
    'Business Registration/Filing Fees',
    'Notary Services',
    'Audit Fees',
    'Contract Review'
  ],
  
  // Line 18 - Office Expenses
  [IRS_CATEGORIES.OFFICE_EXPENSES]: [
    'Printer Paper & Ink',
    'Postage',
    'Small Equipment (< $2,500)',
    'Office Décor',
    'Stationery',
    'Filing Supplies',
    'Office Software (under $2,500)'
  ],
  
  // Line 19 - Pension and Profit-Sharing
  [IRS_CATEGORIES.PENSION_PROFIT_SHARING]: [
    'SEP IRA Contributions',
    'SIMPLE IRA Contributions',
    '401(k) Employer Match',
    'Profit-Sharing Plans'
  ],
  
  // Line 20a - Rent/Lease Vehicles
  [IRS_CATEGORIES.RENT_LEASE_VEHICLES]: [
    'Vehicle Lease Payments',
    'Equipment Lease',
    'Machinery Rental',
    'Tool Rental'
  ],
  
  // Line 20b - Rent/Lease Other
  [IRS_CATEGORIES.RENT_LEASE_OTHER]: [
    'Office Rent',
    'Warehouse Rent',
    'Storage Unit Rent',
    'Retail Space Rent',
    'Co-working Space'
  ],
  
  // Line 21 - Repairs and Maintenance
  [IRS_CATEGORIES.REPAIRS_MAINTENANCE]: [
    'Office Repairs',
    'Equipment Repairs',
    'Building Maintenance',
    'HVAC or Plumbing Repairs',
    'Janitorial Services',
    'Computer Repairs',
    'Landscaping'
  ],
  
  // Line 22 - Supplies
  [IRS_CATEGORIES.SUPPLIES]: [
    'Cleaning Supplies',
    'Building Materials',
    'Consumables used in service',
    'Construction/Field Tools',
    'Safety Equipment',
    'Shop Supplies'
  ],
  
  // Line 23 - Taxes and Licenses
  [IRS_CATEGORIES.TAXES_LICENSES]: [
    'Business Licenses',
    'Sales Tax Paid (on purchases)',
    'Payroll Taxes (employer portion)',
    'Real Estate/Property Tax (business)',
    'Local Regulatory Fees',
    'Professional License Fees',
    'Permit Fees'
  ],
  
  // Line 24a - Travel
  [IRS_CATEGORIES.TRAVEL]: [
    'Flights',
    'Hotels',
    'Rental Cars',
    'Travel Insurance',
    'Business Travel Parking & Tolls',
    'Train/Bus Fare',
    'Conference Registration'
  ],
  
  // Line 24b - Meals
  [IRS_CATEGORIES.MEALS]: [
    'Travel Meals (50% deductible)',
    'Client Meals (50% deductible)',
    'Staff Meals (50% deductible)',
    'Business Meeting Meals',
    'Conference Meals'
  ],
  
  // Line 25 - Utilities
  [IRS_CATEGORIES.UTILITIES]: [
    'Electricity',
    'Gas',
    'Water/Sewer',
    'Internet',
    'Phone (business only)',
    'Trash Collection',
    'Cable/Satellite'
  ],
  
  // Line 26 - Wages
  [IRS_CATEGORIES.WAGES]: [
    'Gross Wages',
    'Bonuses',
    'Overtime Pay',
    'Holiday Pay',
    'Payroll Processing Fees'
  ],
  
  // Line 27a - Other Expenses (Must be itemized)
  [IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS]: [
    'QuickBooks/Accounting Software',
    'Adobe Creative Suite',
    'Microsoft Office 365',
    'CRM Software',
    'Project Management Tools',
    'Cloud Storage',
    'Email Services'
  ],
  
  [IRS_CATEGORIES.WEB_HOSTING]: [
    'Domain Registration',
    'Web Hosting',
    'Website Maintenance',
    'SSL Certificates'
  ],
  
  [IRS_CATEGORIES.BANK_FEES]: [
    'Monthly Account Fees',
    'Transaction Fees',
    'Wire Transfer Fees',
    'ATM Fees',
    'Overdraft Fees',
    'Check Printing'
  ],
  
  [IRS_CATEGORIES.BAD_DEBTS]: [
    'Uncollectible Invoices',
    'Customer Defaults',
    'Write-offs'
  ],
  
  [IRS_CATEGORIES.DUES_MEMBERSHIPS]: [
    'Chamber of Commerce',
    'Trade Associations',
    'Professional Organizations',
    'Industry Groups'
  ],
  
  [IRS_CATEGORIES.TRAINING_EDUCATION]: [
    'Professional Development',
    'Conferences & Seminars',
    'Online Courses',
    'Certification Programs',
    'Industry Training'
  ],
  
  [IRS_CATEGORIES.TRADE_PUBLICATIONS]: [
    'Industry Magazines',
    'Professional Journals',
    'Research Reports',
    'Newsletter Subscriptions'
  ],
  
  [IRS_CATEGORIES.SECURITY_SERVICES]: [
    'Alarm Systems',
    'Security Guards',
    'Cybersecurity Services',
    'Background Checks'
  ],
  
  [IRS_CATEGORIES.BUSINESS_GIFTS]: [
    'Client Gifts (max $25/person/year)',
    'Employee Recognition Gifts',
    'Promotional Gifts'
  ],
  
  [IRS_CATEGORIES.UNIFORMS_SAFETY]: [
    'Work Uniforms',
    'Safety Equipment',
    'Hard Hats',
    'Safety Glasses',
    'Work Boots'
  ],
  
  [IRS_CATEGORIES.TOOLS_EQUIPMENT]: [
    'Hand Tools',
    'Small Equipment',
    'Tool Maintenance',
    'Equipment under $2,500'
  ],
  
  // Additional Other Expenses subcategories for complete IRS compliance
  [IRS_CATEGORIES.OTHER_EXPENSES]: [
    'Charitable Donations to 501(c)(3) (may go on Schedule A instead)',
    'Business Licenses & Permits',
    'Professional Certifications',
    'Equipment Rentals (short-term)',
    'Storage Fees',
    'Cleaning Services',
    'Credit Card Processing Fees',
    'Merchant Services',
    'Background Checks',
    'Drug Testing',
    'Awards & Recognition',
    'Customer Appreciation Events',
    'Miscellaneous Business Expenses'
  ],
  
  // === BUSINESS USE OF HOME (Form 8829) ===
  [IRS_CATEGORIES.BUSINESS_USE_HOME]: [
    'Home Office Rent',
    'Home Office Mortgage Interest',
    'Home Office Utilities',
    'Home Office Property Taxes',
    'Home Office Depreciation',
    'Home Office Repairs'
  ],
  
  // === PERSONAL (NON-DEDUCTIBLE) ===
  [IRS_CATEGORIES.PERSONAL_EXPENSE]: [
    'Personal Purchases',
    'Personal Meals',
    'Personal Travel',
    'Personal Insurance',
    'Personal Loan Payments',
    'Personal Entertainment',
    'Family Expenses'
  ],
  
  [IRS_CATEGORIES.OWNER_DRAWS]: [
    'Owner Draw',
    'Partner Distribution',
    'Shareholder Distribution'
  ]
};

// Category metadata including tax deductibility, Schedule C line numbers, and special requirements
export const CATEGORY_METADATA = {
  // === INCOME ===
  [IRS_CATEGORIES.GROSS_RECEIPTS]: { 
    taxDeductible: false, 
    business: true, 
    scheduleC: true, 
    line: '1a', 
    type: 'income',
    description: 'Revenue from primary business activities',
    specialReporting: false
  },
  [IRS_CATEGORIES.RETURNS_ALLOWANCES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '1b', 
    type: 'deduction',
    description: 'Deduction from gross receipts for returns and allowances',
    specialReporting: false
  },
  [IRS_CATEGORIES.OTHER_INCOME]: { 
    taxDeductible: false, 
    business: true, 
    scheduleC: true, 
    line: '6', 
    type: 'income',
    description: 'Other business-related income',
    specialReporting: false
  },
  
  // === COST OF GOODS SOLD ===
  [IRS_CATEGORIES.COST_OF_GOODS_SOLD]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: 'Part III', 
    type: 'expense',
    description: 'Cost of goods sold',
    specialReporting: true,
    specialForm: 'Part III - Required if selling physical products'
  },
  
  // === SCHEDULE C EXPENSES ===
  [IRS_CATEGORIES.ADVERTISING]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '8', 
    type: 'expense',
    description: 'Marketing and advertising expenses',
    specialReporting: false
  },
  [IRS_CATEGORIES.CAR_TRUCK_EXPENSES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '9', 
    type: 'expense',
    description: 'Vehicle expenses for business use',
    specialReporting: true,
    specialForm: 'Part IV - Must complete vehicle information and choose mileage vs actual method'
  },
  [IRS_CATEGORIES.COMMISSIONS_FEES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '10', 
    type: 'expense',
    description: 'Commissions and fees paid',
    specialReporting: false
  },
  [IRS_CATEGORIES.CONTRACT_LABOR]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '11', 
    type: 'expense',
    description: 'Contract labor costs',
    specialReporting: true,
    specialForm: 'Must issue Form 1099-NEC for payments ≥ $600'
  },
  [IRS_CATEGORIES.DEPLETION]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '12', 
    type: 'expense',
    description: 'Depletion of natural resources',
    specialReporting: false
  },
  [IRS_CATEGORIES.DEPRECIATION]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '13', 
    type: 'expense',
    description: 'Depreciation and Section 179 deductions',
    specialReporting: true,
    specialForm: 'Form 4562 - Must itemize assets and deductions'
  },
  [IRS_CATEGORIES.EMPLOYEE_BENEFIT_PROGRAMS]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '14', 
    type: 'expense',
    description: 'Employee benefit programs (W-2 employees only)',
    specialReporting: false
  },
  [IRS_CATEGORIES.INSURANCE_OTHER]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '15', 
    type: 'expense',
    description: 'Insurance other than health insurance',
    specialReporting: false
  },
  [IRS_CATEGORIES.INTEREST_MORTGAGE]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '16a', 
    type: 'expense',
    description: 'Mortgage interest paid to banks (business property only)',
    specialReporting: false
  },
  [IRS_CATEGORIES.INTEREST_OTHER]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '16b', 
    type: 'expense',
    description: 'Other business interest (loans, credit cards)',
    specialReporting: false
  },
  [IRS_CATEGORIES.LEGAL_PROFESSIONAL]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '17', 
    type: 'expense',
    description: 'Legal and professional services',
    specialReporting: false
  },
  [IRS_CATEGORIES.OFFICE_EXPENSES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '18', 
    type: 'expense',
    description: 'Office expenses (not rent or supplies)',
    specialReporting: false
  },
  [IRS_CATEGORIES.PENSION_PROFIT_SHARING]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '19', 
    type: 'expense',
    description: 'Pension and profit-sharing plans',
    specialReporting: false
  },
  [IRS_CATEGORIES.RENT_LEASE_VEHICLES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '20a', 
    type: 'expense',
    description: 'Rent or lease of vehicles, machinery, and equipment',
    specialReporting: false
  },
  [IRS_CATEGORIES.RENT_LEASE_OTHER]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '20b', 
    type: 'expense',
    description: 'Rent or lease of other business property',
    specialReporting: false
  },
  [IRS_CATEGORIES.REPAIRS_MAINTENANCE]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '21', 
    type: 'expense',
    description: 'Repairs and maintenance',
    specialReporting: false
  },
  [IRS_CATEGORIES.SUPPLIES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '22', 
    type: 'expense',
    description: 'Supplies not included in inventory',
    specialReporting: false
  },
  [IRS_CATEGORIES.TAXES_LICENSES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '23', 
    type: 'expense',
    description: 'Taxes and licenses',
    specialReporting: false
  },
  [IRS_CATEGORIES.TRAVEL]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '24a', 
    type: 'expense',
    description: 'Travel expenses (excluding meals)',
    specialReporting: false
  },
  [IRS_CATEGORIES.MEALS]: { 
    taxDeductible: 'partial', 
    business: true, 
    scheduleC: true, 
    line: '24b', 
    type: 'expense',
    description: 'Meals (generally 50% deductible, no entertainment)',
    deductionPercentage: 50,
    specialReporting: false
  },
  [IRS_CATEGORIES.UTILITIES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '25', 
    type: 'expense',
    description: 'Utilities',
    specialReporting: false
  },
  [IRS_CATEGORIES.WAGES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '26', 
    type: 'expense',
    description: 'Wages paid to employees (less employment credits)',
    specialReporting: false
  },
  
  // === OTHER EXPENSES (Line 27a) - Must be itemized ===
  [IRS_CATEGORIES.OTHER_EXPENSES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Other business expenses',
    specialReporting: true,
    specialForm: 'Must attach breakdown of each expense with name and amount'
  },
  [IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Software subscriptions and services',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.WEB_HOSTING]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Web hosting and domain expenses',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.BANK_FEES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Bank fees and service charges',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.BAD_DEBTS]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Bad debts (for accrual-based businesses)',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.DUES_MEMBERSHIPS]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Dues and memberships',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.TRAINING_EDUCATION]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Training and education',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.TRADE_PUBLICATIONS]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Trade publications',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.SECURITY_SERVICES]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Security services',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.BUSINESS_GIFTS]: { 
    taxDeductible: 'limited', 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Business gifts (limit: $25/person/year)',
    deductionLimit: 25,
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.UNIFORMS_SAFETY]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Uniforms and safety gear',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  [IRS_CATEGORIES.TOOLS_EQUIPMENT]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: true, 
    line: '27a', 
    type: 'expense',
    description: 'Tools under $2,500',
    specialReporting: true,
    specialForm: 'Report under Other Expenses with itemization'
  },
  
  // === SPECIAL FORMS ===
  [IRS_CATEGORIES.BUSINESS_USE_HOME]: { 
    taxDeductible: true, 
    business: true, 
    scheduleC: false, 
    line: 'Form 8829', 
    type: 'expense',
    description: 'Business use of home',
    specialReporting: true,
    specialForm: 'Form 8829 or Simplified Method ($5/sq ft)'
  },
  
  // === PERSONAL (NON-DEDUCTIBLE) ===
  [IRS_CATEGORIES.PERSONAL_EXPENSE]: { 
    taxDeductible: false, 
    business: false, 
    scheduleC: false, 
    type: 'expense',
    description: 'Personal expenses not related to business',
    specialReporting: false
  },
  [IRS_CATEGORIES.PERSONAL_TRANSFER]: { 
    taxDeductible: false, 
    business: false, 
    scheduleC: false, 
    type: 'transfer',
    description: 'Personal transfers between accounts',
    specialReporting: false
  },
  [IRS_CATEGORIES.OWNER_DRAWS]: { 
    taxDeductible: false, 
    business: false, 
    scheduleC: false, 
    type: 'transfer',
    description: 'Owner draws or distributions (not deductible)',
    specialReporting: false
  },
  
  // === SPECIAL ===
  [IRS_CATEGORIES.UNCATEGORIZED]: { 
    taxDeductible: null, 
    business: null, 
    scheduleC: false, 
    type: 'unknown',
    description: 'Uncategorized transaction requiring review',
    specialReporting: false
  }
};

// Category groups for easier organization and UI dropdowns (Schedule C Organized)
export const CATEGORY_GROUPS = {
  INCOME: [
    IRS_CATEGORIES.GROSS_RECEIPTS,
    IRS_CATEGORIES.OTHER_INCOME
  ],
  DEDUCTIONS: [
    IRS_CATEGORIES.RETURNS_ALLOWANCES
  ],
  COST_OF_GOODS: [
    IRS_CATEGORIES.COST_OF_GOODS_SOLD,
    IRS_CATEGORIES.INVENTORY_BEGINNING,
    IRS_CATEGORIES.INVENTORY_PURCHASES,
    IRS_CATEGORIES.COST_OF_LABOR,
    IRS_CATEGORIES.MATERIALS_SUPPLIES,
    IRS_CATEGORIES.OTHER_COSTS,
    IRS_CATEGORIES.INVENTORY_ENDING
  ],
  CORE_OPERATING: [
    IRS_CATEGORIES.ADVERTISING,
    IRS_CATEGORIES.OFFICE_EXPENSES,
    IRS_CATEGORIES.SUPPLIES,
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
  PROPERTY_RENT: [
    IRS_CATEGORIES.RENT_LEASE_OTHER,
    IRS_CATEGORIES.INTEREST_MORTGAGE,
    IRS_CATEGORIES.BUSINESS_USE_HOME
  ],
  EMPLOYEE_COSTS: [
    IRS_CATEGORIES.WAGES,
    IRS_CATEGORIES.EMPLOYEE_BENEFIT_PROGRAMS,
    IRS_CATEGORIES.PENSION_PROFIT_SHARING
  ],
  FINANCIAL: [
    IRS_CATEGORIES.INTEREST_OTHER,
    IRS_CATEGORIES.INSURANCE_OTHER,
    IRS_CATEGORIES.TAXES_LICENSES,
    IRS_CATEGORIES.BANK_FEES
  ],
  TRAVEL_MEALS: [
    IRS_CATEGORIES.TRAVEL,
    IRS_CATEGORIES.MEALS
  ],
  DEPRECIATION: [
    IRS_CATEGORIES.DEPRECIATION,
    IRS_CATEGORIES.DEPLETION
  ],
  OTHER_EXPENSES_27A: [
    IRS_CATEGORIES.OTHER_EXPENSES,
    IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
    IRS_CATEGORIES.WEB_HOSTING,
    IRS_CATEGORIES.BAD_DEBTS,
    IRS_CATEGORIES.DUES_MEMBERSHIPS,
    IRS_CATEGORIES.TRAINING_EDUCATION,
    IRS_CATEGORIES.TRADE_PUBLICATIONS,
    IRS_CATEGORIES.SECURITY_SERVICES,
    IRS_CATEGORIES.BUSINESS_GIFTS,
    IRS_CATEGORIES.UNIFORMS_SAFETY,
    IRS_CATEGORIES.TOOLS_EQUIPMENT
  ],
  PERSONAL: [
    IRS_CATEGORIES.PERSONAL_EXPENSE,
    IRS_CATEGORIES.PERSONAL_TRANSFER,
    IRS_CATEGORIES.OWNER_DRAWS
  ],
  SPECIAL: [
    IRS_CATEGORIES.SPLIT_TRANSACTION
  ]
};

// Helper function to get all categories as an array
export const getAllCategories = () => {
  return Object.values(IRS_CATEGORIES);
};

// Helper function to get subcategories for a given category
export const getSubcategories = (category) => {
  return CATEGORY_SUBCATEGORIES[category] || [];
};

// Helper function to check if a category is tax deductible
export const isTaxDeductible = (category) => {
  const metadata = CATEGORY_METADATA[category];
  return metadata ? metadata.taxDeductible : false;
};

// Helper function to check if a category is business-related
export const isBusinessCategory = (category) => {
  const metadata = CATEGORY_METADATA[category];
  return metadata ? metadata.business : false;
};

// Helper function to get the category group for a given category
export const getCategoryGroup = (category) => {
  for (const [groupName, categories] of Object.entries(CATEGORY_GROUPS)) {
    if (categories.includes(category)) {
      return groupName;
    }
  }
  return 'OTHER';
};

// Helper function to get Schedule C line number for a category
export const getScheduleCLine = (category) => {
  const metadata = CATEGORY_METADATA[category];
  return metadata?.line || null;
};

// Helper function to get categories by type (income, expense, etc.)
export const getCategoriesByType = (type) => {
  return Object.entries(CATEGORY_METADATA)
    .filter(([_, metadata]) => metadata.type === type)
    .map(([category]) => category);
};

// Helper function to get only business deductible categories
export const getBusinessDeductibleCategories = () => {
  return Object.entries(CATEGORY_METADATA)
    .filter(([_, metadata]) => metadata.business && metadata.taxDeductible)
    .map(([category]) => category);
};

// Helper function to get categories formatted for dropdowns with optgroups
export const getCategoriesForDropdown = () => {
  const dropdownData = [];
  
  Object.entries(CATEGORY_GROUPS).forEach(([groupName, categories]) => {
    const groupData = {
      label: groupName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      options: categories.map(category => ({
        value: category,
        label: category,
        subcategories: getSubcategories(category),
        taxDeductible: isTaxDeductible(category),
        business: isBusinessCategory(category)
      }))
    };
    dropdownData.push(groupData);
  });
  
  return dropdownData;
};

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
};

// Neutral/Non-Taxable Transaction Categories (not counted as income or expense)
export const NEUTRAL_CATEGORIES = {
  OWNER_CONTRIBUTION: 'Owner Contribution/Capital',
  OWNER_DRAW: 'Owner Draw/Distribution',
  LOAN_RECEIVED: 'Loan Received',
  LOAN_PAYMENT: 'Loan Payment (Principal)',
  TRANSFER_BETWEEN_ACCOUNTS: 'Transfer Between Accounts',
  REFUND_RECEIVED: 'Refund Received',
  REFUND_ISSUED: 'Refund Issued',
  SECURITY_DEPOSIT: 'Security Deposit',
  SECURITY_DEPOSIT_RETURN: 'Security Deposit Return',
  ESCROW_DEPOSIT: 'Escrow Deposit',
  ESCROW_RELEASE: 'Escrow Release',
  CREDIT_CARD_PAYMENT: 'Credit Card Payment',
  SALES_TAX_COLLECTED: 'Sales Tax Collected',
  SALES_TAX_PAYMENT: 'Sales Tax Payment',
  PAYROLL_TAX_DEPOSIT: 'Payroll Tax Deposit',
  REIMBURSEMENT_RECEIVED: 'Reimbursement Received',
  REIMBURSEMENT_PAID: 'Reimbursement Paid',
  PERSONAL_FUNDS_IN: 'Personal Funds Added',
  PERSONAL_FUNDS_OUT: 'Personal Funds Withdrawn',
  OPENING_BALANCE: 'Opening Balance',
  ADJUSTMENT: 'Balance Adjustment',
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CHECK: 'check',
  CHECK_DEPOSIT: 'check_deposit',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  WIRE_TRANSFER: 'wire_transfer',
  ACH: 'ach',
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
  CATEGORY_SUBCATEGORIES,
  CATEGORY_METADATA,
  CATEGORY_GROUPS,
  TRANSACTION_TYPES,
  NEUTRAL_CATEGORIES,
  PAYMENT_METHODS,
  FILE_UPLOAD,
  // Helper functions
  getAllCategories,
  getSubcategories,
  isTaxDeductible,
  isBusinessCategory,
  getCategoryGroup,
  getScheduleCLine,
  getCategoriesByType,
  getBusinessDeductibleCategories,
  getCategoriesForDropdown
};
