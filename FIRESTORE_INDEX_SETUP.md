# Firestore Index Setup Guide

## Required Index for Transaction Queries

Your application requires a composite index in Firestore for the transaction queries to work properly. This is a one-time setup.

### What you need to create:

**Collection:** `transactions`
**Fields:**
- `userId` (Ascending)
- `statementId` (Ascending) 
- `date` (Ascending)

### How to create the index:

#### Option 1: Automatic Creation (Recommended)
1. Try to view an upload's details in your app
2. The error message will contain a direct link to create the index
3. Click the link and it will take you to the Firebase Console with the index pre-configured
4. Click "Create Index" 

#### Option 2: Manual Creation
1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to "Firestore Database" > "Indexes" 
4. Click "Create Index"
5. Fill in the details:
   - **Collection ID:** `transactions`
   - **Fields:** 
     - `userId` - Ascending
     - `statementId` - Ascending  
     - `date` - Ascending
6. Click "Create"

### Index Creation Time
- Indexes usually take a few minutes to create
- For larger collections, it may take longer
- You'll receive an email when the index is ready

### After Index Creation
1. Refresh your application
2. Navigate to upload details 
3. Transactions should now load properly

## Troubleshooting

If you continue to see issues after index creation:

1. **Check index status:** In Firebase Console > Firestore > Indexes, make sure the status shows "Enabled"
2. **Clear browser cache:** Hard refresh your application (Ctrl+F5)
3. **Check console logs:** Look for any remaining Firestore errors
4. **Wait a bit longer:** Sometimes propagation takes extra time

## Additional Indexes You May Need

As your app grows, you might need additional indexes for:
- Filtering transactions by company
- Sorting by different fields
- Complex query combinations

The Firebase Console will provide direct links for these as they're needed.
