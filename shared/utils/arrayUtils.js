/**
 * Array Manipulation Utilities
 * Shared array utility functions
 */

/**
 * Remove duplicates from array
 * @param {Array} array - Array to deduplicate
 * @param {string|Function} key - Key to compare or comparison function
 * @returns {Array} Array without duplicates
 */
export function removeDuplicates(array, key) {
  if (!Array.isArray(array)) {
    return [];
  }

  if (!key) {
    return [...new Set(array)];
  }

  if (typeof key === 'string') {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = item[key];
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }

  if (typeof key === 'function') {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = key(item);
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }

  return array;
}

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key to group by or grouping function
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  if (!Array.isArray(array)) {
    return {};
  }

  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    const group = groups[groupKey] || [];
    group.push(item);
    groups[groupKey] = group;
    return groups;
  }, {});
}

/**
 * Sort array by multiple keys
 * @param {Array} array - Array to sort
 * @param {Array} sortKeys - Array of sort configurations
 * @returns {Array} Sorted array
 */
export function sortBy(array, sortKeys) {
  if (!Array.isArray(array) || !Array.isArray(sortKeys)) {
    return array;
  }

  return [...array].sort((a, b) => {
    for (const sortKey of sortKeys) {
      const { key, direction = 'asc', type = 'string' } = 
        typeof sortKey === 'string' 
          ? { key: sortKey, direction: 'asc', type: 'string' }
          : sortKey;

      let aValue = typeof key === 'function' ? key(a) : a[key];
      let bValue = typeof key === 'function' ? key(b) : b[key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) continue;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Type-specific comparison
      if (type === 'number') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (type === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Size of each chunk
 * @returns {Array} Array of chunks
 */
export function chunk(array, size) {
  if (!Array.isArray(array) || size <= 0) {
    return [];
  }

  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Find items in array by partial match
 * @param {Array} array - Array to search
 * @param {string} searchTerm - Term to search for
 * @param {Array|string} searchKeys - Keys to search in
 * @returns {Array} Matching items
 */
export function search(array, searchTerm, searchKeys) {
  if (!Array.isArray(array) || typeof searchTerm !== 'string') {
    return [];
  }

  const term = searchTerm.toLowerCase().trim();
  if (!term) {
    return array;
  }

  const keys = Array.isArray(searchKeys) ? searchKeys : [searchKeys];

  return array.filter(item => {
    return keys.some(key => {
      const value = typeof key === 'function' ? key(item) : item[key];
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Paginate array
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Items per page
 * @returns {Object} Pagination result
 */
export function paginate(array, page = 1, pageSize = 10) {
  if (!Array.isArray(array)) {
    return {
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      hasNext: false,
      hasPrev: false
    };
  }

  const totalItems = array.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = array.slice(startIndex, endIndex);

  return {
    data,
    totalItems,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, totalItems)
  };
}

/**
 * Get unique values from array of objects by key
 * @param {Array} array - Array of objects
 * @param {string} key - Key to get unique values for
 * @returns {Array} Unique values
 */
export function getUniqueValues(array, key) {
  if (!Array.isArray(array)) {
    return [];
  }

  const values = array.map(item => item[key]).filter(value => value != null);
  return [...new Set(values)];
}

/**
 * Move item in array
 * @param {Array} array - Array to modify
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Destination index
 * @returns {Array} New array with moved item
 */
export function moveItem(array, fromIndex, toIndex) {
  if (!Array.isArray(array)) {
    return [];
  }

  const newArray = [...array];
  const item = newArray.splice(fromIndex, 1)[0];
  newArray.splice(toIndex, 0, item);
  return newArray;
}

/**
 * Calculate sum of numeric values in array
 * @param {Array} array - Array of objects
 * @param {string|Function} key - Key to sum or function to get value
 * @returns {number} Sum of values
 */
export function sum(array, key) {
  if (!Array.isArray(array)) {
    return 0;
  }

  return array.reduce((total, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    const numValue = Number(value);
    return total + (isNaN(numValue) ? 0 : numValue);
  }, 0);
}

/**
 * Calculate average of numeric values in array
 * @param {Array} array - Array of objects
 * @param {string|Function} key - Key to average or function to get value
 * @returns {number} Average value
 */
export function average(array, key) {
  if (!Array.isArray(array) || array.length === 0) {
    return 0;
  }

  const total = sum(array, key);
  return total / array.length;
}

/**
 * Find min value in array
 * @param {Array} array - Array of objects
 * @param {string|Function} key - Key to compare or function to get value
 * @returns {*} Item with minimum value
 */
export function findMin(array, key) {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  return array.reduce((min, item) => {
    const minValue = typeof key === 'function' ? key(min) : min[key];
    const itemValue = typeof key === 'function' ? key(item) : item[key];
    return itemValue < minValue ? item : min;
  });
}

/**
 * Find max value in array
 * @param {Array} array - Array of objects
 * @param {string|Function} key - Key to compare or function to get value
 * @returns {*} Item with maximum value
 */
export function findMax(array, key) {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }

  return array.reduce((max, item) => {
    const maxValue = typeof key === 'function' ? key(max) : max[key];
    const itemValue = typeof key === 'function' ? key(item) : item[key];
    return itemValue > maxValue ? item : max;
  });
}

/**
 * Check if arrays are equal
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @param {Function} compareFn - Optional comparison function
 * @returns {boolean} True if arrays are equal
 */
export function areArraysEqual(array1, array2, compareFn) {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return false;
  }

  if (array1.length !== array2.length) {
    return false;
  }

  for (let i = 0; i < array1.length; i++) {
    const isEqual = compareFn 
      ? compareFn(array1[i], array2[i])
      : array1[i] === array2[i];
    
    if (!isEqual) {
      return false;
    }
  }

  return true;
}

/**
 * Flatten nested array
 * @param {Array} array - Array to flatten
 * @param {number} depth - Depth to flatten (default: 1)
 * @returns {Array} Flattened array
 */
export function flatten(array, depth = 1) {
  if (!Array.isArray(array)) {
    return [];
  }

  return depth > 0 
    ? array.reduce((acc, val) => 
        acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val), [])
    : array.slice();
}

/**
 * Get random item(s) from array
 * @param {Array} array - Array to pick from
 * @param {number} count - Number of items to pick
 * @returns {*|Array} Random item or array of items
 */
export function getRandomItems(array, count = 1) {
  if (!Array.isArray(array) || array.length === 0) {
    return count === 1 ? null : [];
  }

  if (count === 1) {
    return array[Math.floor(Math.random() * array.length)];
  }

  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Shuffle array
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffle(array) {
  if (!Array.isArray(array)) {
    return [];
  }

  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
