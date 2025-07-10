# Environment Configuration

This document describes how to configure the development and production environments for the Bookkeeping App.

## Environment Overview

The application uses different configurations for:
- **Development**: Local development with Firebase emulators
- **Testing**: Automated testing environment
- **Staging**: Pre-production testing environment  
- **Production**: Live production environment

## Environment Variables

### Client Environment Variables

**Development** (`client/.env.local`):
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-dev-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-dev
VITE_FIREBASE_STORAGE_BUCKET=your-project-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Configuration
VITE_API_BASE_URL=http://localhost:5001/your-project-dev/us-central1/api
VITE_USE_EMULATOR=true

# Debug Settings
VITE_DEBUG_MODE=true
VITE_ENABLE_LOGGING=true
```

**Production** (`client/.env.production`):
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-prod-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:fedcba654321

# API Configuration
VITE_API_BASE_URL=https://us-central1-your-project.cloudfunctions.net/api
VITE_USE_EMULATOR=false

# Debug Settings
VITE_DEBUG_MODE=false
VITE_ENABLE_LOGGING=false
```

### Server Environment Variables

**Development** (`server/.env`):
```env
# Environment
NODE_ENV=development
PORT=5001

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-dev
FIREBASE_USE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Debug Settings
DEBUG_PDF=true
DEBUG_CLASSIFICATION=true
LOG_LEVEL=debug

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

**Production** (`server/.env.production`):
```env
# Environment
NODE_ENV=production

# Firebase Configuration (using service account)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# CORS Configuration
CORS_ORIGIN=https://your-project.firebaseapp.com

# Debug Settings
DEBUG_PDF=false
DEBUG_CLASSIFICATION=false
LOG_LEVEL=error

# File Upload Settings
MAX_FILE_SIZE=10485760
```

## Firebase Configuration

### 1. Development Setup with Emulators

**Firebase Emulator Configuration** (`firebase.json`):
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

**Starting Development Environment:**
```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,auth,functions
```

### 2. Environment-Specific Firebase Projects

**Initialize Projects:**
```bash
# Development project
firebase use --add your-project-dev --alias development

# Staging project  
firebase use --add your-project-staging --alias staging

# Production project
firebase use --add your-project --alias production

# Switch between environments
firebase use development
firebase use staging  
firebase use production
```

### 3. Firebase Client Configuration

**Environment-aware Firebase Initialization** (`client/src/config/firebase.js`):
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## Environment Detection

### Client Environment Detection

**Environment Utilities** (`client/src/utils/environment.js`):
```javascript
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isStaging = import.meta.env.VITE_ENVIRONMENT === 'staging';

export const getEnvironment = () => {
  if (isDevelopment) return 'development';
  if (isStaging) return 'staging';
  if (isProduction) return 'production';
  return 'unknown';
};

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
};

export const isDebugMode = () => {
  return import.meta.env.VITE_DEBUG_MODE === 'true';
};

export const isLoggingEnabled = () => {
  return import.meta.env.VITE_ENABLE_LOGGING === 'true';
};
```

### Server Environment Detection

**Environment Utilities** (`server/utils/environment.js`):
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const getEnvironment = () => process.env.NODE_ENV || 'development';

const useEmulator = process.env.FIREBASE_USE_EMULATOR === 'true';

const getLogLevel = () => process.env.LOG_LEVEL || 'info';

const getMaxFileSize = () => {
  return parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
};

module.exports = {
  isDevelopment,
  isProduction, 
  isTest,
  getEnvironment,
  useEmulator,
  getLogLevel,
  getMaxFileSize
};
```

## Configuration Management

### 1. Environment-Specific Builds

**Vite Build Configuration** (`client/vite.config.js`):
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  return {
    plugins: [react()],
    define: {
      __DEV__: isDev,
      __PROD__: !isDev
    },
    build: {
      sourcemap: isDev,
      minify: isDev ? false : 'terser',
      terserOptions: !isDev ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined
    },
    server: {
      port: 5173,
      proxy: isDev ? {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true
        }
      } : undefined
    }
  };
});
```

### 2. Environment-Specific Logging

**Client Logging** (`client/src/utils/logger.js`):
```javascript
import { isLoggingEnabled, isDevelopment } from './environment';

class Logger {
  constructor() {
    this.enabled = isLoggingEnabled() || isDevelopment;
  }

  debug(...args) {
    if (this.enabled) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.enabled) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.enabled) {
      console.error('[ERROR]', ...args);
    }
  }
}

export default new Logger();
```

**Server Logging** (`server/utils/logger.js`):
```javascript
const { getLogLevel, isDevelopment } = require('./environment');

const winston = require('winston');

const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDevelopment 
      ? winston.format.colorize()
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    ...(isDevelopment ? [] : [
      new winston.transports.File({ 
        filename: 'error.log', 
        level: 'error' 
      })
    ])
  ]
});

module.exports = logger;
```

## Database Configuration

### 1. Firestore Rules per Environment

**Development Rules** (`firestore.rules.dev`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads/writes in development
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Production Rules** (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strict production rules
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    match /companies/{companyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### 2. Environment-Specific Indexes

Deploy different indexes per environment:
```bash
# Development indexes (minimal)
firebase deploy --only firestore:indexes --project development

# Production indexes (optimized)
firebase deploy --only firestore:indexes --project production
```

## Security Configuration

### 1. CORS Configuration

**Environment-Specific CORS** (`server/middlewares/cors.js`):
```javascript
const cors = require('cors');
const { isDevelopment } = require('../utils/environment');

const corsOptions = {
  origin: (origin, callback) => {
    if (isDevelopment) {
      // Allow all origins in development
      callback(null, true);
    } else {
      // Restrict origins in production
      const allowedOrigins = [
        process.env.CORS_ORIGIN,
        'https://your-project.firebaseapp.com'
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
};

module.exports = cors(corsOptions);
```

### 2. Security Headers

**Environment-Specific Security** (`server/middlewares/security.js`):
```javascript
const helmet = require('helmet');
const { isProduction } = require('../utils/environment');

const securityMiddleware = (req, res, next) => {
  if (isProduction) {
    // Strict security headers for production
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
  }
  next();
};

module.exports = isProduction ? [helmet(), securityMiddleware] : [securityMiddleware];
```

## Testing Environment

### 1. Test Environment Configuration

**Jest Configuration** (`client/jest.config.js`):
```javascript
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.stories.js'
  ]
};
```

**Test Setup** (`client/src/test/setup.js`):
```javascript
import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_USE_EMULATOR: 'true',
    VITE_DEBUG_MODE: 'true'
  }
});

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  connectAuthEmulator: jest.fn()
}));
```

### 2. API Testing Environment

**Server Test Configuration** (`server/test/setup.js`):
```javascript
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_USE_EMULATOR = 'true';

// Initialize test database
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'test-project'
  });
}

// Clear test data before each test
beforeEach(async () => {
  const db = admin.firestore();
  const collections = ['users', 'companies', 'transactions', 'uploads'];
  
  for (const collection of collections) {
    const snapshot = await db.collection(collection).get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!snapshot.empty) {
      await batch.commit();
    }
  }
});
```

## Environment Validation

### 1. Configuration Validation

**Environment Validator** (`server/utils/validateEnv.js`):
```javascript
const requiredEnvVars = {
  development: [
    'FIREBASE_PROJECT_ID',
    'CORS_ORIGIN'
  ],
  production: [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'CORS_ORIGIN'
  ]
};

const validateEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || [];
  
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log(`✅ Environment validation passed for ${env}`);
};

module.exports = { validateEnvironment };
```

### 2. Health Check per Environment

**Environment Health Check** (`server/routes/health.js`):
```javascript
const express = require('express');
const { getEnvironment, isDevelopment } = require('../utils/environment');
const admin = require('firebase-admin');

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    environment: getEnvironment(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Test database connection
    if (!isDevelopment) {
      await admin.firestore().collection('_health').doc('test').get();
    }
    
    health.database = 'connected';
  } catch (error) {
    health.status = 'unhealthy';
    health.database = 'disconnected';
    health.error = error.message;
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

## Troubleshooting

### Common Environment Issues

**Firebase Emulator Connection Issues:**
```bash
# Kill existing emulator processes
pkill -f firebase
netstat -tulpn | grep :8080

# Clear emulator data
firebase emulators:exec --project demo-project "echo 'Clearing data'" --import=./emulator-data --export-on-exit
```

**Environment Variable Loading Issues:**
```javascript
// Debug environment variables
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('FIREBASE')));
```

**CORS Issues in Development:**
```javascript
// Temporary CORS bypass for development
if (isDevelopment) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
}
```
