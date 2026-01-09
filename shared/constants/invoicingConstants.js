/**
 * Invoicing System Constants
 * 
 * Shared constants for quotes, invoices, and catalogue management
 * 
 * @author BookkeepingApp Team
 */

// Quote statuses
export const QUOTE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired'
};

export const QUOTE_STATUS_LABELS = {
  [QUOTE_STATUS.DRAFT]: 'Draft',
  [QUOTE_STATUS.SENT]: 'Sent',
  [QUOTE_STATUS.ACCEPTED]: 'Accepted',
  [QUOTE_STATUS.DECLINED]: 'Declined',
  [QUOTE_STATUS.EXPIRED]: 'Expired'
};

export const QUOTE_STATUS_COLORS = {
  [QUOTE_STATUS.DRAFT]: 'gray',
  [QUOTE_STATUS.SENT]: 'blue',
  [QUOTE_STATUS.ACCEPTED]: 'green',
  [QUOTE_STATUS.DECLINED]: 'red',
  [QUOTE_STATUS.EXPIRED]: 'yellow'
};

// Invoice statuses
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void'
};

export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.DRAFT]: 'Draft',
  [INVOICE_STATUS.SENT]: 'Sent',
  [INVOICE_STATUS.VIEWED]: 'Viewed',
  [INVOICE_STATUS.PARTIAL]: 'Partially Paid',
  [INVOICE_STATUS.PAID]: 'Paid',
  [INVOICE_STATUS.OVERDUE]: 'Overdue',
  [INVOICE_STATUS.VOID]: 'Void'
};

export const INVOICE_STATUS_COLORS = {
  [INVOICE_STATUS.DRAFT]: 'gray',
  [INVOICE_STATUS.SENT]: 'blue',
  [INVOICE_STATUS.VIEWED]: 'purple',
  [INVOICE_STATUS.PARTIAL]: 'yellow',
  [INVOICE_STATUS.PAID]: 'green',
  [INVOICE_STATUS.OVERDUE]: 'red',
  [INVOICE_STATUS.VOID]: 'gray'
};

// Payment terms
export const PAYMENT_TERMS = {
  DUE_ON_RECEIPT: 'due_on_receipt',
  NET_7: 'net_7',
  NET_15: 'net_15',
  NET_30: 'net_30',
  NET_45: 'net_45',
  NET_60: 'net_60',
  CUSTOM: 'custom'
};

export const PAYMENT_TERMS_LABELS = {
  [PAYMENT_TERMS.DUE_ON_RECEIPT]: 'Due on Receipt',
  [PAYMENT_TERMS.NET_7]: 'Net 7',
  [PAYMENT_TERMS.NET_15]: 'Net 15',
  [PAYMENT_TERMS.NET_30]: 'Net 30',
  [PAYMENT_TERMS.NET_45]: 'Net 45',
  [PAYMENT_TERMS.NET_60]: 'Net 60',
  [PAYMENT_TERMS.CUSTOM]: 'Custom'
};

export const PAYMENT_TERMS_DAYS = {
  [PAYMENT_TERMS.DUE_ON_RECEIPT]: 0,
  [PAYMENT_TERMS.NET_7]: 7,
  [PAYMENT_TERMS.NET_15]: 15,
  [PAYMENT_TERMS.NET_30]: 30,
  [PAYMENT_TERMS.NET_45]: 45,
  [PAYMENT_TERMS.NET_60]: 60
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CHECK: 'check',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  ACH: 'ach',
  WIRE: 'wire',
  PAYPAL: 'paypal',
  VENMO: 'venmo',
  ZELLE: 'zelle',
  OTHER: 'other'
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Cash',
  [PAYMENT_METHODS.CHECK]: 'Check',
  [PAYMENT_METHODS.CREDIT_CARD]: 'Credit Card',
  [PAYMENT_METHODS.DEBIT_CARD]: 'Debit Card',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer',
  [PAYMENT_METHODS.ACH]: 'ACH',
  [PAYMENT_METHODS.WIRE]: 'Wire Transfer',
  [PAYMENT_METHODS.PAYPAL]: 'PayPal',
  [PAYMENT_METHODS.VENMO]: 'Venmo',
  [PAYMENT_METHODS.ZELLE]: 'Zelle',
  [PAYMENT_METHODS.OTHER]: 'Other'
};

// Recurring frequencies
export const RECURRING_FREQUENCY = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUALLY: 'annually'
};

export const RECURRING_FREQUENCY_LABELS = {
  [RECURRING_FREQUENCY.WEEKLY]: 'Weekly',
  [RECURRING_FREQUENCY.BIWEEKLY]: 'Bi-weekly',
  [RECURRING_FREQUENCY.MONTHLY]: 'Monthly',
  [RECURRING_FREQUENCY.QUARTERLY]: 'Quarterly',
  [RECURRING_FREQUENCY.ANNUALLY]: 'Annually'
};

// Unit types for catalogue items
export const UNIT_TYPES = {
  EACH: 'each',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  SQFT: 'sqft',
  LINEAR_FT: 'linear_ft',
  UNIT: 'unit',
  PROJECT: 'project',
  SERVICE: 'service'
};

export const UNIT_TYPE_LABELS = {
  [UNIT_TYPES.EACH]: 'Each',
  [UNIT_TYPES.HOUR]: 'Hour',
  [UNIT_TYPES.DAY]: 'Day',
  [UNIT_TYPES.WEEK]: 'Week',
  [UNIT_TYPES.MONTH]: 'Month',
  [UNIT_TYPES.YEAR]: 'Year',
  [UNIT_TYPES.SQFT]: 'Sq Ft',
  [UNIT_TYPES.LINEAR_FT]: 'Linear Ft',
  [UNIT_TYPES.UNIT]: 'Unit',
  [UNIT_TYPES.PROJECT]: 'Project',
  [UNIT_TYPES.SERVICE]: 'Service'
};

// Discount types
export const DISCOUNT_TYPES = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage'
};

// Default quote validity (days)
export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

// Number prefixes
export const NUMBER_PREFIXES = {
  QUOTE: 'QT',
  INVOICE: 'INV'
};
