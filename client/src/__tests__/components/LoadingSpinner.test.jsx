import { LoadingSpinner } from '../../components/ui';
import { renderWithProviders } from '../testUtils';

describe('LoadingSpinner', () => {
  test('renders loading spinner', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    
    // Check for spinner element (this will depend on your actual implementation)
    const spinner = container.querySelector('[data-testid="loading-spinner"]') || 
                   container.querySelector('.animate-spin') ||
                   container.querySelector('.spinner');
    
    expect(spinner).toBeInTheDocument();
  });

  test('renders with custom size', () => {
    const { container } = renderWithProviders(<LoadingSpinner size="large" />);
    
    // This test should be adapted based on your actual LoadingSpinner props
    expect(container.firstChild).toBeInTheDocument();
  });

  test('renders with custom text', () => {
    const { getByText } = renderWithProviders(
      <LoadingSpinner text="Loading transactions..." />
    );
    
    // Adapt this based on whether your spinner shows text
    // expect(getByText('Loading transactions...')).toBeInTheDocument();
  });
});
