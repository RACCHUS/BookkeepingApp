# 🔧 Firestore Index Setup for Uploads

## Issue
Your uploaded PDF files are not appearing on the Uploads page because **Firestore requires composite indexes** for the queries used to retrieve uploads. The system has fallback mechanisms in place, but for optimal performance and reliability, you need to create the required indexes.

## Quick Solution

### Option 1: Automatic Index Creation (Recommended)
1. Upload a PDF file (this will trigger the index requirement)
2. Check the server console/logs for an error message containing a URL like:
   ```
   https://console.firebase.google.com/v1/r/project/bookkeeping-app-12583/firestore/indexes?create_composite=...
   ```
3. Click that URL to automatically create the required index
4. Wait 2-5 minutes for the index to build
5. Refresh the Uploads page

### Option 2: Deploy Index Configuration
1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Deploy the indexes from the project root:
   ```bash
   firebase deploy --only firestore:indexes
   ```

4. Wait for deployment to complete (usually 2-5 minutes)

### Option 3: Manual Index Creation
Go to the [Firebase Console](https://console.firebase.google.com/project/bookkeeping-app-12583/firestore/indexes) and create these composite indexes:

#### Index 1: Basic Uploads Query
- **Collection:** `uploads`
- **Fields:**
  - `userId` (Ascending)
  - `uploadedAt` (Descending)

#### Index 2: Company-Filtered Uploads Query
- **Collection:** `uploads`
- **Fields:**
  - `userId` (Ascending)
  - `companyId` (Ascending)
  - `uploadedAt` (Descending)

#### Index 3: Upload Transactions Query
- **Collection:** `transactions`
- **Fields:**
  - `userId` (Ascending)
  - `uploadId` (Ascending)
  - `date` (Descending)

## How to Test

1. After creating the indexes, wait 2-5 minutes for them to build
2. Upload a PDF file
3. Navigate to the Uploads page
4. The uploaded file should now appear immediately

## Troubleshooting

### If uploads still don't appear:
1. Check the browser console for any errors
2. Check the server logs for error messages
3. Try refreshing the page
4. Verify that the indexes show as "Enabled" in the Firebase Console

### If you see "fallback" messages:
- The system is using file system fallback instead of Firestore
- This means the indexes haven't been created yet or are still building
- Create the required indexes as described above

### If uploads appear but transaction counts are wrong:
- Make sure the transactions index (userId + uploadId + date) is created
- This index is needed to count transactions associated with each upload

## Status Check

You can run this test script to check if indexes are working:

```bash
node test-uploads-indexing.mjs
```

This will:
- Test basic uploads retrieval
- Test company-filtered queries
- Show which indexes are missing
- Provide direct links to create indexes

## Current Index Status

The `firestore.indexes.json` file has been updated with all required indexes. Use `firebase deploy --only firestore:indexes` to deploy them all at once.

---

## Why This Happened

Firestore requires composite indexes for queries that:
1. Filter on multiple fields
2. Combine filtering and sorting on different fields
3. Filter on one field and sort on another

The uploads functionality uses queries like:
- Get all uploads for a user, sorted by upload date
- Get uploads for a specific company and user, sorted by upload date
- Get transactions for a specific upload

Each of these requires a custom index that must be created explicitly.
