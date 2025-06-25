# Firebase Setup Guide for Bookkeeping App

## Quick Setup Checklist

- [ ] Create Firebase project
- [ ] Enable Authentication (Email/Password)
- [ ] Set up Firestore Database
- [ ] Set up Storage
- [ ] Get Web App configuration
- [ ] Generate Service Account key
- [ ] Update .env file
- [ ] Deploy security rules
- [ ] Test the connection

## Detailed Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Project name: `bookkeeping-app` (or your preferred name)
4. Enable/disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. Navigate to **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable these providers:
   - ✅ **Email/Password** (Required)
   - ✅ **Google** (Recommended for better UX)

### 3. Set up Firestore Database

1. Navigate to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (temporary)
3. Select location: `us-central1` (or closest to your users)
4. Click "Done"

### 4. Set up Storage

1. Navigate to **Storage** → **Get started**
2. Choose **Start in test mode** (temporary)
3. Use the same location as Firestore
4. Click "Done"

### 5. Get Web Configuration

1. Go to **Project settings** (⚙️ gear icon)
2. Scroll to "Your apps" section
3. Click **Add app** → **Web** (</>)
4. App nickname: "Bookkeeping Web App"
5. Check "Set up Firebase Hosting" (optional)
6. Click "Register app"
7. **Copy the config object** - you'll need this for .env

### 6. Generate Service Account Key

1. Still in **Project settings** → **Service accounts** tab
2. Click **Generate new private key**
3. **Download the JSON file** and keep it secure
4. **Do NOT commit this file to Git**

### 7. Update Environment Variables

Copy the downloaded JSON file values and your web config to update `.env`:

```bash
# From Firebase Web Config
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# From Service Account JSON
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_multi_line_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_CLIENT_ID=your_client_id
```

### 8. Deploy Security Rules

Run these commands to deploy the security rules:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Deploy Firestore and Storage rules
firebase deploy --only firestore:rules,storage
```

### 9. Test the Connection

1. Restart your development servers:
   ```bash
   npm run dev
   ```

2. You should see:
   ```
   ✅ Firebase Admin SDK initialized successfully
   🚀 Server running on port 5000
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```

   Should return:
   ```json
   {
     "status": "OK",
     "services": {
       "firebase": "connected"
     }
   }
   ```

## Security Rules

The app includes pre-configured security rules for:

- **Firestore**: User-based data isolation
- **Storage**: Authenticated file uploads with size limits

## Troubleshooting

### Common Issues:

1. **"Service account object must contain a string 'project_id' property"**
   - Make sure you've updated the .env file with real values
   - Check that FIREBASE_ADMIN_PROJECT_ID is set correctly

2. **"Failed to get document because the client is offline"**
   - Check your internet connection
   - Verify Firestore is enabled in Firebase Console

3. **"Permission denied" errors**
   - Make sure you've deployed the security rules
   - Check that authentication is working

4. **Private key format errors**
   - Ensure the private key includes proper line breaks (\n)
   - Keep the quotes around the entire key value

## Next Steps

Once Firebase is configured:

1. Test user registration and login
2. Upload a PDF to test file processing
3. Create some transactions to test the database
4. Generate a report to test all features

## Production Deployment

Before deploying to production:

1. Update Firestore rules to production mode
2. Update Storage rules for production
3. Set up proper environment variables
4. Configure Firebase Hosting (optional)
5. Set up monitoring and error reporting
