import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { TransactionModal } from '../../components/forms';
import { PencilIcon } from '@heroicons/react/24/outline';

const CheckPayeeAssignment = ({ onAssignmentComplete }) => {
  const [viewMode, setViewMode] = useState('unassigned'); // 'unassigned' or 'assigned'
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [selectedPayee, setSelectedPayee] = useState('');
  const [showNewPayeeForm, setShowNewPayeeForm] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState('');
  const [newPayeeType, setNewPayeeType] = useState('vendor');
  
  // Transaction edit modal state
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch unassigned check transactions
  const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError } = useQuery({
    queryKey: ['unassigned-check-transactions'],
    queryFn: () => api.payees.getTransactionsWithoutPayees({ paymentMethod: 'check' }),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions. Please refresh the page.');
    }
  });

  // Fetch assigned check transactions (for unassign view)
  const { data: assignedData, isLoading: loadingAssigned } = useQuery({
    queryKey: ['assigned-check-transactions'],
    queryFn: () => api.transactions.getAll({ paymentMethod: 'check', limit: 500 }),
    retry: 2,
    enabled: viewMode === 'assigned'
  });

  // Fetch all payees for dropdown
  const { data: payeesData, isLoading: loadingPayees, error: payeesError } = useQuery({
    queryKey: ['all-payees'],
    queryFn: () => api.payees.getAll(),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching payees:', error);
      toast.error('Failed to load payees. Please refresh the page.');
    }
  });

  const unassignedTransactionsRaw = transactionsData?.transactions;
  const unassignedTransactions = Array.isArray(unassignedTransactionsRaw) ? unassignedTransactionsRaw : [];
  const allCheckTransactionsRaw = assignedData?.data?.transactions;
  const allCheckTransactions = Array.isArray(allCheckTransactionsRaw) ? allCheckTransactionsRaw : [];
  // Assigned = has payee OR vendor
  const assignedTransactions = allCheckTransactions.filter(t => 
    (t.payee && t.payee.trim() !== '' && t.payee !== 'Unknown Payee') ||
    (t.vendorId || t.vendorName)
  );
  const transactions = viewMode === 'unassigned' ? unassignedTransactions : assignedTransactions;
  const payeesRaw = payeesData?.payees;
  const payees = Array.isArray(payeesRaw) ? payeesRaw : [];

  // Mutation for bulk payee assignment
  const assignPayeeMutation = useMutation({
    mutationFn: ({ transactionIds, payeeId, payeeName }) => 
      api.payees.bulkAssign(transactionIds, payeeId, payeeName),
    onSuccess: (data) => {
      toast.success(`Payee assigned to ${data.updatedCount} transactions`);
      setSelectedTransactions(new Set());
      setSelectedPayee('');
      queryClient.invalidateQueries(['unassigned-check-transactions']);
      queryClient.invalidateQueries(['assigned-check-transactions']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error assigning payee:', error);
      toast.error('Failed to assign payee to transactions');
    }
  });

  // Mutation for bulk payee unassignment
  const unassignPayeeMutation = useMutation({
    mutationFn: (transactionIds) => api.payees.bulkUnassign(transactionIds),
    onSuccess: (data) => {
      toast.success(`Payee removed from ${data.updatedCount} transactions`);
      setSelectedTransactions(new Set());
      queryClient.invalidateQueries(['unassigned-check-transactions']);
      queryClient.invalidateQueries(['assigned-check-transactions']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error unassigning payee:', error);
      toast.error('Failed to remove payee from transactions');
    }
  });

  // Mutation for creating new payee
  const createPayeeMutation = useMutation({
    mutationFn: (payeeData) => api.payees.create(payeeData),
    onSuccess: (data) => {
      toast.success('Payee created successfully');
      setSelectedPayee(data.id);
      setShowNewPayeeForm(false);
      setNewPayeeName('');
      queryClient.invalidateQueries(['all-payees']);
    },
    onError: (error) => {
      console.error('Error creating payee:', error);
      toast.error('Failed to create payee');
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
      queryClient.invalidateQueries({ queryKey: ['unassigned-check-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-check-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
      handleCloseTransactionModal();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error(error.message || 'Failed to update transaction');
      throw error;
    }
  };

  const handleAssignPayee = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    if (!selectedPayee) {
      toast.error('Please select a payee');
      return;
    }

    const payee = payees.find(p => p.id === selectedPayee);
    if (!payee) {
      toast.error('Selected payee not found');
      return;
    }

    assignPayeeMutation.mutate({
      transactionIds: Array.from(selectedTransactions),
      payeeId: payee.id,
      payeeName: payee.name
    });
  };

  const handleUnassignPayee = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    unassignPayeeMutation.mutate(Array.from(selectedTransactions));
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedTransactions(new Set());
    setSelectedPayee('');
  };

  const handleCreateNewPayee = () => {
    if (!newPayeeName.trim()) {
      toast.error('Please enter a payee name');
      return;
    }

    createPayeeMutation.mutate({
      name: newPayeeName.trim(),
      type: newPayeeType,
      isActive: true
    });
  };

  if (loadingTransactions || loadingPayees) {
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

  if (payeesError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 dark:text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error loading payees</p>
          <p className="text-sm">Please refresh the page or try again later.</p>
          <p className="text-xs mt-2 text-gray-500">{payeesError.message}</p>
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
                ? 'All check transactions have payees assigned!' 
                : 'No assigned check transactions found.'}
            </p>
            <p className="text-sm">
              {viewMode === 'unassigned' 
                ? 'No unassigned check transactions found.' 
                : 'Check transactions will appear here once payees are assigned.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {viewMode === 'unassigned' ? 'Assign Payees to Check Transactions' : 'Remove Payees from Check Transactions'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {transactions.length} check transaction{transactions.length !== 1 ? 's' : ''} {viewMode === 'unassigned' ? 'need payee assignment' : 'have payees assigned'}
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

      {/* Payee Selection / Unassign Section */}
      {viewMode === 'unassigned' ? (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Payee
              </label>
              <select
                value={selectedPayee}
                onChange={(e) => setSelectedPayee(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Choose a payee...</option>
                {payees.map((payee) => (
                  <option key={payee.id} value={payee.id}>
                    {payee.name} ({payee.type})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-6">
            <button
              onClick={() => setShowNewPayeeForm(!showNewPayeeForm)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              {showNewPayeeForm ? 'Cancel' : 'Add New'}
            </button>
          </div>
        </div>

        {/* New Payee Form */}
        {showNewPayeeForm && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payee Name
                </label>
                <input
                  type="text"
                  value={newPayeeName}
                  onChange={(e) => setNewPayeeName(e.target.value)}
                  placeholder="Enter payee name"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newPayeeType}
                  onChange={(e) => setNewPayeeType(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="vendor">Vendor</option>
                  <option value="employee">Employee</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleCreateNewPayee}
              disabled={createPayeeMutation.isPending || !newPayeeName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPayeeMutation.isPending ? 'Creating...' : 'Create Payee'}
            </button>
          </div>
        )}

        {/* Assignment Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAssignPayee}
            disabled={assignPayeeMutation.isPending || selectedTransactions.size === 0 || !selectedPayee}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignPayeeMutation.isPending 
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
              Select transactions to remove their payee assignment
            </p>
            <button
              onClick={handleUnassignPayee}
              disabled={unassignPayeeMutation.isPending || selectedTransactions.size === 0}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unassignPayeeMutation.isPending 
                ? 'Removing...' 
                : `Remove Payee from ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`
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
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current Payee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
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
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  <div className="max-w-xs truncate" title={transaction.description}>
                    {transaction.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(transaction.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {transaction.payee || 'No payee assigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleEditTransaction(transaction)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit transaction"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
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

      {/* Transaction Edit Modal */}
      <TransactionModal
        transaction={editingTransaction}
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        onSave={handleSaveTransaction}
        mode="edit"
      />
    </div>
  );
};

export default CheckPayeeAssignment;
