import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  FunnelIcon,
  DocumentPlusIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../../services/api';

/**
 * BulkAddReceiptsModal - Quick bulk add receipts from transactions
 * Filter by vendor, date, or amount to create multiple receipt records at once
 */
const BulkAddReceiptsModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  // Filter state
  const [filters, setFilters] = useState({
    vendor: '',
    date: '',
    minAmount: '',
    maxAmount: ''
  });
  
  // Selected transactions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Fetch transactions
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', 'for-receipts'],
    queryFn: () => apiClient.transactions.getAll({ limit: 500 }),
    enabled: isOpen
  });

  // Get unique vendors for dropdown
  const uniqueVendors = useMemo(() => {
    if (!transactionsData?.data?.transactions) return [];
    const vendors = new Set();
    transactionsData.data.transactions.forEach(t => {
      if (t.payee) vendors.add(t.payee);
      if (t.description) {
        // Extract vendor name from description (first part before common separators)
        const match = t.description.match(/^([A-Za-z0-9\s&'.-]+)/);
        if (match) vendors.add(match[1].trim());
      }
    });
    return [...vendors].sort();
  }, [transactionsData]);

  // Filter transactions based on criteria
  const filteredTransactions = useMemo(() => {
    if (!transactionsData?.data?.transactions) return [];
    
    let transactions = transactionsData.data.transactions;

    // Filter out transactions that already have receipts
    transactions = transactions.filter(t => !t.receiptId);

    // Apply vendor filter
    if (filters.vendor) {
      const vendorLower = filters.vendor.toLowerCase();
      transactions = transactions.filter(t => 
        (t.payee && t.payee.toLowerCase().includes(vendorLower)) ||
        (t.description && t.description.toLowerCase().includes(vendorLower))
      );
    }

    // Apply date filter
    if (filters.date) {
      transactions = transactions.filter(t => {
        const txDate = new Date(t.date).toISOString().split('T')[0];
        return txDate === filters.date;
      });
    }

    // Apply amount filters
    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      transactions = transactions.filter(t => Math.abs(t.amount) >= min);
    }
    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      transactions = transactions.filter(t => Math.abs(t.amount) <= max);
    }

    return transactions;
  }, [transactionsData, filters]);

  // Check if any filter is active
  const hasActiveFilters = filters.vendor || filters.date || filters.minAmount || filters.maxAmount;

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  // Handle individual selection
  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle submit
  const handleSubmit = () => {
    const selectedTransactions = filteredTransactions.filter(t => selectedIds.has(t.id));
    onSubmit(selectedTransactions);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({ vendor: '', date: '', minAmount: '', maxAmount: '' });
    setSelectedIds(new Set());
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <DocumentPlusIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Bulk Add Receipts
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create receipt records from transactions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter Transactions
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Vendor Filter */}
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <BuildingOfficeIcon className="w-3 h-3" />
                  Vendor
                </label>
                <input
                  type="text"
                  list="vendors"
                  value={filters.vendor}
                  onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value }))}
                  placeholder="Search vendor..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="vendors">
                  {uniqueVendors.map(v => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>

              {/* Date Filter */}
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <CalendarIcon className="w-3 h-3" />
                  Date
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Min Amount */}
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <CurrencyDollarIcon className="w-3 h-3" />
                  Min Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Max Amount */}
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <CurrencyDollarIcon className="w-3 h-3" />
                  Max Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  placeholder="No limit"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Quick:</span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }))}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setFilters(prev => ({ ...prev, date: yesterday.toISOString().split('T')[0] }));
                }}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                Yesterday
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, minAmount: '100' }))}
                className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
              >
                $100+
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, minAmount: '500' }))}
                className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
              >
                $500+
              </button>
            </div>
          </div>

          {/* Results count & Select All */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Select All
                </span>
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
              </span>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {hasActiveFilters 
                    ? 'No transactions match your filters'
                    : 'No transactions without receipts'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map(transaction => (
                  <label
                    key={transaction.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(transaction.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(transaction.id)}
                      onChange={() => handleSelect(transaction.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {transaction.payee || transaction.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(transaction.date).toLocaleDateString()}
                        {transaction.category && ` • ${transaction.category}`}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${
                      transaction.amount >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Creates receipt records linked to selected transactions
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    Add {selectedIds.size} Receipt{selectedIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BulkAddReceiptsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

BulkAddReceiptsModal.defaultProps = {
  isLoading: false
};

export default BulkAddReceiptsModal;
