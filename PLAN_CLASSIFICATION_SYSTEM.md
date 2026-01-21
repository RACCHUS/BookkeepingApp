# Transaction Classification System - Implementation Plan

## ✅ IMPLEMENTED (January 21, 2026)

### What's Complete:
- **3-Layer Classification System**: Local Rules → Gemini API → Manual Review
- **Gemini Edge Function**: Deployed to Supabase, 200 transactions/batch
- **Classification Service**: Full Fuse.js fuzzy matching with user rules + default vendors
- **200+ Default Vendors**: Built-in mappings for common businesses
- **Rules Management UI**: View/edit/delete rules with tabs for User, AI, and Default vendors
- **AI Classification Button**: In bulk panel and post-import modal
- **Database Tables**: 
  - `classification_rules` - User and Gemini-created rules
  - `disabled_default_vendors` - User preferences for defaults
  - `classification_usage_logs` - Gemini usage analytics

### Access Points:
- **Rules Management**: `/classification/rules`
- **Classification Page**: `/classification` (has "Manage Rules" button)
- **AI Classification**: 
  - In TransactionBulkPanel (when unclassified selected)
  - Post-CSV import success modal

---

## Overview
Three-layer system: Local Rules → Gemini API → Manual Review

---

## Architecture

```
CSV Import
    │
    ▼
┌──────────────────────────────┐
│  LAYER 1: Local Rules        │  Instant, free
│  - Exact vendor match        │
│  - Fuzzy match (Fuse.js)     │
│  - Pattern rules (regex)     │
└──────────────────────────────┘
    │ unclassified
    ▼
┌──────────────────────────────┐
│  LAYER 2: Gemini API         │  1 batched request
│  - Send all unknowns         │
│  - Get vendor + category     │
│  - Auto-save as new rules    │
└──────────────────────────────┘
    │ still uncertain
    ▼
┌──────────────────────────────┐
│  LAYER 3: Manual Review      │  User decides
│  - Queue uncertain items     │
│  - User picks category       │
│  - Save as rule (optional)   │
└──────────────────────────────┘
```

---

## Phase 1: Local Rules Engine

### 1.1 Database Schema (Supabase)

```sql
-- Classification rules table
CREATE TABLE classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  pattern TEXT NOT NULL,              -- "HOME DEPOT", "HOMEDEPOT", etc.
  pattern_type TEXT DEFAULT 'exact',  -- 'exact', 'contains', 'regex'
  vendor_name TEXT,                   -- Normalized: "Home Depot"
  category TEXT NOT NULL,             -- IRS category key
  subcategory TEXT,                   -- Optional subcategory
  confidence NUMERIC DEFAULT 1.0,     -- 1.0 = user-set, 0.8 = Gemini
  source TEXT DEFAULT 'user',         -- 'user', 'gemini', 'system'
  match_count INTEGER DEFAULT 0,      -- Times this rule matched
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pattern)
);

-- Index for fast lookups
CREATE INDEX idx_rules_user_pattern ON classification_rules(user_id, pattern);
CREATE INDEX idx_rules_user_vendor ON classification_rules(user_id, vendor_name);
```

### 1.2 Default Vendor Database

File: `shared/constants/defaultVendors.js`

```javascript
export const DEFAULT_VENDORS = {
  // Gas Stations → Car and Truck Expenses
  'SHELL': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas' },
  'CHEVRON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas' },
  'EXXON': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas' },
  'BP': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas' },
  'SPEEDWAY': { category: 'CAR_TRUCK_EXPENSES', subcategory: 'Fuel/Gas' },
  
  // Building Materials → Supplies or COGS
  'HOME DEPOT': { category: 'MATERIALS_SUPPLIES' },
  'LOWES': { category: 'MATERIALS_SUPPLIES' },
  'MENARDS': { category: 'MATERIALS_SUPPLIES' },
  '84 LUMBER': { category: 'MATERIALS_SUPPLIES' },
  
  // Office Supplies
  'STAPLES': { category: 'OFFICE_EXPENSES' },
  'OFFICE DEPOT': { category: 'OFFICE_EXPENSES' },
  'OFFICEMAX': { category: 'OFFICE_EXPENSES' },
  
  // Software/Tech
  'ADOBE': { category: 'SOFTWARE_SUBSCRIPTIONS' },
  'MICROSOFT': { category: 'SOFTWARE_SUBSCRIPTIONS' },
  'GOOGLE': { category: 'SOFTWARE_SUBSCRIPTIONS' },
  'DROPBOX': { category: 'SOFTWARE_SUBSCRIPTIONS' },
  'ZOOM': { category: 'SOFTWARE_SUBSCRIPTIONS' },
  'SLACK': { category: 'SOFTWARE_SUBSCRIPTIONS' },
  
  // Utilities
  'FPL': { category: 'UTILITIES' },
  'DUKE ENERGY': { category: 'UTILITIES' },
  'AT&T': { category: 'UTILITIES' },
  'VERIZON': { category: 'UTILITIES' },
  'COMCAST': { category: 'UTILITIES' },
  'XFINITY': { category: 'UTILITIES' },
  
  // Insurance
  'GEICO': { category: 'INSURANCE_OTHER' },
  'STATE FARM': { category: 'INSURANCE_OTHER' },
  'PROGRESSIVE': { category: 'INSURANCE_OTHER' },
  'ALLSTATE': { category: 'INSURANCE_OTHER' },
  
  // Meals
  'MCDONALDS': { category: 'MEALS' },
  'STARBUCKS': { category: 'MEALS' },
  'CHIPOTLE': { category: 'MEALS' },
  'SUBWAY': { category: 'MEALS' },
  'DUNKIN': { category: 'MEALS' },
  
  // Shipping
  'USPS': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer' },
  'UPS': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer' },
  'FEDEX': { category: 'OTHER_COSTS', subcategory: 'Shipping to Customer' },
  
  // Banking
  'CHASE': { category: 'BANK_FEES' },
  'BANK OF AMERICA': { category: 'BANK_FEES' },
  'WELLS FARGO': { category: 'BANK_FEES' },
  
  // Common Online
  'AMAZON': { category: 'SUPPLIES' },  // Default, user should refine
  'PAYPAL': { category: 'COMMISSIONS_FEES' },
  'STRIPE': { category: 'COMMISSIONS_FEES' },
  'SQUARE': { category: 'COMMISSIONS_FEES' },
};
```

### 1.3 Classification Service

File: `client/src/services/classificationService.js`

```javascript
// Core functions:
// - extractVendor(description) → normalized vendor name
// - classifyTransaction(transaction, userRules) → { category, confidence, source }
// - batchClassify(transactions, userRules) → { classified: [], unclassified: [] }

// Uses Fuse.js for fuzzy matching
// Priority: exact match > contains > fuzzy > default vendors
```

---

## Phase 2: Gemini Integration

### 2.1 API Setup

- Model: `gemini-1.5-flash` (free tier: 15 RPM, 1M tokens/month)
- Endpoint: Called from Supabase Edge Function (keeps API key secure)

### 2.2 Edge Function

File: `supabase/functions/classify-transactions/index.ts`

```typescript
// Input: Array of { id, description, amount, date }
// Output: Array of { id, vendor, category, subcategory, confidence }

// Prompt structure:
// "Classify these bank transactions into IRS Schedule C categories.
//  Return JSON array with vendor name and category for each.
//  Categories: [list from IRS_CATEGORIES]
//  Transactions: [batch of descriptions]"
```

### 2.3 Gemini Constraints

| Limit | Strategy |
|-------|----------|
| 15 requests/min | Batch all unknowns in 1 request |
| 32K tokens/request | ~200 transactions per batch |
| 1M tokens/month | Local-first reduces API calls |

### 2.4 Auto-Save Rules

After Gemini response:
1. Parse vendor + category from response
2. Insert into `classification_rules` with `source: 'gemini'`
3. Next import with same vendor → Layer 1 catches it

---

## Phase 3: Manual Review UI

### 3.1 Review Queue Component

Location: `client/src/features/Classification/ManualReviewQueue.jsx`

Features:
- List transactions with `category = null` or `confidence < 0.7`
- Show description, amount, date
- Category dropdown (from IRS_CATEGORIES)
- Checkbox: "Always use this category for [extracted vendor]"
- Bulk actions: select multiple, assign same category

### 3.2 Inline Classification

On any transaction list:
- Click category cell → dropdown to change
- Option to save as rule for that vendor

---

## Phase 4: CSV Import Integration

### 4.1 Modified Import Flow

```javascript
async function importCSV(file) {
  const transactions = parseCSV(file);
  
  // Layer 1: Local classification
  const { classified, unclassified } = await classifyLocally(transactions);
  
  // Layer 2: Gemini for unknowns (if any)
  let geminiClassified = [];
  if (unclassified.length > 0) {
    geminiClassified = await classifyWithGemini(unclassified);
    // Auto-save new rules
    await saveGeminiRules(geminiClassified);
  }
  
  // Combine results
  const allTransactions = [...classified, ...geminiClassified];
  
  // Insert into database
  await insertTransactions(allTransactions);
  
  // Return stats
  return {
    total: transactions.length,
    autoClassified: classified.length,
    geminiClassified: geminiClassified.length,
    needsReview: allTransactions.filter(t => !t.category).length
  };
}
```

### 4.2 Post-Import Summary Modal

Show user:
- "85 transactions imported"
- "70 auto-classified (local rules)"
- "12 classified by AI"
- "3 need manual review" → Button to review queue

---

## File Structure

```
shared/constants/
  categories.js          (existing - IRS categories)
  defaultVendors.js      (NEW - 100+ common vendors)

client/src/services/
  classificationService.js  (NEW - local classification logic)

client/src/features/Classification/
  Classification.jsx        (existing - update to use new service)
  ManualReviewQueue.jsx     (NEW - review uncertain transactions)

supabase/functions/
  classify-transactions/    (NEW - Gemini API wrapper)
    index.ts

supabase/migrations/
  XXXXXX_classification_rules.sql  (NEW - rules table)
```

---

## Implementation Order

1. **Database**: Create `classification_rules` table
2. **Default Vendors**: Create `defaultVendors.js` with 100+ mappings
3. **Classification Service**: Build local engine with Fuse.js
4. **CSV Import Update**: Integrate Layer 1 into import flow
5. **Gemini Edge Function**: Build and test API integration
6. **Auto-Save Rules**: Save Gemini results as new rules
7. **Manual Review UI**: Build review queue component
8. **Import Summary**: Show classification stats after import

---

## Error Handling

### Layer 1: Local Rules
| Error | Handling |
|-------|----------|
| Invalid transaction data | Skip transaction, log warning, continue batch |
| Fuse.js failure | Fallback to exact match only |
| Rules table unavailable | Use default vendors only |

### Layer 2: Gemini API
| Error | Handling |
|-------|----------|
| Rate limit (429) | Queue for retry, proceed with manual review |
| API timeout | Mark as unclassified, add to manual queue |
| Invalid JSON response | Log error, fallback to manual review |
| API key missing/invalid | Skip Layer 2, log error, continue to Layer 3 |
| Partial response | Process valid items, retry failed ones |

### Layer 3: Manual Review
| Error | Handling |
|-------|----------|
| Rule save fails | Show toast error, don't block category save |
| Invalid category | Validate against IRS_CATEGORIES before save |

### General
- All API calls wrapped in try/catch
- Toast notifications for user-facing errors
- Console logging for debugging
- Graceful degradation (always allow manual classification)

---

## Testing

### Unit Tests

File: `client/src/__tests__/services/classificationService.test.js`

```javascript
describe('classificationService', () => {
  describe('extractVendor', () => {
    it('extracts vendor from common formats');
    it('handles CHECKCARD prefix');
    it('handles POS PURCHASE prefix');
    it('handles ACH DEBIT prefix');
    it('handles SQ * prefix (Square)');
    it('handles PAYPAL * prefix');
    it('returns original if no pattern matches');
  });

  describe('classifyTransaction', () => {
    it('returns exact match with confidence 1.0');
    it('returns fuzzy match with lower confidence');
    it('returns default vendor match');
    it('returns null for unknown vendor');
  });

  describe('batchClassify', () => {
    it('classifies array of transactions');
    it('separates classified and unclassified');
    it('handles empty array');
    it('handles invalid transactions gracefully');
  });
});
```

File: `client/src/__tests__/services/geminiService.test.js`

```javascript
describe('geminiService', () => {
  describe('buildPrompt', () => {
    it('includes all IRS categories');
    it('batches transactions correctly');
    it('limits tokens appropriately');
  });

  describe('parseResponse', () => {
    it('parses valid JSON response');
    it('handles malformed JSON');
    it('validates category against IRS_CATEGORIES');
  });
});
```

### Integration Tests

File: `client/src/__tests__/features/CSVImportClassification.test.jsx`

```javascript
describe('CSV Import with Classification', () => {
  it('classifies known vendors automatically');
  it('sends unknowns to Gemini');
  it('shows correct stats in summary modal');
  it('handles Gemini failure gracefully');
  it('saves Gemini results as new rules');
});
```

### E2E Test Scenarios

1. Import CSV with all known vendors → 100% auto-classified
2. Import CSV with unknown vendors → Gemini called, rules saved
3. Manual classification → Rule created, next import uses it
4. Gemini API failure → Falls back to manual review
5. Edit existing transaction category → Option to save as rule

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Auto-classified (Layer 1) | 70%+ after 1 month of use |
| Gemini API calls | <10% of transactions |
| Manual review needed | <5% of transactions |
| Time to classify 100 transactions | <5 seconds |
