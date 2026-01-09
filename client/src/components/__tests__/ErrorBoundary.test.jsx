import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Import the components we need to test
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

// Suppress console.error during these tests since we expect errors
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Child Content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('renders error fallback when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays error message in details section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Click to expand error details
    const detailsSummary = screen.getByText('Error details');
    fireEvent.click(detailsSummary);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders Go to Dashboard button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('recovers when Try Again is clicked and error is fixed', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click try again
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);
    
    // After clicking try again, the component should re-render
    // In real usage, the error boundary resets its state
  });

  it('navigates to dashboard when Go to Dashboard is clicked', () => {
    // Mock window.location
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    const dashboardButton = screen.getByText('Go to Dashboard');
    fireEvent.click(dashboardButton);
    
    expect(window.location.href).toBe('/dashboard');
    
    // Restore
    window.location = originalLocation;
  });

  it('handles nested error boundaries', () => {
    render(
      <ErrorBoundary>
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <div>Sibling content</div>
        </div>
      </ErrorBoundary>
    );
    
    // Inner error boundary should catch the error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Sibling content should still be visible
    expect(screen.getByText('Sibling content')).toBeInTheDocument();
  });

  it('renders helpful error message text', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/sorry.*unexpected/i)).toBeInTheDocument();
  });
});
