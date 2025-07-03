import React, { memo } from 'react';
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CATEGORY_GROUPS } from '@shared/constants/categories';

const TransactionRow = memo(({
  transaction,
  isSelectMode,
  isSelected,
  onSelect,
  editingCategoryId,
  editingCategoryValue,
  onCategoryEdit,
  onCategoryChange,
  onCategoryKeyPress,
  onSaveCategoryEdit,
  onCancelCategoryEdit,
  onEdit,
  onDelete,
  deletingId
}) => {
  const formatDate = (date) => {
    if (!date) return '';
    // Defensive: ensure date is in YYYY-MM-DD format
    let isoDate = date;
    // If date is not in YYYY-MM-DD, try to parse and reformat
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const d = new Date(date);
      if (!isNaN(d)) {
        isoDate = d.toISOString().split('T')[0];
      }
    }
    // Always parse as local date at noon to avoid timezone shift
    return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  return (
    <li key={transaction.id}>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            {/* Selection checkbox */}
            {isSelectMode && (
              <div className="flex-shrink-0 mr-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(transaction.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            )}
            
            <div className="flex-shrink-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                transaction.type === 'income' 
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                  : transaction.type === 'expense'
                  ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              }`}>
                {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '↔'}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {transaction.description}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {transaction.payee && `${transaction.payee} • `}
                <span className="inline-block">
                  {editingCategoryId === transaction.id ? (
                    <div className="flex items-center space-x-1">
                      <select
                        value={editingCategoryValue}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        onKeyDown={onCategoryKeyPress}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      >
                        <option value="">Select Category</option>
                        {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
                          <optgroup key={groupName} label={groupName}>
                            {categories.map(category => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        onClick={onSaveCategoryEdit}
                        className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        title="Save category"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={onCancelCategoryEdit}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Cancel edit"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onCategoryEdit(transaction.id, transaction.category)}
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Click to edit category"
                    >
                      <span>{transaction.category || 'Uncategorized'}</span>
                      <PencilIcon className="h-3 w-3" />
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-900 dark:text-white">
              <div className="font-medium">
                {formatCurrency(transaction.amount)}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                {formatDate(transaction.date)}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(transaction)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                title="Edit transaction"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(transaction.id)}
                disabled={deletingId === transaction.id}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                title="Delete transaction"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
});

TransactionRow.displayName = 'TransactionRow';

export default TransactionRow;
