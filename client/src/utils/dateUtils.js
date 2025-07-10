/**
 * Date utilities for consistent date range calculations across the application
 * Uses UTC methods to avoid timezone-related issues
 */

/**
 * Get the start and end dates for a full year
 * @param {number} year - The year (e.g., 2023)
 * @returns {object} Object with start and end date strings in YYYY-MM-DD format
 */
export const getYearDateRange = (year) => {
  // Use UTC to avoid timezone issues
  const start = new Date(Date.UTC(year, 0, 1)).toISOString().split('T')[0];
  const end = new Date(Date.UTC(year, 11, 31)).toISOString().split('T')[0];
  
  return { start, end };
};

/**
 * Get the start and end dates for a specific month
 * @param {number} year - The year (e.g., 2023)
 * @param {number} month - The month (0-11, where 0 = January)
 * @returns {object} Object with start and end date strings in YYYY-MM-DD format
 */
export const getMonthDateRange = (year, month) => {
  // Use UTC to avoid timezone issues
  const start = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0]; // Last day of month
  
  return { start, end };
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date string
 */
export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Format a date string for display
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export const formatDateForDisplay = (dateString) => {
  return new Date(dateString + 'T00:00:00').toLocaleDateString();
};

/**
 * Format a date for display (alias for formatDateForDisplay)
 * @param {string|Date|Object} date - Date string, Date object, or Firestore Timestamp
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  try {
    // Handle Firestore Timestamp objects
    if (date && typeof date === 'object' && date.seconds) {
      const jsDate = new Date(date.seconds * 1000);
      return jsDate.toLocaleDateString();
    }
    
    // Handle different date formats
    if (typeof date === 'string') {
      // If it's an ISO string with time (e.g., "2024-01-29T12:00:00")
      if (date.includes('T')) {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString();
        }
      }
      
      // If it's already in YYYY-MM-DD format
      if (date.includes('-') && !date.includes('T')) {
        return formatDateForDisplay(date);
      }
      
      // If it's in MM/DD format (common in PDF parsing)
      if (date.includes('/') && date.length <= 5) {
        const currentYear = new Date().getFullYear();
        const [month, day] = date.split('/');
        const fullDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return formatDateForDisplay(fullDate);
      }
      
      // Try to parse as date string
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString();
      }
    }
    
    // If it's a Date object
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    
    // Try to parse as date
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString();
    }
    
  } catch (error) {
    console.warn('Error formatting date:', date, error);
  }
  
  return String(date);
};

/**
 * Validate that a date range has the correct format and order
 * @param {object} dateRange - Object with start and end properties
 * @returns {boolean} True if valid, false otherwise
 */
export const validateDateRange = (dateRange) => {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    return false;
  }
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  return startDate <= endDate;
};

/**
 * Check if a date range represents a full year
 * @param {object} dateRange - Object with start and end properties
 * @returns {boolean} True if it's a full year range
 */
export const isFullYearRange = (dateRange) => {
  if (!validateDateRange(dateRange)) {
    return false;
  }
  
  // Parse dates from strings (YYYY-MM-DD format)
  const startDate = new Date(dateRange.start + 'T00:00:00');
  const endDate = new Date(dateRange.end + 'T00:00:00');
  
  // Check if start is January 1st and end is December 31st of the same year
  const isJan1 = startDate.getMonth() === 0 && startDate.getDate() === 1;
  const isDec31 = endDate.getMonth() === 11 && endDate.getDate() === 31;
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  
  return isJan1 && isDec31 && sameYear;
};

/**
 * Get the year from a date range if it represents a full year
 * @param {object} dateRange - Object with start and end properties
 * @returns {number|null} Year number if it's a full year range, null otherwise
 */
export const getYearFromRange = (dateRange) => {
  if (!isFullYearRange(dateRange)) {
    return null;
  }
  
  return new Date(dateRange.start + 'T00:00:00').getFullYear();
};
