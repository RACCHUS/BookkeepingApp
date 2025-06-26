import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const TransactionList = () => {
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0,
    orderBy: 'date',
    order: 'desc'
  });
  const [deletingId, setDeletingId] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.transactions.getAll(filters),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (transactionId) => apiClient.transactions.delete(transactionId),
    onSuccess: (data, transactionId) => {
      toast.success('Transaction deleted successfully');
      // Refresh the transactions list
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

  const handleDelete = async (transactionId, description) => {
    if (window.confirm(`Are you sure you want to delete "${description}"?\n\nThis action cannot be undone.`)) {
      setDeletingId(transactionId);
      deleteMutation.mutate(transactionId);
    }
  };

  console.log('🔍 Transaction query data:', data);
  console.log('🔍 Transaction query isLoading:', isLoading);
  console.log('🔍 Transaction query error:', error);

  if (isLoading) {
    return <LoadingSpinner text="Loading transactions..." />;
  }

  if (error) {
    console.error('🔍 Transaction query error details:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading transactions: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const transactions = data?.data?.transactions || [];
  const totalCount = data?.data?.total || 0;
  const hasMore = data?.data?.hasMore || false;
  
  console.log('🔍 Parsed transactions:', transactions);
  console.log('🔍 Transaction count:', transactions.length);
  console.log('🔍 Total count:', totalCount);
  console.log('🔍 Full response data:', JSON.stringify(data, null, 2));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {transactions.length} of {totalCount} transactions
              {hasMore && ' (scroll for more)'}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search transactions..."
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found.</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload a bank statement or add transactions manually to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 text-green-600' 
                            : transaction.type === 'expense'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '↔'}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.payee && `${transaction.payee} • `}
                          {transaction.category}
                          {transaction.source && ` • ${transaction.source}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          transaction.type === 'income' 
                            ? 'text-green-600' 
                            : transaction.type === 'expense'
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                          ${Math.abs(transaction.amount).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {/* TODO: Add edit functionality */}}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit transaction"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id, transaction.description)}
                          disabled={deletingId === transaction.id}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete transaction"
                        >
                          {deletingId === transaction.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
