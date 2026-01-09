import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompanySelector from '../CompanySelector';

// Mock the API client
vi.mock('../../../services/api.js', () => ({
  apiClient: {
    companies: {
      getAll: vi.fn().mockResolvedValue({
        data: [
          { id: 'company-1', name: 'Test Company 1', legalName: 'Test Company 1 LLC', isDefault: true },
          { id: 'company-2', name: 'Test Company 2', legalName: 'Test Company 2 Inc', isDefault: false },
          { id: 'company-3', name: 'Another Business', legalName: 'Another Business Corp', isDefault: false }
        ]
      })
    }
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

describe('CompanySelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <CompanySelector value="" onChange={mockOnChange} />
    );
    expect(screen.getByText('Select a company...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    renderWithProviders(
      <CompanySelector 
        value="" 
        onChange={mockOnChange} 
        placeholder="Choose company..."
      />
    );
    expect(screen.getByText('Choose company...')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    renderWithProviders(
      <CompanySelector value="" onChange={mockOnChange} />
    );
    
    const selector = screen.getByText('Select a company...');
    fireEvent.click(selector);
    
    // Dropdown should open - wait for companies to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search companies...')).toBeInTheDocument();
    });
  });

  it('displays selected company', async () => {
    renderWithProviders(
      <CompanySelector value="company-1" onChange={mockOnChange} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
    });
  });

  it('shows All Companies option when allowAll is true', async () => {
    renderWithProviders(
      <CompanySelector 
        value="" 
        onChange={mockOnChange}
        allowAll={true}
      />
    );
    
    const selector = screen.getByText('Select a company...');
    fireEvent.click(selector);
    
    await waitFor(() => {
      expect(screen.getByText('All Companies')).toBeInTheDocument();
    });
  });

  it('calls onChange when company is selected', async () => {
    renderWithProviders(
      <CompanySelector value="" onChange={mockOnChange} />
    );
    
    const selector = screen.getByText('Select a company...');
    fireEvent.click(selector);
    
    await waitFor(() => {
      const company = screen.getByText('Test Company 1');
      fireEvent.click(company);
    });
    
    expect(mockOnChange).toHaveBeenCalledWith('company-1', expect.any(Object));
  });

  it('filters companies by search term', async () => {
    renderWithProviders(
      <CompanySelector value="" onChange={mockOnChange} />
    );
    
    const selector = screen.getByText('Select a company...');
    fireEvent.click(selector);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search companies...');
      fireEvent.change(searchInput, { target: { value: 'Another' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Another Business')).toBeInTheDocument();
      expect(screen.queryByText('Test Company 1')).not.toBeInTheDocument();
    });
  });

  it('shows error styling when error prop is provided', () => {
    const { container } = renderWithProviders(
      <CompanySelector 
        value="" 
        onChange={mockOnChange}
        error="Company is required"
      />
    );
    
    const selectorDiv = container.querySelector('.border-red-500');
    expect(selectorDiv).toBeInTheDocument();
  });

  it('shows create new option when allowCreate is true', async () => {
    const mockOnCreateNew = vi.fn();
    renderWithProviders(
      <CompanySelector 
        value="" 
        onChange={mockOnChange}
        allowCreate={true}
        onCreateNew={mockOnCreateNew}
      />
    );
    
    const selector = screen.getByText('Select a company...');
    fireEvent.click(selector);
    
    await waitFor(() => {
      expect(screen.getByText(/Create new company/i)).toBeInTheDocument();
    });
  });
});
