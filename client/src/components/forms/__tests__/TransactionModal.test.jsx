import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionModal from '../TransactionModal';

// Mock the API client
vi.mock('../../../services/api', () => ({
  apiClient: {
    pdf: {
      getUploads: vi.fn().mockResolvedValue({ data: [] })
    },
    companies: {
      getAll: vi.fn().mockResolvedValue({ data: { companies: [] } })
    }
  },
  default: {
    pdf: {
      getUploads: vi.fn().mockResolvedValue({ data: [] })
    },
    companies: {
      getAll: vi.fn().mockResolvedValue({ data: { companies: [] } })
    }
  }
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0
      }
    }
  });

const renderWithProviders = (ui) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('TransactionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    renderWithProviders(
      <TransactionModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );
    // When closed, the modal shouldn't render content
    expect(screen.queryByText('Add Transaction')).not.toBeInTheDocument();
  });

  it('renders create mode when open', () => {
    renderWithProviders(
      <TransactionModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );
    
    expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
  });

  it('renders edit mode with transaction data', () => {
    const mockTransaction = {
      id: 'test-123',
      description: 'Test Transaction',
      amount: 100,
      date: '2025-01-01',
      type: 'expense',
      category: 'Office Expenses'
    };

    renderWithProviders(
      <TransactionModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="edit"
      />
    );
    
    expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
  });

  it('renders payment method dropdown with options', () => {
    renderWithProviders(
      <TransactionModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );
    
    // Check that payment method options are rendered
    expect(screen.getByText('Select method...')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('renders category dropdown with groups', () => {
    renderWithProviders(
      <TransactionModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );
    
    // Check that category selection exists by finding the label text
    expect(screen.getByText('Category')).toBeInTheDocument();
    // Check for the select placeholder
    expect(screen.getByText('Select a category')).toBeInTheDocument();
  });
});
