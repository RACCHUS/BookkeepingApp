/**
 * Date and Time Utilities
 * 
 * Comprehensive utilities for date manipulation, formatting,
 * and validation specific to bookkeeping and financial operations.
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso', 'us')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'short') {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }
  
  const options = {
    short: { month: 'numeric', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    iso: null, // Handle separately
    us: { month: 'numeric', day: 'numeric', year: 'numeric' }
  };
  
  if (format === 'iso') {
    return dateObj.toISOString().split('T')[0];
  }
  
  if (!options[format]) {
    throw new Error(`Unsupported format: ${format}`);
  }
  
  return dateObj.toLocaleDateString('en-US', options[format]);
}

/**
 * Get start and end of day
 * @param {Date|string} date - Date to process
 * @returns {object} Object with startOfDay and endOfDay
 */
export function getDayBounds(date) {
  const dateObj = new Date(date);
  
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString()
  };
}

/**
 * Get start and end of month
 * @param {Date|string} date - Date to process
 * @returns {object} Object with startOfMonth and endOfMonth
 */
export function getMonthBounds(date) {
  const dateObj = new Date(date);
  
  const startOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  const endOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return {
    startOfMonth: startOfMonth.toISOString(),
    endOfMonth: endOfMonth.toISOString()
  };
}

/**
 * Get start and end of year
 * @param {Date|string} date - Date to process
 * @returns {object} Object with startOfYear and endOfYear
 */
export function getYearBounds(date) {
  const dateObj = new Date(date);
  
  const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
  const endOfYear = new Date(dateObj.getFullYear(), 11, 31, 23, 59, 59, 999);
  
  return {
    startOfYear: startOfYear.toISOString(),
    endOfYear: endOfYear.toISOString()
  };
}

/**
 * Get fiscal year bounds
 * @param {Date|string} date - Date to process
 * @param {string} fiscalYearEnd - Fiscal year end in MM/DD format (e.g., '12/31')
 * @returns {object} Object with startOfFiscalYear and endOfFiscalYear
 */
export function getFiscalYearBounds(date, fiscalYearEnd = '12/31') {
  const dateObj = new Date(date);
  const [endMonth, endDay] = fiscalYearEnd.split('/').map(num => parseInt(num, 10));
  
  // Determine fiscal year
  const currentYear = dateObj.getFullYear();
  const fiscalEndThisYear = new Date(currentYear, endMonth - 1, endDay);
  
  let fiscalYear;
  if (dateObj <= fiscalEndThisYear) {
    fiscalYear = currentYear;
  } else {
    fiscalYear = currentYear + 1;
  }
  
  const startOfFiscalYear = new Date(fiscalYear - 1, endMonth - 1, endDay + 1);
  const endOfFiscalYear = new Date(fiscalYear, endMonth - 1, endDay, 23, 59, 59, 999);
  
  return {
    startOfFiscalYear: startOfFiscalYear.toISOString(),
    endOfFiscalYear: endOfFiscalYear.toISOString(),
    fiscalYear
  };
}

/**
 * Get quarter bounds
 * @param {Date|string} date - Date to process
 * @returns {object} Object with quarter info
 */
export function getQuarterBounds(date) {
  const dateObj = new Date(date);
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  
  const quarter = Math.floor(month / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  
  const startOfQuarter = new Date(year, startMonth, 1);
  const endOfQuarter = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  
  return {
    quarter,
    startOfQuarter: startOfQuarter.toISOString(),
    endOfQuarter: endOfQuarter.toISOString()
  };
}

/**
 * Calculate days between dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of days
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const timeDifference = end.getTime() - start.getTime();
  return Math.ceil(timeDifference / (1000 * 3600 * 24));
}

/**
 * Add days to date
 * @param {Date|string} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} ISO date string
 */
export function addDays(date, days) {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj.toISOString();
}

/**
 * Add months to date
 * @param {Date|string} date - Base date
 * @param {number} months - Number of months to add (can be negative)
 * @returns {string} ISO date string
 */
export function addMonths(date, months) {
  const dateObj = new Date(date);
  dateObj.setMonth(dateObj.getMonth() + months);
  return dateObj.toISOString();
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isInPast(date) {
  const dateObj = new Date(date);
  const now = new Date();
  return dateObj < now;
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

/**
 * Get relative date description
 * @param {Date|string} date - Date to describe
 * @returns {string} Relative description (e.g., 'today', 'yesterday', '3 days ago')
 */
export function getRelativeDate(date) {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInDays = daysBetween(dateObj, now);
  
  if (diffInDays === 0) return 'today';
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays === -1) return 'tomorrow';
  if (diffInDays > 0) return `${diffInDays} days ago`;
  if (diffInDays < 0) return `in ${Math.abs(diffInDays)} days`;
  
  return formatDate(date);
}

/**
 * Parse various date formats
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  
  // Try common formats
  const formats = [
    // ISO format
    /^\d{4}-\d{2}-\d{2}$/,
    // US format MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // European format DD/MM/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // US format MM-DD-YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/
  ];
  
  const date = new Date(dateString);
  
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Get business days between dates (excludes weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of business days
 */
export function getBusinessDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let businessDays = 0;
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return businessDays;
}

/**
 * Generate date range array
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} interval - Interval ('day', 'week', 'month')
 * @returns {Array} Array of date strings
 */
export function generateDateRange(startDate, endDate, interval = 'day') {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    
    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }
  
  return dates;
}
