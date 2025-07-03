import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('✅ Starting server...');

// Load environment variables from root directory
dotenv.config({ path: join(__dirname, '../.env') });

// Initialize Firebase Admin (with error handling)
let admin = null;
const initializeFirebase = async () => {
  try {
    console.log('🔥 Initializing Firebase Admin...');
    const firebaseAdminModule = await import('./config/firebaseAdmin.js');
    admin = firebaseAdminModule.default;
    if (admin) {
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.log('⚠️  Firebase Admin not configured (running in dev mode)');
    }
  } catch (error) {
    console.warn('⚠️  Firebase Admin initialization failed:', error.message);
    console.warn('   Server will run without Firebase functionality');
  }
};

// Initialize Firebase asynchronously
initializeFirebase();

// Import optional auth middleware
import optionalAuthMiddleware from './middlewares/optionalAuthMiddleware.js';

// Import transaction routes  
import transactionRoutes from './routes/transactionRoutes.js';

// Import PDF routes
import pdfRoutes from './routes/pdfRoutes.js';

// Import classification routes
import classificationRoutes from './routes/classificationRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      firebase: admin ? 'connected' : 'not configured'
    }
  });
});

// Test endpoint (no auth required)
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Firebase test endpoint
app.get('/api/test/firebase', async (req, res) => {
  try {
    if (!admin) {
      return res.status(200).json({
        status: 'firebase_not_configured',
        message: 'Firebase not initialized - check credentials',
        firebase_available: false
      });
    }

    // Import the Firebase service to get status
    const firebaseServiceModule = await import('./services/cleanFirebaseService.js');
    const firebaseService = firebaseServiceModule.default;
    const status = firebaseService.getStatus();

    if (!status.firestore_enabled) {
      return res.status(200).json({
        status: 'firestore_disabled',
        message: 'Firebase configured but Firestore API is disabled',
        firebase_available: true,
        firestore_enabled: false,
        fix_url: 'https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=bookkeeping-app-12583'
      });
    }

    // Test Auth connection  
    const authTest = await admin.auth().listUsers(1);

    res.status(200).json({
      status: 'firebase_fully_connected',
      message: 'Firebase is working correctly!',
      firebase_available: true,
      firestore_enabled: true,
      services: {
        firestore: 'connected',
        auth: 'connected'
      },
      service_status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Firebase test failed:', error);
    res.status(500).json({
      status: 'firebase_error',
      message: 'Firebase connection failed',
      error: error.message,
      firebase_available: false
    });
  }
});

// Test endpoint to seed sample data
app.post('/api/test/seed-data', optionalAuthMiddleware, async (req, res) => {
  try {
    const firebaseServiceModule = await import('./services/cleanFirebaseService.js');
    const firebaseService = firebaseServiceModule.default;
    
    // Add more sample data
    const { uid: userId } = req.user;
    
    const sampleTransactions = [
      {
        date: '2025-06-15',
        amount: 2200.00,
        description: 'Client Payment - Website Redesign',
        category: 'Business Income',
        type: 'income',
        payee: 'Blue Ocean Marketing'
      },
      {
        date: '2025-06-18',
        amount: 67.89,
        description: 'Internet & Phone Bill',
        category: 'Utilities',
        type: 'expense',
        payee: 'Verizon Business'
      },
      {
        date: '2025-06-20',
        amount: 150.00,
        description: 'Professional Development Course',
        category: 'Education & Training',
        type: 'expense',
        payee: 'Udemy'
      }
    ];

    const createdTransactions = [];
    for (const transaction of sampleTransactions) {
      const result = await firebaseService.createTransaction(userId, transaction);
      createdTransactions.push(result);
    }

    res.status(201).json({
      success: true,
      message: `Added ${createdTransactions.length} sample transactions`,
      data: createdTransactions,
      using_firebase: firebaseService.isUsingFirebase(),
      service_status: firebaseService.getStatus()
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({
      error: 'Failed to seed data',
      message: error.message
    });
  }
});

// Debug middleware to log all API requests
app.use('/api/*', (req, res, next) => {
  console.log(`🔍 API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Add full transaction routes with optional auth
app.use('/api/transactions', optionalAuthMiddleware, transactionRoutes);

// Add PDF routes with optional auth
app.use('/api/pdf', optionalAuthMiddleware, pdfRoutes);

// Add classification routes with optional auth
app.use('/api/classification', optionalAuthMiddleware, classificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});
