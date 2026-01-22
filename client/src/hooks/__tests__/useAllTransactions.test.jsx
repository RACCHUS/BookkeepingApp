/**
 * Tests for useAllTransactions hook
 * 
 * Tests the unified transactions hook that provides:
 * - Single query key for all transaction data
 * - Client-side filtering utilities
 * - Cache manipulation utilities
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  useAllTransactions, 
  useIncomeTransactions, 
  useExpenseTransactions,
  useTransactionCounts,
  isIncomeTransaction,
  isExpenseTransaction,
  isUnassignedCheckTransaction,
  ALL_TRANSACTIONS_KEY 
} from '../useAllTransactions';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    transactions: {
      getAll: vi.fn(),
    },
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import api from '../../services/api';
import { toast } from 'react-hot-toast';

// Test data - implementation filters by type only
const mockTransactions = [
  // Income transactions (type: 'income')
  { id: '1', type: 'income', amount: 1000, description: 'Client payment', category: 'Gross Receipts' },
  { id: '2', type: 'income', amount: 500, description: 'Service revenue', category: 'Service Revenue' },
  // Note: tx without type won't be filtered as income/expense by current implementation
  { id: '3', amount: 250, description: 'Deposit', sectionCode: 'deposits' }, // No type - neither income nor expense
  
  // Expense transactions (type: 'expense')
  { id: '4', type: 'expense', amount: -200, description: 'Office supplies', category: 'Office Expenses' },
  { id: '5', type: 'expense', amount: -100, description: 'Software', category: 'Software Subscriptions' },
  // Note: tx without type won't be filtered as expense by current implementation
  { id: '6', amount: -50, description: 'Bank fee' }, // No type - neither income nor expense
  
  // Check transactions (type: 'expense')
  { id: '7', type: 'expense', amount: -500, paymentMethod: 'check', vendorId: 'v1', vendorName: 'Vendor A' },
  { id: '8', type: 'expense', amount: -300, paymentMethod: 'check', vendorId: null, vendorName: null }, // Unassigned
  { id: '9', type: 'expense', amount: -400, sectionCode: 'checks' }, // Unassigned check
];

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('isIncomeTransaction', () => {
  it('returns true for type === income', () => {
    expect(isIncomeTransaction({ type: 'income', amount: 100 })).toBe(true);
  });

  it('returns false for type === expense', () => {
    expect(isIncomeTransaction({ type: 'expense', amount: -100 })).toBe(false);
  });

  // Note: Current implementation only checks tx.type === 'income'
  // Category-based and amount-based detection would need implementation
  it('returns false for income category without type (implementation only checks type)', () => {
    expect(isIncomeTransaction({ category: 'Gross Receipts', amount: 100 })).toBe(false);
    expect(isIncomeTransaction({ category: 'Service Revenue', amount: 100 })).toBe(false);
    expect(isIncomeTransaction({ category: 'Other Income', amount: 100 })).toBe(false);
  });

  it('returns false for deposits section without type (implementation only checks type)', () => {
    expect(isIncomeTransaction({ sectionCode: 'deposits', amount: 100 })).toBe(false);
  });

  it('returns false for positive amount without type (implementation only checks type)', () => {
    expect(isIncomeTransaction({ amount: 100 })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isIncomeTransaction(null)).toBe(false);
    expect(isIncomeTransaction(undefined)).toBe(false);
  });
});

describe('isExpenseTransaction', () => {
  it('returns true for type === expense', () => {
    expect(isExpenseTransaction({ type: 'expense', amount: -100 })).toBe(true);
  });

  it('returns false for type === income', () => {
    expect(isExpenseTransaction({ type: 'income', amount: 100 })).toBe(false);
  });

  // Note: Current implementation only checks tx.type === 'expense'
  it('returns false for negative amount without type (implementation only checks type)', () => {
    expect(isExpenseTransaction({ amount: -100 })).toBe(false);
  });

  it('returns false for positive amount without type', () => {
    expect(isExpenseTransaction({ amount: 100 })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isExpenseTransaction(null)).toBe(false);
    expect(isExpenseTransaction(undefined)).toBe(false);
  });
});

describe('isUnassignedCheckTransaction', () => {
  it('returns true for check without vendor', () => {
    expect(isUnassignedCheckTransaction({ 
      paymentMethod: 'check', 
      vendorId: null, 
      vendorName: null 
    })).toBe(true);
  });

  it('returns true for checks section without vendor', () => {
    expect(isUnassignedCheckTransaction({ 
      sectionCode: 'checks', 
      vendorId: null 
    })).toBe(true);
  });

  it('returns false for check with vendor', () => {
    expect(isUnassignedCheckTransaction({ 
      paymentMethod: 'check', 
      vendorId: 'v1', 
      vendorName: 'Vendor' 
    })).toBe(false);
  });

  it('returns false for non-check transaction', () => {
    expect(isUnassignedCheckTransaction({ 
      paymentMethod: 'card', 
      vendorId: null 
    })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isUnassignedCheckTransaction(null)).toBe(false);
    expect(isUnassignedCheckTransaction(undefined)).toBe(false);
  });
});

describe('useAllTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns all transactions', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions).toHaveLength(9);
    expect(api.transactions.getAll).toHaveBeenCalledWith({ limit: 5000 });
  });

  it('filters income transactions correctly', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should include: id 1, 2 (type: 'income') - id 3 has no type so not filtered
    expect(result.current.incomeTransactions).toHaveLength(2);
    expect(result.current.incomeTransactions.map(t => t.id)).toEqual(['1', '2']);
  });

  it('filters expense transactions correctly', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should include: id 4, 5, 7, 8, 9 (type: 'expense') - id 6 has no type so not filtered
    expect(result.current.expenseTransactions).toHaveLength(5);
  });

  it('filters unassigned check transactions correctly', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should include: id 8, 9 (checks without vendor)
    expect(result.current.unassignedCheckTransactions).toHaveLength(2);
    expect(result.current.unassignedCheckTransactions.map(t => t.id)).toEqual(['8', '9']);
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('API Error');
    api.transactions.getAll.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    // Wait for query to settle - either error or loading false
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // On error, transactions should be empty array (safe default)
    expect(result.current.transactions).toEqual([]);
  });

  it('handles empty response', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: [] }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.incomeTransactions).toEqual([]);
    expect(result.current.expenseTransactions).toEqual([]);
  });

  it('handles malformed response', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: 'not an array' }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
  });

  it('respects custom limit option', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: [] }
    });

    renderHook(() => useAllTransactions({ limit: 500 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.transactions.getAll).toHaveBeenCalledWith({ limit: 500 });
    });
  });

  it('can be disabled', async () => {
    const { result } = renderHook(() => useAllTransactions({ enabled: false }), {
      wrapper: createWrapper(),
    });

    // Should not fetch when disabled
    expect(api.transactions.getAll).not.toHaveBeenCalled();
    expect(result.current.transactions).toEqual([]);
  });
});

describe('useIncomeTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only income transactions', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useIncomeTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Current implementation only checks type === 'income'
    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.transactions.every(t => 
      t.type === 'income'
    )).toBe(true);
  });
});

describe('useExpenseTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only expense transactions', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useExpenseTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Current implementation only checks type === 'expense'
    expect(result.current.transactions).toHaveLength(5);
    expect(result.current.transactions.every(t => 
      t.type === 'expense'
    )).toBe(true);
  });
});

describe('useTransactionCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct counts', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useTransactionCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.total).toBe(9);
    expect(result.current.income).toBe(2); // Only type === 'income'
    expect(result.current.expense).toBe(5); // Only type === 'expense'
    expect(result.current.unassignedChecks).toBe(2);
  });
});

describe('Cache utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateTransactionInCache updates a single transaction', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update transaction 1
    result.current.updateTransactionInCache('1', { description: 'Updated description' });

    // Wait for cache to update
    await waitFor(() => {
      const updated = result.current.transactions.find(t => t.id === '1');
      expect(updated.description).toBe('Updated description');
    });
  });

  it('updateMultipleInCache updates multiple transactions', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update transactions 1 and 2
    result.current.updateMultipleInCache(['1', '2'], { category: 'New Category' });

    await waitFor(() => {
      const tx1 = result.current.transactions.find(t => t.id === '1');
      const tx2 = result.current.transactions.find(t => t.id === '2');
      expect(tx1.category).toBe('New Category');
      expect(tx2.category).toBe('New Category');
    });
  });

  it('removeFromCache removes a single transaction', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.transactions.length;
    result.current.removeFromCache('1');

    await waitFor(() => {
      expect(result.current.transactions.length).toBe(initialCount - 1);
      expect(result.current.transactions.find(t => t.id === '1')).toBeUndefined();
    });
  });

  it('removeMultipleFromCache removes multiple transactions', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.transactions.length;
    result.current.removeMultipleFromCache(['1', '2', '3']);

    await waitFor(() => {
      expect(result.current.transactions.length).toBe(initialCount - 3);
    });
  });

  it('addToCache adds new transactions', async () => {
    api.transactions.getAll.mockResolvedValueOnce({
      data: { transactions: mockTransactions }
    });

    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.transactions.length;
    const newTx = { id: '99', type: 'income', amount: 999, description: 'New transaction' };
    result.current.addToCache(newTx);

    await waitFor(() => {
      expect(result.current.transactions.length).toBe(initialCount + 1);
      expect(result.current.transactions[0].id).toBe('99'); // Added to beginning
    });
  });
});
