/**
 * Comprehensive sorting options for transactions
 * Supports multi-column sorting throughout the application
 * 
 * IMPORTANT: These field names must match the transformed transaction object
 * from supabaseClient.js transformTransaction() function
 */

// All sortable fields based on transaction schema
export const SORT_OPTIONS = [
  {
    value: 'date',
    label: 'Date',
    icon: '📅',
    description: 'Sort by transaction date',
    group: 'primary'
  },
  {
    value: 'amount',
    label: 'Amount',
    icon: '💰',
    description: 'Sort by transaction amount',
    group: 'primary'
  },
  {
    value: 'description',
    label: 'Description',
    icon: '📝',
    description: 'Sort by transaction description (A-Z)',
    group: 'primary'
  },
  {
    value: 'category',
    label: 'Category',
    icon: '🏷️',
    description: 'Sort by transaction category',
    group: 'classification'
  },
  {
    value: 'subcategory',
    label: 'Subcategory',
    icon: '📂',
    description: 'Sort by subcategory',
    group: 'classification'
  },
  {
    value: 'type',
    label: 'Type',
    icon: '🔄',
    description: 'Sort by transaction type (Income/Expense)',
    group: 'classification'
  },
  {
    value: 'payee',
    label: 'Payee',
    icon: '👤',
    description: 'Sort by payee/merchant name',
    group: 'parties'
  },
  {
    value: 'vendorName',
    label: 'Vendor',
    icon: '🏢',
    description: 'Sort by vendor name',
    group: 'parties'
  },
  {
    value: 'companyName',
    label: 'Company',
    icon: '🏛️',
    description: 'Sort by company name (requires join)',
    group: 'organization'
  },
  {
    value: 'paymentMethod',
    label: 'Payment Method',
    icon: '💳',
    description: 'Sort by payment method',
    group: 'payment'
  },
  {
    value: 'checkNumber',
    label: 'Check Number',
    icon: '📑',
    description: 'Sort by check number',
    group: 'payment'
  },
  {
    value: 'referenceNumber',
    label: 'Reference #',
    icon: '🔢',
    description: 'Sort by reference number',
    group: 'payment'
  },
  {
    value: 'source',
    label: 'Source',
    icon: '📥',
    description: 'Sort by transaction source (manual, import, etc.)',
    group: 'metadata'
  },
  {
    value: 'sectionCode',
    label: 'Section',
    icon: '📋',
    description: 'Sort by statement section',
    group: 'metadata'
  },
  {
    value: 'bankName',
    label: 'Bank',
    icon: '🏦',
    description: 'Sort by bank name',
    group: 'metadata'
  },
  {
    value: 'isReconciled',
    label: 'Reconciled',
    icon: '☑️',
    description: 'Sort by reconciliation status',
    group: 'status'
  },
  {
    value: 'isReviewed',
    label: 'Reviewed',
    icon: '👁️',
    description: 'Sort by review status',
    group: 'status'
  },
  {
    value: 'is1099Payment',
    label: '1099 Payment',
    icon: '📋',
    description: 'Sort by 1099 payment status',
    group: 'status'
  },
  {
    value: 'notes',
    label: 'Notes',
    icon: '📝',
    description: 'Sort by notes presence',
    group: 'metadata'
  },
  {
    value: 'createdAt',
    label: 'Created',
    icon: '🕐',
    description: 'Sort by when transaction was added',
    group: 'timestamps'
  },
  {
    value: 'updatedAt',
    label: 'Updated',
    icon: '🔄',
    description: 'Sort by when transaction was last modified',
    group: 'timestamps'
  }
];

// Group labels for organized display
export const SORT_GROUPS = {
  primary: { label: 'Primary Fields', order: 1 },
  classification: { label: 'Classification', order: 2 },
  parties: { label: 'Parties', order: 3 },
  organization: { label: 'Organization', order: 4 },
  payment: { label: 'Payment', order: 5 },
  status: { label: 'Status', order: 6 },
  metadata: { label: 'Metadata', order: 7 },
  timestamps: { label: 'Timestamps', order: 8 }
};

export const SORT_DIRECTIONS = [
  {
    value: 'desc',
    label: 'Descending',
    icon: '⬇️',
    description: 'Newest/Highest first'
  },
  {
    value: 'asc',
    label: 'Ascending', 
    icon: '⬆️',
    description: 'Oldest/Lowest first'
  }
];

// Quick sort presets for common use cases
export const SORT_PRESETS = [
  {
    label: 'Newest First',
    sorts: [{ field: 'date', direction: 'desc' }],
    icon: '📅⬇️'
  },
  {
    label: 'Oldest First',
    sorts: [{ field: 'date', direction: 'asc' }],
    icon: '📅⬆️'
  },
  {
    label: 'Highest Amount',
    sorts: [{ field: 'amount', direction: 'desc' }],
    icon: '💰⬇️'
  },
  {
    label: 'Lowest Amount',
    sorts: [{ field: 'amount', direction: 'asc' }],
    icon: '💰⬆️'
  },
  {
    label: 'A-Z Description',
    sorts: [{ field: 'description', direction: 'asc' }],
    icon: '📝⬆️'
  },
  {
    label: 'By Category',
    sorts: [{ field: 'category', direction: 'asc' }],
    icon: '🏷️⬆️'
  },
  {
    label: 'Category then Date',
    sorts: [
      { field: 'category', direction: 'asc' },
      { field: 'date', direction: 'desc' }
    ],
    icon: '🏷️📅'
  },
  {
    label: 'Company then Date',
    sorts: [
      { field: 'companyName', direction: 'asc' },
      { field: 'date', direction: 'desc' }
    ],
    icon: '🏛️📅'
  },
  {
    label: 'Type then Amount',
    sorts: [
      { field: 'type', direction: 'asc' },
      { field: 'amount', direction: 'desc' }
    ],
    icon: '🔄💰'
  },
  {
    label: 'Payee then Date',
    sorts: [
      { field: 'payee', direction: 'asc' },
      { field: 'date', direction: 'desc' }
    ],
    icon: '👤📅'
  },
  {
    label: 'Tax Year then Category',
    sorts: [
      { field: 'taxYear', direction: 'desc' },
      { field: 'category', direction: 'asc' }
    ],
    icon: '📊🏷️'
  },
  {
    label: 'Unreviewed First',
    sorts: [
      { field: 'isManuallyReviewed', direction: 'asc' },
      { field: 'date', direction: 'desc' }
    ],
    icon: '👁️📅'
  }
];

// Legacy single-sort presets for backward compatibility
export const LEGACY_SORT_PRESETS = SORT_PRESETS.map(preset => ({
  label: preset.label,
  orderBy: preset.sorts[0].field,
  order: preset.sorts[0].direction,
  icon: preset.icon
}));

// Helper functions
export const getSortOptionByValue = (value) => {
  return SORT_OPTIONS.find(option => option.value === value) || SORT_OPTIONS[0];
};

export const getSortDirectionByValue = (value) => {
  return SORT_DIRECTIONS.find(direction => direction.value === value) || SORT_DIRECTIONS[0];
};

/**
 * Get sort options grouped by category
 * @returns {Object} Groups with their sort options
 */
export const getGroupedSortOptions = () => {
  const groups = {};
  
  Object.entries(SORT_GROUPS).forEach(([key, group]) => {
    groups[key] = {
      ...group,
      options: SORT_OPTIONS.filter(opt => opt.group === key)
    };
  });
  
  return Object.entries(groups)
    .sort(([, a], [, b]) => a.order - b.order)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
};

/**
 * Create a default sort configuration
 * @returns {Array} Default sort array with date descending
 */
export const createDefaultSorts = () => [
  { field: 'date', direction: 'desc' }
];

/**
 * Add a new sort level to existing sorts
 * @param {Array} currentSorts - Current sort array
 * @param {string} field - Field to add
 * @param {string} direction - Sort direction
 * @returns {Array} Updated sort array
 */
export const addSortLevel = (currentSorts, field, direction = 'asc') => {
  // Remove if already exists at any level
  const filtered = currentSorts.filter(s => s.field !== field);
  return [...filtered, { field, direction }];
};

/**
 * Remove a sort level
 * @param {Array} currentSorts - Current sort array
 * @param {number} index - Index to remove
 * @returns {Array} Updated sort array
 */
export const removeSortLevel = (currentSorts, index) => {
  return currentSorts.filter((_, i) => i !== index);
};

/**
 * Update a specific sort level
 * @param {Array} currentSorts - Current sort array
 * @param {number} index - Index to update
 * @param {Object} update - Object with field and/or direction
 * @returns {Array} Updated sort array
 */
export const updateSortLevel = (currentSorts, index, update) => {
  return currentSorts.map((sort, i) => 
    i === index ? { ...sort, ...update } : sort
  );
};

/**
 * Move a sort level up or down in priority
 * @param {Array} currentSorts - Current sort array
 * @param {number} index - Index to move
 * @param {string} direction - 'up' or 'down'
 * @returns {Array} Updated sort array
 */
export const moveSortLevel = (currentSorts, index, direction) => {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= currentSorts.length) return currentSorts;
  
  const result = [...currentSorts];
  [result[index], result[newIndex]] = [result[newIndex], result[index]];
  return result;
};

/**
 * Compare two items based on multi-level sort configuration
 * @param {Object} a - First item
 * @param {Object} b - Second item
 * @param {Array} sorts - Array of sort configurations
 * @returns {number} Comparison result
 */
export const multiLevelCompare = (a, b, sorts) => {
  for (const sort of sorts) {
    const { field, direction } = sort;
    const aVal = a[field];
    const bVal = b[field];
    
    let comparison = 0;
    
    // Handle null/undefined
    if (aVal == null && bVal == null) continue;
    if (aVal == null) comparison = 1;
    else if (bVal == null) comparison = -1;
    // Handle dates
    else if (field === 'date' || field === 'createdAt' || field === 'updatedAt') {
      const aDate = new Date(aVal);
      const bDate = new Date(bVal);
      comparison = aDate.getTime() - bDate.getTime();
    }
    // Handle numbers
    else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    }
    // Handle booleans
    else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      comparison = (aVal === bVal) ? 0 : aVal ? -1 : 1;
    }
    // Handle strings
    else {
      comparison = String(aVal).localeCompare(String(bVal), undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
    }
    
    if (comparison !== 0) {
      return direction === 'desc' ? -comparison : comparison;
    }
  }
  
  return 0;
};

/**
 * Sort an array using multi-level sort configuration
 * @param {Array} items - Items to sort
 * @param {Array} sorts - Array of sort configurations
 * @returns {Array} Sorted items
 */
export const multiLevelSort = (items, sorts) => {
  if (!sorts || sorts.length === 0) return items;
  return [...items].sort((a, b) => multiLevelCompare(a, b, sorts));
};

/**
 * Convert legacy single-sort format to multi-sort format
 * @param {string} orderBy - Field to sort by
 * @param {string} order - Sort direction
 * @returns {Array} Multi-sort format array
 */
export const legacyToMultiSort = (orderBy, order) => {
  return [{ field: orderBy, direction: order }];
};

/**
 * Convert multi-sort format to legacy single-sort format
 * (uses first sort level only)
 * @param {Array} sorts - Multi-sort array
 * @returns {Object} Legacy format { orderBy, order }
 */
export const multiSortToLegacy = (sorts) => {
  if (!sorts || sorts.length === 0) {
    return { orderBy: 'date', order: 'desc' };
  }
  return { orderBy: sorts[0].field, order: sorts[0].direction };
};
