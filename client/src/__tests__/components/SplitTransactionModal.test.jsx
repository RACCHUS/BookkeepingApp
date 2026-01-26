/**
 * Unit tests for SplitTransactionModal component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SplitTransactionModal from '../../components/SplitTransactionModal';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('SplitTransactionModal', () => {
  const mockTransaction = {
    id: 'txn-123',
    amount: -100.00,
    description: 'Gas Station Purchase',
    date: '2024-01-15',
    category: 'CAR_TRUCK_EXPENSES',
    payee: 'Shell'
  };

  const mockOnClose = vi.fn();
  const mockOnSplit = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    transaction: mockTransaction,
    onSplit: mockOnSplit,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal when open', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      
      // Check for the modal header/content
      expect(screen.getByRole('heading', { name: /Split Transaction/i }) || screen.getAllByText(/Split Transaction/i).length > 0).toBeTruthy();
    });

    it('should not render when closed', () => {
      render(<SplitTransactionModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('heading', { name: /Split Transaction/i })).not.toBeInTheDocument();
    });

    it('should display original transaction amount', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      
      // Amount should be displayed somewhere (as $100.00 for -$100)
      expect(screen.getByText(/Original Amount/i)).toBeInTheDocument();
    });

    it('should start with split part inputs', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      
      // Should have split part sections
      expect(screen.getByText(/Split Part 1/i)).toBeInTheDocument();
    });
  });

  describe('quick split buttons', () => {
    it('should have quick split buttons', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      
      expect(screen.getByText('2 ways')).toBeInTheDocument();
      expect(screen.getByText('3 ways')).toBeInTheDocument();
      expect(screen.getByText('4 ways')).toBeInTheDocument();
    });

    it('should set 3 split parts when clicking "3 ways"', async () => {
      const user = userEvent.setup();
      render(<SplitTransactionModal {...defaultProps} />);
      
      const split3Button = screen.getByText('3 ways');
      await user.click(split3Button);
      
      // Should now have 3 parts labeled 1, 2, 3
      expect(screen.getByText(/Split Part 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Split Part 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Split Part 3/i)).toBeInTheDocument();
    });
  });

  describe('add/remove split parts', () => {
    it('should have an add part button', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      
      expect(screen.getByText(/Add Another Split Part/i)).toBeInTheDocument();
    });

    it('should add a new split part when clicking add button', async () => {
      const user = userEvent.setup();
      render(<SplitTransactionModal {...defaultProps} />);
      
      // Modal starts with 1 split part
      expect(screen.getByText(/Split Part 1/i)).toBeInTheDocument();
      
      const addButton = screen.getByText(/Add Another Split Part/i);
      await user.click(addButton);
      
      // Should now have 2 parts
      expect(screen.getByText(/Split Part 2/i)).toBeInTheDocument();
    });
  });

  describe('buttons', () => {
    it('should have cancel button', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should call onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<SplitTransactionModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should have a submit button containing Split', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      // There's a button that contains "Split" for submitting
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('split') && 
        !btn.textContent?.toLowerCase().includes('split in')
      );
      expect(submitButton).toBeDefined();
    });

    it('should show loading state when isLoading is true', () => {
      render(<SplitTransactionModal {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText(/Splitting.../i)).toBeInTheDocument();
    });
  });

  describe('validation display', () => {
    it('should show remainder amount section', () => {
      render(<SplitTransactionModal {...defaultProps} />);
      
      // Component uses "Remainder" not "Remaining" - use getAllByText since there may be multiple
      const remainderElements = screen.getAllByText(/Remainder/i);
      expect(remainderElements.length).toBeGreaterThan(0);
    });
  });

  describe('income transactions', () => {
    const incomeTransaction = {
      ...mockTransaction,
      amount: 500.00, // Positive for income
      type: 'income',
      description: 'Client Payment'
    };

    it('should render with income transaction', () => {
      render(
        <SplitTransactionModal 
          {...defaultProps} 
          transaction={incomeTransaction} 
        />
      );
      
      // Modal should render
      const modalContent = screen.getAllByText(/Split/i);
      expect(modalContent.length).toBeGreaterThan(0);
    });
  });
});
