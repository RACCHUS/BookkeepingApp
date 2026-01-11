/**
 * ManageCSVImports Component
 * Lists and manages CSV import records with options to view/delete imports and linked transactions
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api'; // Use hybridApiClient (default export)
import { LoadingSpinner } from '../../components/ui';
import {
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format date range
 */
const formatDateRange = (start, end) => {
  if (!start && !end) return 'N/A';
  return `${formatDate(start)} - ${formatDate(end)}`;
};

/**
 * Delete Confirmation Modal
 */
const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  importRecord, 
  isDeleting,
  deleteType // 'import' | 'transactions'
}) => {
  const [deleteTransactions, setDeleteTransactions] = useState(false);
  const [deleteImportId, setDeleteImportId] = useState(false);

  if (!isOpen || !importRecord) return null;

  const handleConfirm = () => {
    if (deleteType === 'import') {
      onConfirm({ deleteTransactions, deleteImportId });
    } else {
      onConfirm({ deleteImportId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {deleteType === 'import' ? 'Delete CSV Import' : 'Delete Linked Transactions'}
          </h3>
        </div>

        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong>File:</strong> {importRecord.file_name}
          </p>
          <p className="mb-2">
            <strong>Imported:</strong> {formatDate(importRecord.created_at)}
          </p>
          <p>
            <strong>Linked Transactions:</strong> {importRecord.linked_transaction_count || importRecord.transaction_count || 0}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {deleteType === 'import' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteTransactions}
                onChange={(e) => setDeleteTransactions(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Delete all linked transactions
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  If unchecked, transactions will be kept but unlinked from this import
                </p>
              </div>
            </label>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteImportId}
              onChange={(e) => setDeleteImportId(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Permanently delete import ID
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                If unchecked, the import record is marked as deleted but ID is preserved
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <LoadingSpinner className="w-4 h-4" />
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * CSV Import Row Component
 */
const CSVImportRow = ({ importRecord, onViewTransactions, onDelete, onDeleteTransactions }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    deleted: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden">
      {/* Main Row */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <DocumentTextIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {importRecord.file_name}
              </h4>
              <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[importRecord.status] || statusColors.completed}`}>
                {importRecord.status}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {formatDate(importRecord.created_at)}
              </span>
              {importRecord.bank_name && (
                <span className="flex items-center gap-1">
                  <BuildingOfficeIcon className="w-3 h-3" />
                  {importRecord.bank_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" />
                {importRecord.linked_transaction_count || importRecord.transaction_count || 0} transactions
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs">Import ID</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">{importRecord.id.substring(0, 8)}...</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs">Date Range</span>
              <span className="text-gray-900 dark:text-white">
                {formatDateRange(importRecord.date_range_start, importRecord.date_range_end)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs">Duplicates Skipped</span>
              <span className="text-gray-900 dark:text-white">{importRecord.duplicate_count || 0}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs">Errors</span>
              <span className={importRecord.error_count > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}>
                {importRecord.error_count || 0}
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); onViewTransactions(importRecord); }}
              className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
            >
              <EyeIcon className="w-4 h-4" />
              View Transactions
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteTransactions(importRecord); }}
              className="px-3 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 flex items-center gap-1"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Transactions
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(importRecord); }}
              className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * View Transactions Modal
 */
const ViewTransactionsModal = ({ isOpen, onClose, importId, fileName }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['csv-import-transactions', importId],
    queryFn: () => api.csv.getImportTransactions(importId, { limit: 100 }),
    enabled: isOpen && !!importId,
  });

  if (!isOpen) return null;

  const transactions = data?.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transactions from: {fileName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Failed to load transactions
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions linked to this import
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2">{formatDate(tx.date)}</td>
                    <td className="px-3 py-2 truncate max-w-xs">{tx.description}</td>
                    <td className="px-3 py-2">{tx.category || '-'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700 text-sm text-gray-500 text-center">
          Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

/**
 * Main ManageCSVImports Component
 */
const ManageCSVImports = () => {
  const queryClient = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null, type: 'import' });
  const [viewModal, setViewModal] = useState({ isOpen: false, importId: null, fileName: '' });

  // Fetch CSV imports
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['csv-imports', { showDeleted }],
    queryFn: () => api.csv.getImports({ 
      status: showDeleted ? 'all' : 'completed',
      limit: 100 
    }),
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Delete import mutation
  const deleteImportMutation = useMutation({
    mutationFn: ({ importId }) => api.csv.deleteImport(importId),
    onSuccess: (result) => {
      toast.success(result.message || 'CSV import deleted');
      setDeleteModal({ isOpen: false, record: null, type: 'import' });
      // Refetch the list to show updated data
      refetch();
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete import');
    },
  });

  // Delete transactions mutation
  const deleteTransactionsMutation = useMutation({
    mutationFn: ({ importId, options }) => api.csv.deleteImportTransactions(importId, options),
    onSuccess: (result) => {
      toast.success(result.message || 'Transactions deleted');
      setDeleteModal({ isOpen: false, record: null, type: 'transactions' });
      // Refetch the list to show updated data
      refetch();
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete transactions');
    },
  });

  const handleDelete = (record) => {
    setDeleteModal({ isOpen: true, record, type: 'import' });
  };

  const handleDeleteTransactions = (record) => {
    setDeleteModal({ isOpen: true, record, type: 'transactions' });
  };

  const handleConfirmDelete = (options) => {
    if (deleteModal.type === 'import') {
      deleteImportMutation.mutate({ 
        importId: deleteModal.record.id, 
        options 
      });
    } else {
      deleteTransactionsMutation.mutate({ 
        importId: deleteModal.record.id, 
        options 
      });
    }
  };

  const handleViewTransactions = (record) => {
    setViewModal({ 
      isOpen: true, 
      importId: record.id, 
      fileName: record.file_name 
    });
  };

  const imports = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600">Failed to load CSV imports</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          CSV Imports
        </h2>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show deleted imports
        </label>
      </div>

      {/* Import List */}
      {imports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No CSV imports found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Upload a CSV file to see it listed here
          </p>
        </div>
      ) : (
        <div>
          {imports.map((importRecord) => (
            <CSVImportRow
              key={importRecord.id}
              importRecord={importRecord}
              onViewTransactions={handleViewTransactions}
              onDelete={handleDelete}
              onDeleteTransactions={handleDeleteTransactions}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, record: null, type: 'import' })}
        onConfirm={handleConfirmDelete}
        importRecord={deleteModal.record}
        isDeleting={deleteImportMutation.isPending || deleteTransactionsMutation.isPending}
        deleteType={deleteModal.type}
      />

      {/* View Transactions Modal */}
      <ViewTransactionsModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, importId: null, fileName: '' })}
        importId={viewModal.importId}
        fileName={viewModal.fileName}
      />
    </div>
  );
};

export default ManageCSVImports;
