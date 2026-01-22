import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HelpPage from '../HelpPage';

describe('HelpPage', () => {
  it('renders the help center header', () => {
    render(<HelpPage />);
    
    expect(screen.getByText('Help Center')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the Bookkeeping App help center/)).toBeInTheDocument();
  });

  it('renders all main help sections', () => {
    render(<HelpPage />);
    
    // Check that all main sections are present (as button text)
    expect(screen.getByRole('button', { name: /Getting Started/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transaction Types/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importing Transactions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Classification Rules/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tax Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Managing Companies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vendors & Payees/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reports$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reconciliation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Best Practices/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Troubleshooting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Tips/i })).toBeInTheDocument();
  });

  it('Getting Started section is expanded by default', () => {
    render(<HelpPage />);
    
    // Getting Started should be expanded by default
    expect(screen.getByText(/This app helps you track income and expenses/)).toBeInTheDocument();
  });

  it('expands and collapses sections when clicked', () => {
    render(<HelpPage />);
    
    // Click on Transaction Types to expand it
    const transactionTypesHeader = screen.getByRole('button', { name: /Transaction Types/i });
    fireEvent.click(transactionTypesHeader);
    
    // Should now see content about transaction types
    expect(screen.getByText(/The app supports three types of transactions/)).toBeInTheDocument();
  });

  it('displays transfer/neutral transaction information when expanded', () => {
    render(<HelpPage />);
    
    // Click on Transaction Types to expand it
    const transactionTypesHeader = screen.getByRole('button', { name: /Transaction Types/i });
    fireEvent.click(transactionTypesHeader);
    
    // Should see information about transfers (neutral)
    expect(screen.getByText(/Transfers don't affect your profit\/loss calculations/)).toBeInTheDocument();
    expect(screen.getByText('Owner Contribution/Capital', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Loan Received', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Transfer Between Accounts', { selector: 'strong' })).toBeInTheDocument();
    
    // Should see information about owner draws being tracked as expense (NOT neutral)
    expect(screen.getByText('Owner Draws/Distributions', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/Owner withdrawals must be tracked as expenses/)).toBeInTheDocument();
  });

  it('displays warning boxes with important information', () => {
    render(<HelpPage />);
    
    // Click on Transaction Types to expand it
    const transactionTypesHeader = screen.getByRole('button', { name: /Transaction Types/i });
    fireEvent.click(transactionTypesHeader);
    
    // Should see warning about owner contributions
    expect(screen.getByText(/Don't categorize owner contributions as income/)).toBeInTheDocument();
  });

  it('displays classification rules guidance when expanded', () => {
    render(<HelpPage />);
    
    // Click on Classification Rules section
    const classificationHeader = screen.getByRole('button', { name: /Classification Rules/i });
    fireEvent.click(classificationHeader);
    
    // Should see classification rule instructions
    expect(screen.getByText(/Classification rules automatically assign categories/)).toBeInTheDocument();
  });

  it('displays CSV import instructions when expanded', () => {
    render(<HelpPage />);
    
    // Click on CSV Import section
    const csvHeader = screen.getByRole('button', { name: /Importing Transactions/i });
    fireEvent.click(csvHeader);
    
    // Should see CSV import instructions
    expect(screen.getByText(/The fastest way to add transactions is by importing a CSV file/)).toBeInTheDocument();
  });

  it('displays troubleshooting section with common issues when expanded', () => {
    render(<HelpPage />);
    
    // Click on Troubleshooting section
    const troubleshootingHeader = screen.getByRole('button', { name: /Troubleshooting/i });
    fireEvent.click(troubleshootingHeader);
    
    // Should see common issues
    expect(screen.getByText('CSV import shows wrong amounts')).toBeInTheDocument();
    expect(screen.getByText('Classification rule not matching')).toBeInTheDocument();
    expect(screen.getByText('Dashboard shows $0')).toBeInTheDocument();
  });

  it('displays best practices with task categories when expanded', () => {
    render(<HelpPage />);
    
    // Click on Best Practices section
    const bestPracticesHeader = screen.getByRole('button', { name: /Best Practices/i });
    fireEvent.click(bestPracticesHeader);
    
    // Should see task lists
    expect(screen.getByText('Weekly Tasks')).toBeInTheDocument();
    expect(screen.getByText('Monthly Tasks')).toBeInTheDocument();
    expect(screen.getByText('Year-End Tasks')).toBeInTheDocument();
  });

  it('displays IRS category information when expanded', () => {
    render(<HelpPage />);
    
    // Click on Tax Categories section
    const taxCategoriesHeader = screen.getByRole('button', { name: /Tax Categories/i });
    fireEvent.click(taxCategoriesHeader);
    
    // Should see IRS category information - be specific about elements
    expect(screen.getByText(/align with IRS Schedule C/)).toBeInTheDocument();
    expect(screen.getByText('Gross Receipts/Sales', { selector: 'strong' })).toBeInTheDocument();
  });
});
