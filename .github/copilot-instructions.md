# Bookkeeping App - GitHub Copilot Instructions

## Project Overview
Full-stack bookkeeping application built with React (frontend) and Node.js/Express (backend), using **Supabase** for authentication, PostgreSQL database, and storage (with Cloudinary fallback). The app imports PDF bank statements, classifies transactions into IRS tax categories, and generates financial reports.

## Key Principles
1. **Testing Required**: Write unit tests for all services and critical components
2. **Error Handling**: Always include try/catch, proper error messages, and logging
3. **File Size Limits**: Keep files under 300 lines; split large files into modules
4. **Single Responsibility**: Each file/function should do one thing well

## Key API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pdf/upload` | Upload PDF bank statement |
| GET/POST/PUT/DELETE | `/api/transactions` | Transaction CRUD |
| GET/POST/DELETE | `/api/companies` | Company CRUD |
| GET/POST/DELETE | `/api/payees` | Payee/vendor CRUD |
| GET | `/api/reports/*` | P&L, tax, expense reports |

## Core Features
- Multi-company support with filtering
- PDF import & extraction (Chase statements)
- Rule-based transaction classification (IRS categories)
- Manual transaction entry/editing
- Financial reports (P&L, tax, expense summaries)
- Employee/vendor payment tracking

## Code Style

### General
- ES6+ with async/await
- Functional components with hooks
- RESTful API design
- **All functions must have error handling**
- **JSDoc comments for public functions**

### Frontend (React)
- Functional components + hooks only
- React Query for data fetching
- TailwindCSS for styling
- Loading states and error boundaries required
- Vitest + React Testing Library for tests

### Backend (Node.js/Express)
- Controller → Service → Database pattern
- express-validator for input validation
- Supabase client for database operations
- Centralized error middleware
- Jest for testing

### Database (Supabase/PostgreSQL)
- Use snake_case for column names
- Row Level Security (RLS) enabled
- Proper indexes for query performance
- Migrations in `supabase/migrations/`

## Project Structure

```
client/src/
├── components/       # Reusable UI components
├── features/         # Feature modules (Auth, Dashboard, Transactions, etc.)
├── context/          # React contexts
├── services/         # API client functions
├── hooks/            # Custom React hooks
└── utils/            # Helper functions

server/
├── config/           # Configuration (supabase.js, environment.js)
├── controllers/      # Route handlers
├── middlewares/      # Auth, validation, error handling
├── routes/           # Express route definitions
├── services/         # Business logic
│   ├── supabaseService.js    # Storage operations
│   ├── companyService.js     # Company CRUD
│   ├── payeeService.js       # Payee/vendor CRUD
│   ├── chasePDFParser.js     # PDF parsing
│   └── reports/              # Report generators
├── utils/            # Shared utilities
└── test/             # Unit and integration tests

supabase/
├── migrations/       # SQL migration files
└── config.toml       # Supabase local config
```
## Key Technologies

### Frontend
- React 18, Vite, TailwindCSS
- React Router, React Query, React Hook Form
- Supabase JS SDK for auth
- Vitest + React Testing Library

### Backend
- Express.js, Supabase Admin SDK
- pdf-parse, pdfkit, express-validator, multer
- Jest for testing

## Implementation Notes

### Transaction Classification
- IRS categories in `shared/constants/categories.js`
- Rule-based only: user-defined rules map payee names → categories
- No ML or confidence scores; unmatched = empty category

### PDF Processing
- Primary: Chase bank statements
- Extract: date, description, amount, payee
- Async processing with status tracking

### Security
- Supabase RLS policies on all tables
- Input validation on client and server
- Rate limiting, file size limits
- Sanitize data before database writes
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