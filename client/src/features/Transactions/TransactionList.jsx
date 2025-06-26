import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const TransactionList = () => {
  const { user, loading: authLoading } = useAuth(); // Add authentication context with loading state
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0,
    orderBy: 'date',
    order: 'desc'
  });
  const [deletingId, setDeletingId] = useState(null);

  const queryClient = useQueryClient();

  // Debug authentication status
  console.log('🔐 Auth loading:', authLoading);
  console.log('🔐 Current user:', user);
  console.log('🔐 User UID:', user?.uid);
  console.log('🔐 User email:', user?.email);

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

  // Test direct API call (temporary debugging)
  React.useEffect(() => {
    const testDirectCall = async () => {
      try {
        console.log('🧪 Testing direct API call...');
        
        // Test the debug endpoint to compare user vs dev transactions
        const debugResponse = await fetch('/api/transactions/debug', {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        });
        const debugJson = await debugResponse.json();
        console.log('🔍 DEBUG: Transaction comparison:', debugJson);
        
        // Test the new test endpoint first
        const testResponse = await fetch('/api/transactions/test', {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        });
        const testJson = await testResponse.json();
        console.log('🧪 Test endpoint response:', testJson);
        
        // Then test the regular API call
        const directResponse = await apiClient.transactions.getAll(filters);
        console.log('🧪 Direct API response:', directResponse);
        console.log('🧪 Direct response type:', typeof directResponse);
        console.log('🧪 Direct response keys:', Object.keys(directResponse || {}));
      } catch (error) {
        console.error('🧪 Direct API error:', error);
      }
    };
    
    if (user) {
      testDirectCall();
    }
  }, [user]); // Remove filters dependency to avoid too many calls

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.transactions.getAll(filters),
    enabled: !!user && !authLoading, // Only run query when user is authenticated and auth is not loading
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

  // Fix: Handle the nested data structure from backend
  // Backend returns: { success: true, data: { transactions: [], total: 0, hasMore: false } }
  // Axios interceptor extracts: { success: true, data: { transactions: [], total: 0, hasMore: false } }
  // So we need: response.data.transactions
  const transactions = data?.data?.transactions || [];
  const totalCount = data?.data?.total || 0;
  const hasMore = data?.data?.hasMore || false;
  
  console.log('🔍 Raw API response data:', data);
  console.log('🔍 data.success:', data?.success);
  console.log('🔍 data.data:', data?.data);
  console.log('🔍 data.data.transactions:', data?.data?.transactions);
  console.log('🔍 Parsed transactions:', transactions);
  console.log('🔍 Transaction count:', transactions.length);
  console.log('🔍 Total count:', totalCount);
  
  // Check if we're getting the expected structure
  if (data && !data.success) {
    console.warn('🚨 Unexpected response structure - missing success field');
  }
  if (data?.success && !data.data) {
    console.warn('� Unexpected response structure - missing data field');
  }

  return (
    <div className="space-y-6">
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
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
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
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
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
                          {transaction.category}
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {/* TODO: Add edit functionality */}}
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
