# Shared Library

This directory contains shared code, constants, schemas, and utilities used across both client and server applications.

## Directory Structure

```
shared/
├── README.md                     # This file
├── constants/                    # Application constants and enums
│   ├── categories.js            # IRS tax categories and business classifications
│   ├── keywords.js              # Classification keywords for transaction categorization
│   ├── sections.js              # PDF statement section definitions
│   ├── sorting.js               # Sorting and ordering constants
│   ├── api.js                   # API-related constants
│   ├── validation.js            # Validation rules and constraints
│   └── ui.js                    # UI constants and themes
├── schemas/                      # Data validation schemas
│   ├── transactionSchema.js     # Transaction data structure
│   ├── companySchema.js         # Company data structure
│   ├── payeeSchema.js           # Payee data structure
│   ├── uploadSchema.js          # File upload data structure
│   └── reportSchema.js          # Report configuration schema
├── utils/                        # Shared utility functions
│   ├── dateUtils.js             # Date formatting and manipulation
│   ├── currencyUtils.js         # Currency formatting and calculation
│   ├── validationUtils.js       # Data validation helpers
│   ├── formatUtils.js           # String and data formatting
│   ├── mathUtils.js             # Mathematical calculations
│   └── arrayUtils.js            # Array manipulation utilities
├── types/                        # TypeScript type definitions
│   ├── transaction.d.ts         # Transaction types
│   ├── company.d.ts             # Company types
│   ├── api.d.ts                 # API response types
│   └── common.d.ts              # Common utility types
└── .gitignore                   # Git ignore rules
```

## Usage Guidelines

### Importing Shared Code

**From Server (Node.js):**
```javascript
import { IRS_CATEGORIES } from '../shared/constants/categories.js';
import { TransactionSchema } from '../shared/schemas/transactionSchema.js';
import { formatCurrency } from '../shared/utils/currencyUtils.js';
```

**From Client (React):**
```javascript
import { IRS_CATEGORIES } from '../../shared/constants/categories.js';
import { validateTransaction } from '../../shared/utils/validationUtils.js';
import { formatDate } from '../../shared/utils/dateUtils.js';
```

### Adding New Shared Code

When adding new shared code:

1. **Choose appropriate directory**:
   - `constants/` - Static values, enums, configurations
   - `schemas/` - Data structure definitions and validation
   - `utils/` - Pure functions and helper utilities
   - `types/` - TypeScript type definitions

2. **Follow naming conventions**:
   - Use camelCase for functions and variables
   - Use UPPER_SNAKE_CASE for constants
   - Use PascalCase for schemas and types

3. **Export clearly**:
   - Use named exports for better tree-shaking
   - Export default only when appropriate
   - Document all exports with JSDoc

4. **Keep it pure**:
   - No side effects in utility functions
   - No DOM or Node.js specific code
   - Platform-agnostic implementations

## Constants

### Categories (`constants/categories.js`)
IRS-compliant tax categories for business expense classification. Used for:
- Transaction categorization
- Tax reporting
- Financial statement generation

### Keywords (`constants/keywords.js`)
Classification keywords for automatic transaction categorization. Maps transaction descriptions to IRS categories.

### Sections (`constants/sections.js`)
PDF statement section definitions for Chase bank statements and other financial documents.

### API Constants (`constants/api.js`)
API endpoints, status codes, and HTTP-related constants.

## Schemas

### Transaction Schema (`schemas/transactionSchema.js`)
Complete data structure for financial transactions including:
- Required fields (id, date, amount, description)
- Classification fields (category, type)
- Payee information
- Audit trail and metadata

### Validation Rules
All schemas include validation rules for:
- Required field checking
- Data type validation
- Business rule enforcement
- Input sanitization

## Utilities

### Date Utilities (`utils/dateUtils.js`)
- Date formatting for different locales
- Date range calculations
- Fiscal year handling
- Statement period detection

### Currency Utilities (`utils/currencyUtils.js`)
- Currency formatting with locale support
- Mathematical operations with precision
- Currency conversion helpers
- Tax calculation utilities

### Validation Utilities (`utils/validationUtils.js`)
- Schema validation functions
- Input sanitization
- Business rule validation
- Error message generation

## Type Safety

### TypeScript Support
Type definitions are provided for better development experience:
- IntelliSense support
- Compile-time error checking
- API contract documentation
- Better refactoring support

## Best Practices

### Code Organization
- **Single Responsibility**: Each file has one clear purpose
- **No Circular Dependencies**: Avoid importing files that import back
- **Tree Shaking Friendly**: Use named exports for better bundling
- **Documentation**: All public APIs are documented

### Performance
- **Pure Functions**: No side effects for better caching
- **Minimal Dependencies**: Reduce bundle size
- **Lazy Loading**: Support for dynamic imports where appropriate

### Testing
- **Unit Testable**: All utilities can be tested in isolation
- **Mock Friendly**: Easy to mock for testing dependent code
- **Deterministic**: Same input always produces same output

## Dependencies

### External Dependencies
The shared library aims to minimize external dependencies:
- No framework-specific code
- Pure JavaScript/TypeScript
- Node.js and browser compatible

### Internal Dependencies
- Constants may reference other constants
- Schemas reference validation constants
- Utilities are pure and standalone

## Contributing

When modifying shared code:

1. **Impact Assessment**: Consider both client and server usage
2. **Backward Compatibility**: Avoid breaking changes when possible
3. **Testing**: Test in both environments
4. **Documentation**: Update this README and inline docs
5. **Versioning**: Consider semantic versioning for major changes

## Migration Notes

### From Previous Structure
- All shared code is now centralized here
- Import paths have been updated throughout the application
- Better separation of concerns between constants, schemas, and utilities
- Enhanced type safety and documentation
