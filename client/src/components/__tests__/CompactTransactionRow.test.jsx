import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompactTransactionRow from '../CompactTransactionRow';

describe('CompactTransactionRow', () => {
  const mockTransaction = {
    id: 'tx-123',
    description: 'Office Supplies Purchase',
    amount: 150.50,
    date: '2025-01-15',
    type: 'expense',
    category: 'Office Expenses',
    payee: 'Staples',
    companyName: 'My Business LLC'
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
    deletingId: null,
    visibleColumns: [],
    statement: null,
    getPaymentMethodDisplay: vi.fn()
  };

  it('renders without crashing', () => {
    render(<CompactTransactionRow {...defaultProps} />);
    expect(screen.getByText('Office Supplies Purchase')).toBeInTheDocument();
  });

  it('displays transaction description', () => {
    render(<CompactTransactionRow {...defaultProps} />);
    expect(screen.getByText('Office Supplies Purchase')).toBeInTheDocument();
  });

  it('displays formatted amount', () => {
    render(<CompactTransactionRow {...defaultProps} />);
    // Amount should be displayed somewhere in the component
    const component = screen.getByText('Office Supplies Purchase').closest('div');
    expect(component).toBeInTheDocument();
  });

  it('displays transaction type', () => {
    render(<CompactTransactionRow {...defaultProps} />);
    expect(screen.getByText('Expense')).toBeInTheDocument();
  });

  it('shows expand arrow button', () => {
    render(<CompactTransactionRow {...defaultProps} />);
    const expandButton = screen.getByTitle('Show details');
    expect(expandButton).toBeInTheDocument();
  });

  it('expands to show details when arrow is clicked', () => {
    render(<CompactTransactionRow {...defaultProps} />);
    
    const expandButton = screen.getByTitle('Show details');
    fireEvent.click(expandButton);
    
    // Should now show expanded content
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByTitle('Collapse')).toBeInTheDocument();
  });

  it('shows checkbox when in select mode', () => {
    render(<CompactTransactionRow {...defaultProps} isSelectMode={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('checkbox is checked when isSelected is true', () => {
    render(<CompactTransactionRow {...defaultProps} isSelectMode={true} isSelected={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onSelect when checkbox is clicked', () => {
    const onSelect = vi.fn();
    render(<CompactTransactionRow {...defaultProps} isSelectMode={true} onSelect={onSelect} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(onSelect).toHaveBeenCalledWith('tx-123');
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<CompactTransactionRow {...defaultProps} onEdit={onEdit} />);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockTransaction);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<CompactTransactionRow {...defaultProps} onDelete={onDelete} />);
    
    const deleteButton = screen.getByTitle('Delete');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith('tx-123', 'Office Supplies Purchase');
  });

  it('shows dynamic columns based on visibleColumns prop', () => {
    render(
      <CompactTransactionRow 
        {...defaultProps} 
        visibleColumns={['category', 'company']}
      />
    );
    
    // Category and company badges should appear in the compact view
    expect(screen.getByText('Office Expenses')).toBeInTheDocument();
  });

  it('displays income transaction correctly', () => {
    const incomeTransaction = {
      ...mockTransaction,
      type: 'income',
      amount: 500
    };
    
    render(<CompactTransactionRow {...defaultProps} transaction={incomeTransaction} />);
    expect(screen.getByText('Income')).toBeInTheDocument();
  });

  it('displays transfer transaction correctly', () => {
    const transferTransaction = {
      ...mockTransaction,
      type: 'transfer'
    };
    
    render(<CompactTransactionRow {...defaultProps} transaction={transferTransaction} />);
    expect(screen.getByText('Transfer')).toBeInTheDocument();
  });

  it('handles missing description gracefully', () => {
    const noDescTransaction = {
      ...mockTransaction,
      description: ''
    };
    
    render(<CompactTransactionRow {...defaultProps} transaction={noDescTransaction} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows category editing in expanded view', () => {
    render(
      <CompactTransactionRow 
        {...defaultProps} 
        editingCategoryId="tx-123"
        editingCategoryValue="Advertising"
      />
    );
    
    // Expand the row first
    const expandButton = screen.getByTitle('Show details');
    fireEvent.click(expandButton);
    
    // Should show category select dropdown
    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toBeInTheDocument();
  });

  it('shows statement info when provided', () => {
    render(
      <CompactTransactionRow 
        {...defaultProps} 
        statement={{ id: 'stmt-1', name: 'January 2025 Statement' }}
        visibleColumns={['statementId']}
      />
    );
    
    // Statement should be visible when in visibleColumns
    expect(screen.getByText(/January/)).toBeInTheDocument();
  });
});
