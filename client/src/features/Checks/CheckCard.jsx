import React from 'react';
import PropTypes from 'prop-types';
import { 
  DocumentIcon, 
  PhotoIcon, 
  LinkIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

/**
 * CheckCard - Card component for displaying check in grid/list view
 * Checks can be income (received) or expense (written)
 */
const CheckCard = ({ 
  check, 
  onView, 
  onEdit, 
  onDelete, 
  isSelected, 
  onSelect,
  showCheckbox 
}) => {
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const isIncome = check.type === 'income';
  const isPDF = check.mimeType === 'application/pdf';

  // Status badge colors
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    cleared: 'bg-green-100 text-green-800',
    bounced: 'bg-red-100 text-red-800',
    voided: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 rounded-lg border overflow-hidden
        transition-all duration-200 hover:shadow-md
        ${isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
          : 'border-gray-200 dark:border-gray-700'
        }
      `}
    >
      {/* Image/Preview Area */}
      <div 
        className="relative aspect-video bg-gray-100 dark:bg-gray-700 cursor-pointer"
        onClick={() => onView(check)}
      >
        {check.hasImage ? (
          isPDF ? (
            <div className="flex items-center justify-center h-full">
              <DocumentIcon className="w-16 h-16 text-red-400" />
            </div>
          ) : (
            <img
              src={check.thumbnailUrl || check.fileUrl}
              alt={check.payee || 'Check'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
                e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full"><svg class="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
              }}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <BanknotesIcon className="w-16 h-16 text-gray-300 dark:text-gray-500" />
          </div>
        )}

        {/* Checkbox for bulk selection */}
        {showCheckbox && (
          <div 
            className="absolute top-2 left-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(check.id)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

        {/* Type Badge */}
        <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
          isIncome ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {isIncome ? (
            <ArrowDownTrayIcon className="w-3 h-3" />
          ) : (
            <ArrowUpTrayIcon className="w-3 h-3" />
          )}
          {isIncome ? 'Received' : 'Written'}
        </div>

        {/* Transaction Link Badge */}
        {check.transactionId && (
          <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            Linked
          </div>
        )}

        {/* Status Badge */}
        {check.status && check.status !== 'pending' && (
          <div className={`absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full ${statusColors[check.status] || statusColors.pending}`}>
            {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3">
        {/* Payee Name */}
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {check.payee || 'No payee'}
        </h3>

        {/* Check Number */}
        {check.checkNumber && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check #{check.checkNumber}
          </p>
        )}

        {/* Amount and Date */}
        <div className="flex justify-between items-center mt-1 text-sm">
          <span className={`font-semibold ${
            isIncome 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {isIncome ? '+' : '-'}{formatCurrency(check.amount)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {formatDate(check.date)}
          </span>
        </div>

        {/* Notes/Memo Preview */}
        {check.memo && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
            {check.memo}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onView(check)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="View details"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(check)}
            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(check)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

CheckCard.propTypes = {
  check: PropTypes.shape({
    id: PropTypes.string.isRequired,
    payee: PropTypes.string,
    amount: PropTypes.number,
    date: PropTypes.string,
    type: PropTypes.oneOf(['income', 'expense']),
    status: PropTypes.string,
    checkNumber: PropTypes.string,
    memo: PropTypes.string,
    hasImage: PropTypes.bool,
    fileUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    mimeType: PropTypes.string,
    transactionId: PropTypes.string
  }).isRequired,
  onView: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  showCheckbox: PropTypes.bool
};

CheckCard.defaultProps = {
  isSelected: false,
  onSelect: () => {},
  showCheckbox: false
};

export default CheckCard;
