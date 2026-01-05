import React from 'react';
import PropTypes from 'prop-types';
import { 
  DocumentIcon, 
  PhotoIcon, 
  LinkIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

/**
 * ReceiptCard - Card component for displaying receipt in grid/list view
 */
const ReceiptCard = ({ 
  receipt, 
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
    }).format(amount);
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

  const isPDF = receipt.mimeType === 'application/pdf';

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
        onClick={() => onView(receipt)}
      >
        {receipt.hasImage ? (
          isPDF ? (
            <div className="flex items-center justify-center h-full">
              <DocumentIcon className="w-16 h-16 text-red-400" />
            </div>
          ) : (
            <img
              src={receipt.thumbnailUrl || receipt.fileUrl}
              alt={receipt.vendor || 'Receipt'}
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
            <PhotoIcon className="w-16 h-16 text-gray-300 dark:text-gray-500" />
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
              onChange={() => onSelect(receipt.id)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}

        {/* Expiring Soon Badge */}
        {receipt.isExpiringSoon && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <ExclamationTriangleIcon className="w-3 h-3" />
            Expiring
          </div>
        )}

        {/* Transaction Link Badge */}
        {receipt.transactionId && (
          <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            Linked
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3">
        {/* Vendor Name */}
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {receipt.vendor || 'No vendor'}
        </h3>

        {/* Amount and Date */}
        <div className="flex justify-between items-center mt-1 text-sm">
          <span className={`font-semibold ${receipt.amount !== null ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {formatCurrency(receipt.amount)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {formatDate(receipt.date)}
          </span>
        </div>

        {/* Notes Preview */}
        {receipt.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
            {receipt.notes}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onView(receipt)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="View details"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(receipt)}
            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(receipt)}
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

ReceiptCard.propTypes = {
  receipt: PropTypes.shape({
    id: PropTypes.string.isRequired,
    vendor: PropTypes.string,
    amount: PropTypes.number,
    date: PropTypes.string,
    notes: PropTypes.string,
    hasImage: PropTypes.bool,
    fileUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    mimeType: PropTypes.string,
    transactionId: PropTypes.string,
    isExpiringSoon: PropTypes.bool
  }).isRequired,
  onView: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  showCheckbox: PropTypes.bool
};

ReceiptCard.defaultProps = {
  isSelected: false,
  onSelect: () => {},
  showCheckbox: false
};

export default ReceiptCard;
