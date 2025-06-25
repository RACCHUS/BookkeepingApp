<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Bookkeeping App - GitHub Copilot Instructions

## Project Overview
This is a full-stack bookkeeping application built with React (frontend) and Node.js/Express (backend), using Firebase for authentication, database, and storage. The app specializes in importing PDF bank statements, automatically classifying transactions into IRS tax categories, and generating financial reports.

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
├── controllers/      # Route handlers
├── routes/           # Express routes
├── services/         # Business logic
├── middlewares/      # Express middleware
├── config/           # Configuration files
└── utils/            # Helper functions
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

### Backend
- Express.js framework
- Firebase Admin SDK
- pdf-parse for PDF processing
- pdfkit for report generation
- express-validator for validation
- multer for file uploads

## Specific Implementation Notes

### Transaction Classification
- Use IRS tax categories defined in `shared/constants/categories.js`
- Implement machine learning-like classification using keyword matching and historical data
- Store classification rules and user corrections for future improvements
- Provide confidence scores for auto-classifications

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
1. Always include proper error handling
2. Use the established patterns and file structure
3. Follow the security guidelines
4. Include appropriate loading states
5. Add helpful comments for complex logic
6. Use TypeScript-style JSDoc comments for better IntelliSense
7. Consider performance implications
8. Follow accessibility best practices
