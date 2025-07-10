/**
 * Validation Utilities
 * Shared validation functions and helpers
 */

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number validation regex (US format)
 */
const PHONE_REGEX = /^[\+]?[1]?[\s\-\.]?[\(]?[0-9]{3}[\)]?[\s\-\.]?[0-9]{3}[\s\-\.]?[0-9]{4}$/;

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') {
    return false;
  }
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {boolean} True if value is not empty
 */
export function isRequired(value) {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return true;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} True if length is within range
 */
export function isValidLength(value, min = 0, max = Infinity) {
  if (typeof value !== 'string') {
    return false;
  }
  
  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * Validate numeric value
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid number
 */
export function isValidNumber(value, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    allowNegative = true,
    allowZero = true,
    allowDecimal = true
  } = options;

  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof num !== 'number' || isNaN(num)) {
    return false;
  }
  
  if (!allowNegative && num < 0) {
    return false;
  }
  
  if (!allowZero && num === 0) {
    return false;
  }
  
  if (!allowDecimal && num % 1 !== 0) {
    return false;
  }
  
  return num >= min && num <= max;
}

/**
 * Validate currency amount
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid currency amount
 */
export function isValidCurrency(value, options = {}) {
  const {
    allowNegative = true,
    allowZero = true,
    maxDecimalPlaces = 2
  } = options;

  if (!isValidNumber(value, { allowNegative, allowZero })) {
    return false;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check decimal places
  const decimalPlaces = (num.toString().split('.')[1] || '').length;
  return decimalPlaces <= maxDecimalPlaces;
}

/**
 * Validate date
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid date
 */
export function isValidDate(value, options = {}) {
  const {
    allowFuture = true,
    allowPast = true,
    minDate,
    maxDate
  } = options;

  let date;
  
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else {
    return false;
  }
  
  if (isNaN(date.getTime())) {
    return false;
  }
  
  const now = new Date();
  
  if (!allowFuture && date > now) {
    return false;
  }
  
  if (!allowPast && date < now) {
    return false;
  }
  
  if (minDate && date < new Date(minDate)) {
    return false;
  }
  
  if (maxDate && date > new Date(maxDate)) {
    return false;
  }
  
  return true;
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, options = {}) {
  const {
    maxLength = 1000,
    allowHTML = false,
    trimWhitespace = true
  } = options;

  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;
  
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }
  
  if (!allowHTML) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate object against schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result with errors
 */
export function validateObject(obj, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = obj?.[field];
    const fieldErrors = [];

    // Required validation
    if (rules.required && !isRequired(value)) {
      fieldErrors.push(`${field} is required`);
    }

    // Skip other validations if field is empty and not required
    if (!isRequired(value) && !rules.required) {
      continue;
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            fieldErrors.push(`${field} must be a string`);
          }
          break;
        case 'number':
          if (!isValidNumber(value)) {
            fieldErrors.push(`${field} must be a number`);
          }
          break;
        case 'email':
          if (!isValidEmail(value)) {
            fieldErrors.push(`${field} must be a valid email`);
          }
          break;
        case 'phone':
          if (!isValidPhone(value)) {
            fieldErrors.push(`${field} must be a valid phone number`);
          }
          break;
        case 'date':
          if (!isValidDate(value)) {
            fieldErrors.push(`${field} must be a valid date`);
          }
          break;
        case 'currency':
          if (!isValidCurrency(value)) {
            fieldErrors.push(`${field} must be a valid currency amount`);
          }
          break;
      }
    }

    // Length validation
    if (rules.minLength || rules.maxLength) {
      if (!isValidLength(value, rules.minLength, rules.maxLength)) {
        fieldErrors.push(
          `${field} must be between ${rules.minLength || 0} and ${rules.maxLength || 'unlimited'} characters`
        );
      }
    }

    // Numeric range validation
    if (rules.min !== undefined || rules.max !== undefined) {
      if (!isValidNumber(value, { min: rules.min, max: rules.max })) {
        fieldErrors.push(
          `${field} must be between ${rules.min || '-∞'} and ${rules.max || '∞'}`
        );
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      fieldErrors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }

    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customResult = rules.validate(value, obj);
      if (customResult !== true && typeof customResult === 'string') {
        fieldErrors.push(customResult);
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  }

  return {
    isValid,
    errors
  };
}

/**
 * Create validation error message
 * @param {Object} errors - Validation errors
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(errors) {
  const messages = [];
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    if (Array.isArray(fieldErrors)) {
      messages.push(...fieldErrors);
    } else {
      messages.push(`${field}: ${fieldErrors}`);
    }
  }
  
  return messages.join('; ');
}

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  const errors = [];

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  // Size validation
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Type validation
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
  }

  // Extension validation
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension must be one of: ${allowedExtensions.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
