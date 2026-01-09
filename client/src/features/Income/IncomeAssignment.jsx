import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { apiClient } from '../../services/api';
import { toast } from 'react-hot-toast';
import { TransactionModal } from '../../components/forms';

// React Query cache settings to prevent excessive Firestore reads
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Cache persists for 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

/**
 * IncomeAssignment - Assign income transactions to income sources/customers
 */
const IncomeAssignment = ({ sources: sourcesProp = [] }) => {
  // Ensure sources is always an array to prevent .map errors
  const sources = Array.isArray(sourcesProp) ? sourcesProp : [];
  
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('unassigned');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Transaction edit modal state
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // Income categories from IRS Schedule C
  const incomeCategories = [
    'Gross Receipts',
    'Gross Receipts - Sales',
    'Gross Receipts - Services',
    'Gross Receipts or Sales',
    'Returns and Allowances',
    'Interest Income',
    'Dividend Income',
    'Rental Income',
    'Royalties',
    'Other Income',
    'Business Income'
  ];

  // Check if a transaction is income
  const isIncomeTransaction = (tx) => {
    // Check type field first (most reliable)
    if (tx.type === 'income') return true;
    if (tx.type === 'expense') return false;
    
    // Check if category is an income category
    if (tx.category) {
      const catLower = tx.category.toLowerCase();
      if (incomeCategories.some(cat => catLower.includes(cat.toLowerCase()))) {
        return true;
      }
      // Also check for common income keywords
      if (catLower.includes('income') || catLower.includes('receipt') || catLower.includes('revenue')) {
        return true;
      }
    }
    
    // Positive amounts typically indicate income
    if (tx.amount > 0) return true;
    
    return false;
  };

  // Fetch income transactions with React Query caching
  const { 
    data: transactions = [], 
    isLoading, 
    refetch: refetchTransactions 
  } = useQuery({
    queryKey: ['income-assignment-transactions'],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      const allTransactions = response?.data?.transactions || response?.transactions || [];
      
      console.log('[IncomeAssignment] Total transactions fetched:', allTransactions.length);
      
      const incomeTransactions = allTransactions.filter(tx => {
        const result = isIncomeTransaction(tx);
        if (result) {
          console.log('[IncomeAssignment] Income tx found:', tx.id, tx.type, tx.category);
        }
        return result;
      });
      
      console.log('[IncomeAssignment] Income transactions found:', incomeTransactions.length);
      return incomeTransactions;
    },
    ...QUERY_CONFIG,
    onError: (error) => {
      console.error('Error fetching income transactions:', error);
      toast.error('Failed to load income transactions');
    },
  });

  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = !searchTerm || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.payee?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Assignment filter
    const isAssigned = !!tx.incomeSourceId;
    const matchesAssigned = 
      filterAssigned === 'all' ||
      (filterAssigned === 'assigned' && isAssigned) ||
      (filterAssigned === 'unassigned' && !isAssigned);
    
    return matchesSearch && matchesAssigned;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount || 0));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const getSourceName = (sourceId) => {
    const source = sources.find(s => s.id === sourceId);
    return source?.name || 'Unknown Source';
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(tx => tx.id));
    }
  };

  const toggleSelect = (txId) => {
    setSelectedTransactions(prev => 
      prev.includes(txId) 
        ? prev.filter(id => id !== txId)
        : [...prev, txId]
    );
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
      await apiClient.transactions.update(editingTransaction.id, transactionData);
      toast.success('Transaction updated successfully');
      refetchTransactions();
      handleCloseTransactionModal();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error(error.message || 'Failed to update transaction');
      throw error;
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedSource || selectedTransactions.length === 0) {
      toast.error('Select transactions and an income source');
      return;
    }

    setIsAssigning(true);
    try {
      // Assign each selected transaction to the income source
      const source = sources.find(s => s.id === selectedSource);
      
      await Promise.all(selectedTransactions.map(async (txId) => {
        await api.transactions.update(txId, {
          incomeSourceId: selectedSource,
          incomeSourceName: source?.name
        });
      }));

      toast.success(`Assigned ${selectedTransactions.length} transactions to ${source?.name}`);
      setSelectedTransactions([]);
      setSelectedSource('');
      refetchTransactions();
    } catch (error) {
      console.error('Error assigning transactions:', error);
      toast.error('Failed to assign transactions');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (txId) => {
    try {
      await api.transactions.update(txId, {
        incomeSourceId: null,
        incomeSourceName: null
      });
      toast.success('Income source unassigned');
      refetchTransactions();
    } catch (error) {
      console.error('Error unassigning transaction:', error);
      toast.error('Failed to unassign transaction');
    }
  };

  const handleSingleAssign = async (txId, sourceId) => {
    try {
      const source = sources.find(s => s.id === sourceId);
      await api.transactions.update(txId, {
        incomeSourceId: sourceId,
        incomeSourceName: source?.name
      });
      toast.success(`Assigned to ${source?.name}`);
      refetchTransactions();
    } catch (error) {
      console.error('Error assigning transaction:', error);
      toast.error('Failed to assign transaction');
    }
  };

  const unassignedCount = transactions.filter(tx => !tx.incomeSourceId).length;
  const assignedCount = transactions.filter(tx => tx.incomeSourceId).length;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-2" />
        Loading income transactions...
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{transactions.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Income</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{assignedCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Assigned</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{unassignedCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Unassigned</div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedTransactions.length} selected
          </span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select income source...</option>
            {sources.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!selectedSource || isAssigning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckIcon className="h-4 w-4" />
            {isAssigning ? 'Assigning...' : 'Assign'}
          </button>
          <button
            onClick={() => setSelectedTransactions([])}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterAssigned}
          onChange={(e) => setFilterAssigned(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Transactions</option>
          <option value="unassigned">Unassigned Only</option>
          <option value="assigned">Assigned Only</option>
        </select>
        <button
          onClick={() => refetchTransactions()}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          title="Refresh"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No income transactions</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filterAssigned !== 'all' 
              ? 'No transactions match your search criteria.'
              : 'Income transactions (deposits) will appear here.'}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_100px_1fr_100px_180px_60px] gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
            <div className="w-6">
              <input
                type="checkbox"
                checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div>Date</div>
            <div>Description</div>
            <div className="text-right">Amount</div>
            <div>Income Source</div>
            <div className="text-center">Actions</div>
          </div>

          {/* Rows */}
          {filteredTransactions.map(tx => (
            <div key={tx.id}>
              <div 
                className={`grid grid-cols-[auto_100px_1fr_100px_180px_60px] gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  selectedTransactions.includes(tx.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="w-6 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  {formatDate(tx.date)}
                </div>
                <div className="flex items-center min-w-0">
                  <button 
                    onClick={() => toggleExpand(tx.id)}
                    className="flex items-center text-left text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 min-w-0"
                  >
                    {expandedRows.has(tx.id) ? (
                      <ChevronUpIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    )}
                    <span className="truncate">{tx.description || tx.payee || 'No description'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-end font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(tx.amount)}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {tx.incomeSourceId ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{getSourceName(tx.incomeSourceId)}</span>
                      <button
                        onClick={() => handleUnassign(tx.id)}
                        className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                        title="Remove assignment"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => handleSingleAssign(tx.id, e.target.value)}
                      className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Assign to...</option>
                      {sources.map(source => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => handleEditTransaction(tx)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit transaction"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedRows.has(tx.id) && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Payee:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{tx.payee || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{tx.category || 'Uncategorized'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">{tx.type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Statement:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{tx.statementName || 'Manual Entry'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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

export default IncomeAssignment;
