import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import checkService from '../../services/checkService';
import api from '../../services/api';
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { LoadingSpinner } from '../../components/ui';
import { CompanySelector } from '../../components/common';
import {
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LinkIcon,
  LinkSlashIcon
} from '@heroicons/react/24/outline';

/**
 * ManageChecks - Check management tab with delete/rename/bulk link functionality
 * Supports multi-transaction linking and bulk operations
 */
const ManageChecks = () => {
  const queryClient = useQueryClient();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editPayee, setEditPayee] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCheck, setDeletingCheck] = useState(null);
  const [deleteTransaction, setDeleteTransaction] = useState(false);
  
  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingChecks, setLinkingChecks] = useState([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Build query filters
  const queryFilters = {};
  if (searchTerm) queryFilters.payee = searchTerm;
  if (companyFilter) queryFilters.companyId = companyFilter;
  if (typeFilter) queryFilters.type = typeFilter;

  // Fetch checks
  const { data: checksData, isLoading, refetch } = useQuery({
    queryKey: ['checks', queryFilters],
    queryFn: () => checkService.getChecks(queryFilters),
    staleTime: 30 * 1000
  });

  // Fetch transactions for linking
  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', { limit: 200 }],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      return response.data || response;
    }
  });

  // Check API returns { data: [...], pagination: {...} } - data is array directly
  const checksRaw = checksData?.data?.checks || checksData?.data;
  const checks = Array.isArray(checksRaw) ? checksRaw : [];
  // Transaction API may return { transactions: [...] } or { data: [...] }
  const transactionsRaw = transactionsData?.transactions || transactionsData?.data || transactionsData;
  const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => checkService.updateCheck(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      setEditingId(null);
      setEditPayee('');
      toast.success('Check updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update check')
  });

  // Delete mutation - supports optional transaction deletion
  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteAssociatedTransaction }) => 
      checkService.deleteCheck(id, { deleteTransaction: deleteAssociatedTransaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      setShowDeleteModal(false);
      setDeletingCheck(null);
      setDeleteTransaction(false);
      toast.success(deleteTransaction 
        ? 'Check and associated transaction deleted' 
        : 'Check deleted (transaction preserved)');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete check')
  });

  // Bulk link mutation
  const bulkLinkMutation = useMutation({
    mutationFn: ({ checkIds, transactionId }) => 
      checkService.bulkLinkToTransaction(checkIds, transactionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      setShowLinkModal(false);
      setLinkingChecks([]);
      setSelectedTransactionId('');
      setSelectedIds(new Set());
      toast.success(`Linked ${data.data?.successful?.length || 0} checks to transaction`);
    },
    onError: (err) => toast.error(err.message || 'Failed to link checks')
  });

  // Bulk unlink mutation
  const bulkUnlinkMutation = useMutation({
    mutationFn: (checkIds) => checkService.bulkUnlinkFromTransactions(checkIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      setSelectedIds(new Set());
      toast.success(`Unlinked ${data.data?.successful?.length || 0} checks`);
    },
    onError: (err) => toast.error(err.message || 'Failed to unlink checks')
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: (checkIds) => checkService.batchDeleteChecks(checkIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      setSelectedIds(new Set());
      toast.success(`Deleted ${data.data?.successful?.length || 0} checks`);
    },
    onError: (err) => toast.error(err.message || 'Failed to delete checks')
  });

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredChecks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChecks.map(c => c.id)));
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
  const handleStartEdit = (check) => {
    setEditingId(check.id);
    setEditPayee(check.payee || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPayee('');
  };

  const handleSaveEdit = (checkId) => {
    if (editPayee.trim()) {
      updateMutation.mutate({ id: checkId, updates: { payee: editPayee.trim() } });
    }
  };

  const handleOpenDeleteModal = (check) => {
    setDeletingCheck(check);
    setDeleteTransaction(false); // Default to NOT deleting transaction
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletingCheck) {
      deleteMutation.mutate({ 
        id: deletingCheck.id, 
        deleteAssociatedTransaction: deleteTransaction 
      });
    }
  };

  // Bulk operation handlers
  const handleOpenBulkLink = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select checks to link');
      return;
    }
    setLinkingChecks(Array.from(selectedIds));
    setShowLinkModal(true);
  };

  const handleConfirmBulkLink = () => {
    if (!selectedTransactionId) {
      toast.error('Please select a transaction');
      return;
    }
    bulkLinkMutation.mutate({ 
      checkIds: linkingChecks, 
      transactionId: selectedTransactionId 
    });
  };

  const handleBulkUnlink = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select checks to unlink');
      return;
    }
    const linkedChecks = Array.from(selectedIds).filter(id => {
      const check = checks.find(c => c.id === id);
      return check?.transactionId || (check?.transactionIds?.length > 0);
    });
    if (linkedChecks.length === 0) {
      toast.error('Selected checks are not linked to any transactions');
      return;
    }
    bulkUnlinkMutation.mutate(linkedChecks);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select checks to delete');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedIds.size} checks?`)) {
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

  // Filter checks by search
  const filteredChecks = checks.filter(check => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (check.payee || '').toLowerCase().includes(searchLower) ||
      (check.checkNumber || '').toString().includes(searchLower) ||
      (check.memo || '').toLowerCase().includes(searchLower)
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search checks..."
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

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="income">Income (Received)</option>
            <option value="expense">Expense (Written)</option>
          </select>

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
              {selectedIds.size} check{selectedIds.size !== 1 ? 's' : ''} selected
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

      {/* Checks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <BanknotesIcon className="mx-auto h-12 w-12 mb-4" />
            <p>No checks found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredChecks.length && filteredChecks.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Payee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Check #
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
              {filteredChecks.map((check) => (
                <tr 
                  key={check.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(check.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(check.id)}
                      onChange={() => handleSelectOne(check.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === check.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editPayee}
                          onChange={(e) => setEditPayee(e.target.value)}
                          className="w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(check.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(check.id)}
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
                        <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {check.payee || 'Unknown Payee'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {check.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      check.type === 'income' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {check.type === 'income' ? (
                        <><ArrowDownTrayIcon className="h-3 w-3 mr-1" /> Received</>
                      ) : (
                        <><ArrowUpTrayIcon className="h-3 w-3 mr-1" /> Written</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${check.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {check.checkNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {check.date 
                      ? format(new Date(check.date), 'MMM d, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {check.fileUrl ? (
                      <PhotoIcon className="h-5 w-5 text-green-500" title="Has image" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      check.transactionId 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {check.transactionId ? 'Linked' : 'Unlinked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(check)}
                        className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        title="Rename"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(check)}
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
      {showDeleteModal && deletingCheck && (
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
                  Delete Check
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Are you sure you want to delete the check to "{deletingCheck.payee || 'Unknown Payee'}"
                {deletingCheck.checkNumber && ` (#${deletingCheck.checkNumber})`}?
                This action cannot be undone.
              </p>

              {/* Transaction link info */}
              {deletingCheck.transactionId && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This check is linked to a transaction.
                  </p>
                </div>
              )}

              {/* Delete transaction checkbox */}
              {deletingCheck.transactionId && (
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
                        If unchecked, the transaction will be preserved but unlinked from this check.
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
                  Link Checks to Transaction
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Link {linkingChecks.length} check{linkingChecks.length !== 1 ? 's' : ''} to a transaction.
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
                    setLinkingChecks([]);
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
                  {bulkLinkMutation.isPending ? 'Linking...' : 'Link Checks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageChecks;
