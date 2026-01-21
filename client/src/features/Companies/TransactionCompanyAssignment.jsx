import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api.js';
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { formatCurrency } from '../../utils/currencyUtils';
import { TransactionModal } from '../../components/forms';
import { PencilIcon } from '@heroicons/react/24/outline';

const TransactionCompanyAssignment = ({ onAssignmentComplete }) => {
  const [viewMode, setViewMode] = useState('unassigned'); // 'unassigned' or 'assigned'
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [selectedCompany, setSelectedCompany] = useState('');
  
  // Transaction edit modal state
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch transactions without company
  const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError } = useQuery({
    queryKey: ['unassigned-company-transactions'],
    queryFn: () => api.companies.getTransactionsWithoutCompany(),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions. Please refresh the page.');
    }
  });

  // Fetch assigned transactions (for unassign view)
  const { data: assignedData, isLoading: loadingAssigned } = useQuery({
    queryKey: ['assigned-company-transactions'],
    queryFn: () => api.transactions.getAll({ limit: 500 }),
    retry: 2,
    enabled: viewMode === 'assigned'
  });

  // Fetch all companies for dropdown
  const { data: companiesData, isLoading: loadingCompanies, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.companies.getAll(),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies. Please refresh the page.');
    }
  });

  const unassignedTransactionsRaw = transactionsData?.transactions;
  const unassignedTransactions = Array.isArray(unassignedTransactionsRaw) ? unassignedTransactionsRaw : [];
  const allTransactionsRaw = assignedData?.data?.transactions;
  const allTransactions = Array.isArray(allTransactionsRaw) ? allTransactionsRaw : [];
  const assignedTransactions = allTransactions.filter(t => t.companyId && t.companyId.trim() !== '');
  const transactions = viewMode === 'unassigned' ? unassignedTransactions : assignedTransactions;
  // Server returns { success: true, data: [...] }
  // Supabase returns { success: true, data: { companies: [...] } }
  const companiesRaw = Array.isArray(companiesData?.data) 
    ? companiesData.data 
    : companiesData?.data?.companies;
  const companies = Array.isArray(companiesRaw) ? companiesRaw : [];

  // Mutation for bulk company assignment
  const assignCompanyMutation = useMutation({
    mutationFn: ({ companyId, transactionIds }) => 
      api.companies.bulkAssignTransactions(companyId, transactionIds),
    onSuccess: (result) => {
      const count = result?.data?.updated || result?.updated || 0;
      toast.success(`Company assigned to ${count} transactions`);
      setSelectedTransactions(new Set());
      setSelectedCompany('');
      queryClient.invalidateQueries(['unassigned-company-transactions']);
      queryClient.invalidateQueries(['assigned-company-transactions']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error assigning company:', error);
      toast.error('Failed to assign company to transactions');
    }
  });

  // Mutation for bulk company unassignment
  const unassignCompanyMutation = useMutation({
    mutationFn: (transactionIds) => api.companies.bulkUnassignTransactions(transactionIds),
    onSuccess: (result) => {
      const count = result?.data?.updated || result?.updated || 0;
      toast.success(`Company removed from ${count} transactions`);
      setSelectedTransactions(new Set());
      queryClient.invalidateQueries(['unassigned-company-transactions']);
      queryClient.invalidateQueries(['assigned-company-transactions']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error unassigning company:', error);
      toast.error('Failed to remove company from transactions');
    }
  });

  const handleSelectAll = () => {
    const currentTransactions = viewMode === 'unassigned' ? transactions : (assignedTransactions || []);
    if (selectedTransactions.size === currentTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(currentTransactions.map(t => t.id)));
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
      queryClient.invalidateQueries({ queryKey: ['unassigned-company-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-company-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      handleCloseTransactionModal();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error(error.message || 'Failed to update transaction');
      throw error;
    }
  };

  const handleAssignCompany = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    if (!selectedCompany) {
      toast.error('Please select a company');
      return;
    }

    assignCompanyMutation.mutate({
      companyId: selectedCompany,
      transactionIds: Array.from(selectedTransactions)
    });
  };

  const handleUnassignCompany = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    unassignCompanyMutation.mutate(Array.from(selectedTransactions));
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedTransactions(new Set());
    setSelectedCompany('');
  };

  if (loadingTransactions || loadingCompanies) {
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

  if (companiesError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 dark:text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error loading companies</p>
          <p className="text-sm">Please refresh the page or try again later.</p>
          <p className="text-xs mt-2 text-gray-500">{companiesError.message}</p>
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

  if (companies.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">🏢</div>
          <p className="text-lg font-medium">No companies available</p>
          <p className="text-sm">Create a company first before assigning transactions.</p>
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
                ? 'All transactions have companies assigned!' 
                : 'No assigned transactions found.'}
            </p>
            <p className="text-sm">
              {viewMode === 'unassigned' 
                ? 'No unassigned transactions found.' 
                : 'Transactions will appear here once companies are assigned.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {viewMode === 'unassigned' ? 'Assign Companies to Transactions' : 'Unassign Companies from Transactions'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {viewMode === 'unassigned'
                  ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} need company assignment`
                  : `${assignedTransactions?.length || 0} transaction${(assignedTransactions?.length || 0) !== 1 ? 's' : ''} have companies assigned`
                }
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

          {/* Company Selection - Only show in unassigned mode */}
          {viewMode === 'unassigned' && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Company
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Choose a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} {company.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignment Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAssignCompany}
                  disabled={assignCompanyMutation.isPending || selectedTransactions.size === 0 || !selectedCompany}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignCompanyMutation.isPending 
                    ? 'Assigning...' 
                    : `Assign to ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          )}

          {/* Unassign Button - Only show in assigned mode */}
          {viewMode === 'assigned' && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex justify-end">
                <button
                  onClick={handleUnassignCompany}
                  disabled={unassignCompanyMutation.isPending || selectedTransactions.size === 0}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unassignCompanyMutation.isPending 
                    ? 'Unassigning...' 
                    : `Unassign ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`
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
                      checked={
                        viewMode === 'unassigned'
                          ? selectedTransactions.size === transactions.length && transactions.length > 0
                          : selectedTransactions.size === (assignedTransactions?.length || 0) && (assignedTransactions?.length || 0) > 0
                      }
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
                  {viewMode === 'assigned' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(viewMode === 'unassigned' ? transactions : assignedTransactions || []).map((transaction) => (
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
                    {viewMode === 'assigned' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                        {transaction.companyName || 'Unknown'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.category || 'Uncategorized'}
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
                (viewMode === 'unassigned' ? transactions : assignedTransactions || []).reduce((sum, t) => sum + (t.amount || 0), 0)
              )}
              {selectedTransactions.size > 0 && (
                <>
                  {' • '}
                  <strong>Selected Amount:</strong> {formatCurrency(
                    (viewMode === 'unassigned' ? transactions : assignedTransactions || [])
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

export default TransactionCompanyAssignment;
