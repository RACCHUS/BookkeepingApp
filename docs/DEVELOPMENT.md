# Development Guide

This guide covers the development workflow, coding standards, and best practices for the Bookkeeping App.

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd BookkeepingApp
   npm run install:all
   ```

2. **Environment Setup**
   - Copy `client/.env.example` to `client/.env.local`
   - Copy `server/.env.example` to `server/.env`
   - Configure Firebase credentials (see [GETTING_STARTED.md](GETTING_STARTED.md))

3. **Development Servers**
   - Use VS Code tasks: `Ctrl+Shift+P` → "Tasks: Run Task" → "Restart Server and Client"
   - Or manually:
     ```bash
     # Terminal 1 - Backend
     cd server && npm run dev
     
     # Terminal 2 - Frontend  
     cd client && npm run dev
     ```

## Project Architecture

### Frontend (React + Vite)
```
client/src/
├── components/       # Reusable UI components
│   ├── ui/          # Basic UI elements (Button, Modal, etc.)
│   └── forms/       # Form components
├── features/        # Feature-based modules
│   ├── auth/        # Authentication
│   ├── dashboard/   # Main dashboard
│   ├── transactions/ # Transaction management
│   ├── uploads/     # PDF upload handling
│   ├── companies/   # Company management
│   ├── reports/     # Report generation
│   └── payees/      # Payee management
├── context/         # React contexts
├── hooks/           # Custom React hooks
├── services/        # API communication
├── utils/           # Helper functions
└── assets/          # Static assets
```

### Backend (Node.js + Express)
```
server/
├── controllers/     # Route handlers
├── routes/          # Express routes
├── services/        # Business logic
├── middlewares/     # Express middleware
├── config/          # Configuration
├── utils/           # Helper functions
└── scripts/         # Automation scripts
```

### Shared Code
```
shared/
├── constants/       # Shared constants
├── schemas/         # Data schemas
└── utils/           # Shared utilities
```

## Development Workflow

### 1. Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Follow Feature Structure**
   ```
   features/feature-name/
   ├── components/      # Feature-specific components
   ├── hooks/          # Feature-specific hooks
   ├── services/       # API calls
   └── index.js        # Feature entry point
   ```

3. **Implement Tests**
   - Unit tests for utilities and services
   - Component tests for React components
   - Integration tests for API endpoints

### 2. Code Style

#### React Components
```javascript
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.title - Title text
 * @param {Function} props.onSubmit - Submit handler
 */
const MyComponent = ({ title, onSubmit }) => {
  // Implementation
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* Component content */}
    </div>
  );
};

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default MyComponent;
```

#### Custom Hooks
```javascript
import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';

/**
 * Custom hook for managing transactions
 * @param {Object} filters - Transaction filters
 * @returns {Object} Hook return value
 */
const useTransactions = (filters = {}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.transactions.getAll(filters),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    transactions: data?.transactions || [],
    isLoading,
    error
  };
};

export default useTransactions;
```

#### Express Controllers
```javascript
const { validationResult } = require('express-validator');
const transactionService = require('../services/transactionService');
const { handleAsync } = require('../utils/errorHandler');

/**
 * Get all transactions for user
 */
const getTransactions = handleAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId } = req.user;
  const filters = req.query;
  
  const transactions = await transactionService.getAll(userId, filters);
  
  res.json({
    success: true,
    data: transactions
  });
});

module.exports = {
  getTransactions
};
```

### 3. State Management

#### React Context Pattern
```javascript
// context/TransactionContext.js
const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [filters, setFilters] = useState({});

  const value = {
    selectedCompany,
    setSelectedCompany,
    filters,
    setFilters
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactionContext = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within TransactionProvider');
  }
  return context;
};
```

### 4. API Design

#### REST Endpoints
```javascript
// routes/transactionRoutes.js
const express = require('express');
const { body, query } = require('express-validator');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/transactions
router.get('/',
  authMiddleware,
  [
    query('companyId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  transactionController.getTransactions
);

// POST /api/transactions
router.post('/',
  authMiddleware,
  [
    body('amount').isNumeric(),
    body('date').isISO8601(),
    body('description').isLength({ min: 1 }),
    body('type').isIn(['income', 'expense'])
  ],
  transactionController.createTransaction
);

module.exports = router;
```

### 5. Error Handling

#### Frontend Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}
```

#### Backend Error Middleware
```javascript
// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.message
    });
  }

  if (err.code === 'permission-denied') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
};

module.exports = errorHandler;
```

## Testing

### Frontend Testing (Vitest + React Testing Library)
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from 'react-query';
import TransactionForm from './TransactionForm';

const renderWithQuery = (component) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TransactionForm', () => {
  test('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    renderWithQuery(<TransactionForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '100.00' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 100.00,
      // ... other form data
    });
  });
});
```

### Backend Testing (Jest + Supertest)
```javascript
const request = require('supertest');
const app = require('../index');

describe('Transaction API', () => {
  test('GET /api/transactions requires authentication', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .expect(401);

    expect(response.body.error).toBe('Authentication required');
  });

  test('POST /api/transactions creates transaction', async () => {
    const token = 'valid-firebase-token';
    const transactionData = {
      amount: 100.00,
      date: '2024-01-15',
      description: 'Test transaction',
      type: 'expense'
    };

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transactionData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(100.00);
  });
});
```

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Use React Query for caching and background updates
- Optimize bundle size with code splitting

### Backend
- Implement pagination for large datasets
- Use Firestore compound queries efficiently
- Cache frequently accessed data
- Optimize PDF processing with streaming

## Debugging

### Frontend
- Use React Developer Tools
- Use Redux DevTools (if using Redux)
- Console debugging with useful context

### Backend
- Use VS Code debugger with launch configurations
- Log important operations with structured logging
- Use Firebase Emulator for local development

## Security Best Practices

1. **Authentication**: Always verify Firebase tokens
2. **Authorization**: Check user permissions for all operations
3. **Input Validation**: Validate all user inputs
4. **Data Sanitization**: Sanitize data before database operations
5. **Rate Limiting**: Implement rate limiting for APIs
6. **HTTPS**: Use HTTPS in production

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

1. Follow the established patterns and conventions
2. Write tests for new features
3. Update documentation for API changes
4. Use meaningful commit messages
5. Submit pull requests for review
