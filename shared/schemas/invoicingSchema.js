/**
 * Invoicing System Schemas
 * 
 * Validation schemas for catalogue items, quotes, and invoices
 * 
 * @author BookkeepingApp Team
 */

import {
  QUOTE_STATUS,
  INVOICE_STATUS,
  PAYMENT_TERMS,
  PAYMENT_METHODS,
  RECURRING_FREQUENCY,
  UNIT_TYPES,
  DISCOUNT_TYPES
} from '../constants/invoicingConstants.js';

/**
 * Catalogue Item Schema
 */
export const catalogueItemSchema = {
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  description: {
    required: false,
    type: 'string',
    maxLength: 1000
  },
  sku: {
    required: false,
    type: 'string',
    maxLength: 50
  },
  category: {
    required: false,
    type: 'string',
    maxLength: 100
  },
  unit_price: {
    required: true,
    type: 'number',
    min: 0,
    max: 9999999999.99
  },
  unit: {
    required: false,
    type: 'string',
    enum: Object.values(UNIT_TYPES),
    default: UNIT_TYPES.EACH
  },
  tax_rate: {
    required: false,
    type: 'number',
    min: 0,
    max: 100,
    default: 0
  },
  is_active: {
    required: false,
    type: 'boolean',
    default: true
  }
};

/**
 * Line Item Schema (used for both quotes and invoices)
 */
export const lineItemSchema = {
  catalogue_item_id: {
    required: false,
    type: 'string' // UUID, null for ad-hoc items
  },
  description: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 500
  },
  quantity: {
    required: true,
    type: 'number',
    min: 0.01,
    max: 999999.99
  },
  unit_price: {
    required: true,
    type: 'number',
    min: 0,
    max: 9999999999.99
  },
  tax_rate: {
    required: false,
    type: 'number',
    min: 0,
    max: 100,
    default: 0
  },
  sort_order: {
    required: false,
    type: 'number',
    default: 0
  }
};

/**
 * Quote Schema
 */
export const quoteSchema = {
  client_id: {
    required: false,
    type: 'string' // UUID
  },
  company_id: {
    required: false,
    type: 'string' // UUID
  },
  status: {
    required: false,
    type: 'string',
    enum: Object.values(QUOTE_STATUS),
    default: QUOTE_STATUS.DRAFT
  },
  issue_date: {
    required: true,
    type: 'date'
  },
  expiry_date: {
    required: false,
    type: 'date'
  },
  discount_amount: {
    required: false,
    type: 'number',
    min: 0,
    default: 0
  },
  discount_type: {
    required: false,
    type: 'string',
    enum: Object.values(DISCOUNT_TYPES),
    default: DISCOUNT_TYPES.FIXED
  },
  notes: {
    required: false,
    type: 'string',
    maxLength: 2000
  },
  terms: {
    required: false,
    type: 'string',
    maxLength: 2000
  },
  line_items: {
    required: true,
    type: 'array',
    minItems: 1,
    items: lineItemSchema
  }
};

/**
 * Invoice Schema
 */
export const invoiceSchema = {
  client_id: {
    required: false,
    type: 'string' // UUID
  },
  company_id: {
    required: false,
    type: 'string' // UUID
  },
  quote_id: {
    required: false,
    type: 'string' // UUID, if created from quote
  },
  status: {
    required: false,
    type: 'string',
    enum: Object.values(INVOICE_STATUS),
    default: INVOICE_STATUS.DRAFT
  },
  issue_date: {
    required: true,
    type: 'date'
  },
  due_date: {
    required: true,
    type: 'date'
  },
  payment_terms: {
    required: false,
    type: 'string',
    enum: Object.values(PAYMENT_TERMS),
    default: PAYMENT_TERMS.NET_30
  },
  discount_amount: {
    required: false,
    type: 'number',
    min: 0,
    default: 0
  },
  discount_type: {
    required: false,
    type: 'string',
    enum: Object.values(DISCOUNT_TYPES),
    default: DISCOUNT_TYPES.FIXED
  },
  notes: {
    required: false,
    type: 'string',
    maxLength: 2000
  },
  terms: {
    required: false,
    type: 'string',
    maxLength: 2000
  },
  line_items: {
    required: true,
    type: 'array',
    minItems: 1,
    items: lineItemSchema
  }
};

/**
 * Payment Schema
 */
export const paymentSchema = {
  amount: {
    required: true,
    type: 'number',
    min: 0.01,
    max: 9999999999.99
  },
  payment_date: {
    required: true,
    type: 'date'
  },
  payment_method: {
    required: false,
    type: 'string',
    enum: Object.values(PAYMENT_METHODS)
  },
  reference: {
    required: false,
    type: 'string',
    maxLength: 100
  },
  transaction_id: {
    required: false,
    type: 'string' // UUID
  },
  notes: {
    required: false,
    type: 'string',
    maxLength: 500
  }
};

/**
 * Recurring Schedule Schema
 */
export const recurringScheduleSchema = {
  client_id: {
    required: true,
    type: 'string' // UUID
  },
  company_id: {
    required: false,
    type: 'string' // UUID
  },
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  frequency: {
    required: true,
    type: 'string',
    enum: Object.values(RECURRING_FREQUENCY)
  },
  day_of_month: {
    required: false,
    type: 'number',
    min: 1,
    max: 31
  },
  day_of_week: {
    required: false,
    type: 'number',
    min: 0,
    max: 6
  },
  start_date: {
    required: true,
    type: 'date'
  },
  end_date: {
    required: false,
    type: 'date'
  },
  max_occurrences: {
    required: false,
    type: 'number',
    min: 1
  },
  auto_send: {
    required: false,
    type: 'boolean',
    default: false
  },
  template_data: {
    required: true,
    type: 'object' // Line items template
  }
};

/**
 * Calculate line item total
 * @param {number} quantity 
 * @param {number} unitPrice 
 * @param {number} taxRate 
 * @returns {Object} { subtotal, tax, total }
 */
export function calculateLineTotal(quantity, unitPrice, taxRate = 0) {
  const subtotal = quantity * unitPrice;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

/**
 * Calculate document totals from line items
 * @param {Array} lineItems 
 * @param {number} discountAmount 
 * @param {string} discountType 
 * @returns {Object} { subtotal, taxTotal, discountAmount, total }
 */
export function calculateDocumentTotals(lineItems, discountAmount = 0, discountType = 'fixed') {
  let subtotal = 0;
  let taxTotal = 0;
  
  for (const item of lineItems) {
    const lineCalc = calculateLineTotal(item.quantity, item.unit_price, item.tax_rate);
    subtotal += lineCalc.subtotal;
    taxTotal += lineCalc.tax;
  }
  
  // Apply discount
  let actualDiscount = discountAmount;
  if (discountType === 'percentage') {
    actualDiscount = subtotal * (discountAmount / 100);
  }
  
  const total = subtotal + taxTotal - actualDiscount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discountAmount: Math.round(actualDiscount * 100) / 100,
    total: Math.round(Math.max(0, total) * 100) / 100
  };
}

/**
 * Calculate due date from issue date and payment terms
 * @param {Date} issueDate 
 * @param {string} paymentTerms 
 * @returns {Date}
 */
export function calculateDueDate(issueDate, paymentTerms) {
  const days = {
    [PAYMENT_TERMS.DUE_ON_RECEIPT]: 0,
    [PAYMENT_TERMS.NET_7]: 7,
    [PAYMENT_TERMS.NET_15]: 15,
    [PAYMENT_TERMS.NET_30]: 30,
    [PAYMENT_TERMS.NET_45]: 45,
    [PAYMENT_TERMS.NET_60]: 60
  };
  
  const daysToAdd = days[paymentTerms] ?? 30;
  const date = new Date(issueDate);
  date.setDate(date.getDate() + daysToAdd);
  
  return date;
}
