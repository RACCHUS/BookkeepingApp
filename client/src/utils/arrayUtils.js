/**
 * Array utility functions
 * Provides helper functions for working with arrays, especially for batch processing
 */

/**
 * Maximum number of items to include in a single Supabase .in() query
 * PostgreSQL has practical limits, and Supabase URL encoding can hit limits with large arrays
 * 250 is a safe default that works reliably
 */
export const BATCH_SIZE = 250;

/**
 * Split an array into chunks of specified size
 * Used for batching large database operations to avoid query limits
 * 
 * @param {Array} array - The array to chunk
 * @param {number} size - Maximum size of each chunk (default: BATCH_SIZE)
 * @returns {Array<Array>} Array of chunks
 * 
 * @example
 * chunkArray([1,2,3,4,5], 2) // [[1,2], [3,4], [5]]
 * chunkArray([], 2) // []
 * chunkArray([1,2,3], 10) // [[1,2,3]]
 */
export function chunkArray(array, size = BATCH_SIZE) {
  if (!Array.isArray(array)) {
    console.warn('chunkArray: Expected array, got:', typeof array);
    return [];
  }
  
  if (array.length === 0) {
    return [];
  }
  
  if (size <= 0) {
    console.warn('chunkArray: Size must be positive, got:', size);
    return [array];
  }
  
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Execute an async function on chunked data and combine results
 * Useful for batching database queries that have limits
 * 
 * @param {Array} items - Items to process
 * @param {Function} asyncFn - Async function that takes a chunk and returns results
 * @param {number} chunkSize - Size of each chunk (default: BATCH_SIZE)
 * @returns {Promise<Array>} Combined results from all chunks
 * 
 * @example
 * const allResults = await processInChunks(
 *   transactionIds,
 *   async (chunk) => {
 *     const { data } = await supabase.from('transactions').select('*').in('id', chunk);
 *     return data || [];
 *   }
 * );
 */
export async function processInChunks(items, asyncFn, chunkSize = BATCH_SIZE) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  
  const chunks = chunkArray(items, chunkSize);
  const results = [];
  
  for (const chunk of chunks) {
    try {
      const chunkResult = await asyncFn(chunk);
      if (Array.isArray(chunkResult)) {
        results.push(...chunkResult);
      } else if (chunkResult !== null && chunkResult !== undefined) {
        results.push(chunkResult);
      }
    } catch (error) {
      console.error('processInChunks: Error processing chunk:', error);
      throw error; // Re-throw to let caller handle
    }
  }
  
  return results;
}

/**
 * Execute async updates on chunked data
 * Useful for batch update operations where we need to track success/failure
 * 
 * @param {Array} items - Items to update
 * @param {Function} updateFn - Async function that takes a chunk and performs update
 * @param {number} chunkSize - Size of each chunk (default: BATCH_SIZE)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export async function updateInChunks(items, updateFn, chunkSize = BATCH_SIZE) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }
  
  const chunks = chunkArray(items, chunkSize);
  let success = 0;
  let failed = 0;
  const errors = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      await updateFn(chunk);
      success += chunk.length;
    } catch (error) {
      console.error(`updateInChunks: Error in chunk ${i + 1}/${chunks.length}:`, error);
      failed += chunk.length;
      errors.push({
        chunkIndex: i,
        chunkSize: chunk.length,
        error: error.message || String(error),
      });
    }
  }
  
  return { success, failed, errors };
}
