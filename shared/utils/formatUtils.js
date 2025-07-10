/**
 * String and Data Formatting Utilities
 * Shared formatting functions for consistent display
 */

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export function titleCase(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert camelCase to readable string
 * @param {string} str - CamelCase string
 * @returns {string} Readable string
 */
export function camelToReadable(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Convert string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 */
export function toKebabCase(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 * @param {string} str - String to convert
 * @returns {string} Snake_case string
 */
export function toSnakeCase(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength, suffix = '...') {
  if (typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Pluralize a word based on count
 * @param {string} word - Word to pluralize
 * @param {number} count - Count to check
 * @param {string} plural - Custom plural form (optional)
 * @returns {string} Singular or plural form
 */
export function pluralize(word, count, plural) {
  if (count === 1) {
    return word;
  }
  
  if (plural) {
    return plural;
  }
  
  // Simple pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  } else if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch')) {
    return word + 'es';
  } else {
    return word + 's';
  }
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @param {string} format - Format type ('us', 'international')
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone, format = 'us') {
  if (typeof phone !== 'string') {
    return '';
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (format === 'us' && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (format === 'us' && digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return original if can't format
  return phone;
}

/**
 * Mask sensitive information
 * @param {string} str - String to mask
 * @param {Object} options - Masking options
 * @returns {string} Masked string
 */
export function maskString(str, options = {}) {
  const {
    maskChar = '*',
    showFirst = 2,
    showLast = 2,
    minLength = 4
  } = options;
  
  if (typeof str !== 'string' || str.length < minLength) {
    return str;
  }
  
  const first = str.slice(0, showFirst);
  const last = str.slice(-showLast);
  const middle = maskChar.repeat(str.length - showFirst - showLast);
  
  return first + middle + last;
}

/**
 * Format credit card number
 * @param {string} cardNumber - Card number to format
 * @returns {string} Formatted card number
 */
export function formatCreditCard(cardNumber) {
  if (typeof cardNumber !== 'string') {
    return '';
  }
  
  const digits = cardNumber.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  
  return groups.join(' ').trim();
}

/**
 * Extract initials from name
 * @param {string} name - Full name
 * @param {number} maxInitials - Maximum number of initials
 * @returns {string} Initials
 */
export function getInitials(name, maxInitials = 2) {
  if (typeof name !== 'string') {
    return '';
  }
  
  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  return initials;
}

/**
 * Generate a slug from string
 * @param {string} str - String to convert to slug
 * @returns {string} URL-friendly slug
 */
export function slugify(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Highlight search terms in text
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Term to highlight
 * @param {string} highlightClass - CSS class for highlighting
 * @returns {string} Text with highlighted terms
 */
export function highlightText(text, searchTerm, highlightClass = 'highlight') {
  if (typeof text !== 'string' || typeof searchTerm !== 'string' || !searchTerm.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<span class="${highlightClass}">$1</span>`);
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @param {string} chars - Characters to use
 * @returns {string} Random string
 */
export function generateRandomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Clean and normalize text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function cleanText(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .replace(/\t+/g, ' '); // Replace tabs with spaces
}

/**
 * Check if string is empty or only whitespace
 * @param {string} str - String to check
 * @returns {boolean} True if empty
 */
export function isEmpty(str) {
  return typeof str !== 'string' || str.trim().length === 0;
}

/**
 * Compare strings ignoring case and whitespace
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} True if strings are equal
 */
export function isEqualIgnoreCase(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    return false;
  }
  
  return str1.trim().toLowerCase() === str2.trim().toLowerCase();
}
