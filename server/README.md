# Bookkeeping Server

Express.js backend server for the Bookkeeping Application.

## Overview

This server provides REST API endpoints for:
- PDF bank statement processing and parsing
- Transaction management and classification
- Company management
- User authentication via Firebase
- Financial reporting and analytics

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

## Environment Variables

Create a `.env` file in the project root with:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Server Configuration
PORT=5000
NODE_ENV=development

# Features
DEBUG_PDF=false
ENABLE_CLASSIFICATION=true
```

## Architecture

```
server/
├── config/          # Configuration files (Firebase, etc.)
├── controllers/     # Route handlers and business logic
├── middlewares/     # Express middleware (auth, validation, etc.)
├── routes/          # API route definitions
├── services/        # Business logic and external service integrations
├── utils/           # Utility functions and helpers
├── scripts/         # Maintenance and setup scripts
├── test/            # Test files and test data
└── uploads/         # Temporary file storage for PDF uploads
```

## API Endpoints

### PDF Processing
- `POST /api/pdf/upload` - Upload and process PDF bank statements
- `GET /api/uploads` - List uploaded statements
- `GET /api/uploads/:id` - Get upload details
- `DELETE /api/uploads/:id` - Delete upload

### Transactions
- `GET /api/transactions` - List transactions with filtering
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Classification
- `GET /api/classification/rules` - Get classification rules
- `POST /api/classification/rules` - Create classification rule
- `PUT /api/classification/rules/:id` - Update rule
- `DELETE /api/classification/rules/:id` - Delete rule

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `DELETE /api/companies/:id` - Delete company

### Reports
- `GET /api/reports/profit-loss` - Profit & Loss report
- `GET /api/reports/expense-summary` - Expense summary
- `GET /api/reports/tax-summary` - Tax category summary

## Features

### PDF Processing
- Chase bank statement parsing with section detection
- Generic PDF text extraction fallback
- Transaction classification using IRS tax categories
- Multi-company support for transaction organization

### Transaction Management
- Rule-based automatic classification
- Manual transaction entry and editing
- Historical pattern recognition
- Bulk operations and CSV export

### Security
- Firebase Authentication integration
- Request validation and sanitization
- Rate limiting and CORS protection
- Input validation with express-validator

## Development

### File Structure
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data processing
- **Routes**: API endpoint definitions
- **Middlewares**: Authentication, validation, error handling
- **Utils**: Helper functions and utilities

### Error Handling
All endpoints use consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "details": { "additional": "context" }
}
```

### Testing
- Unit tests for services and utilities
- Integration tests for API endpoints
- Test data in `test/data/` directory

### Logging
- Winston for structured logging
- Morgan for HTTP request logging
- Console logging for development

## Deployment

1. Set environment variables
2. Install dependencies: `npm install --production`
3. Start server: `npm start`
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL certificates

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Use ESLint for code formatting
5. Commit with descriptive messages

## Troubleshooting

### Common Issues

**Server won't start**
- Check environment variables
- Verify Firebase configuration
- Ensure port is available

**PDF processing fails**
- Check file size limits (10MB)
- Verify PDF is text-based (not scanned)
- Check pdf-parse dependencies

**Authentication errors**
- Verify Firebase Admin SDK setup
- Check service account permissions
- Validate JWT tokens

**Database connection issues**
- Check Firestore security rules
- Verify project permissions
- Review network connectivity
