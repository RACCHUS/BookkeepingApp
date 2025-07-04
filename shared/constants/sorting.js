/**
 * Sorting options for transactions
 */

export const SORT_OPTIONS = [
  {
    value: 'date',
    label: 'Date',
    icon: '📅',
    description: 'Sort by transaction date'
  },
  {
    value: 'amount',
    label: 'Amount',
    icon: '💰',
    description: 'Sort by transaction amount'
  },
  {
    value: 'description',
    label: 'Description',
    icon: '📝',
    description: 'Sort by transaction description (A-Z)'
  },
  {
    value: 'category',
    label: 'Category',
    icon: '🏷️',
    description: 'Sort by transaction category'
  },
  {
    value: 'type',
    label: 'Type',
    icon: '🔄',
    description: 'Sort by transaction type (Income/Expense)'
  },
  {
    value: 'payee',
    label: 'Payee',
    icon: '👤',
    description: 'Sort by payee/merchant name'
  },
  {
    value: 'sectionCode',
    label: 'Section',
    icon: '📋',
    description: 'Sort by statement section'
  },
  {
    value: 'createdAt',
    label: 'Created',
    icon: '🕐',
    description: 'Sort by when transaction was added'
  }
];

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
    orderBy: 'date',
    order: 'desc',
    icon: '📅⬇️'
  },
  {
    label: 'Oldest First',
    orderBy: 'date',
    order: 'asc',
    icon: '📅⬆️'
  },
  {
    label: 'Highest Amount',
    orderBy: 'amount',
    order: 'desc',
    icon: '💰⬇️'
  },
  {
    label: 'Lowest Amount',
    orderBy: 'amount',
    order: 'asc',
    icon: '💰⬆️'
  },
  {
    label: 'A-Z Description',
    orderBy: 'description',
    order: 'asc',
    icon: '📝⬆️'
  },
  {
    label: 'By Category',
    orderBy: 'category',
    order: 'asc',
    icon: '🏷️⬆️'
  }
];

export const getSortOptionByValue = (value) => {
  return SORT_OPTIONS.find(option => option.value === value) || SORT_OPTIONS[0];
};

export const getSortDirectionByValue = (value) => {
  return SORT_DIRECTIONS.find(direction => direction.value === value) || SORT_DIRECTIONS[0];
};
