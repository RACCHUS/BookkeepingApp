import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { TransactionModal } from '../../components/forms';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  TagIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const TransactionList = () => {
  const { user, loading: authLoading } = useAuth();
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0,
    orderBy: 'date',
    order: 'desc'
  });
  const [deletingId, setDeletingId] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalMode, setModalMode] = useState('edit');

  // Bulk operations state
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [bulkOperating, setBulkOperating] = useState(false);

  const queryClient = useQueryClient();

  // Show loading state while auth is loading
  if (authLoading) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Please log in to view transactions</p>
      </div>
    );
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.transactions.getAll(filters),
    enabled: !!user && !authLoading,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (transactionId) => apiClient.transactions.delete(transactionId),
    onSuccess: (data, transactionId) => {
      toast.success('Transaction deleted successfully');
      queryClient.invalidateQueries(['transactions']);
      setDeletingId(null);
    },
    onError: (error, transactionId) => {
      console.error('Delete transaction error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to delete transaction: ${errorMessage}`);
      setDeletingId(null);
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (transactionData) => apiClient.transactions.create(transactionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      console.error('Create transaction error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      throw new Error(errorMessage);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.transactions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      console.error('Update transaction error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      throw new Error(errorMessage);
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (transactions) => apiClient.transactions.bulkUpdate(transactions),
    onSuccess: () => {
      toast.success('Bulk operation completed successfully');
      queryClient.invalidateQueries(['transactions']);
      setSelectedTransactions(new Set());
      setIsSelectMode(false);
      setBulkOperating(false);
    },
    onError: (error) => {
      console.error('Bulk update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bulk operation failed';
      toast.error(errorMessage);
      setBulkOperating(false);
    }
  });

  const handleDelete = async (transactionId, description) => {
    if (window.confirm(`Are you sure you want to delete "${description}"?\\n\\nThis action cannot be undone.`)) {
      setDeletingId(transactionId);
      deleteMutation.mutate(transactionId);
    }
  };

  // Modal handlers
  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleSaveTransaction = async (transactionData) => {
    try {
      if (modalMode === 'create') {
        await createMutation.mutateAsync(transactionData);
      } else if (modalMode === 'edit' && selectedTransaction) {
        await updateMutation.mutateAsync({
          id: selectedTransaction.id,
          data: transactionData
        });
      }
    } catch (error) {
      throw error;
    }
  };

  // Bulk operation handlers
  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (transactionId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedTransactions.size} transaction(s)?\\n\\nThis action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setBulkOperating(true);
    
    try {
      const deletePromises = Array.from(selectedTransactions).map(id => 
        apiClient.transactions.delete(id)
      );
      
      await Promise.all(deletePromises);
      toast.success(`${selectedTransactions.size} transaction(s) deleted successfully`);
      queryClient.invalidateQueries(['transactions']);
      setSelectedTransactions(new Set());
      setIsSelectMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Some transactions could not be deleted');
    } finally {
      setBulkOperating(false);
    }
  };

  const handleBulkCategorize = async (category) => {
    if (selectedTransactions.size === 0) return;

    setBulkOperating(true);
    
    const transactionsToUpdate = Array.from(selectedTransactions).map(id => ({
      id,
      category
    }));

    try {
      await bulkUpdateMutation.mutateAsync(transactionsToUpdate);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedTransactions(new Set());
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading transactions..." />;
  }

  if (error) {
    console.error('Transaction query error:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading transactions: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Extract transaction data from the API response
  const transactions = data?.data?.transactions || [];
  const totalCount = data?.data?.total || 0;
  const hasMore = data?.data?.hasMore || false;
  const usingMockData = data?.data?.usingMockData || false;

  return (
    <div className="space-y-6">
      {/* Mock Data Notice */}
      {usingMockData && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Development Mode:</strong> Showing sample data while database indexes are being set up. Real transaction data will be available once the database is properly configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Showing {transactions.length} of {totalCount} transactions
              {hasMore && ' (scroll for more)'}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          {isSelectMode ? (
            <>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{selectedTransactions.size} selected</span>
              </div>
              
              {selectedTransactions.size > 0 && (
                <>
                  <select
                    onChange={(e) => e.target.value && handleBulkCategorize(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={bulkOperating}
                  >
                    <option value="">Change Category...</option>
                    <option value="Office Expenses">Office Expenses</option>
                    <option value="Gross Receipts or Sales">Gross Receipts or Sales</option>
                    <option value="Meals and Entertainment">Meals and Entertainment</option>
                    <option value="Travel">Travel</option>
                    <option value="Utilities">Utilities</option>
                  </select>
                  
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkOperating}
                    className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete ({selectedTransactions.size})
                  </button>
                </>
              )}
              
              <button
                onClick={toggleSelectMode}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={toggleSelectMode}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Select
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filter
              </button>
              <button 
                onClick={handleCreateTransaction}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Transaction
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="Search transactions..."
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No transactions found.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Upload a bank statement or add transactions manually to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            {isSelectMode && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Select All ({transactions.length})
                  </span>
                </label>
              </div>
            )}
            
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        {/* Selection checkbox */}
                        {isSelectMode && (
                          <div className="flex-shrink-0 mr-3">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.has(transaction.id)}
                              onChange={() => handleSelectTransaction(transaction.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                          </div>
                        )}
                        
                        <div className="flex-shrink-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'income' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                              : transaction.type === 'expense'
                              ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          }`}>
                            {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '↔'}
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.payee && `${transaction.payee} • `}
                            <span className="inline-block">
                              {transaction.category}
                              {!isSelectMode && (
                                <button
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="ml-1 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                                  title="Edit category"
                                >
                                  <TagIcon className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                            {transaction.source && ` • ${transaction.source}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            transaction.type === 'income' 
                              ? 'text-green-600 dark:text-green-400' 
                              : transaction.type === 'expense'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                            ${Math.abs(transaction.amount).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                        {!isSelectMode && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                              title="Edit transaction"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id, transaction.description)}
                              disabled={deletingId === transaction.id}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete transaction"
                            >
                              {deletingId === transaction.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTransaction}
        mode={modalMode}
        refreshTrigger={data?.timestamp || Date.now()}
      />
    </div>
  );
};

export default TransactionList;
