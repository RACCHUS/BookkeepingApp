/**
 * Utility functions for handling common errors gracefully
 */

/**
 * Check if an error is related to missing Firestore indexes
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's an index-related error
 */
export const isFirestoreIndexError = (error) => {
  return (
    error &&
    (error.code === 9 || // FAILED_PRECONDITION error code
     error.message?.includes('index') ||
     error.message?.includes('composite index') ||
     error.message?.includes('query requires an index'))
  );
};

/**
 * Get a user-friendly error message for index errors
 * @param {Error} error - The original error
 * @returns {string} User-friendly error message
 */
export const getIndexErrorMessage = (error) => {
  if (isFirestoreIndexError(error)) {
    return 'Database index configuration needed. The system is using a simplified query as a fallback. For optimal performance, please create the required database indexes.';
  }
  return error.message || 'An unexpected error occurred';
};

/**
 * Extract the index creation URL from Firestore error messages
 * @param {Error} error - The Firestore error
 * @returns {string|null} The index creation URL or null
 */
export const extractIndexCreationUrl = (error) => {
  if (!error || !error.message) return null;
  
  const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
};

/**
 * Log index errors with helpful information for developers
 * @param {Error} error - The error to log
 * @param {string} operation - Description of the operation that failed
 */
export const logIndexError = (error, operation = 'database operation') => {
  if (isFirestoreIndexError(error)) {
    console.warn('🔍 Firestore Index Required:', {
      operation,
      error: error.message,
      indexUrl: extractIndexCreationUrl(error),
      recommendation: 'Using fallback query. Create the index for optimal performance.'
    });
  } else {
    console.error(`Error in ${operation}:`, error);
  }
};

/**
 * Wrapper for async functions that might need index fallback
 * @param {Function} primaryFn - Primary function to try
 * @param {Function} fallbackFn - Fallback function if primary fails due to index
 * @param {string} operation - Description for logging
 * @returns {Promise} Result from primary or fallback function
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
    throw error;
  }
};
