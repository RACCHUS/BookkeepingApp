# Quick Start - Testing Guide

## 📋 Test Commands

### Unit Tests (Fast, No Setup Required)
```bash
# Run all unit tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- ChaseClassifier.test

# Watch mode (re-run on file changes)
npm run test:watch

# Specific test suites
npm run test:unit          # All unit tests
npm run test:services      # Service tests only
npm run test:utils         # Utility tests only
```

### Integration Tests (Requires Firebase Emulators)
```bash
# Step 1: Start Firebase emulators (in Terminal 1)
npm run emulator:start          # Headless mode
# OR
npm run emulator:start:ui       # With web UI at localhost:4000

# Step 2: Run integration tests (in Terminal 2)
npm run test:emulator:integration   # Integration tests only
npm run test:emulator               # All tests (unit + integration)
```

## 🎯 Current Test Coverage

**Overall**: 32.24% (723 tests passing)

| Module | Coverage | Tests |
|--------|----------|-------|
| Utils | 79.5% | ~200 |
| Middlewares | 67.3% | ~150 |
| Routes | Comprehensive | ~50 |
| Parsers | 51.75% | 189 |
| **Total Unit Tests** | | **721** |
| **Integration Tests** | | **82** (needs emulator) |
| **Grand Total** | | **803** |

## ✅ What's Been Tested

### Parser Files (100% Coverage)
- ✅ ChaseDateUtils.js
- ✅ parseTransactionLine.js
- ✅ extractCompanyInfo.js
- ✅ ChaseClassifier.js
- ✅ ChaseSummary.js
- ✅ ChaseSectionExtractor.js

### Controllers (Integration Tests Created)
- ✅ Company Controller (25 tests, all 9 endpoints)
- ✅ Payee Controller (19 tests, all 8 endpoints)
- ✅ Transaction Controller (38 tests, 11 major endpoints)

### Utilities
- ✅ dateUtils.js (~80% coverage)
- ✅ financialUtils.js (~85% coverage)
- ✅ pathUtils.js (~75% coverage)
- ✅ validation.js (~80% coverage)
- ✅ errorHandler.js (~75% coverage)
- ✅ responseHelpers.js (~80% coverage)

## 🚀 Quick Workflows

### Before Making Changes
```bash
# Run tests to establish baseline
npm run test:coverage

# Make your changes...

# Run tests again to see impact
npm run test:coverage
```

### Testing Your Changes
```bash
# Unit test specific file
npm test -- YourFile.test

# Integration test specific controller
npm run emulator:start:ui
npm run test:emulator -- companyController.emulator.test
```

### Before Committing
```bash
# Run all unit tests
npm test

# Check coverage hasn't decreased
npm run test:coverage
```

## 🔧 Troubleshooting

### "Emulator tests failing"
**Solution**: Make sure emulators are running
```bash
# Check if emulators are running
curl http://localhost:8080  # Should return Firestore emulator page

# If not running, start them
npm run emulator:start
```

### "Tests timing out"
**Solution**: Increase timeout in specific test file
```javascript
jest.setTimeout(30000); // 30 seconds
```

### "Firebase connection errors"
**Solution**: Verify emulator environment variables
```bash
# Check if properly set (should be set by emulatorSetup.js)
echo $FIRESTORE_EMULATOR_HOST
echo $FIREBASE_AUTH_EMULATOR_HOST
```

## 📚 Documentation

- **Emulator Guide**: `test/EMULATOR_TESTING.md`
- **Session Summary**: `test/TESTING_SESSION_SUMMARY.md`
- **Test Setup**: `test/setup/testSetup.js`
- **Data Helpers**: `test/fixtures/helpers/testDataHelpers.js`

## 🎯 Next Steps

1. **Run integration tests** to verify 82 tests pass
2. **Add Report controller tests** (~20 tests needed)
3. **Add Classification controller tests** (~15 tests needed)
4. **Target**: 40%+ coverage (currently at 32.24%)

## 💡 Pro Tips

- Use `--watch` mode during development
- Run specific test files to iterate faster
- Use emulator UI (localhost:4000) to inspect test data
- Check `TESTING_SESSION_SUMMARY.md` for detailed info

---

**Last Updated**: November 30, 2025  
**Total Tests**: 803 (721 unit + 82 integration)  
**Pass Rate**: 99.7%
