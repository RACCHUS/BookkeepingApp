import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  FunnelIcon,
  DocumentPlusIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

/**
 * BulkAddChecksModal - Create check records from existing transactions
 * For transactions that are already on your bank statement
 */
const BulkAddChecksModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  // Filter state
  const [filters, setFilters] = useState({
    payee: '',
    date: '',
    minAmount: '',
    maxAmount: '',
    sectionCode: 'checks' // Default to checks section
  });
  
  // Selected transactions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Fetch transactions
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', 'for-checks'],
    queryFn: () => api.transactions.getAll({ limit: 500 }),
    enabled: isOpen
  });

  // Get unique payees for suggestions
  const uniquePayees = useMemo(() => {
    if (!transactionsData?.data?.transactions) return [];
    const payees = new Set();
    transactionsData.data.transactions.forEach(t => {
      if (t.payee) payees.add(t.payee);
    });
    return [...payees].sort();
  }, [transactionsData]);

  // Filter transactions based on criteria
  const filteredTransactions = useMemo(() => {
    if (!transactionsData?.data?.transactions) return [];
    
    let transactions = transactionsData.data.transactions;

    // Filter out transactions that already have checks
    transactions = transactions.filter(t => !t.checkId);

    // Filter by section (checks are usually from 'checks' section)
    if (filters.sectionCode) {
      transactions = transactions.filter(t => t.sectionCode === filters.sectionCode);
    }

    // Apply payee filter
    if (filters.payee) {
      const payeeLower = filters.payee.toLowerCase();
      transactions = transactions.filter(t => 
        (t.payee && t.payee.toLowerCase().includes(payeeLower)) ||
        (t.description && t.description.toLowerCase().includes(payeeLower))
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
  const hasActiveFilters = filters.payee || filters.date || filters.minAmount || filters.maxAmount;

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
    setFilters({ payee: '', date: '', minAmount: '', maxAmount: '', sectionCode: 'checks' });
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
              <BanknotesIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Link Checks to Transactions
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create check records from existing transactions (already on bank statement)
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Section Filter */}
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <DocumentPlusIcon className="w-3 h-3" />
                  Section
                </label>
                <select
                  value={filters.sectionCode}
                  onChange={(e) => setFilters(prev => ({ ...prev, sectionCode: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sections</option>
                  <option value="checks">Checks (CHECKS PAID)</option>
                  <option value="deposits">Deposits</option>
                  <option value="electronic">Electronic</option>
                  <option value="card">Card Transactions</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>

              {/* Payee Filter */}
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <BuildingOfficeIcon className="w-3 h-3" />
                  Payee
                </label>
                <input
                  type="text"
                  list="payees"
                  value={filters.payee}
                  onChange={(e) => setFilters(prev => ({ ...prev, payee: e.target.value }))}
                  placeholder="Search payee..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="payees">
                  {uniquePayees.map(payee => (
                    <option key={payee} value={payee} />
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
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
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
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loadingTransactions ? (
              <div className="text-center py-8 text-gray-500">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BanknotesIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>No transactions found without check records</p>
                <p className="text-sm mt-1">Try adjusting your filters or section selection</p>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                <div className="flex items-center justify-between mb-3 px-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Select all ({filteredTransactions.length})
                    </span>
                  </label>
                  {selectedIds.size > 0 && (
                    <span className="text-sm text-blue-600 font-medium">
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>

                {/* Transaction List */}
                <div className="space-y-2">
                  {filteredTransactions.map(transaction => (
                    <label
                      key={transaction.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(transaction.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(transaction.id)}
                        onChange={() => handleSelect(transaction.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      
                      {/* Check icon indicator */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.amount >= 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                      }`}>
                        <BanknotesIcon className="w-4 h-4" />
                      </div>

                      {/* Transaction Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {transaction.payee || transaction.description || 'Unknown'}
                          </span>
                          <span className={`font-semibold ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount >= 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                          {transaction.checkNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-xs">
                              Check #{transaction.checkNumber}
                            </span>
                          )}
                          {transaction.sectionCode && (
                            <span className="text-xs text-gray-400">
                              • {transaction.sectionCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.amount >= 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {transaction.amount >= 0 ? 'Income' : 'Expense'}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size > 0 ? (
                <span>
                  Will create <strong className="text-gray-700 dark:text-gray-200">{selectedIds.size}</strong> check record{selectedIds.size !== 1 ? 's' : ''} linked to existing transactions
                </span>
              ) : (
                <span>Select transactions to create check records</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Create {selectedIds.size} Check{selectedIds.size !== 1 ? 's' : ''}
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

BulkAddChecksModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

BulkAddChecksModal.defaultProps = {
  isLoading: false
};

export default BulkAddChecksModal;
