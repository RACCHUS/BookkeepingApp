# Critical Fixes Plan

**Status: Priority 1-2 items COMPLETED** (2026-01-09)

## Completed Fixes

### ✅ 1.1 Mock Auth Bypass in Production (FIXED)
**File:** `server/middlewares/optionalAuthMiddleware.js`
**Fix Applied:** Added three-condition check:
- `NODE_ENV === 'development'`
- `ALLOW_MOCK_AUTH === 'true'` (explicit opt-in)
- Request must be from localhost (no X-Forwarded-For header)

**Tests Added:** `server/test/unit/middlewares/optionalAuthMiddleware.test.js` (10 tests)

### ✅ 1.2 CSV Routes Auth (VERIFIED OK)
CSV routes use inline `authMiddleware` per-route intentionally. `/banks` is public, others require auth.

### ✅ 1.3 Invoicing Tables Use TEXT for user_id (FIXED)
**Migration Created:** `supabase/migrations/20260109000000_fix_invoicing_user_id.sql`
- Converts `user_id TEXT` to `user_id UUID REFERENCES auth.users(id)`
- Updates RLS policies to use proper UUID comparison
- Applies to: catalogue_items, quotes, invoices, recurring_schedules

### ✅ 2.1 getTransactionById Performance (FIXED)
**File:** `server/controllers/transactionController.js`
**Fix Applied:** Changed from fetching all transactions + JS filter to direct database query:
```javascript
// Before: O(n)
const transactions = await getDb().getTransactions(userId);
const transaction = transactions.find(t => t.id === id);

// After: O(1)
const transaction = await getDb().getTransactionById(userId, id);
```

### ✅ 3.1 Missing RLS Policies on inventory_transactions (FIXED)
**Migration Created:** `supabase/migrations/20260109000001_fix_inventory_rls.sql`
- Added UPDATE policy
- Added DELETE policy

---

## Remaining Fixes (Lower Priority)

### 4.1 Large Files Exceeding 300 Lines
Split these files into focused modules:

| File | Lines | Action |
|------|-------|--------|
| `transactionController.js` | 1010 | Split: crud, bulk, classification |
| `reportController.js` | 916 | Split: by report type |
| `pdfController.js` | 888 | Split: upload, process, link |
| `checkController.js` | 845 | Split: crud, bulk, images |
| `invoiceController.js` | 780 | Split: crud, payments, pdf |
| `csvController.js` | 695 | Split: upload, preview, import |

### 4.2 Standardize asyncHandler Usage
**Issue:** Some controllers use `asyncHandler`, others manual try/catch.
**Fix:** Standardize all controllers to use `asyncHandler` wrapper:
```javascript
// Import at top of each controller:
import { asyncHandler } from '../utils/asyncHandler.js';

// Wrap each export:
export const getItems = asyncHandler(async (req, res) => {
  // ... no try/catch needed
});
```

### 4.3 Remove Debug Console.logs
**Files:** `client/src/context/AuthContext.jsx`, various services
**Fix:** Remove or wrap in development check:
```javascript
if (import.meta.env.DEV) console.log('Debug:', data);
```

---

## Priority 5: Consistency (Medium)

### 5.1 Standardize API Response Format
**Issue:** Mixed formats: `{ success, data }`, `{ success, transaction }`, direct data.
**Standard:** Use consistent wrapper:
```javascript
// Success:
res.json({ success: true, data: result, meta: { total, page } });

// Error:
res.status(code).json({ success: false, error: message, code: 'ERROR_CODE' });
```

### 5.2 Client Auth Hardcoded to Firebase
**File:** `client/src/context/AuthContext.jsx`
**Issue:** Hardcoded to Firebase but README says Supabase Auth.
**Decision needed:** 
- If using Firebase for auth: Update README
- If migrating to Supabase auth: Create auth adapter similar to server pattern

---

## Priority 6: Configuration (Low)

### 6.1 CORS Fallback in Production
**File:** `server/index.js` or config
**Issue:** CORS defaults to localhost if `CORS_ORIGIN` not set.
**Fix:**
```javascript
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN must be set in production');
}
```

### 6.2 Cache TTL Hardcoded
**File:** `server/services/adapters/SupabaseAdapter.js`
**Fix:** Move to environment config:
```javascript
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS) || 5 * 60 * 1000;
```

---

## Implementation Order

1. **Day 1:** Security fixes (1.1, 1.2, 1.3)
2. **Day 2:** Performance fixes (2.1, 2.2)
3. **Day 3:** Database integrity (3.1, 3.2)
4. **Week 2:** Code quality refactoring (4.1-4.3)
5. **Ongoing:** Consistency improvements (5.1, 5.2, 6.x)

---

## Testing Checklist

After each fix:
- [ ] Run `cd server && npm test`
- [ ] Run `cd client && npm test`
- [ ] Manual test affected endpoints with Postman/curl
- [ ] Verify RLS policies with Supabase SQL editor
- [ ] Check browser console for auth flow

---

## Notes

- All database migrations should be tested locally first with `supabase db reset`
- Backup production database before running any ALTER TABLE migrations
- The invoicing user_id fix requires data migration if production data exists
