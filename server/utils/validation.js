/**
 * Data Validation Utilities
 * 
 * Centralized validation functions for common data types and business logic.
 * These utilities complement express-validator with application-specific
 * validation rules and data formatting.
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

/**
 * Validate and format monetary amounts
 * @param {any} amount - Amount to validate
 * @returns {object} Validation result with isValid, value, and error
 */
export function validateAmount(amount) {
  if (amount === null || amount === undefined) {
    return { isValid: false, error: 'Amount is required' };
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (!isFinite(numAmount)) {
    return { isValid: false, error: 'Amount must be a finite number' };
  }

  // Round to 2 decimal places for monetary values
  const roundedAmount = Math.round(numAmount * 100) / 100;
  
  return { 
    isValid: true, 
    value: roundedAmount,
    formatted: roundedAmount.toFixed(2)
  };
}

/**
 * Validate ISO date strings
 * @param {string} dateString - Date string to validate
 * @returns {object} Validation result
 */
export function validateDate(dateString) {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' };
  }

  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  // Check if date is reasonable (not too far in past or future)
  const now = new Date();
  const minDate = new Date(1900, 0, 1);
  const maxDate = new Date(now.getFullYear() + 10, 11, 31);

  if (date < minDate || date > maxDate) {
    return { 
      isValid: false, 
      error: `Date must be between ${minDate.getFullYear()} and ${maxDate.getFullYear()}` 
    };
  }

  return { 
    isValid: true, 
    value: date,
    isoString: date.toISOString()
  };
}

/**
 * Validate EIN (Employer Identification Number)
 * @param {string} ein - EIN to validate
 * @returns {object} Validation result
 */
export function validateEIN(ein) {
  if (!ein) {
    return { isValid: false, error: 'EIN is required' };
  }

  // Remove any formatting
  const cleanEIN = ein.replace(/[^0-9]/g, '');
  
  if (cleanEIN.length !== 9) {
    return { isValid: false, error: 'EIN must be 9 digits' };
  }

  // Format as XX-XXXXXXX
  const formattedEIN = `${cleanEIN.slice(0, 2)}-${cleanEIN.slice(2)}`;
  
  return { 
    isValid: true, 
    value: formattedEIN,
    digits: cleanEIN
  };
}

/**
 * Validate email addresses
 * @param {string} email - Email to validate
 * @returns {object} Validation result
 */
export function validateEmail(email) {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { 
    isValid: true, 
    value: email.toLowerCase().trim()
  };
}

/**
 * Validate phone numbers
 * @param {string} phone - Phone number to validate
 * @returns {object} Validation result
 */
export function validatePhone(phone) {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10) {
    return { isValid: false, error: 'Phone number must have at least 10 digits' };
  }

  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits' };
  }

  // Format US phone numbers (10 digits)
  if (digits.length === 10) {
    const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return { 
      isValid: true, 
      value: formatted,
      digits: digits
    };
  }

  // For international numbers, just return with minimal formatting
  return { 
    isValid: true, 
    value: `+${digits}`,
    digits: digits
  };
}

/**
 * Validate transaction categories
 * @param {string} category - Category to validate
 * @returns {object} Validation result
 */
export function validateCategory(category) {
  if (!category || typeof category !== 'string') {
    return { isValid: false, error: 'Category is required' };
  }

  const trimmedCategory = category.trim();
  
  if (trimmedCategory.length === 0) {
    return { isValid: false, error: 'Category cannot be empty' };
  }

  if (trimmedCategory.length > 100) {
    return { isValid: false, error: 'Category cannot exceed 100 characters' };
  }

  return { 
    isValid: true, 
    value: trimmedCategory
  };
}

/**
 * Validate transaction descriptions
 * @param {string} description - Description to validate
 * @returns {object} Validation result
 */
export function validateDescription(description) {
  if (!description || typeof description !== 'string') {
    return { isValid: false, error: 'Description is required' };
  }

  const trimmedDescription = description.trim();
  
  if (trimmedDescription.length === 0) {
    return { isValid: false, error: 'Description cannot be empty' };
  }

  if (trimmedDescription.length > 500) {
    return { isValid: false, error: 'Description cannot exceed 500 characters' };
  }

  return { 
    isValid: true, 
    value: trimmedDescription
  };
}

/**
 * Validate pagination parameters
 * @param {object} params - Pagination parameters {limit, offset}
 * @returns {object} Validation result
 */
export function validatePagination(params = {}) {
  const { limit = 50, offset = 0 } = params;
  
  const numLimit = parseInt(limit, 10);
  const numOffset = parseInt(offset, 10);
  
  if (isNaN(numLimit) || numLimit < 1 || numLimit > 1000) {
    return { isValid: false, error: 'Limit must be between 1 and 1000' };
  }
  
  if (isNaN(numOffset) || numOffset < 0) {
    return { isValid: false, error: 'Offset must be 0 or greater' };
  }
  
  return {
    isValid: true,
    value: { limit: numLimit, offset: numOffset }
  };
}

/**
 * Validate date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {object} Validation result
 */
export function validateDateRange(startDate, endDate) {
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return { isValid: false, error: `Start date: ${startValidation.error}` };
  }
  
  const endValidation = validateDate(endDate);
  if (!endValidation.isValid) {
    return { isValid: false, error: `End date: ${endValidation.error}` };
  }
  
  if (startValidation.value > endValidation.value) {
    return { isValid: false, error: 'Start date must be before end date' };
  }
  
  // Check if date range is reasonable (not more than 10 years)
  const daysDifference = (endValidation.value - startValidation.value) / (1000 * 60 * 60 * 24);
  if (daysDifference > 3650) { // 10 years
    return { isValid: false, error: 'Date range cannot exceed 10 years' };
  }
  
  return {
    isValid: true,
    value: {
      startDate: startValidation.value,
      endDate: endValidation.value,
      daysDifference: Math.ceil(daysDifference)
    }
  };
}

/**
 * Sanitize string input
 * @param {string} input - Input string to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }
  
  const {
    trim = true,
    removeHTML = true,
    removeSpecialChars = false,
    maxLength = null
  } = options;
  
  let sanitized = input;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  if (removeHTML) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  if (removeSpecialChars) {
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
  }
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate object ID (Firestore document ID)
 * @param {string} id - ID to validate
 * @returns {object} Validation result
 */
export function validateObjectId(id) {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID is required' };
  }
  
  const trimmedId = id.trim();
  
  if (trimmedId.length === 0) {
    return { isValid: false, error: 'ID cannot be empty' };
  }
  
  // Firestore document IDs can be up to 1500 bytes
  if (trimmedId.length > 1500) {
    return { isValid: false, error: 'ID too long' };
  }
  
  // Check for invalid characters in Firestore IDs
  if (/[\/\x00-\x1f\x7f]/.test(trimmedId)) {
    return { isValid: false, error: 'ID contains invalid characters' };
  }
  
  return {
    isValid: true,
    value: trimmedId
  };
}
