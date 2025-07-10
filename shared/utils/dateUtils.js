/**
 * Date Utilities
 * Shared date formatting and manipulation functions
 */

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const {
    format = 'MM/DD/YYYY',
    locale = 'en-US',
    includeTime = false
  } = options;

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  switch (format) {
    case 'MM/DD/YYYY':
      return dateObj.toLocaleDateString('en-US');
    case 'YYYY-MM-DD':
      return dateObj.toISOString().split('T')[0];
    case 'long':
      return dateObj.toLocaleDateString(locale, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'short':
      return dateObj.toLocaleDateString(locale, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    default:
      return dateObj.toLocaleDateString(locale, formatOptions);
  }
}

/**
 * Parse date from various formats
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  
  // Handle MM/DD format (current year assumed)
  if (/^\d{1,2}\/\d{1,2}$/.test(dateString)) {
    const currentYear = new Date().getFullYear();
    dateString = `${dateString}/${currentYear}`;
  }
  
  // Handle MM/DD/YY format
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateString)) {
    const parts = dateString.split('/');
    const year = parseInt(parts[2]);
    // Assume years 00-29 are 2000-2029, 30-99 are 1930-1999
    const fullYear = year <= 29 ? 2000 + year : 1900 + year;
    dateString = `${parts[0]}/${parts[1]}/${fullYear}`;
  }
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get date range for common periods
 * @param {string} period - Period type ('today', 'week', 'month', 'quarter', 'year', 'ytd')
 * @param {Date} referenceDate - Reference date (defaults to today)
 * @returns {Object} Object with start and end dates
 */
export function getDateRange(period, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return {
        start: new Date(date),
        end: new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1)
      };

    case 'week': {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // End of week (Saturday)
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'month': {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'quarter': {
      const quarter = Math.floor(date.getMonth() / 3);
      const start = new Date(date.getFullYear(), quarter * 3, 1);
      const end = new Date(date.getFullYear(), quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'year': {
      const start = new Date(date.getFullYear(), 0, 1);
      const end = new Date(date.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case 'ytd': {
      const start = new Date(date.getFullYear(), 0, 1);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

/**
 * Calculate difference between dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} unit - Unit to return ('days', 'weeks', 'months', 'years')
 * @returns {number} Difference in specified unit
 */
export function dateDifference(startDate, endDate, unit = 'days') {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();

  switch (unit) {
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    case 'weeks':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    case 'months':
      return end.getMonth() - start.getMonth() + 
             (end.getFullYear() - start.getFullYear()) * 12;
    case 'years':
      return end.getFullYear() - start.getFullYear();
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Check if date is within range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(date, startDate, endDate) {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return checkDate >= start && checkDate <= end;
}

/**
 * Get fiscal year for a given date
 * @param {Date} date - Date to get fiscal year for
 * @param {number} fiscalYearStart - Fiscal year start month (1-12, default 1 for January)
 * @returns {number} Fiscal year
 */
export function getFiscalYear(date, fiscalYearStart = 1) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  
  if (month >= fiscalYearStart) {
    return year;
  } else {
    return year - 1;
  }
}

/**
 * Format duration in human readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Human readable duration
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {Date} date - Date to compare
 * @param {Date} referenceDate - Reference date (defaults to now)
 * @returns {string} Relative time string
 */
export function getRelativeTime(date, referenceDate = new Date()) {
  const diffMs = referenceDate.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (Math.abs(diffSec) < 60) {
    return 'just now';
  } else if (Math.abs(diffMin) < 60) {
    return diffMin > 0 ? `${diffMin} minutes ago` : `in ${-diffMin} minutes`;
  } else if (Math.abs(diffHour) < 24) {
    return diffHour > 0 ? `${diffHour} hours ago` : `in ${-diffHour} hours`;
  } else {
    return diffDay > 0 ? `${diffDay} days ago` : `in ${-diffDay} days`;
  }
}
