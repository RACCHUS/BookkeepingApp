import { UI_CONSTANTS } from '../constants';

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = UI_CONSTANTS.DEFAULT_CURRENCY) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${UI_CONSTANTS.CURRENCY_SYMBOL}0.00`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed number
 */
export const parseCurrency = (currencyString) => {
  if (typeof currencyString !== 'string') {
    return 0;
  }
  
  // Remove currency symbol, commas, and spaces
  const cleanString = currencyString.replace(/[$,\s]/g, '');
  const number = parseFloat(cleanString);
  
  return isNaN(number) ? 0 : number;
};

/**
 * Format a number with commas
 * @param {number} number - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }
  
  return new Intl.NumberFormat('en-US').format(number);
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} total - Total value for percentage calculation
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (typeof value !== 'number' || typeof total !== 'number' || total === 0) {
    return '0%';
  }
  
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Calculate percentage change
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value
 * @returns {number} Percentage change
 */
export const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100;
  }
  
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Round to specified decimal places
 * @param {number} number - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
export const roundToDecimals = (number, decimals = 2) => {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Check if amount is positive (income)
 * @param {number} amount - Amount to check
 * @returns {boolean} True if positive
 */
export const isIncome = (amount) => {
  return amount > 0;
};

/**
 * Check if amount is negative (expense)
 * @param {number} amount - Amount to check
 * @returns {boolean} True if negative
 */
export const isExpense = (amount) => {
  return amount < 0;
};

/**
 * Get absolute value for display
 * @param {number} amount - Amount to get absolute value of
 * @returns {number} Absolute value
 */
export const getAbsoluteAmount = (amount) => {
  return Math.abs(amount);
};
