import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

// Test utility for rendering components with providers
export const renderWithProviders = (ui, options = {}) => {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  const AllTheProviders = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: AllTheProviders, ...renderOptions }),
    queryClient,
  };
};

// Mock Firebase Auth
export const mockAuth = {
  currentUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
};

// Mock API responses
export const mockApiResponses = {
  transactions: [
    {
      id: '1',
      amount: 100.50,
      description: 'Test Transaction',
      date: '2024-01-15',
      category: 'Office Supplies',
      type: 'expense',
    },
    {
      id: '2',
      amount: 2500.00,
      description: 'Client Payment',
      date: '2024-01-16',
      category: 'Service Revenue',
      type: 'income',
    },
  ],
  companies: [
    {
      id: 'company-1',
      name: 'Test Company LLC',
      type: 'LLC',
      isActive: true,
    },
  ],
  uploads: [
    {
      id: 'upload-1',
      originalFileName: 'statement.pdf',
      status: 'completed',
      transactionCount: 15,
      uploadDate: '2024-01-15T10:00:00Z',
    },
  ],
};

// Common test utilities
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  ...overrides,
});

export const createMockTransaction = (overrides = {}) => ({
  id: '1',
  amount: 100.50,
  description: 'Test Transaction',
  date: '2024-01-15',
  category: 'Office Supplies',
  type: 'expense',
  userId: 'test-user-123',
  companyId: 'company-1',
  ...overrides,
});

export const createMockCompany = (overrides = {}) => ({
  id: 'company-1',
  name: 'Test Company LLC',
  type: 'LLC',
  userId: 'test-user-123',
  isActive: true,
  ...overrides,
});

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
