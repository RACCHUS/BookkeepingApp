/**
 * Missing Info Alert Component
 * 
 * Displays payees with incomplete tax form information
 * 
 * @author BookkeepingApp Team
 */

import React from 'react';
import { ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';

/**
 * Alert showing payees missing required tax form information
 * @param {Object} props
 * @param {Array} props.payees - Payees with missing info
 * @param {string} props.formType - Form type (1099-NEC, W-2)
 * @param {Function} props.onEditPayee - Callback when user clicks to edit payee
 */
export function MissingInfoAlert({ payees = [], formType, onEditPayee }) {
  if (!payees || payees.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Missing Information for {formType}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            The following {payees.length === 1 ? 'payee needs' : `${payees.length} payees need`} additional 
            information before generating tax forms:
          </p>
          
          <ul className="mt-3 space-y-2">
            {payees.slice(0, 5).map((item) => (
              <li key={item.payeeId} className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                  <span className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    {item.payeeName}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                    Missing: {item.missing?.join(', ')}
                  </span>
                </div>
                {onEditPayee && (
                  <button
                    onClick={() => onEditPayee(item.payee)}
                    className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 
                             dark:hover:text-amber-100 underline"
                  >
                    Edit
                  </button>
                )}
              </li>
            ))}
          </ul>
          
          {payees.length > 5 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              And {payees.length - 5} more...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MissingInfoAlert;
