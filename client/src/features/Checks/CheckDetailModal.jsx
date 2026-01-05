import React from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  BanknotesIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

/**
 * CheckDetailModal - View detailed check information
 */
const CheckDetailModal = ({ 
  isOpen, 
  onClose, 
  check, 
  onEdit, 
  onDelete,
  onLinkTransaction,
  companies = []
}) => {
  if (!isOpen || !check) return null;

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
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const isIncome = check.type === 'income';
  const isPDF = check.mimeType === 'application/pdf';
  const companyName = companies.find(c => c.id === check.companyId)?.name || '—';

  // Status colors
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    cleared: 'bg-green-100 text-green-800 border-green-300',
    bounced: 'bg-red-100 text-red-800 border-red-300',
    voided: 'bg-gray-100 text-gray-600 border-gray-300',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-300'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                <BanknotesIcon className={`h-6 w-6 ${isIncome ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Check Details
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isIncome ? (
                      <ArrowDownTrayIcon className="w-3 h-3" />
                    ) : (
                      <ArrowUpTrayIcon className="w-3 h-3" />
                    )}
                    {isIncome ? 'Received' : 'Written'}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                    statusColors[check.status] || statusColors.pending
                  }`}>
                    {(check.status || 'pending').charAt(0).toUpperCase() + (check.status || 'pending').slice(1)}
                  </span>
                  {check.transactionId && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <LinkIcon className="w-3 h-3" />
                      Linked to Transaction
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Image Section */}
            <div className="md:w-1/2 p-4 bg-gray-50 border-r border-gray-200">
              {check.hasImage ? (
                isPDF ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                    <DocumentIcon className="w-20 h-20 text-red-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">PDF Document</p>
                    <a 
                      href={check.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View PDF
                    </a>
                  </div>
                ) : (
                  <img
                    src={check.fileUrl}
                    alt="Check"
                    className="w-full rounded-lg shadow-md cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(check.fileUrl, '_blank')}
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400">
                  <BanknotesIcon className="w-20 h-20 mb-4" />
                  <p className="text-sm">No image attached</p>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="md:w-1/2 p-4">
              {/* Amount */}
              <div className="mb-6 text-center pb-4 border-b border-gray-200">
                <p className={`text-3xl font-bold ${
                  isIncome ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isIncome ? '+' : '-'}{formatCurrency(check.amount)}
                </p>
              </div>

              {/* Details Grid */}
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Payee</dt>
                  <dd className="text-sm font-medium text-gray-900">{check.payee || '—'}</dd>
                </div>

                {check.checkNumber && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Check Number</dt>
                    <dd className="text-sm font-medium text-gray-900">#{check.checkNumber}</dd>
                  </div>
                )}

                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Date</dt>
                  <dd className="text-sm font-medium text-gray-900">{formatDate(check.date)}</dd>
                </div>

                {check.category && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Category</dt>
                    <dd className="text-sm font-medium text-gray-900">{check.category}</dd>
                  </div>
                )}

                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Company</dt>
                  <dd className="text-sm font-medium text-gray-900">{companyName}</dd>
                </div>

                {check.bankName && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Bank</dt>
                    <dd className="text-sm font-medium text-gray-900">{check.bankName}</dd>
                  </div>
                )}

                {check.memo && (
                  <div>
                    <dt className="text-sm text-gray-500 mb-1">Memo</dt>
                    <dd className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{check.memo}</dd>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <dt className="text-gray-400">Created</dt>
                    <dd className="text-gray-500">{formatDateTime(check.createdAt)}</dd>
                  </div>
                  {check.updatedAt && check.updatedAt !== check.createdAt && (
                    <div className="flex justify-between text-xs">
                      <dt className="text-gray-400">Updated</dt>
                      <dd className="text-gray-500">{formatDateTime(check.updatedAt)}</dd>
                    </div>
                  )}
                </div>
              </dl>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              {!check.transactionId && onLinkTransaction && (
                <button
                  onClick={() => onLinkTransaction(check)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link to Transaction
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(check)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => onDelete(check)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CheckDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  check: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onLinkTransaction: PropTypes.func,
  companies: PropTypes.array
};

CheckDetailModal.defaultProps = {
  check: null,
  onLinkTransaction: null,
  companies: []
};

export default CheckDetailModal;
