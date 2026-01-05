/**
 * @fileoverview Receipt Form Tests
 * @description Tests for ReceiptForm component - focused on rendering and key interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceiptForm from '../../features/Receipts/ReceiptForm';

// Mock the ReceiptUpload component to simplify testing
vi.mock('../../features/Receipts/ReceiptUpload', () => ({
  default: ({ disabled }) => (
    <div data-testid="receipt-upload">
      <span>{disabled ? 'Upload Disabled' : 'Upload Enabled'}</span>
    </div>
  )
}));

describe('ReceiptForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockCompanies = [
    { id: 'company-1', name: 'Test Company LLC' },
    { id: 'company-2', name: 'Another Business Inc' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (props = {}) => {
    return render(
      <ReceiptForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        companies={mockCompanies}
        isLoading={false}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render the form with key elements', () => {
      const { container } = renderForm();

      // Form exists
      expect(container.querySelector('form')).toBeInTheDocument();
      
      // Cancel and submit buttons exist
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /receipt/i })).toBeInTheDocument();
    });

    it('should show retention policy warning', () => {
      renderForm();

      expect(screen.getByText(/Receipt Retention Policy/i)).toBeInTheDocument();
    });

    it('should show create button for new receipts', () => {
      renderForm({ isEdit: false });

      expect(screen.getByRole('button', { name: /create receipt/i })).toBeInTheDocument();
    });

    it('should show update button when editing', () => {
      renderForm({ 
        isEdit: true,
        initialData: { vendor: 'Test', amount: 50, date: '2025-01-01' }
      });

      expect(screen.getByRole('button', { name: /update receipt/i })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const existingReceipt = {
      id: 'receipt-1',
      vendor: 'Existing Store',
      amount: 99.99,
      date: '2025-12-15',
      notes: 'Existing notes'
    };

    it('should populate fields with existing data', () => {
      renderForm({ initialData: existingReceipt, isEdit: true });

      // Vendor field should have the value
      const vendorInput = screen.getByDisplayValue('Existing Store');
      expect(vendorInput).toBeInTheDocument();
      
      // Notes field should have the value
      const notesInput = screen.getByDisplayValue('Existing notes');
      expect(notesInput).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable cancel button when loading', () => {
      renderForm({ isLoading: true });

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      renderForm({ isLoading: true });

      const submitButton = screen.getByRole('button', { name: /receipt/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cancel', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
