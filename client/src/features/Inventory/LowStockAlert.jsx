/**
 * @fileoverview Low Stock Alert - Warning component for low stock items
 * @description Displays a banner/alert for items that are at or below reorder level
 * @version 1.0.0
 */

import React, { useState } from 'react';

const LowStockAlert = ({ items, onViewItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayItems = isExpanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  if (items.length === 0) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">
            Low Stock Alert
          </h3>
          <div className="mt-2 text-sm text-orange-700 dark:text-orange-400">
            <p>
              {items.length} item{items.length !== 1 ? 's are' : ' is'} at or below reorder level:
            </p>
            <ul className="mt-2 space-y-1">
              {displayItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <button
                    onClick={() => onViewItem(item)}
                    className="text-orange-800 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-200 underline"
                  >
                    {item.name} ({item.sku})
                  </button>
                  <span className="ml-2 text-orange-600 dark:text-orange-400">
                    {item.quantity} / {item.reorderLevel} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-sm font-medium text-orange-800 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-200"
              >
                {isExpanded ? 'Show less' : `Show ${items.length - 3} more...`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LowStockAlert;
