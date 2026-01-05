import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon, 
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import ReceiptUpload from './ReceiptUpload';

/**
 * ReceiptDetailModal - Full detail view for a receipt
 */
const ReceiptDetailModal = ({ 
  receipt, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onUploadImage,
  onDeleteImage,
  onAttachTransaction,
  onDetachTransaction,
  transactions,
  isLoading 
}) => {
  const [showAttachDropdown, setShowAttachDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  if (!isOpen || !receipt) return null;

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
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatExpirationDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const days = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        days,
        isExpiringSoon: days <= 30 && days > 0,
        isExpired: days <= 0
      };
    } catch {
      return null;
    }
  };

  const handleFileSelect = async (file) => {
    setUploadFile(file);
    setIsUploading(true);
    try {
      await onUploadImage(receipt.id, file);
      setUploadFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (receipt.fileUrl) {
      window.open(receipt.fileUrl, '_blank');
    }
  };

  const isPDF = receipt.mimeType === 'application/pdf';
  const expiration = formatExpirationDate(receipt.expiresAt);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Receipt Details
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(receipt)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit receipt"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(receipt)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete receipt"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Image Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Receipt Image
                </h3>
                
                {receipt.hasImage ? (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {isPDF ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <DocumentIcon className="w-20 h-20 text-red-400 mb-4" />
                          <p className="text-gray-600 dark:text-gray-300 font-medium">
                            {receipt.fileName || 'PDF Document'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {(receipt.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ) : (
                        <img
                          src={receipt.fileUrl}
                          alt="Receipt"
                          className="w-full h-auto max-h-96 object-contain"
                        />
                      )}
                    </div>
                    
                    {/* Image Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => onDeleteImage(receipt.id)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <ReceiptUpload
                    onFileSelect={handleFileSelect}
                    onRemove={() => setUploadFile(null)}
                    currentFile={uploadFile}
                    disabled={isUploading}
                  />
                )}

                {/* Expiration Warning */}
                {expiration && (
                  <div className={`rounded-lg p-3 ${
                    expiration.isExpired 
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : expiration.isExpiringSoon
                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      {(expiration.isExpired || expiration.isExpiringSoon) && (
                        <ExclamationTriangleIcon className={`w-5 h-5 ${
                          expiration.isExpired ? 'text-red-500' : 'text-amber-500'
                        }`} />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${
                          expiration.isExpired 
                            ? 'text-red-700 dark:text-red-300'
                            : expiration.isExpiringSoon
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {expiration.isExpired 
                            ? 'This receipt has expired'
                            : expiration.isExpiringSoon
                              ? `Expires in ${expiration.days} days`
                              : `Expires on ${expiration.date}`
                          }
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Receipts are automatically deleted after 2 years
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Details
                </h3>

                {/* Vendor */}
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vendor</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {receipt.vendor || '—'}
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                    <p className={`font-medium ${receipt.amount !== null ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {formatCurrency(receipt.amount)}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(receipt.date)}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {receipt.notes && (
                  <div className="flex items-start gap-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {receipt.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Transaction Link */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Linked Transaction
                  </h4>
                  
                  {receipt.transactionId ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 dark:text-green-300">
                          Transaction linked
                        </span>
                      </div>
                      <button
                        onClick={() => onDetachTransaction(receipt.id)}
                        disabled={isLoading}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setShowAttachDropdown(!showAttachDropdown)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Link to Transaction
                      </button>
                      
                      {showAttachDropdown && transactions && transactions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                          {transactions.map(tx => (
                            <button
                              key={tx.id}
                              onClick={() => {
                                onAttachTransaction(receipt.id, tx.id);
                                setShowAttachDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {tx.description || tx.payee}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(tx.amount)} • {formatDate(tx.date)}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>Created: {formatDate(receipt.createdAt)}</p>
                  {receipt.updatedAt && receipt.updatedAt !== receipt.createdAt && (
                    <p>Updated: {formatDate(receipt.updatedAt)}</p>
                  )}
                  {receipt.storageProvider && receipt.storageProvider !== 'none' && (
                    <p>Storage: {receipt.storageProvider}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReceiptDetailModal.propTypes = {
  receipt: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUploadImage: PropTypes.func.isRequired,
  onDeleteImage: PropTypes.func.isRequired,
  onAttachTransaction: PropTypes.func.isRequired,
  onDetachTransaction: PropTypes.func.isRequired,
  transactions: PropTypes.array,
  isLoading: PropTypes.bool
};

ReceiptDetailModal.defaultProps = {
  receipt: null,
  transactions: [],
  isLoading: false
};

export default ReceiptDetailModal;
