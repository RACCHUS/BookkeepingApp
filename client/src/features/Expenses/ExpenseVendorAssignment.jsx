import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  CheckIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { TransactionModal } from '../../components/forms';
import { useExpenseTransactions, ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';

/**
 * ExpenseVendorAssignment - Assign vendors to expense transactions
 * Similar to IncomeAssignment but for expense transactions
 */
const ExpenseVendorAssignment = ({ onAssignmentComplete }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('unassigned');
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [selectedVendor, setSelectedVendor] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  
  // Transaction edit modal state
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // Use shared expense transactions hook
  const { 
    transactions: allExpenseTransactions = [], 
    isLoading: loadingTransactions, 
    refetch: refetchTransactions 
  } = useExpenseTransactions();

  // Fetch all vendors for dropdown
  const { data: vendorsData, isLoading: loadingVendors } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: () => api.payees.getAll({ type: 'vendor' }),
    retry: 2,
  });

  const vendorsRaw = vendorsData?.payees;
  const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];

  // Filter transactions based on search and assignment status
  const filteredTransactions = useMemo(() => {
    return allExpenseTransactions.filter(tx => {
      // Exclude checks and receipts - they have their own assignment tabs
      const isCheck = tx.paymentMethod === 'check' || tx.sectionCode === 'checks';
      const hasReceipt = !!tx.receiptId;
      if (isCheck || hasReceipt) return false;

      // Search filter
      const matchesSearch = !searchTerm || 
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.payee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Assignment filter
      const isAssigned = !!tx.vendorId || !!tx.vendorName;
      const matchesAssigned = 
        filterAssigned === 'all' ||
        (filterAssigned === 'assigned' && isAssigned) ||
        (filterAssigned === 'unassigned' && !isAssigned);
      
      return matchesSearch && matchesAssigned;
    });
  }, [allExpenseTransactions, searchTerm, filterAssigned]);

  // Count unassigned for badge
  const unassignedCount = useMemo(() => {
    return allExpenseTransactions.filter(tx => {
      const isCheck = tx.paymentMethod === 'check' || tx.sectionCode === 'checks';
      const hasReceipt = !!tx.receiptId;
      if (isCheck || hasReceipt) return false;
      return !tx.vendorId && !tx.vendorName;
    }).length;
  }, [allExpenseTransactions]);

  const assignedCount = useMemo(() => {
    return allExpenseTransactions.filter(tx => {
      const isCheck = tx.paymentMethod === 'check' || tx.sectionCode === 'checks';
      const hasReceipt = !!tx.receiptId;
      if (isCheck || hasReceipt) return false;
      return !!tx.vendorId || !!tx.vendorName;
    }).length;
  }, [allExpenseTransactions]);

  // Mutation for bulk vendor assignment
  const assignVendorMutation = useMutation({
    mutationFn: async ({ transactionIds, vendorId, vendorName }) => {
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
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
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

  const toggleExpand = (txId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
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

  const handleFilterChange = (filter) => {
    setFilterAssigned(filter);
    setSelectedTransactions(new Set());
  };

  // Transaction edit handlers
  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);
  };

  const handleSaveTransaction = async (transactionData) => {
    try {
      await api.transactions.update(editingTransaction.id, transactionData);
      toast.success('Transaction updated successfully');
      refetchTransactions();
      handleCloseTransactionModal();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error(error.message || 'Failed to update transaction');
      throw error;
    }
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

  return (
    <div className="p-6 space-y-6">
      {/* Header with filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Expense Vendor Assignment
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assign vendors to expense transactions (excludes checks and receipts)
          </p>
        </div>
        
        {/* Filter Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => handleFilterChange('unassigned')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filterAssigned === 'unassigned'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Unassigned ({unassignedCount})
          </button>
          <button
            onClick={() => handleFilterChange('assigned')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filterAssigned === 'assigned'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Assigned ({assignedCount})
          </button>
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filterAssigned === 'all'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by description, payee, or vendor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Vendor Selection / Unassign Section */}
      {filterAssigned === 'unassigned' || filterAssigned === 'all' ? (
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
          <div className="flex justify-end gap-2">
            {filterAssigned === 'assigned' && selectedTransactions.size > 0 && (
              <button
                onClick={handleUnassignVendor}
                disabled={unassignVendorMutation.isPending}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unassignVendorMutation.isPending 
                  ? 'Removing...' 
                  : `Remove Vendor (${selectedTransactions.size})`
                }
              </button>
            )}
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
        /* Unassign Only Section */
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
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">{filterAssigned === 'unassigned' ? '✅' : '📋'}</div>
            <p className="text-lg font-medium">
              {filterAssigned === 'unassigned' 
                ? 'All expense transactions have vendors assigned!' 
                : filterAssigned === 'assigned'
                ? 'No assigned expense transactions found.'
                : 'No expense transactions found.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="relative px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="relative px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((tx) => (
                <React.Fragment key={tx.id}>
                  <tr 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedTransactions.has(tx.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(tx.id)}
                        onChange={() => handleTransactionSelect(tx.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {tx.description || tx.payee || 'No description'}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {tx.vendorName ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          {tx.vendorName}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditTransaction(tx)}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit transaction"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleExpand(tx.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Show details"
                        >
                          {expandedRows.has(tx.id) ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(tx.id) && (
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Category:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{tx.category || 'Uncategorized'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Payment Method:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{tx.paymentMethod || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Payee:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{tx.payee || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Company:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{tx.companyName || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Edit Modal */}
      {isTransactionModalOpen && editingTransaction && (
        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={handleCloseTransactionModal}
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
};

export default ExpenseVendorAssignment;
