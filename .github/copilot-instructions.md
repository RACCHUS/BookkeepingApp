# Bookkeeping App - GitHub Copilot Instructions

## Project Overview
Full-stack bookkeeping application built with React (frontend) and Node.js/Express (backend), using Firebase for authentication, database, and storage. The app specializes in importing PDF bank statements, automatically classifying transactions into IRS tax categories, and generating financial reports.

**Server Architecture**: The backend has been comprehensively enhanced with professional patterns, featuring 70+ utility functions, enterprise security middleware, complete testing infrastructure, and centralized organization across all server modules.

## Key API Endpoints
- `POST /api/pdf/upload` – Upload PDF bank statement
- `GET /api/uploads` – List uploads (with company filter)
- `GET /api/uploads/:id` – Get upload details (transactions, company, file info)
- `PUT /api/uploads/:id` – Rename upload
- `DELETE /api/uploads/:id` – Delete upload
- `GET /api/transactions` – List transactions (filter by company, statement, date)
- `POST /api/transactions` – Create transaction
- `PUT /api/transactions/:id` – Edit transaction
- `DELETE /api/transactions/:id` – Delete transaction
- `GET /api/reports/profit-loss` – P&L report
- `GET /api/reports/expense-summary` – Expense summary
- `GET /api/reports/tax-summary` – Tax summary
- `GET /api/companies` – List companies
- `POST /api/companies` – Create company
- `DELETE /api/companies/:id` – Delete company

## Required Firestore Indexes
- **transactions**: Composite index on `userId`, `statementId`, `date` (ASC)
- **Advanced filters**: indexes on `userId`, `companyId`, `category`, `date` as needed
- See `FIRESTORE_INDEX_SETUP.md` for setup instructions

## Core Features
- **Multi-company support**: Assign/filter transactions and uploads by company
- **PDF import & extraction**: Upload, parse, and extract Chase bank statements
- **Rule-based transaction classification**: IRS categories assigned by user-defined rules
- **Manual transaction entry/editing**: Add/edit transactions in UI
- **Upload management**: CRUD operations for PDF uploads
- **Financial reports**: P&L, tax, expense summaries, export to PDF
- **Employee payment tracking**: Track and report employee payments
- **Real-time dashboard**: Live summaries and charts
- **Security**: Firebase Auth, Firestore rules, input validation
## Code Style & Patterns

### General Guidelines
- Use ES6+ features and modern JavaScript patterns
- Prefer functional components with hooks over class components
- Use async/await over Promise chains
- Follow RESTful API design principles
- Implement proper error handling and logging

### Frontend (React)
- Use functional components with React hooks
- Implement proper prop validation with PropTypes or TypeScript
- Use React Query for data fetching and caching
- Follow component composition patterns
- Use TailwindCSS for styling with semantic class names
- Implement proper loading states and error boundaries

### Backend (Node.js/Express)
- Use Express.js with middleware pattern
- Implement proper validation using express-validator
- Use Firebase Admin SDK for authentication and database operations
- Follow controller-service-repository pattern
- Implement proper error handling middleware
- Use environment variables for configuration

### Database (Firestore)
- Design denormalized data structures for Firestore
- Implement proper security rules
- Use batch operations for bulk writes
- Follow Firestore best practices for queries

## File Organization

### Frontend Structure
```
client/src/
├── components/       # Reusable UI components
├── features/         # Feature-based components (Auth, Dashboard, etc.)
├── context/          # React contexts for global state
├── services/         # API calls and Firebase client
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
└── assets/           # Static assets
```

### Backend Structure
```
server/
├── index.js                     # Main server entry point
├── package.json                 # Server dependencies and scripts
├── config/                      # 🔧 Configuration files
│   ├── firebaseAdmin.js         # Firebase Admin SDK configuration
│   ├── database.js              # Database configuration
│   ├── security.js              # Security configuration
│   └── index.js                 # Centralized config exports
├── controllers/                 # 🎯 Route handlers (enhanced with professional patterns)
│   ├── classificationController.js
│   ├── companyController.js
│   ├── payeeController.js
│   ├── pdfController.js
│   ├── reportController.js
│   ├── transactionController.js
│   └── index.js                 # Centralized controller exports
├── middlewares/                 # 🛡️ Express middleware (comprehensive security & validation)
│   ├── authMiddleware.js        # Firebase authentication
│   ├── validationMiddleware.js  # Input validation and sanitization
│   ├── securityMiddleware.js    # Security headers and protection
│   ├── loggingMiddleware.js     # Request/response logging
│   ├── errorMiddleware.js       # Centralized error handling
│   ├── rateLimitMiddleware.js   # Rate limiting protection
│   └── index.js                 # Centralized middleware exports
├── routes/                      # 🛣️ Express routes (enhanced with validation & middleware)
│   ├── classificationRoutes.js
│   ├── companyRoutes.js
│   ├── payeeRoutes.js
│   ├── pdfRoutes.js
│   ├── reportRoutes.js
│   ├── transactionRoutes.js
│   └── index.js                 # Centralized route exports
├── services/                    # ⚡ Business logic (enhanced with utils integration)
│   ├── cleanFirebaseService.js  # Main Firebase operations
│   ├── companyService.js        # Company management
│   ├── payeeService.js          # Employee/vendor management
│   ├── chasePDFParser.js        # PDF processing
│   ├── transactionClassifier.js # Transaction classification
│   ├── transactionClassifierService.js
│   ├── reportGenerator.js       # Report generation
│   ├── reportService.js
│   ├── parsers/                 # PDF parsing utilities
│   │   ├── ChaseClassifier.js
│   │   ├── ChaseDateUtils.js
│   │   ├── ChaseTransactionParser.js
│   │   └── index.js             # Parser exports
│   ├── reports/                 # Report generators
│   │   ├── BaseReportGenerator.js
│   │   ├── CategoryBreakdownReport.js
│   │   ├── TaxSummaryReport.js
│   │   └── index.js             # Report exports
│   └── index.js                 # Centralized service exports
├── utils/                       # 🧰 Professional utility toolkit (70+ functions)
│   ├── pathUtils.js             # Path and file utilities
│   ├── validation.js            # Business validation functions
│   ├── responseHelpers.js       # Standardized API responses
│   ├── dateUtils.js             # Financial date utilities
│   ├── financialUtils.js        # Financial calculations
│   ├── errorHandler.js          # Enhanced error handling
│   ├── sectionFiltering.js      # PDF section filtering
│   └── index.js                 # Centralized utils exports
├── test/                        # 🧪 Comprehensive testing infrastructure
│   ├── unit/                    # Unit tests
│   │   ├── services/            # Service tests
│   │   ├── utils/               # Utility tests
│   │   └── controllers/         # Controller tests
│   ├── integration/             # Integration tests
│   │   ├── api/                 # API endpoint tests
│   │   └── database/            # Database tests
│   ├── fixtures/                # Test data and mocks
│   │   ├── mocks/               # Mock objects
│   │   └── helpers/             # Test utilities
│   ├── setup/                   # Test configuration
│   │   ├── jest.config.js       # Jest configuration
│   │   └── testSetup.js         # Global test setup
│   ├── data/                    # Test data files
│   │   ├── pdfs/                # PDF test files
│   │   ├── csv/                 # CSV test files
│   │   └── json/                # JSON test files
│   └── index.js                 # Test exports
├── scripts/                     # Scripts for automation and maintenance
└── uploads/                     # File uploads (if applicable)
```
## Key Technologies & Libraries

### Frontend
- React 18 with hooks
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- React Query for data fetching
- React Hook Form for forms
- Firebase SDK for auth/database
- Vitest + React Testing Library for testing

### Backend
- Express.js framework
- Firebase Admin SDK
- pdf-parse for PDF processing
- pdfkit for report generation
- express-validator for validation
- multer for file uploads
- Jest for testing

## Specific Implementation Notes

### Transaction Classification
- Use IRS tax categories defined in `shared/constants/categories.js`
- **Only rule-based classification**: assign categories based on user-defined rules mapping transaction names to categories. If no rule matches, the category is left empty. No machine learning, historical data, or confidence scores are used.
- Allow user to manage rules for name-to-category mapping via the UI.

### PDF Processing
- Support Chase bank statement format primarily
- Implement generic PDF parsing as fallback
- Extract date, description, amount, and payee information
- Use async processing with status tracking for large files

### Security Considerations
- Implement proper Firebase security rules
- Validate all user inputs on both client and server
- Use proper authentication middleware
- Implement rate limiting and file size restrictions
- Sanitize data before database operations

### Performance Optimization
- Use React Query for caching and background updates
- Implement pagination for large transaction lists
- Use Firestore compound queries efficiently
- Optimize PDF processing with streaming
## Common Patterns

### Error Handling
```javascript
// Frontend
try {
  const result = await apiCall();
  toast.success('Success message');
} catch (error) {
  toast.error(error.message || 'Something went wrong');
}

// Backend
const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### Data Validation
```javascript
// Use express-validator for backend validation
const validateTransaction = [
  body('amount').isNumeric(),
  body('date').isISO8601(),
  body('category').isIn(Object.values(IRS_CATEGORIES))
];
```

### React Hook Patterns
```javascript
// Custom hooks for data fetching
const useTransactions = (filters) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.transactions.getAll(filters)
  });
};
```

## When generating code:
- Always include proper error handling
- Use the established patterns and file structure
- Follow the security guidelines
- Include appropriate loading states
- Add helpful comments for complex logic
- Use TypeScript-style JSDoc comments for better IntelliSense
- Consider performance implications
- Follow accessibility best practices
- Write unit tests for critical components