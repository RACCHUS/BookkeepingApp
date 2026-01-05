/**
 * Server-Side In-Memory Cache
 * Simple TTL-based cache to reduce Firestore reads and prevent quota exhaustion
 */

// Cache storage
const cache = new Map();

// Default TTL: 5 minutes (in milliseconds)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Get a cached value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if expired/not found
 */
export const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
};

/**
 * Set a cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
export const set = (key, value, ttl = DEFAULT_TTL) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
};

/**
 * Delete a cached value
 * @param {string} key - Cache key
 */
export const del = (key) => {
  cache.delete(key);
};

/**
 * Delete all cached values matching a prefix
 * @param {string} prefix - Key prefix to match
 */
export const delByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

/**
 * Clear all cached values for a specific user
 * @param {string} userId - User ID
 */
export const clearUserCache = (userId) => {
  delByPrefix(`user:${userId}:`);
};

/**
 * Clear entire cache
 */
export const clearAll = () => {
  cache.clear();
};

/**
 * Get cache stats
 * @returns {object} Cache statistics
 */
export const getStats = () => {
  let validEntries = 0;
  let expiredEntries = 0;
  const now = Date.now();
  
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }
  
  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries
  };
};

/**
 * Helper to generate cache key
 * @param {string} userId - User ID
 * @param {string} type - Data type (e.g., 'incomeSources', 'companies')
 * @param {object} params - Additional parameters
 * @returns {string} Cache key
 */
export const makeKey = (userId, type, params = {}) => {
  const paramStr = Object.keys(params).length > 0 
    ? ':' + JSON.stringify(params)
    : '';
  return `user:${userId}:${type}${paramStr}`;
};

export default {
  get,
  set,
  del,
  delByPrefix,
  clearUserCache,
  clearAll,
  getStats,
  makeKey
};
