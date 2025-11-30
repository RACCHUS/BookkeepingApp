/**
 * Date and Time Utilities
 * 
 * Comprehensive utilities for date manipulation, formatting,
 * and validation specific to bookkeeping and financial operations.
 * 
 * @module utils/dateUtils
 * @requires utils/dateConstants
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

import {
  TIME_UNITS,
  DATE_FORMATS,
  TIME_BOUNDS,
  CALENDAR,
  FISCAL_YEAR,
  DATE_INTERVALS,
  RELATIVE_DATES,
  DATE_ERRORS
} from './dateConstants.js';

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso', 'us')
 * @returns {string} Formatted date string
 * @throws {Error} If date is invalid or format is unsupported
 * @example
 * formatDate(new Date(), 'short') // "1/15/2024"
 * formatDate('2024-01-15', 'long') // "January 15, 2024"
 */
export function formatDate(date, format = DATE_FORMATS.SHORT) {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(DATE_ERRORS.INVALID_DATE);
  }
  
  const options = {
    [DATE_FORMATS.SHORT]: { month: 'numeric', day: 'numeric', year: 'numeric' },
    [DATE_FORMATS.LONG]: { month: 'long', day: 'numeric', year: 'numeric' },
    [DATE_FORMATS.ISO]: null, // Handle separately
    [DATE_FORMATS.US]: { month: 'numeric', day: 'numeric', year: 'numeric' }
  };
  
  if (format === DATE_FORMATS.ISO) {
    return dateObj.toISOString().split('T')[0];
  }
  
  if (!options[format]) {
    throw new Error(`${DATE_ERRORS.UNSUPPORTED_FORMAT}: ${format}`);
  }
  
  return dateObj.toLocaleDateString('en-US', options[format]);
}

/**
 * Get start and end of day
 * @param {Date|string} date - Date to process
 * @returns {object} Object with startOfDay and endOfDay in ISO format
 * @example
 * getDayBounds('2024-01-15')
 * // { startOfDay: '2024-01-15T00:00:00.000Z', endOfDay: '2024-01-15T23:59:59.999Z' }
 */
export function getDayBounds(date) {
  const dateObj = new Date(date);
  
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(
    TIME_BOUNDS.START_OF_DAY.hours,
    TIME_BOUNDS.START_OF_DAY.minutes,
    TIME_BOUNDS.START_OF_DAY.seconds,
    TIME_BOUNDS.START_OF_DAY.milliseconds
  );
  
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(
    TIME_BOUNDS.END_OF_DAY.hours,
    TIME_BOUNDS.END_OF_DAY.minutes,
    TIME_BOUNDS.END_OF_DAY.seconds,
    TIME_BOUNDS.END_OF_DAY.milliseconds
  );
  
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
 * @returns {object} Object with startOfYear and endOfYear in ISO format
 * @example
 * getYearBounds('2024-06-15')
 * // { startOfYear: '2024-01-01T00:00:00.000Z', endOfYear: '2024-12-31T23:59:59.999Z' }
 */
export function getYearBounds(date) {
  const dateObj = new Date(date);
  
  const startOfYear = new Date(dateObj.getFullYear(), CALENDAR.FIRST_MONTH, 1);
  const endOfYear = new Date(
    dateObj.getFullYear(),
    CALENDAR.LAST_MONTH,
    31,
    TIME_BOUNDS.END_OF_DAY.hours,
    TIME_BOUNDS.END_OF_DAY.minutes,
    TIME_BOUNDS.END_OF_DAY.seconds,
    TIME_BOUNDS.END_OF_DAY.milliseconds
  );
  
  return {
    startOfYear: startOfYear.toISOString(),
    endOfYear: endOfYear.toISOString()
  };
}

/**
 * Get fiscal year bounds
 * @param {Date|string} date - Date to process
 * @param {string} fiscalYearEnd - Fiscal year end in MM/DD format (e.g., '12/31')
 * @returns {object} Object with startOfFiscalYear, endOfFiscalYear, and fiscalYear number
 * @example
 * getFiscalYearBounds('2024-03-15', '12/31')
 * // Calendar year fiscal year
 */
export function getFiscalYearBounds(date, fiscalYearEnd = FISCAL_YEAR.DEFAULT_END) {
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
 * @returns {object} Object with quarter number and bounds
 * @example
 * getQuarterBounds('2024-04-15')
 * // { quarter: 2, startOfQuarter: '2024-04-01...', endOfQuarter: '2024-06-30...' }
 */
export function getQuarterBounds(date) {
  const dateObj = new Date(date);
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  
  const quarter = Math.floor(month / CALENDAR.MONTHS_IN_QUARTER) + 1;
  const startMonth = (quarter - 1) * CALENDAR.MONTHS_IN_QUARTER;
  
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
 * @returns {number} Number of days (can be negative if endDate < startDate)
 * @example
 * daysBetween('2024-01-01', '2024-01-15') // 14
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const timeDifference = end.getTime() - start.getTime();
  return Math.ceil(timeDifference / TIME_UNITS.DAY);
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
 * @example
 * getRelativeDate(new Date()) // 'today'
 * getRelativeDate(yesterday) // 'yesterday'
 */
export function getRelativeDate(date) {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInDays = daysBetween(dateObj, now);
  
  if (diffInDays === 0) return RELATIVE_DATES.TODAY;
  if (diffInDays === 1) return RELATIVE_DATES.YESTERDAY;
  if (diffInDays === -1) return RELATIVE_DATES.TOMORROW;
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
 * @returns {number} Number of business days (Monday-Friday only)
 * @example
 * getBusinessDays('2024-01-01', '2024-01-05') // Excludes weekend days
 */
export function getBusinessDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let businessDays = 0;
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // Check if not a weekend day (0 = Sunday, 6 = Saturday)
    if (!CALENDAR.WEEKEND_DAYS.includes(dayOfWeek)) {
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
 * @returns {Array<string>} Array of ISO date strings
 * @example
 * generateDateRange('2024-01-01', '2024-01-03', 'day')
 * // ['2024-01-01', '2024-01-02', '2024-01-03']
 */
export function generateDateRange(startDate, endDate, interval = DATE_INTERVALS.DAY) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    
    switch (interval) {
      case DATE_INTERVALS.DAY:
        current.setDate(current.getDate() + 1);
        break;
      case DATE_INTERVALS.WEEK:
        current.setDate(current.getDate() + CALENDAR.DAYS_IN_WEEK);
        break;
      case DATE_INTERVALS.MONTH:
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }
  
  return dates;
}
