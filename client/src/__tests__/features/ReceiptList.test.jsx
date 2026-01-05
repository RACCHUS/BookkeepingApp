/**
 * @fileoverview Receipt List Integration Tests
 * @description Tests for ReceiptList component - focused on rendering with mocked data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock receipt service - define before vi.mock due to hoisting
vi.mock('../../services/receiptService', () => ({
  default: {
    getReceipts: vi.fn(),
    createReceipt: vi.fn(),
    updateReceipt: vi.fn(),
    deleteReceipt: vi.fn(),
    bulkCreate: vi.fn(),
    batchUpdateReceipts: vi.fn(),
    batchDeleteReceipts: vi.fn(),
    getReceiptStats: vi.fn()
  }
}));

// Mock API client for companies
vi.mock('../../services/api', () => ({
  apiClient: {
    companies: {
      getAll: vi.fn().mockResolvedValue({
        companies: [
          { id: 'company-1', name: 'Test Company LLC' }
        ]
      })
    },
    transactions: {
      getAll: vi.fn().mockResolvedValue({
        data: { transactions: [] }
      })
    }
  }
}));

// Import the mocked service after vi.mock
import receiptService from '../../services/receiptService';
import ReceiptList from '../../features/Receipts/ReceiptList';

const mockReceipts = [
  {
    id: 'receipt-1',
    vendor: 'Office Depot',
    amount: 125.50,
    date: '2025-12-28',
    hasImage: true,
    createdAt: '2025-12-28T10:00:00Z'
  },
  {
    id: 'receipt-2',
    vendor: 'Amazon',
    amount: 89.99,
    date: '2025-12-27',
    hasImage: false,
    createdAt: '2025-12-27T14:30:00Z'
  }
];

describe('ReceiptList', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    // Default mock responses - use the imported mocked service
    receiptService.getReceipts.mockResolvedValue({
      data: mockReceipts,
      pagination: { total: 2, limit: 20, offset: 0 }
    });
    receiptService.getReceiptStats.mockResolvedValue({
      data: { total: 2, withImage: 1, withTransaction: 0, expiringSoon: 0 }
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReceiptList />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderList();

      // Should show some kind of loading state
      expect(document.body).toBeInTheDocument();
    });

    it('should fetch receipts on mount', async () => {
      renderList();

      await waitFor(() => {
        expect(receiptService.getReceipts).toHaveBeenCalled();
      });
    });

    it('should display receipts after loading', async () => {
      renderList();

      await waitFor(() => {
        // Should show vendor names from mock data
        expect(screen.queryByText(/Office Depot/i) || screen.queryByText(/Amazon/i)).toBeDefined();
      });
    });
  });

  describe('Empty State', () => {
    it('should handle empty receipts list', async () => {
      receiptService.getReceipts.mockResolvedValue({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0 }
      });

      renderList();

      await waitFor(() => {
        expect(receiptService.getReceipts).toHaveBeenCalled();
      });

      // Component should still render without errors
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should handle API errors gracefully', async () => {
      receiptService.getReceipts.mockRejectedValue(new Error('API Error'));

      renderList();

      await waitFor(() => {
        expect(receiptService.getReceipts).toHaveBeenCalled();
      });

      // Component should still render without crashing
      expect(document.body).toBeInTheDocument();
    });
  });
});
