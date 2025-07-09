API Endpoints (Key)
POST /api/pdf/upload – Upload PDF bank statement
GET /api/uploads – List uploads (with company filter)
GET /api/uploads/:id – Get upload details (transactions, company, file info)
PUT /api/uploads/:id – Rename upload
DELETE /api/uploads/:id – Delete upload
GET /api/transactions – List transactions (filter by company, statement, date)
POST /api/transactions – Create transaction
PUT /api/transactions/:id – Edit transaction
DELETE /api/transactions/:id – Delete transaction
GET /api/reports/profit-loss – P&L report
GET /api/reports/expense-summary – Expense summary
GET /api/reports/tax-summary – Tax summary
GET /api/companies – List companies
POST /api/companies – Create company
DELETE /api/companies/:id – Delete company
Firestore Indexes (Required)
transactions: Composite index on userId, statementId, date (ASC)
For advanced filters: indexes on userId, companyId, category, date as needed
See FIRESTORE_INDEX_SETUP.md for setup instructions
App Features & Implementation (Concise)
Multi-company support: Assign/filter transactions and uploads by company (frontend: React Query, selectors; backend: Firestore, companyId fields, compound indexes).
PDF import & extraction: Upload, parse, and extract Chase bank statements (frontend: file upload, status tracking; backend: multer, pdf-parse, async processing, Firestore record, Storage).
Rule-based transaction classification: IRS categories assigned by user-defined rules mapping transaction names to categories. If no rule matches, the category is left empty. (Backend: service layer, rules, Firestore; Frontend: display, correction UI for user to set rules.)
Manual transaction entry/editing: Add/edit transactions in UI (React Hook Form, validation, REST API, Firestore updates).
Upload management: CRUD, rename, delete, link to transactions, assign to company (frontend: UploadManagement, optimistic React Query; backend: Firestore, Storage, batch ops).
Financial reports: P&L, tax, expense summaries, export to PDF (backend: reportService, pdfkit; frontend: reporting UI, export button).
Employee payment tracking: Track and report employee payments (Firestore, reporting endpoints, UI tables).
Real-time dashboard: Live summaries and charts (React Query, Firestore listeners, dashboard components).
Security: Firebase Auth, Firestore rules, input validation (express-validator, client/server), JWT, file/content type checks.
Bookkeeping App - GitHub Copilot Instructions
Project Overview
This is a full-stack bookkeeping application built with React (frontend) and Node.js/Express (backend), using Firebase for authentication, database, and storage. The app specializes in importing PDF bank statements, automatically classifying transactions into IRS tax categories, and generating financial reports.

Code Style & Patterns
General Guidelines
Use ES6+ features and modern JavaScript patterns
Prefer functional components with hooks over class components
Use async/await over Promise chains
Follow RESTful API design principles
Implement proper error handling and logging
Frontend (React)
Use functional components with React hooks
Implement proper prop validation with PropTypes or TypeScript
Use React Query for data fetching and caching
Follow component composition patterns
Use TailwindCSS for styling with semantic class names
Implement proper loading states and error boundaries
Backend (Node.js/Express)
Use Express.js with middleware pattern
Implement proper validation using express-validator
Use Firebase Admin SDK for authentication and database operations
Follow controller-service-repository pattern
Implement proper error handling middleware
Use environment variables for configuration
Database (Firestore)
Design denormalized data structures for Firestore
Implement proper security rules
Use batch operations for bulk writes
Follow Firestore best practices for queries
File Organization
Frontend Structure
client/src/
├── components/       # Reusable UI components
├── features/         # Feature-based components (Auth, Dashboard, etc.)
├── context/          # React contexts for global state
├── services/         # API calls and Firebase client
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
└── assets/           # Static assets
Backend Structure
server/
├── controllers/      # Route handlers
├── routes/           # Express routes
├── services/         # Business logic
├── middlewares/      # Express middleware
├── config/           # Configuration files
└── utils/            # Helper functions
├── scripts/          # Scripts for automation and maintenance
├── test              # Test files
└── uploads/          # File uploads (if applicable)

Key Technologies & Libraries
Frontend
React 18 with hooks
Vite for build tooling
TailwindCSS for styling
React Router for navigation
React Query for data fetching
React Hook Form for forms
Firebase SDK for auth/database
Backend
Express.js framework
Firebase Admin SDK
pdf-parse for PDF processing
pdfkit for report generation
express-validator for validation
multer for file uploads
Specific Implementation Notes
Transaction Classification
Use IRS tax categories defined in shared/constants/categories.js
Only rule-based classification: assign categories based on user-defined rules mapping transaction names to categories. If no rule matches, the category is left empty. No machine learning, historical data, or confidence scores are used.
Allow user to manage rules for name-to-category mapping via the UI.
PDF Processing
Support Chase bank statement format primarily
Implement generic PDF parsing as fallback
Extract date, description, amount, and payee information
Use async processing with status tracking for large files
Security Considerations
Implement proper Firebase security rules
Validate all user inputs on both client and server
Use proper authentication middleware
Implement rate limiting and file size restrictions
Sanitize data before database operations
Performance Optimization
Use React Query for caching and background updates
Implement pagination for large transaction lists
Use Firestore compound queries efficiently
Optimize PDF processing with streaming
Common Patterns
Error Handling
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
Data Validation
// Use express-validator for backend validation
const validateTransaction = [
  body('amount').isNumeric(),
  body('date').isISO8601(),
  body('category').isIn(Object.values(IRS_CATEGORIES))
];
React Hook Patterns
// Custom hooks for data fetching
const useTransactions = (filters) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => apiClient.transactions.getAll(filters)
  });
};
When generating code:
Always include proper error handling
Use the established patterns and file structure
Follow the security guidelines
Include appropriate loading states
Add helpful comments for complex logic
Use TypeScript-style JSDoc comments for better IntelliSense
Consider performance implications
Follow accessibility best practices
Write unit tests for critical components