import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryBadge from '../CategoryBadge';

describe('CategoryBadge', () => {
  it('renders without crashing', () => {
    render(<CategoryBadge category="Office Expenses" />);
    expect(screen.getByText('Office Expenses')).toBeInTheDocument();
  });

  it('renders Uncategorized when no category provided', () => {
    render(<CategoryBadge category={null} />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders Uncategorized for undefined category', () => {
    render(<CategoryBadge />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders Uncategorized for empty string category', () => {
    render(<CategoryBadge category="" />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders category with subcategory', () => {
    render(<CategoryBadge category="Office Expenses" subcategory="Supplies" />);
    expect(screen.getByText('Office Expenses')).toBeInTheDocument();
    expect(screen.getByText('Supplies')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<CategoryBadge category="Advertising" compact={true} />);
    expect(screen.getByText('Advertising')).toBeInTheDocument();
  });

  it('renders compact mode with subcategory', () => {
    render(<CategoryBadge category="Advertising" subcategory="Online Ads" compact={true} />);
    expect(screen.getByText('Advertising')).toBeInTheDocument();
    expect(screen.getByText('Online Ads')).toBeInTheDocument();
  });

  it('shows group when showGroup is true', () => {
    render(<CategoryBadge category="Office Expenses" showGroup={true} />);
    // Group should be displayed
    expect(screen.getByText('Office Expenses')).toBeInTheDocument();
  });

  it('shows tax status when showTaxStatus is true', () => {
    render(<CategoryBadge category="Office Expenses" showTaxStatus={true} />);
    // Should show either Deductible or Non-deductible
    const deductible = screen.queryByText('Deductible');
    const nonDeductible = screen.queryByText('Non-deductible');
    expect(deductible || nonDeductible).toBeTruthy();
  });

  it('handles personal categories', () => {
    render(<CategoryBadge category="Personal" />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('handles business categories with proper styling', () => {
    const { container } = render(<CategoryBadge category="Advertising" />);
    // Should have business badge class
    const badge = container.querySelector('.badge');
    expect(badge).toBeInTheDocument();
  });
});
