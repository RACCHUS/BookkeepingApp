# BookkeepingApp Client

React frontend application for the BookkeepingApp project.

## Overview

Modern React 18 application built with Vite, featuring:
- 📱 Responsive design with TailwindCSS
- 🔥 Firebase Authentication
- 📊 Real-time data with React Query
- 🎯 TypeScript support ready
- 🧪 Testing setup with Vitest and React Testing Library

## Project Structure

```
client/
├── 📁 public/                    # Static assets
├── 📁 src/                      # Source code
│   ├── 📁 __tests__/            # Test files
│   │   ├── 📁 components/       # Component tests
│   │   ├── 📁 features/         # Feature tests
│   │   ├── 📁 utils/           # Utility tests
│   │   ├── setupTests.js        # Test configuration
│   │   └── testUtils.js         # Test utilities
│   ├── 📁 assets/              # Images, icons, etc.
│   ├── 📁 components/          # Reusable UI components
│   │   ├── 📁 common/          # Business components
│   │   ├── 📁 forms/           # Form components
│   │   ├── 📁 layout/          # Layout components
│   │   ├── 📁 ui/              # Pure UI components
│   │   └── index.js            # Component exports
│   ├── 📁 constants/           # Application constants
│   │   ├── api.js              # API endpoints
│   │   ├── routes.js           # Route definitions
│   │   └── index.js            # All constants
│   ├── 📁 context/             # React contexts
│   ├── 📁 features/            # Feature-based modules
│   │   ├── 📁 Auth/            # Authentication
│   │   ├── 📁 Dashboard/       # Dashboard views
│   │   ├── 📁 Transactions/    # Transaction management
│   │   ├── 📁 Companies/       # Company management
│   │   ├── 📁 Reports/         # Report generation
│   │   └── ...                 # Other features
│   ├── 📁 hooks/               # Custom React hooks
│   ├── 📁 services/            # API and external services
│   ├── 📁 utils/               # Utility functions
│   │   ├── currencyUtils.js    # Currency formatting
│   │   ├── dateUtils.js        # Date utilities
│   │   ├── helpers.js          # General helpers
│   │   └── index.js            # Utility exports
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Application entry point
│   └── index.css               # Global styles
├── 📄 package.json              # Dependencies and scripts
├── 📄 vite.config.js           # Vite configuration
├── 📄 tailwind.config.js       # TailwindCSS configuration
├── 📄 postcss.config.js        # PostCSS configuration
├── 📄 .env.example             # Environment variables template
└── 📄 README.md                # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your environment variables:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_API_BASE_URL=http://localhost:3001
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   App will be available at http://localhost:3000

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run dev:host     # Start with network access

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
```

### Code Organization

#### Components Structure
- **`components/layout/`** - Header, Sidebar, Layout wrapper
- **`components/ui/`** - Reusable UI components (buttons, modals, etc.)
- **`components/forms/`** - Form-specific components
- **`components/common/`** - Business logic components

#### Feature-Based Architecture
Each feature in `features/` contains:
```
Feature/
├── components/      # Feature-specific components
├── hooks/          # Feature-specific hooks
├── services/       # Feature API calls
├── types.js        # Feature type definitions
└── index.js        # Feature exports
```

#### Import Organization
```javascript
// External libraries
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// Internal imports (absolute paths)
import { Layout, LoadingSpinner } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils';
import { API_ENDPOINTS } from '@/constants';

// Relative imports
import './Component.css';
```

### Styling

#### TailwindCSS
- Utility-first CSS framework
- Custom configuration in `tailwind.config.js`
- Design system with consistent spacing, colors, typography

#### Component Styling
```jsx
// Preferred approach - utility classes
const Button = ({ variant = 'primary', children }) => (
  <button 
    className={`
      px-4 py-2 rounded-md font-medium transition-colors
      ${variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
      ${variant === 'secondary' ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : ''}
    `}
  >
    {children}
  </button>
);
```

### State Management

#### React Query for Server State
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';

// Data fetching
const { data, isLoading, error } = useQuery({
  queryKey: [QUERY_KEYS.TRANSACTIONS, { companyId, dateRange }],
  queryFn: () => fetchTransactions({ companyId, dateRange }),
});

// Mutations
const mutation = useMutation({
  mutationFn: createTransaction,
  onSuccess: () => {
    queryClient.invalidateQueries([QUERY_KEYS.TRANSACTIONS]);
  },
});
```

#### Context for Global State
```javascript
// Authentication context
const { user, isAuthenticated, login, logout } = useAuth();

// Company context
const { currentCompany, switchCompany } = useCompany();
```

### API Integration

#### Service Layer
```javascript
// services/transactionService.js
import { api } from './api';
import { API_ENDPOINTS } from '@/constants';

export const transactionService = {
  getAll: (params) => api.get(API_ENDPOINTS.TRANSACTIONS.BASE, { params }),
  getById: (id) => api.get(API_ENDPOINTS.TRANSACTIONS.BY_ID(id)),
  create: (data) => api.post(API_ENDPOINTS.TRANSACTIONS.BASE, data),
  update: (id, data) => api.put(API_ENDPOINTS.TRANSACTIONS.BY_ID(id), data),
  delete: (id) => api.delete(API_ENDPOINTS.TRANSACTIONS.BY_ID(id)),
};
```

#### Error Handling
```javascript
import { toast } from 'react-hot-toast';
import { ERROR_MESSAGES } from '@/constants';

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || ERROR_MESSAGES.NETWORK_ERROR;
    toast.error(message);
    return Promise.reject(error);
  }
);
```

## Testing

### Test Structure
```
__tests__/
├── components/          # Component unit tests
├── features/           # Feature integration tests
├── utils/              # Utility function tests
├── setupTests.js       # Vitest setup
└── testUtils.jsx       # Testing utilities
```

### Testing Patterns

#### Component Testing
```javascript
import { renderWithProviders, createMockTransaction } from '../testUtils';
import TransactionRow from '../../components/TransactionRow';

test('renders transaction information', () => {
  const transaction = createMockTransaction({
    description: 'Test Transaction',
    amount: 100.50,
  });

  const { getByText } = renderWithProviders(
    <TransactionRow transaction={transaction} />
  );

  expect(getByText('Test Transaction')).toBeInTheDocument();
  expect(getByText('$100.50')).toBeInTheDocument();
});
```

#### Hook Testing
```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTransactions } from '../hooks/useTransactions';

test('fetches transactions', async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const { result } = renderHook(() => useTransactions(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toBeDefined();
});
```

## Performance Optimization

### Code Splitting
```javascript
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components';

// Lazy load feature components
const Dashboard = lazy(() => import('@/features/Dashboard'));
const Transactions = lazy(() => import('@/features/Transactions'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Dashboard />
</Suspense>
```

### Memoization
```javascript
import { memo, useMemo, useCallback } from 'react';

// Memo for expensive calculations
const TransactionSummary = memo(({ transactions }) => {
  const summary = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      // expensive calculation
      return acc;
    }, {});
  }, [transactions]);

  return <div>{/* render summary */}</div>;
});

// Callback memoization
const TransactionList = ({ transactions, onUpdate }) => {
  const handleUpdate = useCallback((id, data) => {
    onUpdate(id, data);
  }, [onUpdate]);

  return (
    // render list with stable callback
  );
};
```

## Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
- Development: `.env.local`
- Production: Set in deployment platform
- Never commit sensitive credentials

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Build completes without errors
- [ ] All tests passing
- [ ] Firebase configuration correct
- [ ] API endpoints pointing to production

## Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

**Hot Reload Not Working**
- Check Vite configuration
- Verify file system permissions
- Try different port

**Firebase Authentication Issues**
- Verify environment variables
- Check Firebase console configuration
- Ensure correct domain in Firebase Auth settings

**Import Errors**
- Check path aliases in `vite.config.js`
- Verify export/import syntax
- Use absolute imports for clarity

### Debug Tools
```javascript
// Enable debug mode
localStorage.setItem('debug', 'true');

// React Query Devtools (development only)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* App content */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

## Contributing

1. Follow the established file structure
2. Use consistent naming conventions
3. Add tests for new components
4. Update documentation for new features
5. Follow the style guide in the main project

## Dependencies

### Core
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **React Query** - Data fetching

### UI & Styling
- **TailwindCSS** - Utility-first CSS
- **Headless UI** - Unstyled components
- **Heroicons** - Icon library

### Forms & Validation
- **React Hook Form** - Form management
- **Date-fns** - Date utilities

### Development
- **ESLint** - Code linting
- **Vitest** - Testing framework (native Vite integration)
- **React Testing Library** - Component testing

For full dependency list, see `package.json`.
