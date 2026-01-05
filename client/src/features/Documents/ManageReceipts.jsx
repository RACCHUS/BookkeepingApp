import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import receiptService from '../../services/receiptService';
import apiClient from '../../services/api';
import { LoadingSpinner } from '../../components/ui';
import { CompanySelector } from '../../components/common';
import {
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  ReceiptPercentIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PhotoIcon,
  LinkIcon,
  LinkSlashIcon
} from '@heroicons/react/24/outline';

/**
 * ManageReceipts - Receipt management tab with delete/rename/bulk link functionality
 * Supports multi-transaction linking and bulk operations
 */
const ManageReceipts = () => {
  const queryClient = useQueryClient();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  
  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editVendor, setEditVendor] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReceipt, setDeletingReceipt] = useState(null);
  const [deleteTransaction, setDeleteTransaction] = useState(false);
  
  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingReceipts, setLinkingReceipts] = useState([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Build query params
  const queryParams = {
    sortField: 'createdAt',
    sortDirection: 'desc',
    limit: 100
  };
  if (companyFilter) queryParams.companyId = companyFilter;

  // Fetch receipts
  const { data: receiptsData, isLoading, refetch } = useQuery({
    queryKey: ['receipts', queryParams],
    queryFn: () => receiptService.getReceipts(queryParams)
  });

  // Fetch transactions for linking
  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', { limit: 200 }],
    queryFn: async () => {
      const response = await apiClient.transactions.getAll({ limit: 200 });
      return response.data || response;
    }
  });

  const receiptsRaw = receiptsData?.receipts;
  const receipts = Array.isArray(receiptsRaw) ? receiptsRaw : [];
  const transactionsRaw = transactionsData?.transactions;
  const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => receiptService.updateReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      setEditingId(null);
      setEditVendor('');
      toast.success('Receipt updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update receipt')
  });

  // Delete mutation - supports optional transaction deletion
  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteAssociatedTransaction }) => 
      receiptService.deleteReceipt(id, { deleteTransaction: deleteAssociatedTransaction }),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setShowDeleteModal(false);
      setDeletingReceipt(null);
      setDeleteTransaction(false);
      toast.success(deleteTransaction 
        ? 'Receipt and associated transaction deleted' 
        : 'Receipt deleted (transaction preserved)');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete receipt')
  });

  // Bulk link mutation
  const bulkLinkMutation = useMutation({
    mutationFn: ({ receiptIds, transactionId }) => 
      receiptService.bulkLinkToTransaction(receiptIds, transactionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setShowLinkModal(false);
      setLinkingReceipts([]);
      setSelectedTransactionId('');
      setSelectedIds(new Set());
      toast.success(`Linked ${data.data?.successful?.length || 0} receipts to transaction`);
    },
    onError: (err) => toast.error(err.message || 'Failed to link receipts')
  });

  // Bulk unlink mutation
  const bulkUnlinkMutation = useMutation({
    mutationFn: (receiptIds) => receiptService.bulkUnlinkFromTransactions(receiptIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setSelectedIds(new Set());
      toast.success(`Unlinked ${data.data?.successful?.length || 0} receipts`);
    },
    onError: (err) => toast.error(err.message || 'Failed to unlink receipts')
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: (receiptIds) => receiptService.batchDeleteReceipts(receiptIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setSelectedIds(new Set());
      toast.success(`Deleted ${data.data?.successful?.length || 0} receipts`);
    },
    onError: (err) => toast.error(err.message || 'Failed to delete receipts')
  });

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredReceipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReceipts.map(r => r.id)));
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handlers
  const handleStartEdit = (receipt) => {
    setEditingId(receipt.id);
    setEditVendor(receipt.vendor || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditVendor('');
  };

  const handleSaveEdit = (receiptId) => {
    if (editVendor.trim()) {
      updateMutation.mutate({ id: receiptId, data: { vendor: editVendor.trim() } });
    }
  };

  const handleOpenDeleteModal = (receipt) => {
    setDeletingReceipt(receipt);
    setDeleteTransaction(false); // Default to NOT deleting transaction
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletingReceipt) {
      deleteMutation.mutate({ 
        id: deletingReceipt.id, 
        deleteAssociatedTransaction: deleteTransaction 
      });
    }
  };

  // Bulk operation handlers
  const handleOpenBulkLink = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select receipts to link');
      return;
    }
    setLinkingReceipts(Array.from(selectedIds));
    setShowLinkModal(true);
  };

  const handleConfirmBulkLink = () => {
    if (!selectedTransactionId) {
      toast.error('Please select a transaction');
      return;
    }
    bulkLinkMutation.mutate({ 
      receiptIds: linkingReceipts, 
      transactionId: selectedTransactionId 
    });
  };

  const handleBulkUnlink = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select receipts to unlink');
      return;
    }
    const linkedReceipts = Array.from(selectedIds).filter(id => {
      const receipt = receipts.find(r => r.id === id);
      return receipt?.transactionId || (receipt?.transactionIds?.length > 0);
    });
    if (linkedReceipts.length === 0) {
      toast.error('Selected receipts are not linked to any transactions');
      return;
    }
    bulkUnlinkMutation.mutate(linkedReceipts);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select receipts to delete');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedIds.size} receipts?`)) {
      batchDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  // Filter transactions for linking dropdown
  const filteredTransactions = transactions.filter(tx => {
    if (!transactionSearch) return true;
    const search = transactionSearch.toLowerCase();
    return (
      (tx.description || '').toLowerCase().includes(search) ||
      (tx.payee || '').toLowerCase().includes(search)
    );
  }).slice(0, 50);

  // Filter receipts by search
  const filteredReceipts = receipts.filter(receipt => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (receipt.vendor || '').toLowerCase().includes(searchLower) ||
      (receipt.notes || '').toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Company Filter */}
          <CompanySelector
            value={companyFilter}
            onChange={(id) => setCompanyFilter(id)}
            placeholder="All companies"
            allowAll={true}
            allowCreate={false}
          />

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedIds.size} receipt{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenBulkLink}
                disabled={bulkLinkMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <LinkIcon className="h-4 w-4 mr-1.5" />
                Link to Transaction
              </button>
              <button
                onClick={handleBulkUnlink}
                disabled={bulkUnlinkMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                <LinkSlashIcon className="h-4 w-4 mr-1.5" />
                Unlink
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={batchDeleteMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 mr-1.5" />
                Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredReceipts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <ReceiptPercentIcon className="mx-auto h-12 w-12 mb-4" />
            <p>No receipts found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Linked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReceipts.map((receipt) => (
                <tr 
                  key={receipt.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(receipt.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(receipt.id)}
                      onChange={() => handleSelectOne(receipt.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === receipt.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editVendor}
                          onChange={(e) => setEditVendor(e.target.value)}
                          className="w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(receipt.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(receipt.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title="Save"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-gray-400 hover:text-gray-500"
                          title="Cancel"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <ReceiptPercentIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {receipt.vendor || 'Unknown Vendor'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {receipt.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${receipt.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {receipt.date 
                      ? format(new Date(receipt.date), 'MMM d, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {receipt.fileUrl ? (
                      <PhotoIcon className="h-5 w-5 text-green-500" title="Has image" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      receipt.transactionId 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {receipt.transactionId ? 'Linked' : 'Unlinked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(receipt)}
                        className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        title="Rename"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(receipt)}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete Receipt
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Are you sure you want to delete the receipt from "{deletingReceipt.vendor || 'Unknown Vendor'}"?
                This action cannot be undone.
              </p>

              {/* Transaction link info */}
              {deletingReceipt.transactionId && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This receipt is linked to a transaction.
                  </p>
                </div>
              )}

              {/* Delete transaction checkbox */}
              {deletingReceipt.transactionId && (
                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteTransaction}
                      onChange={(e) => setDeleteTransaction(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Also delete linked transaction
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        If unchecked, the transaction will be preserved but unlinked from this receipt.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowLinkModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Link Receipts to Transaction
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Link {linkingReceipts.length} receipt{linkingReceipts.length !== 1 ? 's' : ''} to a transaction.
              </p>

              {/* Transaction search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Transactions
                </label>
                <input
                  type="text"
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  placeholder="Search by description or payee..."
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Transaction list */}
              <div className="mb-4 max-h-60 overflow-y-auto border rounded-md dark:border-gray-600">
                {filteredTransactions.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No transactions found
                  </p>
                ) : (
                  filteredTransactions.map((tx) => (
                    <label
                      key={tx.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0 dark:border-gray-600 ${
                        selectedTransactionId === tx.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="transaction"
                        checked={selectedTransactionId === tx.id}
                        onChange={() => setSelectedTransactionId(tx.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {tx.description || tx.payee || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${Math.abs(tx.amount || 0).toFixed(2)} • {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkingReceipts([]);
                    setSelectedTransactionId('');
                    setTransactionSearch('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBulkLink}
                  disabled={!selectedTransactionId || bulkLinkMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {bulkLinkMutation.isPending ? 'Linking...' : 'Link Receipts'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageReceipts;
