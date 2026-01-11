/**
 * Math Utilities
 * Safe mathematical operations with error handling and floating-point precision management
 * 
 * All currency calculations use cents-based arithmetic to avoid floating-point precision issues.
 * @module mathUtils
 */

/**
 * Safely parse a value to a number
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed number or default value
 */
export function safeParseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  // Handle string currency format (e.g., "$1,234.56")
  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[$,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? defaultValue : value;
  }
  
  return defaultValue;
}

/**
 * Round a number to specified decimal places with proper floating-point handling
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded value
 */
export function roundTo(value, decimals = 2) {
  const num = safeParseNumber(value);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Add two numbers with cent-based precision
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {number} Sum with 2 decimal precision
 */
export function safeAdd(a, b) {
  const num1 = safeParseNumber(a);
  const num2 = safeParseNumber(b);
  // Convert to cents, add, convert back
  const cents = Math.round(num1 * 100) + Math.round(num2 * 100);
  return cents / 100;
}

/**
 * Subtract two numbers with cent-based precision
 * @param {number|string} a - Value to subtract from
 * @param {number|string} b - Value to subtract
 * @returns {number} Difference with 2 decimal precision
 */
export function safeSubtract(a, b) {
  const num1 = safeParseNumber(a);
  const num2 = safeParseNumber(b);
  const cents = Math.round(num1 * 100) - Math.round(num2 * 100);
  return cents / 100;
}

/**
 * Multiply a number with cent-based precision
 * @param {number|string} value - Value to multiply
 * @param {number|string} multiplier - Multiplier
 * @returns {number} Product with 2 decimal precision
 */
export function safeMultiply(value, multiplier) {
  const num = safeParseNumber(value);
  const mult = safeParseNumber(multiplier);
  const cents = Math.round(num * 100);
  return Math.round(cents * mult) / 100;
}

/**
 * Divide numbers safely with zero-division protection
 * @param {number|string} numerator - Value to divide
 * @param {number|string} denominator - Divisor
 * @param {number} defaultValue - Value to return if division by zero
 * @returns {number} Quotient with 2 decimal precision
 */
export function safeDivide(numerator, denominator, defaultValue = 0) {
  const num = safeParseNumber(numerator);
  const denom = safeParseNumber(denominator);
  
  if (denom === 0) {
    return defaultValue;
  }
  
  const cents = Math.round(num * 100);
  return Math.round(cents / denom) / 100;
}

/**
 * Calculate percentage safely (part/total * 100)
 * @param {number|string} part - Part value
 * @param {number|string} total - Total value
 * @param {number} decimals - Decimal places in result (default: 2)
 * @returns {number} Percentage value (0-100+)
 */
export function safePercentage(part, total, decimals = 2) {
  const partNum = safeParseNumber(part);
  const totalNum = safeParseNumber(total);
  
  if (totalNum === 0) {
    return 0;
  }
  
  const percentage = (partNum / totalNum) * 100;
  return roundTo(percentage, decimals);
}

/**
 * Calculate percentage change between two values
 * @param {number|string} oldValue - Original value
 * @param {number|string} newValue - New value
 * @param {number} decimals - Decimal places in result (default: 2)
 * @returns {number} Percentage change
 */
export function safePercentageChange(oldValue, newValue, decimals = 2) {
  const oldNum = safeParseNumber(oldValue);
  const newNum = safeParseNumber(newValue);
  
  if (oldNum === 0) {
    // If old value is 0 and new value is also 0, return 0
    // If old value is 0 but new value is not, return 100% (infinite increase)
    return newNum === 0 ? 0 : 100;
  }
  
  const change = ((newNum - oldNum) / Math.abs(oldNum)) * 100;
  return roundTo(change, decimals);
}

/**
 * Sum an array of numbers safely
 * @param {Array} values - Array of numbers or objects
 * @param {string} [key] - If values are objects, the key to sum
 * @returns {number} Sum with 2 decimal precision
 */
export function safeSum(values, key = null) {
  if (!Array.isArray(values)) {
    return 0;
  }
  
  // Sum in cents to avoid floating-point accumulation errors
  const totalCents = values.reduce((acc, item) => {
    let value;
    if (key && typeof item === 'object' && item !== null) {
      value = item[key];
    } else {
      value = item;
    }
    const num = safeParseNumber(value);
    return acc + Math.round(num * 100);
  }, 0);
  
  return totalCents / 100;
}

/**
 * Calculate average of an array safely
 * @param {Array} values - Array of numbers or objects
 * @param {string} [key] - If values are objects, the key to average
 * @returns {number} Average with 2 decimal precision
 */
export function safeAverage(values, key = null) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  
  const sum = safeSum(values, key);
  return roundTo(sum / values.length);
}

/**
 * Get absolute value safely
 * @param {number|string} value - Value to get absolute value of
 * @returns {number} Absolute value
 */
export function safeAbs(value) {
  return Math.abs(safeParseNumber(value));
}

/**
 * Clamp a value between min and max
 * @param {number|string} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  const num = safeParseNumber(value);
  return Math.min(Math.max(num, min), max);
}

/**
 * Check if a value is a valid number for financial calculations
 * @param {any} value - Value to check
 * @returns {boolean} True if valid number
 */
export function isValidAmount(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  const num = safeParseNumber(value, NaN);
  return !isNaN(num) && isFinite(num);
}

/**
 * Format a number as currency string
 * @param {number|string} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export function formatAmount(value, options = {}) {
  const {
    currency = 'USD',
    locale = 'en-US',
    showSymbol = true,
    decimals = 2
  } = options;
  
  const num = safeParseNumber(value);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  } catch {
    // Fallback for invalid currency codes
    return `$${roundTo(num, decimals).toFixed(decimals)}`;
  }
}

/**
 * Calculate profit margin percentage
 * @param {number|string} income - Total income
 * @param {number|string} expenses - Total expenses
 * @returns {number} Profit margin as percentage
 */
export function calculateProfitMargin(income, expenses) {
  const incomeNum = safeParseNumber(income);
  const expenseNum = safeParseNumber(expenses);
  const profit = safeSubtract(incomeNum, expenseNum);
  
  if (incomeNum === 0) {
    return 0;
  }
  
  return roundTo((profit / incomeNum) * 100);
}

/**
 * Calculate net income (income - expenses)
 * @param {number|string} income - Total income
 * @param {number|string} expenses - Total expenses
 * @returns {number} Net income
 */
export function calculateNetIncome(income, expenses) {
  return safeSubtract(income, expenses);
}

// Named exports for convenience
export default {
  safeParseNumber,
  roundTo,
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide,
  safePercentage,
  safePercentageChange,
  safeSum,
  safeAverage,
  safeAbs,
  clamp,
  isValidAmount,
  formatAmount,
  calculateProfitMargin,
  calculateNetIncome
};
