# Database Schema

This document describes the Firestore database structure for the Bookkeeping App.

## Collections Overview

```
bookkeeping-app (database)
├── users/                 # User profiles and settings
├── companies/             # Company information
├── transactions/          # Financial transactions
├── uploads/               # PDF upload metadata
├── payees/                # Employees and vendors
├── classification-rules/  # Transaction classification rules
└── reports/               # Generated report metadata
```

## Collection Schemas

### Users Collection
```
users/{userId}
```

```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  displayName?: string;           // User's display name
  defaultCompanyId?: string;      // Default company selection
  preferences: {
    dateFormat: string;           // "MM/DD/YYYY" | "DD/MM/YYYY"
    currency: string;             // "USD", "EUR", etc.
    defaultReportRange: string;   // "month" | "quarter" | "year"
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Companies Collection
```
companies/{companyId}
```

```typescript
interface Company {
  id: string;                     // Auto-generated ID
  userId: string;                 // Owner's user ID
  name: string;                   // Company name
  description?: string;           // Optional description
  settings: {
    fiscalYearStart: string;      // "01-01" format (MM-DD)
    taxId?: string;               // EIN or SSN
    address?: string;             // Business address
    industry?: string;            // Business industry
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Transactions Collection
```
transactions/{transactionId}
```

```typescript
interface Transaction {
  id: string;                     // Auto-generated ID
  userId: string;                 // Owner's user ID
  companyId?: string;             // Associated company
  statementId?: string;           // Source upload ID
  
  // Transaction Details
  date: string;                   // ISO date string
  description: string;            // Transaction description
  amount: number;                 // Amount (positive number)
  type: "income" | "expense";     // Transaction type
  
  // Classification
  category: string;               // IRS tax category
  categoryConfidence?: number;    // Classification confidence (0-100)
  needsReview: boolean;           // Requires manual review
  
  // Additional Info
  payeeId?: string;               // Associated payee
  checkNumber?: string;           // Check number (if applicable)
  notes?: string;                 // User notes
  
  // Metadata
  source: string;                 // "manual" | "chase_pdf" | "import"
  section?: string;               // PDF section (e.g., "CHECKS PAID")
  sectionCode?: string;           // Section code (e.g., "checks")
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Uploads Collection
```
uploads/{uploadId}
```

```typescript
interface Upload {
  id: string;                     // Auto-generated ID
  userId: string;                 // Owner's user ID
  companyId?: string;             // Associated company
  
  // File Information
  fileName: string;               // Original filename
  displayName: string;            // User-friendly name
  fileSize: number;               // File size in bytes
  mimeType: string;               // File MIME type
  storagePath: string;            // Firebase Storage path
  
  // Processing Status
  status: "uploading" | "processing" | "completed" | "error";
  processingStarted?: Timestamp;
  processingCompleted?: Timestamp;
  errorMessage?: string;
  
  // Extraction Results
  accountInfo?: {
    accountNumber?: string;
    statementPeriod?: {
      start: string;
      end: string;
    };
    beginningBalance?: number;
    endingBalance?: number;
  };
  
  // Statistics
  transactionCount: number;       // Number of extracted transactions
  totalIncome: number;            // Total income extracted
  totalExpenses: number;          // Total expenses extracted
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Payees Collection
```
payees/{payeeId}
```

```typescript
interface Payee {
  id: string;                     // Auto-generated ID
  userId: string;                 // Owner's user ID
  companyId?: string;             // Associated company
  
  // Basic Information
  name: string;                   // Payee name
  type: "employee" | "vendor";    // Payee type
  
  // Contact Information
  email?: string;                 // Email address
  phone?: string;                 // Phone number
  address?: string;               // Mailing address
  
  // Tax Information
  taxId?: string;                 // SSN or EIN
  is1099Required: boolean;        // Requires 1099 reporting
  
  // Statistics
  totalPaid: number;              // Total amount paid to date
  transactionCount: number;       // Number of transactions
  lastPaymentDate?: string;       // Last payment date
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Classification Rules Collection
```
classification-rules/{ruleId}
```

```typescript
interface ClassificationRule {
  id: string;                     // Auto-generated ID
  userId: string;                 // Owner's user ID
  
  // Rule Definition
  pattern: string;                // Text pattern to match
  category: string;               // Target IRS category
  priority: number;               // Rule priority (higher = first)
  isActive: boolean;              // Rule enabled/disabled
  
  // Pattern Options
  caseSensitive: boolean;         // Case sensitive matching
  useRegex: boolean;              // Use regex pattern
  
  // Statistics
  matchCount: number;             // Number of matches to date
  lastUsed?: Timestamp;           // Last time rule was applied
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Reports Collection
```
reports/{reportId}
```

```typescript
interface Report {
  id: string;                     // Auto-generated ID
  userId: string;                 // Owner's user ID
  companyId?: string;             // Associated company
  
  // Report Details
  type: string;                   // "profit-loss" | "tax-summary" | etc.
  title: string;                  // Report title
  parameters: {                   // Report parameters
    startDate?: string;
    endDate?: string;
    year?: number;
    companyId?: string;
  };
  
  // File Information
  fileName: string;               // Generated filename
  storagePath?: string;           // Storage path (if saved)
  fileSize?: number;              // File size in bytes
  
  // Status
  status: "generating" | "completed" | "error";
  errorMessage?: string;
  
  createdAt: Timestamp;
  expiresAt: Timestamp;           // Auto-deletion date
}
```

## Indexes Required

### Composite Indexes

```javascript
// transactions collection
{
  collection: "transactions",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "date", order: "DESCENDING" }
  ]
}

{
  collection: "transactions",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "companyId", order: "ASCENDING" },
    { field: "date", order: "DESCENDING" }
  ]
}

{
  collection: "transactions",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "statementId", order: "ASCENDING" },
    { field: "date", order: "DESCENDING" }
  ]
}

// uploads collection
{
  collection: "uploads",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "createdAt", order: "DESCENDING" }
  ]
}

// payees collection
{
  collection: "payees",
  fields: [
    { field: "userId", order: "ASCENDING" },
    { field: "companyId", order: "ASCENDING" },
    { field: "name", order: "ASCENDING" }
  ]
}
```

## Security Rules

See `firestore.rules` for complete security rules. Key principles:

1. **User Isolation**: Users can only access their own data
2. **Company Filtering**: Data is filtered by company when applicable
3. **Authentication Required**: All operations require valid Firebase Auth
4. **Validation**: Input validation on all write operations

## Data Migration

When schema changes are needed:

1. Update interfaces in `shared/schemas/`
2. Create migration script in `scripts/migrations/`
3. Test migration on development data
4. Deploy with proper rollback plan

## Backup and Recovery

- Firestore automatic backups are enabled
- Export scripts available in `scripts/backup/`
- Point-in-time recovery available for 7 days
