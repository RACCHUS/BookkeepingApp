# Firestore Index Setup

## Issue
The app requires Firestore composite indexes for complex queries. Until these are set up, the app will use mock data as a fallback.

## Solution
Create the required Firestore indexes using one of these methods:

### Method 1: Automatic Index Creation
1. Navigate to the Firebase Console: https://console.firebase.google.com
2. Select your project: `bookkeeping-app-12583`
3. Go to Firestore Database → Indexes
4. Click the link provided in the error message to auto-create the index

### Method 2: Deploy Index Configuration
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize Firebase in the project root: `firebase init firestore`
4. Deploy the indexes: `firebase deploy --only firestore:indexes`

### Method 3: Manual Index Creation
Create a composite index with these fields:
- Collection: `transactions`
- Fields:
  - `userId` (Ascending)
  - `date` (Descending)

## Required Indexes
The app needs these composite indexes:

1. **Basic Query Index**
   - Collection: `transactions`
   - Fields: `userId` (ASC), `date` (DESC)

2. **Category Filter Index**
   - Collection: `transactions` 
   - Fields: `userId` (ASC), `category` (ASC), `date` (DESC)

3. **Type Filter Index**
   - Collection: `transactions`
   - Fields: `userId` (ASC), `type` (ASC), `date` (DESC)

## Index Creation Links
You can use these direct links to create indexes (replace with your actual URLs from the error messages):

- Primary Index: [Create Index](https://console.firebase.google.com/v1/r/project/bookkeeping-app-12583/firestore/indexes?create_composite=...)

## Status
- ✅ App fallback mechanism implemented (shows mock data)
- ✅ Index configuration file created (`firestore.indexes.json`)
- ⏳ Indexes need to be deployed to Firebase
- ⏳ Real transaction data will load once indexes are active

## Testing
Once indexes are deployed:
1. Restart the server
2. The yellow warning banner should disappear
3. Real transaction data will load from Firestore
4. All CRUD operations (create, edit, delete) will work with persistent data
