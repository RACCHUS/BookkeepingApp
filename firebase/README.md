# Firebase Configuration

This directory contains all Firebase-related configuration files and documentation.

## Configuration Files

### Core Config
- `firestore.rules` - Firestore database security rules
- `firestore.indexes.json` - Firestore composite indexes for query optimization  
- `storage.rules` - Firebase Storage security rules

### Documentation
- `CONFIGURATION.md` - Complete Firebase setup and configuration guide
- `SETUP.md` - Firestore setup instructions and troubleshooting
- `INDEX_SETUP.md` - Required Firestore indexes for the application

## File Details

### `firestore.rules`
- **Purpose**: Firestore database security rules
- **Description**: Defines read/write permissions for all Firestore collections
- **Key Features**:
  - User-scoped data access (users can only access their own data)
  - Authentication requirements for all operations
  - Collection-specific rules for transactions, companies, uploads, etc.

### `firestore.indexes.json`
- **Purpose**: Firestore composite indexes for query optimization
- **Description**: Defines compound indexes for efficient querying
- **Key Indexes**:
  - Transactions: `userId + date`, `userId + companyId + date`, `userId + category + date`
  - Uploads: `userId + createdAt`, `userId + companyId + createdAt`
  - Companies: `userId + name`
  - Payees: `userId + companyId + name`

### `storage.rules`
- **Purpose**: Firebase Storage security rules
- **Description**: Controls file access and upload restrictions
- **Key Features**:
  - User-scoped file access (`/users/{userId}/...`)
  - File type restrictions (PDF, CSV, Excel, images)
  - Size limits (10MB for uploads, 5MB for receipts)
  - Directory-specific rules for uploads, receipts, and reports

## Deployment

These files are automatically deployed when running:
```bash
firebase deploy
```

Or individually:
```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Firestore indexes  
firebase deploy --only firestore:indexes

# Deploy only Storage rules
firebase deploy --only storage
```

## Local Development

When using Firebase emulators, these files are automatically loaded:
```bash
firebase emulators:start
```

The emulator UI at `http://localhost:4000` provides tools to:
- View and test Firestore rules
- Inspect database indexes
- Monitor file uploads and storage rules

## Validation

Before deploying, validate the configuration:
```bash
# Validate Firestore rules
firebase firestore:rules:validate

# Test rules with emulator
firebase emulators:exec --ui "npm test"
```

## Notes

- **File paths** are referenced in the main `firebase.json` configuration
- **Rule changes** require deployment to take effect
- **Index creation** can take several minutes in production
- **Storage rules** apply immediately upon deployment
