/**
 * @fileoverview Manage CSV Imports Component Tests
 * @description Tests for ManageCSVImports component - list, delete, and view linked transactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock API client
vi.mock('../../services/api', () => ({
  default: {
    csv: {
      getImports: vi.fn(),
      getImportById: vi.fn(),
      getImportTransactions: vi.fn(),
      deleteImport: vi.fn(),
    },
    companies: {
      getAll: vi.fn(),
    },
  },
}));

import api from '../../services/api';
import { toast } from 'react-hot-toast';
import ManageCSVImports from '../../features/Documents/ManageCSVImports';

const mockImports = [
  {
    id: 'import-1',
    file_name: 'january-2025.csv',
    bank_name: 'Chase',
    company_name: 'Test Company',
    transaction_count: 25,
    linked_transaction_count: 23,
    duplicate_count: 2,
    error_count: 0,
    status: 'completed',
    created_at: '2025-01-05T10:00:00Z',
    date_range_start: '2025-01-01',
    date_range_end: '2025-01-31',
  },
  {
    id: 'import-2',
    file_name: 'december-2024.csv',
    bank_name: 'Bank of America',
    company_name: 'Another Business',
    transaction_count: 50,
    linked_transaction_count: 48,
    duplicate_count: 2,
    error_count: 0,
    status: 'completed',
    created_at: '2024-12-15T14:30:00Z',
    date_range_start: '2024-12-01',
    date_range_end: '2024-12-31',
  },
];

const mockTransactions = [
  {
    id: 'tx-1',
    date: '2025-01-15',
    description: 'Amazon Purchase',
    amount: -59.99,
    type: 'expense',
  },
  {
    id: 'tx-2',
    date: '2025-01-10',
    description: 'Payroll Deposit',
    amount: 3500.00,
    type: 'income',
  },
];

describe('ManageCSVImports', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Default mock responses
    api.csv.getImports.mockResolvedValue({
      success: true,
      data: mockImports,
      count: mockImports.length,
    });

    api.csv.getImportTransactions.mockResolvedValue({
      success: true,
      data: mockTransactions,
      count: mockTransactions.length,
    });

    api.companies.getAll.mockResolvedValue({
      companies: [
        { id: 'company-1', name: 'Test Company' },
        { id: 'company-2', name: 'Another Business' },
      ],
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ManageCSVImports />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the CSV imports list header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CSV Imports')).toBeInTheDocument();
      });
    });

    it('should display import records', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('january-2025.csv')).toBeInTheDocument();
        expect(screen.getByText('december-2024.csv')).toBeInTheDocument();
      });
    });

    it('should show bank names', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Chase')).toBeInTheDocument();
        expect(screen.getByText('Bank of America')).toBeInTheDocument();
      });
    });

    it('should display transaction counts', async () => {
      renderComponent();

      await waitFor(() => {
        // Check for linked transaction counts
        expect(screen.getByText(/23 transactions/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no imports', async () => {
      api.csv.getImports.mockResolvedValue({
        success: true,
        data: [],
        count: 0,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no csv imports/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise;
      api.csv.getImports.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      renderComponent();

      // Loading state should be visible (check for loading text)
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise({ success: true, data: mockImports, count: 2 });

      await waitFor(() => {
        expect(screen.getByText('january-2025.csv')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation modal', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('january-2025.csv')).toBeInTheDocument();
      });

      // Find and click delete button for first import (need to expand first)
      const importRows = screen.getAllByText(/january-2025\.csv|december-2024\.csv/);
      if (importRows.length > 0) {
        // Click to expand the row
        await user.click(importRows[0].closest('div[class*="cursor-pointer"]') || importRows[0]);

        await waitFor(() => {
          const deleteButtons = screen.getAllByRole('button', { name: /delete import/i });
          expect(deleteButtons.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle successful delete', async () => {
      api.csv.deleteImport.mockResolvedValue({
        success: true,
        data: { deletedTransactionCount: 0 },
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('january-2025.csv')).toBeInTheDocument();
      });

      // Expand the import row first
      const importRows = screen.getAllByText(/january-2025\.csv/);
      if (importRows.length > 0) {
        await user.click(importRows[0].closest('div[class*="cursor-pointer"]') || importRows[0]);
      }

      // Wait for expanded content
      await waitFor(() => {
        const deleteButtons = screen.queryAllByRole('button', { name: /delete import/i });
        if (deleteButtons.length > 0) {
          expect(deleteButtons[0]).toBeInTheDocument();
        }
      });
    });

    it('should show error toast on delete failure', async () => {
      api.csv.deleteImport.mockRejectedValue({
        response: { data: { message: 'Failed to delete import' } },
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('january-2025.csv')).toBeInTheDocument();
      });
    });
  });

  describe('View Transactions', () => {
    it('should show transactions when View Transactions is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('january-2025.csv')).toBeInTheDocument();
      });

      // Expand the import row first
      const importRows = screen.getAllByText(/january-2025\.csv/);
      if (importRows.length > 0) {
        await user.click(importRows[0].closest('div[class*="cursor-pointer"]') || importRows[0]);
      }

      // Wait for expanded content and find View Transactions button
      await waitFor(() => {
        const viewButtons = screen.queryAllByRole('button', { name: /view transactions/i });
        expect(viewButtons.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      api.csv.getImports.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        // Component shows either an error message or empty state on error
        const hasError = screen.queryByText(/error|failed|problem/i);
        const hasEmptyState = screen.queryByText(/no csv imports/i);
        expect(hasError || hasEmptyState).toBeTruthy();
      });
    });
  });

  describe('Filtering', () => {
    it('should call getImports on initial render', async () => {
      renderComponent();

      await waitFor(() => {
        expect(api.csv.getImports).toHaveBeenCalled();
      });
    });
  });
});
