# Firebase Emulator Testing Guide

## Overview

Firebase emulators allow you to test controllers and services with real Firebase operations locally, without affecting production data or consuming Firebase quota.

## Prerequisites

1. **Firebase CLI installed globally**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Verify installation**:
   ```bash
   firebase --version
   ```

## Quick Start

### 1. Start Firebase Emulators

**Option A: Start without UI** (faster, for testing only):
```bash
npm run emulator:start
```

**Option B: Start with UI** (includes web interface):
```bash
npm run emulator:start:ui
```

The emulator UI will be available at: http://localhost:4000

### 2. Run Tests with Emulators

**Run integration tests**:
```bash
npm run test:emulator:integration
```

**Run all tests with emulators**:
```bash
npm run test:emulator
```

**Run specific test file**:
```bash
USE_EMULATOR=true npm test -- companyService.emulator.test
```

## Emulator Ports (configured in firebase.json)

- **Firestore**: http://localhost:8080
- **Authentication**: http://localhost:9099
- **Storage**: http://localhost:9199
- **UI Dashboard**: http://localhost:4000 (when using `emulator:start:ui`)

## Writing Emulator Tests

### Basic Structure

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeEmulators, cleanEmulatorData, areEmulatorsRunning } from '../../setup/emulatorSetup.js';
import { createTestUser, createTestCompany } from '../../fixtures/helpers/testDataHelpers.js';

describe('My Integration Test', () => {
  let db, auth;
  const TEST_USER_ID = 'test-user-123';
  
  beforeAll(async () => {
    // Check if emulators are running
    const running = await areEmulatorsRunning();
    if (!running) {
      throw new Error('Firebase emulators not running! Start with: npm run emulator:start');
    }
    
    // Initialize Firebase with emulator
    const firebase = initializeEmulators();
    db = firebase.db;
    auth = firebase.auth;
  });
  
  beforeEach(async () => {
    // Clean data before each test
    await cleanEmulatorData();
  });
  
  it('should create a document', async () => {
    await createTestUser(db, TEST_USER_ID);
    
    const doc = await db.collection('users').doc(TEST_USER_ID).get();
    expect(doc.exists).toBe(true);
  });
});
```

### Test Data Helpers

Located in `test/fixtures/helpers/testDataHelpers.js`:

- `createTestUser(db, userId, userData)` - Create user
- `createTestCompany(db, userId, companyData)` - Create company
- `createTestTransactions(db, userId, transactions)` - Create transactions
- `createTestUpload(db, userId, uploadData)` - Create upload record
- `createTestRules(db, userId, rules)` - Create classification rules
- `createTestPayees(db, userId, payees)` - Create payees
- `clearUserData(db, userId)` - Clear all data for a user
- `getCollectionData(db, collectionName, filters)` - Query collections

### Example: Testing Controller with Emulator

```javascript
import request from 'supertest';
import express from 'express';
import { initializeEmulators } from '../../setup/emulatorSetup.js';
import companyRoutes from '../../../routes/companyRoutes.js';

describe('Company Controller Integration', () => {
  let app, db;
  
  beforeAll(async () => {
    const firebase = initializeEmulators();
    db = firebase.db;
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/companies', companyRoutes);
  });
  
  it('should create a company via API', async () => {
    const response = await request(app)
      .post('/api/companies')
      .send({ name: 'Test Company' })
      .expect(201);
    
    expect(response.body.company.name).toBe('Test Company');
  });
});
```

## Workflow

### Development Workflow

1. **Start emulators in one terminal**:
   ```bash
   npm run emulator:start:ui
   ```

2. **Run tests in another terminal**:
   ```bash
   npm run test:emulator:integration -- --watch
   ```

3. **View emulator state** in browser:
   - Open http://localhost:4000
   - Inspect Firestore data, Auth users, Storage files

### CI/CD Workflow

For automated testing in CI:

```bash
# Start emulators in background
firebase emulators:exec --only firestore,auth,storage "npm run test:emulator"
```

This automatically starts emulators, runs tests, and stops emulators when done.

## Troubleshooting

### Emulators not starting

**Check if ports are in use**:
```bash
netstat -ano | findstr "8080"
netstat -ano | findstr "9099"
```

**Kill processes if needed** (Windows):
```bash
taskkill /F /PID <process_id>
```

### Tests timing out

Increase Jest timeout in test file:
```javascript
jest.setTimeout(30000); // 30 seconds
```

### Data not clearing between tests

Ensure `cleanEmulatorData()` is called in `beforeEach`:
```javascript
beforeEach(async () => {
  await cleanEmulatorData();
});
```

### Emulator connection errors

Verify emulators are running:
```bash
curl http://localhost:8080
```

Should return Firestore emulator response (not connection refused).

## Best Practices

### 1. Test Isolation
- Always clean data in `beforeEach`
- Use unique test user IDs per test suite
- Avoid test interdependencies

### 2. Emulator Data
- Don't commit emulator data (in `.gitignore`)
- Use test data helpers for consistency
- Keep test data minimal for speed

### 3. Performance
- Start emulators once for entire test run
- Use `cleanEmulatorData()` instead of restarting
- Batch Firestore operations when possible

### 4. Debugging
- Use emulator UI to inspect data
- Enable verbose logging: `VERBOSE_TESTS=true npm run test:emulator`
- Check Firestore rules in `firebase/firestore.rules`

## Example Test Files

See these files for examples:
- `test/integration/database/companyService.emulator.test.js` - Company CRUD operations
- More examples coming as we add controller tests

## Environment Variables

- `USE_EMULATOR=true` - Enables emulator mode in tests
- `VERBOSE_TESTS=true` - Shows console output during tests
- `FIRESTORE_EMULATOR_HOST` - Set automatically by emulatorSetup.js
- `FIREBASE_AUTH_EMULATOR_HOST` - Set automatically by emulatorSetup.js

## Next Steps

1. **Add Controller Tests**: Test controllers with real Firebase operations
2. **Add Service Tests**: Test services with emulator data
3. **Integration Testing**: Test full API workflows end-to-end
4. **CI Integration**: Add emulator tests to GitHub Actions workflow

## Resources

- [Firebase Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [Auth Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_auth)
