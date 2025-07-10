# Server Test Suite

## Overview
Comprehensive testing infrastructure for the Bookkeeping App server, featuring unit tests, integration tests, and end-to-end testing capabilities with professional patterns and utilities.

## Test Structure

```
server/test/
├── index.js                         # Centralized test exports and configuration
├── ORGANIZATION_PLAN.md             # Test organization strategy
├── README.md                        # This documentation
├── unit/                           # Unit Tests
│   ├── services/                   # Service layer tests
│   │   ├── companyService.test.js  # ✨ Company service tests
│   │   ├── payeeService.test.js    # Payee service tests (planned)
│   │   └── firebaseService.test.js # Firebase service tests (planned)
│   ├── utils/                      # Utility function tests
│   │   └── utils.test.js           # ✨ Utils comprehensive tests
│   ├── controllers/                # Controller tests (planned)
│   └── middlewares/                # Middleware tests (planned)
├── integration/                    # Integration Tests
│   ├── api/                        # API endpoint tests
│   │   ├── companies.test.js       # ✨ Company API tests
│   │   ├── transactions.test.js    # Transaction API tests (planned)
│   │   └── uploads.test.js         # Upload API tests (planned)
│   ├── database/                   # Database integration tests (planned)
│   └── pdf/                        # PDF processing tests (planned)
├── e2e/                           # End-to-End Tests (planned)
│   ├── workflows/                  # Complete user workflows
│   └── scenarios/                  # Business scenarios
├── fixtures/                      # Test Fixtures and Utilities
│   ├── mocks/                      # Mock data and objects
│   │   └── mockData.js             # ✨ Comprehensive mock data
│   └── helpers/                    # Test helper functions
│       └── testHelpers.js          # ✨ Testing utilities
├── setup/                         # Test Configuration
│   ├── testSetup.js                # ✨ Global test setup
│   └── jest.config.js              # ✨ Jest configuration
└── data/                          # Test Data (existing)
    ├── pdfs/                      # PDF test files
    ├── csv/                       # CSV test files
    ├── json/                      # JSON test files
    └── README.md                  # Test data documentation
```

## Testing Frameworks and Tools

### Core Testing Stack
- **Jest** - Primary testing framework with ES modules support
- **Supertest** - HTTP endpoint testing
- **Firebase Admin Mock** - Firebase service mocking
- **Express Test App** - Isolated API testing

### Test Categories

#### 1. Unit Tests (`/unit/`)
- **Services**: Business logic testing with mocked dependencies
- **Utils**: Utility function testing with comprehensive coverage
- **Controllers**: Controller logic testing (planned)
- **Middlewares**: Middleware testing (planned)

#### 2. Integration Tests (`/integration/`)
- **API Endpoints**: Full HTTP request/response testing
- **Database Operations**: Real database integration testing (planned)
- **PDF Processing**: File processing integration testing (planned)

#### 3. End-to-End Tests (`/e2e/`) - Planned
- **User Workflows**: Complete business process testing
- **Scenarios**: Real-world usage scenarios

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js features:
- ES modules support
- Test environment: Node.js
- Coverage reporting (HTML, LCOV, Text)
- Global setup and teardown
- Module path mapping
- Mock configuration
```

### Environment Variables
```bash
# Test environment variables
NODE_ENV=test
VERBOSE_TESTS=false          # Enable console output during tests
TEST_TIMEOUT=10000          # Default test timeout
```

## Mock Data and Fixtures

### Mock Data (`fixtures/mocks/mockData.js`)
- **User Data**: Test user profiles
- **Company Data**: Business entity test data
- **Transaction Data**: Financial transaction samples
- **Payee Data**: Employee and vendor test records
- **Classification Rules**: Transaction categorization rules
- **Upload Data**: File upload metadata

### Test Helpers (`fixtures/helpers/testHelpers.js`)
- **Express Mocking**: Request, response, and middleware mocks
- **Firebase Mocking**: Firestore and Auth service mocks
- **Assertion Helpers**: Common test assertions
- **File Helpers**: Temporary file creation and cleanup
- **Database Helpers**: Mock database operations

## Running Tests

### NPM Scripts (to be added to package.json)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest test/unit",
    "test:integration": "jest test/integration",
    "test:services": "jest test/unit/services",
    "test:utils": "jest test/unit/utils",
    "test:api": "jest test/integration/api",
    "test:verbose": "VERBOSE_TESTS=true jest"
  }
}
```

### Command Examples
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only API integration tests
npm run test:api

# Run specific test file
npm test -- companyService.test.js

# Run tests with verbose output
npm run test:verbose
```

## Test Writing Guidelines

### Unit Test Patterns
```javascript
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const mockData = createMockData('type');
      
      // Act
      const result = await service.method(mockData);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle error case', async () => {
      // Test error scenarios
    });
  });
});
```

### Integration Test Patterns
```javascript
describe('API Endpoint', () => {
  it('should return success response', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(testData)
      .expect(200);

    assertResponseSuccess(response, expectedData);
  });
});
```

## Coverage Goals

### Target Coverage Thresholds
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

### Priority Coverage Areas
1. **Services** - Core business logic (80%+ target)
2. **Utils** - Utility functions (90%+ target)
3. **Controllers** - API handlers (75%+ target)
4. **Middlewares** - Request processing (80%+ target)

## Test Data Management

### Mock Data Strategy
- **Realistic Data**: Use realistic but non-sensitive test data
- **Consistent IDs**: Use predictable test IDs for easier debugging
- **Relationships**: Maintain proper data relationships in mocks
- **Edge Cases**: Include edge case data for comprehensive testing

### Test File Cleanup
- **Temporary Files**: Auto-cleanup with test helpers
- **Mock State**: Reset between tests
- **Database State**: Clean slate for each test

## Implementation Status

### ✅ Completed
- Test infrastructure and configuration
- Mock data and test helpers
- Company service unit tests
- Utils comprehensive unit tests
- Company API integration tests
- Professional test documentation

### 🚧 Planned Next Steps
1. **Additional Unit Tests**:
   - PayeeService unit tests
   - FirebaseService unit tests
   - Controller unit tests
   - Middleware unit tests

2. **Integration Tests**:
   - Transaction API tests
   - Upload/PDF processing tests
   - Database integration tests

3. **End-to-End Tests**:
   - Complete user workflows
   - Business scenario testing

4. **Package.json Integration**:
   - Add test scripts
   - Configure test dependencies

## Usage Examples

### Running Service Tests
```bash
# Test company service
npm test -- companyService.test.js

# Test all services
npm run test:services

# Test with coverage
npm run test:coverage -- test/unit/services
```

### Writing New Tests
```javascript
import { createMockData, createMockRequest, assertResponseSuccess } from '@test';

describe('NewService', () => {
  const mockData = createMockData('transaction');
  // Test implementation
});
```

The test folder now provides a **comprehensive testing foundation** with professional patterns, mock data, and utilities ready for extensive testing coverage of the bookkeeping application.
