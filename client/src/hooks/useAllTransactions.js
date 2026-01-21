/**
 * useAllTransactions - Unified hook for fetching all transactions
 * 
 * Provides a single source of truth for transaction data across the app.
 * Components filter client-side based on their needs (income, expense, etc.)
 * 
 * Features:
 * - Single query key for all transaction data
 * - Client-side filtering utilities
 * - Selective cache invalidation
 * - Error handling and retry logic
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Shared query key for all transactions
export const ALL_TRANSACTIONS_KEY = 'all-transactions';

// Cache configuration - balanced between freshness and performance
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,    // Data stays fresh for 5 minutes
  cacheTime: 15 * 60 * 1000,   // Keep in cache for 15 minutes
  refetchOnWindowFocus: false,  // Don't refetch on tab focus
  refetchOnMount: false,        // Use cached data if available
  retry: 2,                     // Retry twice on failure
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
};

// Income categories from IRS Schedule C
const INCOME_CATEGORIES = [
  'Gross Receipts', 'Gross Receipts - Sales', 'Gross Receipts - Services',
  'Gross Receipts or Sales', 'Returns and Allowances', 'Interest Income',
  'Dividend Income', 'Rental Income', 'Royalties', 'Other Income',
  'Business Income', 'Customer Payments', 'Service Revenue', 'Product Sales',
  'Consulting Income', 'Freelance Income', 'Commission Income', 'Refunds Received'
];

// Section codes that indicate expenses (withdrawals from bank)
const EXPENSE_SECTION_CODES = ['checks', 'card', 'electronic'];

// Section codes that indicate income (deposits to bank)
const INCOME_SECTION_CODES = ['deposits'];

/**
 * Check if a transaction is income
 * @param {Object} tx - Transaction object
 * @returns {boolean}
 */
export const isIncomeTransaction = (tx) => {
  if (!tx) return false;
  if (tx.type === 'income') return true;
  if (tx.type === 'expense') return false;
  
  // Check for income section code (deposits)
  if (INCOME_SECTION_CODES.includes(tx.sectionCode)) return true;
  
  // Check for expense section code (not income)
  if (EXPENSE_SECTION_CODES.includes(tx.sectionCode)) return false;
  
  // Check for income category
  if (tx.category) {
    const catLower = tx.category.toLowerCase();
    if (INCOME_CATEGORIES.some(cat => catLower.includes(cat.toLowerCase()))) {
      return true;
    }
    if (catLower.includes('income') || catLower.includes('receipt') || catLower.includes('revenue')) {
      return true;
    }
  }
  
  // Positive amounts typically indicate income (fallback)
  if (tx.amount > 0) return true;
  
  return false;
};

/**
 * Check if a transaction is an expense
 * @param {Object} tx - Transaction object
 * @returns {boolean}
 */
export const isExpenseTransaction = (tx) => {
  if (!tx) return false;
  
  // Primary: check the type field (most reliable for DB transactions)
  if (tx.type === 'expense') return true;
  if (tx.type === 'income') return false;
  
  // Fallback: check for expense section codes (PDF imports)
  if (EXPENSE_SECTION_CODES.includes(tx.sectionCode)) return true;
  if (INCOME_SECTION_CODES.includes(tx.sectionCode)) return false;
  
  // Last resort: negative amounts (pre-existing data)
  if (tx.amount < 0) return true;
  
  // Default to false - if we can't determine, don't include
  return false;
};

/**
 * Check if a transaction is a check without vendor assigned
 * @param {Object} tx - Transaction object
 * @returns {boolean}
 */
export const isUnassignedCheckTransaction = (tx) => {
  if (!tx) return false;
  const isCheck = tx.paymentMethod === 'check' || tx.sectionCode === 'checks';
  const hasNoVendor = !tx.vendorId && !tx.vendorName;
  return isCheck && hasNoVendor;
};

/**
 * Main hook for fetching all transactions
 * @param {Object} options - Query options
 * @param {number} options.limit - Max transactions to fetch (default: 5000)
 * @param {boolean} options.enabled - Whether to enable the query (default: true)
 * @returns {Object} Query result with transactions and utilities
 */
export function useAllTransactions(options = {}) {
  const { limit = 5000, enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ALL_TRANSACTIONS_KEY],
    queryFn: async () => {
      try {
        console.log(`[useAllTransactions] Fetching transactions with limit: ${limit}`);
        const response = await api.transactions.getAll({ limit });
        const transactions = response?.data?.transactions || response?.transactions || [];
        
        console.log(`[useAllTransactions] Received ${transactions.length} transactions`);
        
        if (!Array.isArray(transactions)) {
          console.error('Invalid transactions response:', response);
          return [];
        }
        
        // Debug: count by type
        const typeCounts = transactions.reduce((acc, tx) => {
          acc[tx.type || 'undefined'] = (acc[tx.type || 'undefined'] || 0) + 1;
          return acc;
        }, {});
        console.log('[useAllTransactions] Transaction counts by type:', typeCounts);
        
        return transactions;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        // Re-throw to let React Query handle retry
        throw error;
      }
    },
    ...QUERY_CONFIG,
    enabled,
    onError: (error) => {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions. Please refresh the page.');
    },
  });

  // Memoized filtered arrays for common use cases
  const incomeTransactions = useMemo(() => {
    if (!query.data) return [];
    const result = query.data.filter(isIncomeTransaction);
    console.log(`[useAllTransactions] Income: ${result.length} of ${query.data.length} total`);
    return result;
  }, [query.data]);

  const expenseTransactions = useMemo(() => {
    if (!query.data) return [];
    const result = query.data.filter(isExpenseTransaction);
    console.log(`[useAllTransactions] Expenses: ${result.length} of ${query.data.length} total`);
    // Debug: log a sample of what's being filtered out
    if (query.data.length > 0 && result.length < query.data.length / 2) {
      const sample = query.data.slice(0, 5);
      console.log('[useAllTransactions] Sample transactions:', sample.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        sectionCode: tx.sectionCode,
        description: tx.description?.substring(0, 30)
      })));
    }
    return result;
  }, [query.data]);

  const unassignedCheckTransactions = useMemo(() => {
    if (!query.data) return [];
    return query.data.filter(isUnassignedCheckTransaction);
  }, [query.data]);

  /**
   * Invalidate and refetch all transactions
   */
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
  }, [queryClient]);

  /**
   * Update a single transaction in the cache without refetching
   * @param {string} transactionId - ID of transaction to update
   * @param {Object} updates - Fields to update
   */
  const updateTransactionInCache = useCallback((transactionId, updates) => {
    queryClient.setQueryData([ALL_TRANSACTIONS_KEY], (oldData) => {
      if (!oldData) return oldData;
      return oldData.map(tx => 
        tx.id === transactionId ? { ...tx, ...updates } : tx
      );
    });
  }, [queryClient]);

  /**
   * Update multiple transactions in the cache without refetching
   * @param {string[]} transactionIds - IDs of transactions to update
   * @param {Object} updates - Fields to update
   */
  const updateMultipleInCache = useCallback((transactionIds, updates) => {
    const idSet = new Set(transactionIds);
    queryClient.setQueryData([ALL_TRANSACTIONS_KEY], (oldData) => {
      if (!oldData) return oldData;
      return oldData.map(tx => 
        idSet.has(tx.id) ? { ...tx, ...updates } : tx
      );
    });
  }, [queryClient]);

  /**
   * Remove a transaction from the cache
   * @param {string} transactionId - ID of transaction to remove
   */
  const removeFromCache = useCallback((transactionId) => {
    queryClient.setQueryData([ALL_TRANSACTIONS_KEY], (oldData) => {
      if (!oldData) return oldData;
      return oldData.filter(tx => tx.id !== transactionId);
    });
  }, [queryClient]);

  /**
   * Remove multiple transactions from the cache
   * @param {string[]} transactionIds - IDs of transactions to remove
   */
  const removeMultipleFromCache = useCallback((transactionIds) => {
    const idSet = new Set(transactionIds);
    queryClient.setQueryData([ALL_TRANSACTIONS_KEY], (oldData) => {
      if (!oldData) return oldData;
      return oldData.filter(tx => !idSet.has(tx.id));
    });
  }, [queryClient]);

  /**
   * Add new transactions to the cache
   * @param {Object[]} newTransactions - Transactions to add
   */
  const addToCache = useCallback((newTransactions) => {
    const txArray = Array.isArray(newTransactions) ? newTransactions : [newTransactions];
    queryClient.setQueryData([ALL_TRANSACTIONS_KEY], (oldData) => {
      if (!oldData) return txArray;
      // Add to beginning (most recent first)
      return [...txArray, ...oldData];
    });
  }, [queryClient]);

  return {
    // Query state
    transactions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    
    // Pre-filtered arrays
    incomeTransactions,
    expenseTransactions,
    unassignedCheckTransactions,
    
    // Utilities
    refetch: query.refetch,
    invalidateAll,
    updateTransactionInCache,
    updateMultipleInCache,
    removeFromCache,
    removeMultipleFromCache,
    addToCache,
    
    // Filter helpers (for custom filtering)
    isIncomeTransaction,
    isExpenseTransaction,
    isUnassignedCheckTransaction,
  };
}

/**
 * Hook for components that only need income transactions
 * Uses the shared cache but returns only income
 */
export function useIncomeTransactions(options = {}) {
  const result = useAllTransactions(options);
  return {
    ...result,
    transactions: result.incomeTransactions,
  };
}

/**
 * Hook for components that only need expense transactions
 * Uses the shared cache but returns only expenses
 */
export function useExpenseTransactions(options = {}) {
  const result = useAllTransactions(options);
  return {
    ...result,
    transactions: result.expenseTransactions,
  };
}

/**
 * Hook for getting transaction counts without full data
 * Useful for badges and summaries
 */
export function useTransactionCounts() {
  const { transactions, incomeTransactions, expenseTransactions, unassignedCheckTransactions, isLoading } = useAllTransactions();
  
  return useMemo(() => ({
    total: transactions.length,
    income: incomeTransactions.length,
    expense: expenseTransactions.length,
    unassignedChecks: unassignedCheckTransactions.length,
    isLoading,
  }), [transactions.length, incomeTransactions.length, expenseTransactions.length, unassignedCheckTransactions.length, isLoading]);
}

export default useAllTransactions;
