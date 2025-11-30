/**
 * Error Handler Utilities
 * 
 * Provides utilities for handling common error scenarios gracefully,
 * especially Firestore index-related errors with automatic fallbacks.
 * 
 * @module utils/errorHandler
 * @author BookkeepingApp Team
 * @version 2.0.0
 */

/**
 * Firestore error codes
 * @see https://firebase.google.com/docs/firestore/errors
 */
const FIRESTORE_ERROR_CODES = {
  FAILED_PRECONDITION: 9,
  RESOURCE_EXHAUSTED: 8,
  UNAUTHENTICATED: 16,
  PERMISSION_DENIED: 7,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6
};

/**
 * Error keywords for index detection
 */
const INDEX_ERROR_KEYWORDS = [
  'index',
  'composite index',
  'query requires an index',
  'index not found'
];

/**
 * Default error messages
 */
const ERROR_MESSAGES = {
  INDEX_MISSING: 'Database index configuration needed. The system is using a simplified query as a fallback. For optimal performance, please create the required database indexes.',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  FALLBACK_QUERY: 'Using fallback query. Create the index for optimal performance.'
};

/**
 * Check if an error is related to missing Firestore indexes
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's an index-related error
 * @example
 * if (isFirestoreIndexError(error)) {
 *   // Use fallback query
 * }
 */
export const isFirestoreIndexError = (error) => {
  if (!error) return false;
  
  // Check for specific error code
  if (error.code === FIRESTORE_ERROR_CODES.FAILED_PRECONDITION) {
    return true;
  }
  
  // Check for index-related keywords in error message
  const errorMessage = error.message?.toLowerCase() || '';
  return INDEX_ERROR_KEYWORDS.some(keyword => 
    errorMessage.includes(keyword.toLowerCase())
  );
};

/**
 * Get a user-friendly error message for index errors
 * @param {Error} error - The original error
 * @returns {string} User-friendly error message
 * @example
 * const message = getIndexErrorMessage(error);
 * res.status(500).json({ error: message });
 */
export const getIndexErrorMessage = (error) => {
  if (isFirestoreIndexError(error)) {
    return ERROR_MESSAGES.INDEX_MISSING;
  }
  return error?.message || ERROR_MESSAGES.UNEXPECTED_ERROR;
};

/**
 * Extract the index creation URL from Firestore error messages
 * @param {Error} error - The Firestore error
 * @returns {string|null} The index creation URL or null if not found
 * @example
 * const url = extractIndexCreationUrl(error);
 * if (url) console.log('Create index:', url);
 */
export const extractIndexCreationUrl = (error) => {
  if (!error?.message) return null;
  
  const urlPattern = /https:\/\/console\.firebase\.google\.com[^\s]+/;
  const urlMatch = error.message.match(urlPattern);
  return urlMatch ? urlMatch[0] : null;
};

/**
 * Log index errors with helpful information for developers
 * @param {Error} error - The error to log
 * @param {string} operation - Description of the operation that failed
 * @example
 * logIndexError(error, 'fetching transactions');
 */
export const logIndexError = (error, operation = 'database operation') => {
  if (isFirestoreIndexError(error)) {
    console.warn('🔍 Firestore Index Required:', {
      operation,
      error: error.message,
      indexUrl: extractIndexCreationUrl(error),
      recommendation: ERROR_MESSAGES.FALLBACK_QUERY
    });
  } else {
    console.error(`Error in ${operation}:`, error);
  }
};

/**
 * Wrapper for async functions that might need index fallback
 * Automatically catches index errors and executes fallback function
 * @param {Function} primaryFn - Primary function to try (should return Promise)
 * @param {Function} fallbackFn - Fallback function if primary fails due to index (should return Promise)
 * @param {string} operation - Description for logging purposes
 * @returns {Promise<any>} Result from primary or fallback function
 * @throws {Error} Re-throws if error is not index-related
 * @example
 * const result = await withIndexFallback(
 *   () => db.collection('users').where('age', '>', 18).get(),
 *   () => db.collection('users').get(),  // Simpler fallback query
 *   'fetching adult users'
 * );
 */
export const withIndexFallback = async (primaryFn, fallbackFn, operation = 'query') => {
  try {
    return await primaryFn();
  } catch (error) {
    if (isFirestoreIndexError(error)) {
      logIndexError(error, operation);
      console.log(`🔄 Falling back to alternative ${operation}...`);
      return await fallbackFn();
    }
    // Re-throw non-index errors
    throw error;
  }
};
