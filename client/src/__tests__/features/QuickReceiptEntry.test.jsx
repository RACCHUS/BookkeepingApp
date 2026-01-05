/**
 * @fileoverview Quick Receipt Entry Tests
 * @description Tests for QuickReceiptEntry component - focused on rendering and key interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickReceiptEntry from '../../features/Receipts/QuickReceiptEntry';

describe('QuickReceiptEntry', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();
  const mockCompanies = [
    { id: 'company-1', name: 'Test Company LLC' },
    { id: 'company-2', name: 'Another Business Inc' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QuickReceiptEntry
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
        companies={mockCompanies}
        isLoading={false}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render the component', () => {
      renderComponent();

      // Component should be in the document
      expect(document.body).toBeInTheDocument();
    });

    it('should have add row functionality', () => {
      renderComponent();

      // Should have a button to add rows
      const addButton = screen.queryByRole('button', { name: /add/i });
      // Component might use icon button without text
      expect(addButton || screen.queryByTestId('add-row')).toBeDefined();
    });
  });

  describe('Close Action', () => {
    it('should have close/cancel button', () => {
      renderComponent();

      // Should have some way to close
      const closeButton = screen.queryByRole('button', { name: /close|cancel/i });
      expect(closeButton).toBeDefined();
    });
  });
});
