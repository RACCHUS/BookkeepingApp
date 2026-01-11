# Deployment Guide

This guide covers deploying the Bookkeeping App to production using Firebase Hosting.

## Architecture Overview

The application uses a hybrid architecture:
- **Frontend**: React app deployed to Firebase Hosting
- **Authentication**: Firebase Authentication
- **Database**: Supabase PostgreSQL (accessed directly from frontend)
- **Storage**: Supabase Storage (with Cloudinary fallback)

> **Note**: The Express.js server (`/server`) is only used for local development. In production, the frontend communicates directly with Supabase.

## Prerequisites

### 1. Firebase CLI Installation
```bash
npm install -g firebase-tools
```

### 2. Authentication
```bash
firebase login
```

### 3. Project Setup
Ensure your Firebase project is configured with:
- Firebase Authentication (Email/Password enabled)
- Firebase Hosting

## Environment Configuration

### 1. Production Environment Variables

**Client Environment** (`client/.env.production`):
```env
# Firebase Auth Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Supabase Configuration (Database)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your-anon-key
```

> **Important**: Use the Supabase **publishable** key (starts with `sb_publishable_`), NOT the secret key.

## Deployment Steps

### Quick Deploy (Recommended)

```bash
# 1. Build the client
cd client
npm run build

# 2. Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

### Full Deployment Script

**Windows (`scripts/deployment/deploy.bat`):**
```batch
@echo off
echo 🚀 Starting deployment process...

echo 📦 Installing dependencies...
cd client
call npm install

echo 🏗️ Building client...
call npm run build

echo 🔥 Deploying to Firebase Hosting...
cd ..
call firebase deploy --only hosting

echo ✅ Deployment complete!
pause
```

**Linux/Mac (`scripts/deployment/deploy.sh`):**
```bash
#!/bin/bash
echo "🚀 Starting deployment process..."

cd client
npm install
npm run build
cd ..

firebase deploy --only hosting

echo "✅ Deployment complete!"
```

## Firebase Configuration

### `firebase.json`
```json
{
  "hosting": {
    "public": "client/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Supabase Configuration

### Row Level Security (RLS)
RLS is disabled for this app since authentication is handled by Firebase. The Supabase `user_id` column stores Firebase UIDs.

### Required Tables
Ensure these tables exist in your Supabase project:
- `transactions`
- `companies`
- `payees`
- `classification_rules`
- `csv_imports`
- `income_sources`
- `receipts`
- `uploads`

Run the migrations in `supabase/migrations/` to set up the schema.

## Post-Deployment Checklist

- [ ] Verify Firebase Hosting is live at `https://your-project.firebaseapp.com`
- [ ] Test user authentication (sign up, login, logout)
- [ ] Test CSV import functionality
- [ ] Verify transactions are saved to Supabase
- [ ] Test classification rules
- [ ] Generate a test report

## Troubleshooting

### "Forbidden use of secret API key in browser"
You're using the Supabase **secret** key instead of the **publishable** key. Update `VITE_SUPABASE_ANON_KEY` to use the publishable key from Supabase Dashboard → Settings → API → Publishable keys.

### Authentication Issues
1. Ensure Firebase Auth is enabled in Firebase Console
2. Check that the Firebase config in `.env.production` matches your project
3. Verify the authorized domains in Firebase Console → Authentication → Settings

### Database Connection Issues
1. Check Supabase project is active (not paused)
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
3. Check browser console for specific error messages

## Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Rotate compromised keys** - If keys are exposed, regenerate them immediately
3. **Use environment variables** - Never hardcode secrets in source code
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "server",
    "runtime": "nodejs18",
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log",
      "test/**"
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### 2. Cloud Functions Configuration

**`server/package.json`** (Functions package.json):
```json
{
  "name": "bookkeeping-functions",
  "version": "1.0.0",
  "main": "index.js",
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "express-validator": "^6.14.0",
    "pdf-parse": "^1.1.1",
    "pdfkit": "^0.13.0"
  }
}
```

### 3. Firestore Security Rules Deployment

Ensure `firestore.rules` is properly configured:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Transactions are user-scoped
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Companies are user-scoped
    match /companies/{companyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## Production Optimizations

### 1. Build Optimizations

**Client Build** (`client/vite.config.js`):
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['react-query', 'react-router-dom']
        }
      }
    }
  }
});
```

### 2. Function Optimizations

**Cloud Function Configuration**:
```javascript
// server/index.js
const functions = require('firebase-functions');
const express = require('express');

const app = express();

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable compression
  const compression = require('compression');
  app.use(compression());
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Export Cloud Function
exports.api = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https
  .onRequest(app);
```

## Environment-Specific Deployments

### 1. Staging Environment

**Deploy to Staging:**
```bash
# Switch to staging project
firebase use staging

# Deploy with staging configuration
firebase deploy --only hosting,functions
```

### 2. Production Environment

**Deploy to Production:**
```bash
# Switch to production project  
firebase use production

# Run tests before deployment
npm run test:all

# Deploy to production
firebase deploy
```

## Database Migration

### 1. Firestore Indexes

Deploy required indexes with `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date", 
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION", 
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "companyId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### 2. Data Migration Scripts

**Migration Script Example:**
```javascript
// scripts/migrate-data.js
const admin = require('firebase-admin');

const migrateTransactionSchema = async () => {
  console.log('Starting transaction schema migration...');
  
  const db = admin.firestore();
  const batch = db.batch();
  
  const transactions = await db.collection('transactions').get();
  
  transactions.docs.forEach(doc => {
    const data = doc.data();
    
    // Add new fields with default values
    const updates = {
      needsReview: data.category ? false : true,
      source: data.source || 'manual'
    };
    
    batch.update(doc.ref, updates);
  });
  
  await batch.commit();
  console.log(`Migrated ${transactions.size} transactions`);
};
```

## Monitoring and Logging

### 1. Cloud Function Logs

**View Function Logs:**
```bash
# View recent logs
firebase functions:log

# View logs for specific function
firebase functions:log --only api

# Stream logs in real-time
firebase functions:log --follow
```

### 2. Performance Monitoring

Enable Firebase Performance Monitoring in `client/main.jsx`:
```javascript
import { initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';

const app = initializeApp(firebaseConfig);

// Enable performance monitoring in production
if (import.meta.env.PROD) {
  getPerformance(app);
}
```

### 3. Error Reporting

**Cloud Function Error Handling:**
```javascript
const functions = require('firebase-functions');

exports.api = functions.https.onRequest((req, res) => {
  try {
    // Your API logic
  } catch (error) {
    // Log error for monitoring
    functions.logger.error('API Error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

## Rollback Strategy

### 1. Quick Rollback

**Rollback to Previous Version:**
```bash
# View deployment history
firebase hosting:releases

# Rollback hosting to previous version
firebase hosting:clone <SOURCE_SITE_ID>:<SOURCE_VERSION_ID> <TARGET_SITE_ID>
```

### 2. Database Rollback

**Firestore Backup Strategy:**
```bash
# Export data before major deployments
gcloud firestore export gs://your-backup-bucket/backup-$(date +%Y%m%d)

# Restore from backup if needed
gcloud firestore import gs://your-backup-bucket/backup-20240115
```

## SSL and Security

### 1. Custom Domain Setup

**Configure Custom Domain:**
1. Go to Firebase Console → Hosting
2. Add custom domain
3. Verify domain ownership
4. SSL certificate is automatically provisioned

### 2. Security Headers

**Additional Security Headers:**
```javascript
// In Cloud Function
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
  next();
});
```

## Health Checks

### 1. API Health Check

**Health Check Endpoint:**
```javascript
// Add to server routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

### 2. Monitoring Script

**Automated Health Check:**
```bash
#!/bin/bash
# scripts/health-check.sh

HEALTH_URL="https://us-central1-your-project.cloudfunctions.net/api/health"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "✅ API is healthy"
    exit 0
else
    echo "❌ API health check failed (HTTP $response)"
    exit 1
fi
```

## Troubleshooting Deployment

### Common Issues

**Build Failures:**
```bash
# Clear build cache
rm -rf client/dist client/node_modules
npm run install:all
npm run build
```

**Function Deployment Errors:**
```bash
# Check function logs
firebase functions:log --only api

# Test function locally
cd server && npm start
```

**Firestore Rules Validation:**
```bash
# Validate rules before deployment
firebase firestore:rules:validate
```

### Debug Deployment
```bash
# Deploy with debug output
firebase deploy --debug

# Deploy specific components only
firebase deploy --only functions:api
firebase deploy --only hosting
```
