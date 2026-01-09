import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionRow from '../TransactionRow';

describe('TransactionRow', () => {
  const mockTransaction = {
    id: 'tx-456',
    description: 'Client Payment',
    amount: 1000,
    date: '2025-01-10',
    type: 'income',
    category: 'Gross Receipts or Sales',
    payee: 'ABC Corp'
  };

  const defaultProps = {
    transaction: mockTransaction,
    isSelectMode: false,
    isSelected: false,
    onSelect: vi.fn(),
    editingCategoryId: null,
    editingCategoryValue: '',
    onCategoryEdit: vi.fn(),
    onCategoryChange: vi.fn(),
    onCategoryKeyPress: vi.fn(),
    onSaveCategoryEdit: vi.fn(),
    onCancelCategoryEdit: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    deletingId: null
  };

  it('renders without crashing', () => {
    render(<TransactionRow {...defaultProps} />);
    expect(screen.getByText('Client Payment')).toBeInTheDocument();
  });

  it('displays transaction description', () => {
    render(<TransactionRow {...defaultProps} />);
    expect(screen.getByText('Client Payment')).toBeInTheDocument();
  });

  it('displays formatted currency amount', () => {
    render(<TransactionRow {...defaultProps} />);
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('displays formatted date', () => {
    render(<TransactionRow {...defaultProps} />);
    expect(screen.getByText(/Jan 10, 2025/)).toBeInTheDocument();
  });

  it('displays payee with category', () => {
    render(<TransactionRow {...defaultProps} />);
    expect(screen.getByText(/ABC Corp/)).toBeInTheDocument();
  });

  it('shows income type styling', () => {
    const { container } = render(<TransactionRow {...defaultProps} />);
    // Income should have green styling
    const incomeIndicator = container.querySelector('.bg-green-100, .text-green-600');
    expect(incomeIndicator).toBeTruthy();
  });

  it('shows expense type styling for expense transactions', () => {
    const expenseTransaction = {
      ...mockTransaction,
      type: 'expense',
      amount: -200
    };
    
    const { container } = render(
      <TransactionRow {...defaultProps} transaction={expenseTransaction} />
    );
    
    // Expense should have red styling
    const expenseIndicator = container.querySelector('.bg-red-100, .text-red-600');
    expect(expenseIndicator).toBeTruthy();
  });

  it('shows checkbox in select mode', () => {
    render(<TransactionRow {...defaultProps} isSelectMode={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('checkbox is checked when isSelected', () => {
    render(<TransactionRow {...defaultProps} isSelectMode={true} isSelected={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onSelect when checkbox clicked', () => {
    const onSelect = vi.fn();
    render(<TransactionRow {...defaultProps} isSelectMode={true} onSelect={onSelect} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(onSelect).toHaveBeenCalledWith('tx-456');
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<TransactionRow {...defaultProps} onEdit={onEdit} />);
    
    const editButton = screen.getByTitle('Edit transaction');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockTransaction);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<TransactionRow {...defaultProps} onDelete={onDelete} />);
    
    const deleteButton = screen.getByTitle('Delete transaction');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith('tx-456');
  });

  it('disables delete button when deletingId matches', () => {
    render(<TransactionRow {...defaultProps} deletingId="tx-456" />);
    const deleteButton = screen.getByTitle('Delete transaction');
    expect(deleteButton).toBeDisabled();
  });

  it('shows category editing mode', () => {
    render(
      <TransactionRow 
        {...defaultProps} 
        editingCategoryId="tx-456"
        editingCategoryValue="Advertising"
      />
    );
    
    // Should show dropdown for category selection
    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toBeInTheDocument();
    expect(categorySelect).toHaveValue('Advertising');
  });

  it('shows save and cancel buttons during category edit', () => {
    render(
      <TransactionRow 
        {...defaultProps} 
        editingCategoryId="tx-456"
        editingCategoryValue="Advertising"
      />
    );
    
    expect(screen.getByTitle('Save category')).toBeInTheDocument();
    expect(screen.getByTitle('Cancel edit')).toBeInTheDocument();
  });

  it('calls onSaveCategoryEdit when save clicked', () => {
    const onSaveCategoryEdit = vi.fn();
    render(
      <TransactionRow 
        {...defaultProps} 
        editingCategoryId="tx-456"
        editingCategoryValue="Advertising"
        onSaveCategoryEdit={onSaveCategoryEdit}
      />
    );
    
    const saveButton = screen.getByTitle('Save category');
    fireEvent.click(saveButton);
    
    expect(onSaveCategoryEdit).toHaveBeenCalled();
  });

  it('calls onCancelCategoryEdit when cancel clicked', () => {
    const onCancelCategoryEdit = vi.fn();
    render(
      <TransactionRow 
        {...defaultProps} 
        editingCategoryId="tx-456"
        editingCategoryValue="Advertising"
        onCancelCategoryEdit={onCancelCategoryEdit}
      />
    );
    
    const cancelButton = screen.getByTitle('Cancel edit');
    fireEvent.click(cancelButton);
    
    expect(onCancelCategoryEdit).toHaveBeenCalled();
  });

  it('displays Uncategorized when no category', () => {
    const uncategorizedTx = {
      ...mockTransaction,
      category: ''
    };
    
    render(<TransactionRow {...defaultProps} transaction={uncategorizedTx} />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('handles null date gracefully', () => {
    const noDateTx = {
      ...mockTransaction,
      date: null
    };
    
    render(<TransactionRow {...defaultProps} transaction={noDateTx} />);
    // Should render without crashing
    expect(screen.getByText('Client Payment')).toBeInTheDocument();
  });

  it('handles various date formats', () => {
    const isoDateTx = {
      ...mockTransaction,
      date: '2025-01-10T14:30:00Z'
    };
    
    render(<TransactionRow {...defaultProps} transaction={isoDateTx} />);
    expect(screen.getByText(/Jan 10, 2025/)).toBeInTheDocument();
  });
});
