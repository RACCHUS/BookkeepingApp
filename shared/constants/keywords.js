import { IRS_CATEGORIES } from './categories.js';

// Keywords for automatic transaction classification
export const CLASSIFICATION_KEYWORDS = {
  [IRS_CATEGORIES.ADVERTISING]: [
    'google ads', 'facebook ads', 'instagram ads', 'linkedin ads', 'twitter ads',
    'advertising', 'marketing', 'promotion', 'billboard', 'radio ad', 'tv ad',
    'newspaper ad', 'magazine ad', 'flyer', 'brochure', 'business card',
    'website promotion', 'seo', 'sem', 'social media marketing'
  ],
  
  [IRS_CATEGORIES.CAR_TRUCK_EXPENSES]: [
    'gas station', 'fuel', 'gasoline', 'diesel', 'auto repair', 'car wash',
    'oil change', 'tire', 'brake', 'battery', 'mechanic', 'auto parts',
    'vehicle maintenance', 'car insurance', 'registration', 'dmv',
    'parking', 'toll', 'uber', 'lyft', 'taxi', 'rental car'
  ],
  
  [IRS_CATEGORIES.OFFICE_EXPENSES]: [
    'office supplies', 'staples', 'office depot', 'best buy', 'amazon',
    'printer', 'ink', 'toner', 'paper', 'pen', 'pencil', 'notebook',
    'folder', 'binder', 'calculator', 'desk', 'chair', 'computer',
    'monitor', 'keyboard', 'mouse', 'software', 'microsoft office',
    'adobe', 'printer paper', 'envelopes', 'stamps'
  ],
  
  [IRS_CATEGORIES.LEGAL_PROFESSIONAL]: [
    'attorney', 'lawyer', 'legal', 'law firm', 'court', 'legal fees',
    'consultation', 'accountant', 'cpa', 'bookkeeper', 'tax prep',
    'consultant', 'business advisor', 'professional services',
    'notary', 'paralegal', 'contract review'
  ],
  
  [IRS_CATEGORIES.UTILITIES]: [
    'electric', 'electricity', 'gas bill', 'water', 'sewer', 'trash',
    'internet', 'phone', 'cell phone', 'telephone', 'wifi',
    'cable', 'satellite', 'utility', 'power company', 'energy'
  ],
  
  [IRS_CATEGORIES.RENT_LEASE_OTHER]: [
    'rent', 'lease', 'rental', 'property management', 'landlord',
    'office rent', 'warehouse rent', 'storage unit', 'co-working space'
  ],
  
  [IRS_CATEGORIES.INSURANCE_OTHER]: [
    'insurance', 'liability insurance', 'business insurance',
    'property insurance', 'general liability', 'professional liability',
    'errors and omissions', 'workers comp', 'disability insurance'
  ],
  
  [IRS_CATEGORIES.MEALS]: [
    'restaurant', 'coffee', 'lunch', 'dinner', 'catering', 'food',
    'business meal', 'client dinner', 'conference meal', 'starbucks',
    'mcdonalds', 'subway', 'pizza', 'entertainment', 'tickets',
    'event', 'conference', 'seminar', 'business entertainment'
  ],
  
  [IRS_CATEGORIES.TRAVEL]: [
    'hotel', 'motel', 'airbnb', 'airline', 'flight', 'airport',
    'taxi', 'uber', 'lyft', 'rental car', 'train', 'bus',
    'business travel', 'conference travel', 'mileage', 'lodging',
    'accommodation', 'travel expense'
  ],
  
  [IRS_CATEGORIES.SUPPLIES]: [
    'supplies', 'materials', 'inventory', 'parts', 'components',
    'raw materials', 'production supplies', 'manufacturing supplies',
    'tools', 'equipment supplies', 'cleaning supplies', 'safety supplies'
  ],
  
  [IRS_CATEGORIES.INTEREST_OTHER]: [
    'interest', 'loan interest', 'credit card interest', 'line of credit',
    'business loan', 'equipment loan', 'financing charges',
    'late fees', 'penalty'
  ],
  
  [IRS_CATEGORIES.REPAIRS_MAINTENANCE]: [
    'repair', 'maintenance', 'fix', 'service', 'hvac', 'plumbing',
    'electrical', 'cleaning', 'janitorial', 'landscaping',
    'snow removal', 'pest control', 'security system',
    'equipment repair', 'building maintenance'
  ],
  
  [IRS_CATEGORIES.WAGES]: [
    'payroll', 'salary', 'wages', 'employee', 'staff', 'worker',
    'compensation', 'bonus', 'overtime', 'commission', 'tip',
    'adp', 'paychex', 'quickbooks payroll', 'gusto'
  ],
  
  [IRS_CATEGORIES.TAXES_LICENSES]: [
    'payroll tax', 'fica', 'social security', 'medicare', 'unemployment tax',
    'futa', 'suta', 'state unemployment', 'federal unemployment',
    'withholding', 'employer tax',
    'tax', 'taxes', 'irs', 'state tax', 'local tax', 'sales tax',
    'license', 'permit', 'registration', 'business license',
    'professional license', 'city license', 'county tax',
    'property tax', 'franchise tax'
  ],
  
  [IRS_CATEGORIES.GROSS_RECEIPTS]: [
    'payment', 'invoice', 'sale', 'revenue', 'income', 'receipt',
    'deposit', 'cash sale', 'credit card sale', 'check payment',
    'client payment', 'customer payment', 'stripe', 'paypal', 'square'
  ],
  
  [IRS_CATEGORIES.CONTRACT_LABOR]: [
    'contractor', 'freelancer', 'consultant', 'independent contractor',
    '1099', 'subcontractor', 'vendor', 'service provider',
    'temporary worker', 'contract work'
  ],
  
  [IRS_CATEGORIES.COMMISSIONS_FEES]: [
    'commission', 'fee', 'service fee', 'processing fee', 'transaction fee',
    'bank fee', 'credit card fee', 'paypal fee', 'stripe fee',
    'merchant fee', 'broker fee', 'agent fee'
  ],
  
  [IRS_CATEGORIES.PERSONAL_EXPENSE]: [
    'personal', 'grocery', 'clothing', 'entertainment', 'vacation',
    'personal care', 'medical', 'dental', 'pharmacy', 'gym',
    'fitness', 'hobby', 'personal shopping', 'home improvement'
  ]
};

// Common payee patterns for classification
export const PAYEE_PATTERNS = {
  BANKS: [
    'bank of america', 'chase', 'wells fargo', 'citibank', 'us bank',
    'pnc bank', 'td bank', 'capital one', 'ally bank', 'discover bank'
  ],
  
  CREDIT_CARDS: [
    'american express', 'amex', 'visa', 'mastercard', 'discover card',
    'capital one', 'chase card', 'citi card'
  ],
  
  UTILITIES: [
    'pg&e', 'con edison', 'duke energy', 'georgia power', 'florida power',
    'verizon', 'at&t', 'comcast', 'xfinity', 'spectrum', 'cox',
    'time warner', 'directv', 'dish network'
  ],
  
  GAS_STATIONS: [
    'shell', 'exxon', 'mobil', 'chevron', 'bp', 'arco', 'texaco',
    'phillips 66', 'marathon', 'valero', 'speedway', 'wawa'
  ],
  
  OFFICE_SUPPLIES: [
    'staples', 'office depot', 'officemax', 'best buy', 'costco',
    'walmart', 'target', 'amazon', 'ups store', 'fedex office'
  ]
};

// Transaction amount patterns
export const AMOUNT_PATTERNS = {
  SMALL_OFFICE_EXPENSE: { min: 0, max: 100 },
  MEDIUM_EXPENSE: { min: 100, max: 1000 },
  LARGE_EXPENSE: { min: 1000, max: 10000 },
  MAJOR_EXPENSE: { min: 10000, max: Infinity }
};

export default {
  CLASSIFICATION_KEYWORDS,
  PAYEE_PATTERNS,
  AMOUNT_PATTERNS
};
