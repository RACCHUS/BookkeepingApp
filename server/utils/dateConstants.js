/**
 * Date and Time Constants
 * 
 * Centralized constants for date operations, formats, and intervals
 * used throughout the bookkeeping application.
 * 
 * @module utils/dateConstants
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// Time units in milliseconds
export const TIME_UNITS = {
  MILLISECOND: 1,
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
};

// Date format types
export const DATE_FORMATS = {
  SHORT: 'short',      // 1/15/2024
  LONG: 'long',        // January 15, 2024
  ISO: 'iso',          // 2024-01-15
  US: 'us'             // 1/15/2024
};

// Time boundary constants
export const TIME_BOUNDS = {
  START_OF_DAY: { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 },
  END_OF_DAY: { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }
};

// Calendar constants
export const CALENDAR = {
  MONTHS_IN_YEAR: 12,
  MONTHS_IN_QUARTER: 3,
  DAYS_IN_WEEK: 7,
  WEEKEND_DAYS: [0, 6], // Sunday = 0, Saturday = 6
  FIRST_MONTH: 0,        // January
  LAST_MONTH: 11         // December
};

// Fiscal year defaults
export const FISCAL_YEAR = {
  DEFAULT_END: '12/31',  // Standard calendar year
  COMMON_ENDS: {
    CALENDAR: '12/31',
    FEDERAL: '09/30',
    RETAIL: '01/31',
    EDUCATION: '06/30'
  }
};

// Date interval types
export const DATE_INTERVALS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

// Relative date descriptions
export const RELATIVE_DATES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  TOMORROW: 'tomorrow'
};

// Common date regex patterns
export const DATE_PATTERNS = {
  ISO: /^\d{4}-\d{2}-\d{2}$/,              // 2024-01-15
  US_SLASH: /^\d{1,2}\/\d{1,2}\/\d{4}$/,   // 1/15/2024 or 01/15/2024
  US_DASH: /^\d{1,2}-\d{1,2}-\d{4}$/,      // 1-15-2024 or 01-15-2024
  EUROPEAN: /^\d{1,2}\/\d{1,2}\/\d{4}$/    // 15/01/2024 or 15/1/2024
};

// Error messages
export const DATE_ERRORS = {
  INVALID_DATE: 'Invalid date',
  UNSUPPORTED_FORMAT: 'Unsupported date format',
  INVALID_INTERVAL: 'Invalid date interval'
};
