# Contributing to BookkeepingApp

Thank you for your interest in contributing to the BookkeepingApp! This guide will help you get started with contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Firebase account (for backend services)
- VS Code (recommended)

### Initial Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm run install:all`
4. Copy environment template: `cp .env.example .env`
5. Follow Firebase setup in `/firebase/CONFIGURATION.md`

### Development Environment
```bash
# Start backend server
npm run dev:server

# Start frontend (in new terminal)
npm run dev:client
```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Individual features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes

### Feature Development
1. **Create Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop Feature**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Changes**
   ```bash
   npm run test
   npm run lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### General Guidelines
- Follow existing code patterns and conventions
- Write self-documenting code with clear variable names
- Add comments for complex logic
- Keep functions small and focused
- Use modern JavaScript features (ES6+)

### Frontend (React)
```javascript
// ✅ Good: Functional components with hooks
const TransactionList = ({ transactions, onEdit }) => {
  const [selectedId, setSelectedId] = useState(null);
  
  const handleSelect = useCallback((id) => {
    setSelectedId(id);
  }, []);

  return (
    <div className="transaction-list">
      {transactions.map(transaction => (
        <TransactionItem 
          key={transaction.id}
          transaction={transaction}
          isSelected={selectedId === transaction.id}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
};

// ✅ PropTypes for type checking
TransactionList.propTypes = {
  transactions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onEdit: PropTypes.func.isRequired
};
```

### Backend (Node.js/Express)
```javascript
// ✅ Good: Async/await with proper error handling
const getTransactions = async (req, res) => {
  try {
    const { userId, companyId, startDate, endDate } = req.query;
    
    const transactions = await transactionService.getTransactions({
      userId,
      companyId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
};

// ✅ Input validation
const validateTransactionData = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('date').isISO8601().withMessage('Invalid date format'),
  body('category').isIn(Object.values(IRS_CATEGORIES)).withMessage('Invalid category')
];
```

### File Naming Conventions
- **Components**: PascalCase (`TransactionItem.jsx`)
- **Utilities**: camelCase (`dateUtils.js`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.js`)
- **Services**: camelCase with Service suffix (`transactionService.js`)

### Commit Message Format
Follow the conventional commits specification:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(transactions): add bulk edit functionality
fix(pdf): resolve Chase statement parsing issue
docs(api): update transaction endpoints documentation
```

## Testing

### Frontend Testing
```javascript
// Component tests with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionItem from './TransactionItem';

describe('TransactionItem', () => {
  const mockTransaction = {
    id: '1',
    amount: 100.50,
    description: 'Test Transaction',
    date: '2024-01-15'
  };

  test('renders transaction information correctly', () => {
    render(<TransactionItem transaction={mockTransaction} />);
    
    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    expect(screen.getByText('$100.50')).toBeInTheDocument();
  });

  test('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<TransactionItem transaction={mockTransaction} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockTransaction.id);
  });
});
```

### Backend Testing
```javascript
// API endpoint tests with supertest
describe('Transaction API', () => {
  test('POST /api/transactions creates new transaction', async () => {
    const transactionData = {
      amount: 100.50,
      description: 'Test Transaction',
      date: '2024-01-15',
      category: 'Office Supplies'
    };

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${validToken}`)
      .send(transactionData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.amount).toBe(100.50);
  });
});
```

### Running Tests
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test TransactionItem.test.js
```

## Documentation

### Code Documentation
- Use JSDoc comments for functions and classes
- Document complex algorithms and business logic
- Include examples for utility functions

```javascript
/**
 * Formats a currency amount for display
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @returns {string} Formatted currency string
 * @example
 * formatCurrency(1234.56) // '$1,234.56'
 * formatCurrency(1234.56, 'EUR') // '€1,234.56'
 */
const formatCurrency = (amount, currency = 'USD') => {
  // Implementation...
};
```

### API Documentation
- Update `/docs/API_REFERENCE.md` for new endpoints
- Include request/response examples
- Document error cases and status codes

### Feature Documentation
- Add new features to `/docs/USER_GUIDE.md`
- Update setup instructions if needed
- Document configuration changes

## Pull Request Process

### Before Submitting
1. **Test Your Changes**
   ```bash
   npm run test
   npm run lint
   npm run build:client
   ```

2. **Update Documentation**
   - API changes: Update `/docs/API_REFERENCE.md`
   - New features: Update `/docs/USER_GUIDE.md`
   - Breaking changes: Update migration guide

3. **Check Dependencies**
   - No unnecessary dependencies added
   - Lock file updated if dependencies changed

### PR Checklist
- [ ] Code follows project coding standards
- [ ] Tests added/updated for new functionality
- [ ] Documentation updated where necessary
- [ ] No breaking changes (or clearly documented)
- [ ] PR description clearly explains the changes
- [ ] Linked to relevant issue(s)

### PR Description Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Fixes #(issue number)
```

### Review Process
1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Manual testing for significant changes
4. **Documentation**: Ensure all documentation is updated

## Getting Help

### Resources
- **Documentation**: Check `/docs/` directory
- **Project Structure**: See `PROJECT_STRUCTURE.md`
- **API Reference**: `/docs/API_REFERENCE.md`

### Communication
- **Issues**: Create GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact maintainers for sensitive issues

### Development Tips
- **VS Code**: Use provided workspace settings in `.vscode/`
- **Debugging**: Check browser dev tools and server logs
- **Firebase**: Use Firebase console for database debugging
- **Testing**: Write tests as you develop, not after

## Recognition

Contributors are recognized in:
- Project README.md
- Release notes for significant contributions
- GitHub contributor graphs

Thank you for contributing to BookkeepingApp! 🎉
