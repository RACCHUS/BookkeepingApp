/**
 * @fileoverview ExpenseVendorAssignment Component Tests
 * @description Tests for ExpenseVendorAssignment component - vendor assignment to expense transactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks and services
vi.mock('../../hooks/useAllTransactions', () => ({
  useExpenseTransactions: vi.fn(),
  ALL_TRANSACTIONS_KEY: 'all-transactions'
}));

vi.mock('../../services/api', () => ({
  default: {
    payees: {
      getAll: vi.fn(),
      create: vi.fn()
    },
    transactions: {
      update: vi.fn()
    }
  }
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../utils/dateUtils', () => ({
  formatDate: vi.fn((date) => date ? '2025-12-28' : 'N/A')
}));

vi.mock('../../utils/currencyUtils', () => ({
  formatCurrency: vi.fn((amount) => `$${Math.abs(amount || 0).toFixed(2)}`)
}));

// Import after mocks
import { useExpenseTransactions } from '../../hooks/useAllTransactions';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import ExpenseVendorAssignment from '../../features/Expenses/ExpenseVendorAssignment';

// Mock data
const mockExpenseTransactions = [
  {
    id: 'tx-1',
    description: 'Office Supplies',
    payee: 'Staples',
    amount: 125.50,
    date: '2025-12-28',
    type: 'expense',
    vendorId: null,
    vendorName: null,
    paymentMethod: 'card',
    category: 'Office Expenses'
  },
  {
    id: 'tx-2',
    description: 'Software Subscription',
    payee: 'Adobe',
    amount: 89.99,
    date: '2025-12-27',
    type: 'expense',
    vendorId: 'vendor-1',
    vendorName: 'Adobe Inc',
    paymentMethod: 'card',
    category: 'Software'
  },
  {
    id: 'tx-3',
    description: 'Check Payment',
    payee: 'Contractor',
    amount: 500.00,
    date: '2025-12-26',
    type: 'expense',
    paymentMethod: 'check',
    sectionCode: 'checks',
    vendorId: null,
    vendorName: null
  },
  {
    id: 'tx-4',
    description: 'Hardware Purchase',
    payee: 'Best Buy',
    amount: 299.99,
    date: '2025-12-25',
    type: 'expense',
    vendorId: null,
    vendorName: null,
    paymentMethod: 'card',
    category: 'Equipment'
  }
];

const mockVendors = [
  { id: 'vendor-1', name: 'Adobe Inc', type: 'vendor' },
  { id: 'vendor-2', name: 'Office Depot', type: 'vendor' },
  { id: 'vendor-3', name: 'Best Buy', type: 'vendor' }
];

describe('ExpenseVendorAssignment', () => {
  let queryClient;
  const mockOnAssignmentComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Default successful responses
    useExpenseTransactions.mockReturnValue({
      transactions: mockExpenseTransactions,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    api.payees.getAll.mockResolvedValue({
      payees: mockVendors
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ExpenseVendorAssignment
            onAssignmentComplete={mockOnAssignmentComplete}
            {...props}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Loading States', () => {
    it('should show loading skeleton when transactions are loading', () => {
      useExpenseTransactions.mockReturnValue({
        transactions: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      renderComponent();

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading skeleton when vendors are loading', async () => {
      // Make vendors query hang
      api.payees.getAll.mockImplementation(() => new Promise(() => {}));

      useExpenseTransactions.mockReturnValue({
        transactions: mockExpenseTransactions,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      renderComponent();

      // Initially should be loading since vendors haven't resolved
      await waitFor(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error States', () => {
    it('should show error message when transactions fail to load', async () => {
      useExpenseTransactions.mockReturnValue({
        transactions: [],
        isLoading: false,
        error: new Error('Failed to fetch transactions'),
        refetch: vi.fn()
      });

      // Also need vendors to be loaded for error state to show
      api.payees.getAll.mockResolvedValue({ payees: mockVendors });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error loading transactions')).toBeInTheDocument();
      });
      expect(screen.getByText(/Please refresh the page/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call refetch when Try Again button is clicked', async () => {
      const mockRefetch = vi.fn();
      useExpenseTransactions.mockReturnValue({
        transactions: [],
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch
      });

      // Also need vendors to be loaded
      api.payees.getAll.mockResolvedValue({ payees: mockVendors });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      await userEvent.click(tryAgainButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    it('should show only unassigned transactions by default', async () => {
      renderComponent();

      await waitFor(() => {
        // Should show unassigned count (tx-1 and tx-4, excluding check tx-3)
        expect(screen.getByText('Unassigned (2)')).toBeInTheDocument();
      });
    });

    it('should filter out check transactions', async () => {
      renderComponent();

      await waitFor(() => {
        // tx-3 is a check and should not be shown
        expect(screen.queryByText('Check Payment')).not.toBeInTheDocument();
      });
    });

    it('should switch between assigned and unassigned views', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Unassigned (2)')).toBeInTheDocument();
      });

      // Click on Assigned tab
      await user.click(screen.getByText('Assigned (1)'));

      // Should now show assigned transaction
      await waitFor(() => {
        expect(screen.getByText('Software Subscription')).toBeInTheDocument();
      });
    });

    it('should search transactions by description', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by description/)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by description/);
      await user.type(searchInput, 'Office');

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
        expect(screen.queryByText('Hardware Purchase')).not.toBeInTheDocument();
      });
    });
  });

  describe('Transaction Selection', () => {
    it('should allow selecting individual transactions', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      });

      // Find checkboxes and select one
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First transaction checkbox (skip select all)

      // Button should show selection count
      await waitFor(() => {
        expect(screen.getByText(/Assign to 1 Transaction/)).toBeInTheDocument();
      });
    });

    it('should allow selecting all transactions', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      });

      // Click select all checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select all checkbox

      // Should show 2 selected (unassigned, non-check transactions)
      await waitFor(() => {
        expect(screen.getByText(/Assign to 2 Transactions/)).toBeInTheDocument();
      });
    });
  });

  describe('Vendor Assignment', () => {
    it('should show vendor dropdown with options', async () => {
      renderComponent();

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });

      // Check vendor options
      const select = screen.getByRole('combobox');
      expect(within(select).getByText('Choose a vendor...')).toBeInTheDocument();
    });

    it('should require both selection and vendor to assign', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      });

      // Try to assign without selecting anything
      const assignButton = screen.getByText(/Assign to 0 Transaction/);
      expect(assignButton).toBeDisabled();
    });

    it('should successfully assign vendor to selected transactions', async () => {
      const user = userEvent.setup();
      api.transactions.update.mockResolvedValue({ success: true });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      });

      // Select a transaction
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Select a vendor
      const vendorSelect = screen.getByRole('combobox');
      await user.selectOptions(vendorSelect, 'vendor-2');

      // Click assign
      const assignButton = screen.getByText(/Assign to 1 Transaction/);
      await user.click(assignButton);

      await waitFor(() => {
        expect(api.transactions.update).toHaveBeenCalledWith('tx-1', {
          vendorId: 'vendor-2',
          vendorName: 'Office Depot'
        });
      });
    });

    it('should show error toast when assignment fails', async () => {
      const user = userEvent.setup();
      api.transactions.update.mockRejectedValue(new Error('Update failed'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      });

      // Select and try to assign
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const vendorSelect = screen.getByRole('combobox');
      await user.selectOptions(vendorSelect, 'vendor-2');

      const assignButton = screen.getByText(/Assign to 1 Transaction/);
      await user.click(assignButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to assign vendor to transactions');
      });
    });
  });

  describe('Create New Vendor', () => {
    it('should show new vendor form when Add New is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New'));

      expect(screen.getByPlaceholderText('Enter vendor name')).toBeInTheDocument();
      expect(screen.getByText('Create Vendor')).toBeInTheDocument();
    });

    it('should create new vendor and select it', async () => {
      const user = userEvent.setup();
      api.payees.create.mockResolvedValue({ id: 'new-vendor', name: 'New Vendor Inc' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New'));

      const nameInput = screen.getByPlaceholderText('Enter vendor name');
      await user.type(nameInput, 'New Vendor Inc');

      await user.click(screen.getByText('Create Vendor'));

      await waitFor(() => {
        expect(api.payees.create).toHaveBeenCalledWith({
          name: 'New Vendor Inc',
          type: 'vendor',
          isActive: true
        });
        expect(toast.success).toHaveBeenCalledWith('Vendor created successfully');
      });
    });

    it('should show error when creating vendor fails', async () => {
      const user = userEvent.setup();
      api.payees.create.mockRejectedValue(new Error('Create failed'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New'));

      const nameInput = screen.getByPlaceholderText('Enter vendor name');
      await user.type(nameInput, 'New Vendor Inc');

      await user.click(screen.getByText('Create Vendor'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create vendor');
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no unassigned transactions', async () => {
      useExpenseTransactions.mockReturnValue({
        transactions: [mockExpenseTransactions[1]], // Only assigned transaction
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('All expense transactions have vendors assigned!')).toBeInTheDocument();
      });
    });

    it('should show empty state when no assigned transactions in assigned view', async () => {
      const user = userEvent.setup();
      useExpenseTransactions.mockReturnValue({
        transactions: [mockExpenseTransactions[0]], // Only unassigned transaction
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Assigned (0)')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Assigned (0)'));

      await waitFor(() => {
        expect(screen.getByText('No assigned expense transactions found.')).toBeInTheDocument();
      });
    });
  });

  describe('Expand/Collapse Rows', () => {
    it('should expand row to show additional details', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      });

      // Find expand button and click it
      const expandButtons = screen.getAllByTitle('Show details');
      await user.click(expandButtons[0]);

      // Should show expanded details
      await waitFor(() => {
        expect(screen.getByText('Category:')).toBeInTheDocument();
        expect(screen.getByText('Office Expenses')).toBeInTheDocument();
      });
    });
  });
});
