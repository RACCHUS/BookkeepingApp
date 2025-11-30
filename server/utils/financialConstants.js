/**
 * Financial Constants
 * 
 * Centralized constants for financial calculations, currency formatting,
 * and accounting operations used throughout the bookkeeping application.
 * 
 * @module utils/financialConstants
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// Currency defaults
export const CURRENCY = {
  DEFAULT_CODE: 'USD',
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_SYMBOL: '$'
};

// Decimal precision
export const PRECISION = {
  CURRENCY: 2,           // Standard currency precision
  PERCENTAGE: 2,         // Percentage precision
  CALCULATION: 4,        // Intermediate calculations
  TAX_RATE: 4           // Tax rate precision
};

// Rounding multipliers (for avoiding floating point issues)
export const ROUNDING = {
  CENTS: 100,           // Round to cents (2 decimal places)
  TENTHS: 10,           // Round to tenths (1 decimal place)
  THOUSANDS: 1000,      // Round to thousands
  MILLIONS: 1000000     // Round to millions
};

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
};

// Percentage constants
export const PERCENTAGE = {
  MIN: 0,
  MAX: 100,
  MULTIPLIER: 100,
  FULL: 100
};

// Financial period types
export const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

// Tax calculation defaults
export const TAX = {
  DEFAULT_RATE: 0,
  RATE_MULTIPLIER: 100  // Convert 0.075 to 7.5%
};

// Default financial values
export const DEFAULTS = {
  STARTING_BALANCE: 0,
  ZERO_AMOUNT: 0,
  FALLBACK_DISPLAY: '$0.00'
};

// Currency formatting options
export const FORMAT_OPTIONS = {
  SHOW_SYMBOL: true,
  HIDE_SYMBOL: false,
  MIN_FRACTION_DIGITS: 2,
  MAX_FRACTION_DIGITS: 2
};

// Error messages
export const FINANCIAL_ERRORS = {
  INVALID_AMOUNT: 'Amount must be a valid number',
  INVALID_ARRAY: 'Amounts must be an array',
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  NEGATIVE_NOT_ALLOWED: 'Negative values not allowed'
};
