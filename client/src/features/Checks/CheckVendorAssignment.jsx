import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';

/**
 * CheckVendorAssignment - Assign vendors to check transactions
 * Uses transactions collection (sectionCode: 'checks') from PDF bank statement imports
 * Mirrors styling and logic of CheckPayeeAssignment
 */
const CheckVendorAssignment = ({ onAssignmentComplete }) => {
  const [viewMode, setViewMode] = useState('unassigned'); // 'unassigned' or 'assigned'
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [selectedVendor, setSelectedVendor] = useState('');
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  const queryClient = useQueryClient();

  // Fetch unassigned check transactions (checks without vendor assigned)
  const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError } = useQuery({
    queryKey: ['unassigned-check-vendor-transactions'],
    queryFn: () => api.payees.getTransactionsWithoutVendors({ paymentMethod: 'check' }),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions. Please refresh the page.');
    }
  });

  // Fetch assigned check transactions (for unassign view)
  const { data: assignedData, isLoading: loadingAssigned } = useQuery({
    queryKey: ['assigned-check-vendor-transactions'],
    queryFn: () => api.transactions.getAll({ sectionCode: 'checks', limit: 500 }),
    retry: 2,
    enabled: viewMode === 'assigned'
  });

  // Fetch all vendors for dropdown
  const { data: vendorsData, isLoading: loadingVendors, error: vendorsError } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: () => api.payees.getAll({ type: 'vendor' }),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors. Please refresh the page.');
    }
  });

  const unassignedTransactionsRaw = transactionsData?.transactions;
  const unassignedTransactions = Array.isArray(unassignedTransactionsRaw) ? unassignedTransactionsRaw : [];
  const allCheckTransactionsRaw = assignedData?.data?.transactions;
  const allCheckTransactions = Array.isArray(allCheckTransactionsRaw) ? allCheckTransactionsRaw : [];
  // Assigned = has vendor
  const assignedTransactions = allCheckTransactions.filter(t => t.vendorId || t.vendorName);
  const transactions = viewMode === 'unassigned' ? unassignedTransactions : assignedTransactions;
  const vendorsRaw = vendorsData?.payees;
  const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];

  // Mutation for bulk vendor assignment
  const assignVendorMutation = useMutation({
    mutationFn: async ({ transactionIds, vendorId, vendorName }) => {
      // Update each transaction with vendor info
      const updatePromises = transactionIds.map(id =>
        api.transactions.update(id, { vendorId, vendorName })
      );
      await Promise.all(updatePromises);
      return { updatedCount: transactionIds.length };
    },
    onSuccess: (data) => {
      toast.success(`Vendor assigned to ${data.updatedCount} transactions`);
      setSelectedTransactions(new Set());
      setSelectedVendor('');
      queryClient.invalidateQueries(['unassigned-check-vendor-transactions']);
      queryClient.invalidateQueries(['assigned-check-vendor-transactions']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error assigning vendor:', error);
      toast.error('Failed to assign vendor to transactions');
    }
  });

  // Mutation for bulk vendor unassignment
  const unassignVendorMutation = useMutation({
    mutationFn: async (transactionIds) => {
      const updatePromises = transactionIds.map(id =>
        api.transactions.update(id, { vendorId: null, vendorName: null })
      );
      await Promise.all(updatePromises);
      return { updatedCount: transactionIds.length };
    },
    onSuccess: (data) => {
      toast.success(`Vendor removed from ${data.updatedCount} transactions`);
      setSelectedTransactions(new Set());
      queryClient.invalidateQueries(['unassigned-check-vendor-transactions']);
      queryClient.invalidateQueries(['assigned-check-vendor-transactions']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error unassigning vendor:', error);
      toast.error('Failed to remove vendor from transactions');
    }
  });

  // Mutation for creating new vendor
  const createVendorMutation = useMutation({
    mutationFn: (vendorData) => api.payees.create(vendorData),
    onSuccess: (data) => {
      toast.success('Vendor created successfully');
      setSelectedVendor(data.id);
      setShowNewVendorForm(false);
      setNewVendorName('');
      queryClient.invalidateQueries(['all-vendors']);
    },
    onError: (error) => {
      console.error('Error creating vendor:', error);
      toast.error('Failed to create vendor');
    }
  });

  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const handleTransactionSelect = (transactionId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleAssignVendor = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }

    const vendor = vendors.find(v => v.id === selectedVendor);
    if (!vendor) {
      toast.error('Selected vendor not found');
      return;
    }

    assignVendorMutation.mutate({
      transactionIds: Array.from(selectedTransactions),
      vendorId: vendor.id,
      vendorName: vendor.name
    });
  };

  const handleUnassignVendor = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    unassignVendorMutation.mutate(Array.from(selectedTransactions));
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedTransactions(new Set());
    setSelectedVendor('');
  };

  const handleCreateNewVendor = () => {
    if (!newVendorName.trim()) {
      toast.error('Please enter a vendor name');
      return;
    }

    createVendorMutation.mutate({
      name: newVendorName.trim(),
      type: 'vendor',
      isActive: true
    });
  };

  if (loadingTransactions || loadingVendors) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (vendorsError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 dark:text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error loading vendors</p>
          <p className="text-sm">Please refresh the page or try again later.</p>
          <p className="text-xs mt-2 text-gray-500">{vendorsError.message}</p>
        </div>
      </div>
    );
  }

  if (transactionsError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 dark:text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error loading transactions</p>
          <p className="text-sm">Please refresh the page or try again later.</p>
          <p className="text-xs mt-2 text-gray-500">{transactionsError.message}</p>
        </div>
      </div>
    );
  }

  const showEmptyState = transactions.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => handleViewModeChange('unassigned')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            viewMode === 'unassigned'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Unassigned ({unassignedTransactions.length})
        </button>
        <button
          onClick={() => handleViewModeChange('assigned')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            viewMode === 'assigned'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Assigned ({assignedTransactions.length})
        </button>
      </div>

      {showEmptyState ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">{viewMode === 'unassigned' ? '✅' : '📋'}</div>
            <p className="text-lg font-medium">
              {viewMode === 'unassigned' 
                ? 'All check transactions have vendors assigned!' 
                : 'No assigned check transactions found.'}
            </p>
            <p className="text-sm">
              {viewMode === 'unassigned' 
                ? 'No unassigned check transactions found.' 
                : 'Check transactions will appear here once vendors are assigned.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {viewMode === 'unassigned' ? 'Assign Vendors to Check Transactions' : 'Remove Vendors from Check Transactions'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {transactions.length} check transaction{transactions.length !== 1 ? 's' : ''} {viewMode === 'unassigned' ? 'need vendor assignment' : 'have vendors assigned'}
              </p>
            </div>
            
            {selectedTransactions.size > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedTransactions.size} selected
                </span>
              </div>
            )}
          </div>

      {/* Vendor Selection / Unassign Section */}
      {viewMode === 'unassigned' ? (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Vendor
              </label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Choose a vendor...</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-6">
            <button
              onClick={() => setShowNewVendorForm(!showNewVendorForm)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              {showNewVendorForm ? 'Cancel' : 'Add New'}
            </button>
          </div>
        </div>

        {/* New Vendor Form */}
        {showNewVendorForm && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="Enter vendor name"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <button
              onClick={handleCreateNewVendor}
              disabled={createVendorMutation.isPending || !newVendorName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createVendorMutation.isPending ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        )}

        {/* Assignment Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAssignVendor}
            disabled={assignVendorMutation.isPending || selectedTransactions.size === 0 || !selectedVendor}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignVendorMutation.isPending 
              ? 'Assigning...' 
              : `Assign to ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
      ) : (
        /* Unassign Section */
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select transactions to remove their vendor assignment
            </p>
            <button
              onClick={handleUnassignVendor}
              disabled={unassignVendorMutation.isPending || selectedTransactions.size === 0}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unassignVendorMutation.isPending 
                ? 'Removing...' 
                : `Remove Vendor from ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Check #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current Vendor
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedTransactions.has(transaction.id) ? 'bg-blue-50 dark:bg-blue-900' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleTransactionSelect(transaction.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {transaction.date && !isNaN(new Date(transaction.date))
                    ? new Date(transaction.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                    : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {transaction.checkNumber || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  <div className="max-w-xs truncate" title={transaction.description}>
                    {transaction.description}
                  </div>
                  {transaction.sectionCode && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {transaction.sectionCode}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {transaction.vendorName || 'No vendor assigned'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Total Amount:</strong> {formatCurrency(
            transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
          )}
          {selectedTransactions.size > 0 && (
            <>
              {' • '}
              <strong>Selected Amount:</strong> {formatCurrency(
                transactions
                  .filter(t => selectedTransactions.has(t.id))
                  .reduce((sum, t) => sum + (t.amount || 0), 0)
              )}
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default CheckVendorAssignment;
