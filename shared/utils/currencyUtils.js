/**
 * Currency Utilities
 * Shared currency formatting and calculation functions
 */

/**
 * Format currency amount for display
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, options = {}) {
  const {
    currency = 'USD',
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrencySymbol = true,
    showSign = false
  } = options;

  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00';
  }

  const formatOptions = {
    style: showCurrencySymbol ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  };

  let formatted = new Intl.NumberFormat(locale, formatOptions).format(Math.abs(amount));

  // Add sign if requested or if negative
  if (amount < 0) {
    formatted = `-${formatted}`;
  } else if (showSign && amount > 0) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed amount or 0 if invalid
 */
export function parseCurrency(currencyString) {
  if (typeof currencyString !== 'string') {
    return 0;
  }

  // Remove currency symbols, commas, and spaces
  const cleaned = currencyString
    .replace(/[$,\s]/g, '')
    .replace(/[()]/g, ''); // Remove parentheses

  // Handle negative amounts in parentheses format
  const isNegative = currencyString.includes('(') && currencyString.includes(')');
  
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    return 0;
  }

  return isNegative ? -amount : amount;
}

/**
 * Add two currency amounts with precision handling
 * @param {number} amount1 - First amount
 * @param {number} amount2 - Second amount
 * @returns {number} Sum with proper precision
 */
export function addCurrency(amount1, amount2) {
  // Convert to cents to avoid floating point precision issues
  const cents1 = Math.round((amount1 || 0) * 100);
  const cents2 = Math.round((amount2 || 0) * 100);
  
  return (cents1 + cents2) / 100;
}

/**
 * Subtract currency amounts with precision handling
 * @param {number} amount1 - Amount to subtract from
 * @param {number} amount2 - Amount to subtract
 * @returns {number} Difference with proper precision
 */
export function subtractCurrency(amount1, amount2) {
  const cents1 = Math.round((amount1 || 0) * 100);
  const cents2 = Math.round((amount2 || 0) * 100);
  
  return (cents1 - cents2) / 100;
}

/**
 * Multiply currency amount with precision handling
 * @param {number} amount - Amount to multiply
 * @param {number} multiplier - Multiplier
 * @returns {number} Product with proper precision
 */
export function multiplyCurrency(amount, multiplier) {
  const cents = Math.round((amount || 0) * 100);
  return Math.round(cents * multiplier) / 100;
}

/**
 * Divide currency amount with precision handling
 * @param {number} amount - Amount to divide
 * @param {number} divisor - Divisor
 * @returns {number} Quotient with proper precision
 */
export function divideCurrency(amount, divisor) {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }
  
  const cents = Math.round((amount || 0) * 100);
  return Math.round(cents / divisor) / 100;
}

/**
 * Round currency amount to nearest cent
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
export function roundCurrency(amount) {
  return Math.round((amount || 0) * 100) / 100;
}

/**
 * Calculate percentage of amount
 * @param {number} amount - Base amount
 * @param {number} percentage - Percentage (e.g., 15 for 15%)
 * @returns {number} Calculated percentage amount
 */
export function calculatePercentage(amount, percentage) {
  return roundCurrency((amount || 0) * (percentage || 0) / 100);
}

/**
 * Calculate percentage that one amount is of another
 * @param {number} part - Part amount
 * @param {number} total - Total amount
 * @returns {number} Percentage (0-100)
 */
export function getPercentageOf(part, total) {
  if (total === 0) {
    return 0;
  }
  
  return Math.round(((part || 0) / total) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Format percentage for display
 * @param {number} percentage - Percentage to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(percentage, options = {}) {
  const {
    minimumFractionDigits = 1,
    maximumFractionDigits = 2,
    showSign = false
  } = options;

  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return '0.0%';
  }

  const formatOptions = {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits
  };

  // Convert percentage to decimal for Intl.NumberFormat
  const decimal = percentage / 100;
  let formatted = new Intl.NumberFormat('en-US', formatOptions).format(Math.abs(decimal));

  // Add sign if requested or if negative
  if (percentage < 0) {
    formatted = `-${formatted}`;
  } else if (showSign && percentage > 0) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

/**
 * Calculate tax amount
 * @param {number} amount - Taxable amount
 * @param {number} taxRate - Tax rate as percentage (e.g., 8.25 for 8.25%)
 * @returns {number} Tax amount
 */
export function calculateTax(amount, taxRate) {
  return calculatePercentage(amount, taxRate);
}

/**
 * Calculate amount including tax
 * @param {number} amount - Base amount
 * @param {number} taxRate - Tax rate as percentage
 * @returns {number} Amount including tax
 */
export function addTax(amount, taxRate) {
  const tax = calculateTax(amount, taxRate);
  return addCurrency(amount, tax);
}

/**
 * Calculate amount excluding tax
 * @param {number} amountWithTax - Amount including tax
 * @param {number} taxRate - Tax rate as percentage
 * @returns {number} Amount excluding tax
 */
export function removeTax(amountWithTax, taxRate) {
  const divisor = 1 + (taxRate / 100);
  return divideCurrency(amountWithTax, divisor);
}

/**
 * Sum array of currency amounts
 * @param {number[]} amounts - Array of amounts to sum
 * @returns {number} Total sum
 */
export function sumCurrency(amounts) {
  if (!Array.isArray(amounts)) {
    return 0;
  }

  return amounts.reduce((total, amount) => addCurrency(total, amount), 0);
}

/**
 * Get absolute value of currency amount
 * @param {number} amount - Amount to get absolute value of
 * @returns {number} Absolute value
 */
export function absCurrency(amount) {
  return Math.abs(amount || 0);
}

/**
 * Check if amount is negative
 * @param {number} amount - Amount to check
 * @returns {boolean} True if negative
 */
export function isNegativeAmount(amount) {
  return (amount || 0) < 0;
}

/**
 * Check if amount is positive
 * @param {number} amount - Amount to check
 * @returns {boolean} True if positive
 */
export function isPositiveAmount(amount) {
  return (amount || 0) > 0;
}

/**
 * Check if amount is zero
 * @param {number} amount - Amount to check
 * @param {number} tolerance - Tolerance for floating point comparison
 * @returns {boolean} True if zero (within tolerance)
 */
export function isZeroAmount(amount, tolerance = 0.001) {
  return Math.abs(amount || 0) < tolerance;
}

/**
 * Convert amount to cents (for storage or API calls)
 * @param {number} amount - Dollar amount
 * @returns {number} Amount in cents
 */
export function toCents(amount) {
  return Math.round((amount || 0) * 100);
}

/**
 * Convert cents to dollar amount
 * @param {number} cents - Amount in cents
 * @returns {number} Dollar amount
 */
export function fromCents(cents) {
  return (cents || 0) / 100;
}
