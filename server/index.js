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

// Import company routes
import companyRoutes from './routes/companyRoutes.js';

// Import payee routes
import payeeRoutes from './routes/payeeRoutes.js';

// Import report routes
import reportRoutes from './routes/reportRoutes.js';

// Import receipt routes
import receiptRoutes from './routes/receiptRoutes.js';

// Import check routes
import checkRoutes from './routes/checkRoutes.js';

// Import income source routes
import incomeSourceRoutes from './routes/incomeSourceRoutes.js';

// Import scheduler service for automatic cleanup
import schedulerService from './services/schedulerService.js';

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

// Add company routes with optional auth
app.use('/api/companies', optionalAuthMiddleware, companyRoutes);

// Add payee routes with optional auth
app.use('/api/payees', optionalAuthMiddleware, payeeRoutes);

// Add report routes with optional auth
app.use('/api/reports', optionalAuthMiddleware, reportRoutes);

// Add receipt routes with optional auth
app.use('/api/receipts', optionalAuthMiddleware, receiptRoutes);

// Add check routes with optional auth
app.use('/api/checks', optionalAuthMiddleware, checkRoutes);

// Add income source routes with optional auth
app.use('/api/income-sources', optionalAuthMiddleware, incomeSourceRoutes);

// Test endpoint for PDF generation (no auth required)
app.post('/api/test/pdf', async (req, res) => {
  try {
    console.log('🧪 Testing PDF generation...');
    
    const reportServiceModule = await import('./services/reportService.js');
    const reportService = reportServiceModule.default;
    
    const firebaseServiceModule = await import('./services/cleanFirebaseService.js');
    const firebaseService = firebaseServiceModule.default;
    
    // Check Firebase status
    console.log('🔥 Firebase status:', firebaseService.getStatus());
    
    // Use mock user ID for testing
    const userId = 'dev-user-123'; // Use the dev user that might have data
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    // First, let's add some test transactions
    console.log('🌱 Seeding test transactions...');
    
    const testTransactions = [
      {
        date: '2024-06-01',
        amount: 3500.00,
        description: 'Software Development Consulting',
        category: 'Business Income',
        type: 'income',
        payee: 'Tech Corp Ltd'
      },
      {
        date: '2024-06-02',
        amount: 85.50,
        description: 'Office Supplies - Staples',
        category: 'Office Expenses',
        type: 'expense',
        payee: 'Staples'
      },
      {
        date: '2024-06-03',
        amount: 1200.00,
        description: 'Rent Payment',
        category: 'Rent or Lease',
        type: 'expense',
        payee: 'Property Management Co'
      },
      {
        date: '2024-06-04',
        amount: 450.00,
        description: 'Marketing Campaign',
        category: 'Advertising',
        type: 'expense',
        payee: 'AdCorp'
      },
      {
        date: '2024-06-05',
        amount: 2200.00,
        description: 'Client Payment - ABC Corp',
        category: 'Business Income',
        type: 'income',
        payee: 'ABC Corp'
      }
    ];
    
    // Add transactions to database using the service method signature
    for (const transaction of testTransactions) {
      try {
        await firebaseService.createTransaction(userId, transaction);
        console.log('✅ Created transaction:', transaction.description);
      } catch (error) {
        console.log('⚠️ Transaction might already exist:', transaction.description, error.message);
      }
    }
    
    console.log('📊 Fetching transactions for PDF test...');
    
    // Get transactions for the test user
    const transactionResult = await firebaseService.getTransactions(userId, {
      startDate,
      endDate,
      limit: 100
    });
    
    const transactions = transactionResult.transactions || [];
    
    console.log(`📝 Found ${transactions.length} transactions for test`);
    
    // Generate tax summary
    const summary = await firebaseService.getTransactionSummary(userId, startDate, endDate);
    
    console.log('📄 Generating PDF...');
    
    // Test all PDF generation methods
    const taxPdfResult = await reportService.generateTaxSummaryPDF(
      transactions,
      summary,
      2024,
      {
        userId,
        includeTransactionDetails: true
      }
    );
    
    const summaryPdfResult = await reportService.generateTransactionSummaryPDF(
      transactions,
      summary,
      {
        userId,
        includeDetails: true,
        title: 'Test Transaction Summary',
        dateRange: { start: '2024-01-01', end: '2024-12-31' }
      }
    );
    
    const categoryPdfResult = await reportService.generateCategoryBreakdownPDF(
      transactions,
      summary,
      {
        userId,
        title: 'Test Category Breakdown',
        dateRange: { start: '2024-01-01', end: '2024-12-31' }
      }
    );
    
    const checksPaidPdfResult = await reportService.generateChecksPaidPDF(
      transactions,
      summary,
      {
        userId,
        title: 'Test Checks Paid Report',
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        includeDetails: true
      }
    );
    
    console.log('✅ All PDFs generated successfully:');
    console.log('  - Tax Summary:', taxPdfResult.fileName);
    console.log('  - Transaction Summary:', summaryPdfResult.fileName);
    console.log('  - Category Breakdown:', categoryPdfResult.fileName);
    console.log('  - Checks Paid Report:', checksPaidPdfResult.fileName);
    
    res.json({
      success: true,
      message: 'All PDF reports generated successfully',
      files: {
        taxSummary: taxPdfResult.fileName,
        transactionSummary: summaryPdfResult.fileName,
        categoryBreakdown: categoryPdfResult.fileName,
        checksPaidReport: checksPaidPdfResult.fileName
      },
      transactionCount: transactions.length,
      summary
    });
  } catch (error) {
    console.error('❌ Error testing PDF generation:', error);
    res.status(500).json({
      error: 'PDF generation test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Test endpoint specifically for category breakdown debugging
app.post('/api/test/category-breakdown', async (req, res) => {
  try {
    console.log('🧪 Testing Category Breakdown PDF generation...');
    
    const reportServiceModule = await import('./services/reportService.js');
    const reportService = reportServiceModule.default;
    
    const firebaseServiceModule = await import('./services/cleanFirebaseService.js');
    const firebaseService = firebaseServiceModule.default;
    
    const userId = 'dev-user-123';
    const startDate = new Date('2020-01-01'); // Expanded date range
    const endDate = new Date('2025-12-31');
    
    // Get transactions
    const transactionResult = await firebaseService.getTransactions(userId, {
      startDate,
      endDate,
      limit: 100
    });
    
    const transactions = transactionResult.transactions || [];
    console.log('📝 Found transactions:', transactions.length);
    console.log('📝 Sample transaction:', transactions[0]);
    
    // Generate summary
    const summary = await firebaseService.getTransactionSummary(userId, startDate, endDate);
    console.log('📊 Summary:', summary);
    
    // Test category breakdown PDF generation
    const pdfResult = await reportService.generateCategoryBreakdownPDF(
      transactions,
      summary,
      {
        title: 'Category Breakdown Report',
        dateRange: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString()
        },
        userId
      }
    );
    
    console.log('✅ Category Breakdown PDF generated:', pdfResult.fileName);
    
    res.json({
      success: true,
      message: 'Category breakdown PDF generated successfully',
      fileName: pdfResult.fileName,
      transactionCount: transactions.length,
      summary
    });
  } catch (error) {
    console.error('❌ Error testing category breakdown PDF:', error);
    res.status(500).json({
      error: 'Category breakdown PDF test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint to check transactions by section
app.post('/api/test/sections', async (req, res) => {
  try {
    const firebaseServiceModule = await import('./services/cleanFirebaseService.js');
    const firebaseService = firebaseServiceModule.default;
    
    const userId = 'dev-user-123';
    
    // First, add some test transactions with proper sections
    const testTransactionsWithSections = [
      {
        date: '2024-01-08',
        amount: 180,
        description: 'CHECK #534',
        category: '',
        type: 'expense',
        payee: 'Ric Flair',
        section: 'CHECKS PAID',
        sectionCode: 'checks',
        source: 'chase_pdf_import'
      },
      {
        date: '2024-01-15', 
        amount: 250,
        description: 'CHECK #535',
        category: '',
        type: 'expense',
        payee: 'Richard',
        section: 'CHECKS PAID',
        sectionCode: 'checks',
        source: 'chase_pdf_import'
      },
      {
        date: '2024-01-19',
        amount: 91.95,
        description: 'Lipton Toyota FT',
        category: '',
        type: 'expense',
        payee: 'Lipton Toyota FT',
        section: 'ATM & DEBIT CARD WITHDRAWALS',
        sectionCode: 'card',
        source: 'chase_pdf_import'
      }
    ];
    
    // Add these test transactions
    for (const txData of testTransactionsWithSections) {
      try {
        await firebaseService.createTransaction(userId, txData);
        console.log(`✅ Created test transaction: ${txData.description}`);
      } catch (error) {
        console.log(`⚠️ Transaction might already exist: ${txData.description}`);
      }
    }
    
    const transactionResult = await firebaseService.getTransactions(userId, {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    const transactions = transactionResult.transactions || [];
    
    // Group transactions by section
    const sectionGroups = {};
    const sectionCodeGroups = {};
    
    transactions.forEach(transaction => {
      const section = transaction.section || 'No Section';
      const sectionCode = transaction.sectionCode || 'No Section Code';
      
      if (!sectionGroups[section]) {
        sectionGroups[section] = [];
      }
      if (!sectionCodeGroups[sectionCode]) {
        sectionCodeGroups[sectionCode] = [];
      }
      
      sectionGroups[section].push({
        description: transaction.description,
        payee: transaction.payee,
        amount: transaction.amount,
        date: transaction.date
      });
      
      sectionCodeGroups[sectionCode].push({
        description: transaction.description,
        payee: transaction.payee,
        amount: transaction.amount,
        date: transaction.date
      });
    });
    
    // Focus on checks paid specifically
    const checksPaidSection = sectionGroups['CHECKS PAID'] || [];
    const checksCode = sectionCodeGroups['checks'] || [];
    
    console.log('📊 Section Analysis:');
    console.log('🏷️  All sections:', Object.keys(sectionGroups));
    console.log('🏷️  All section codes:', Object.keys(sectionCodeGroups));
    console.log('💳 CHECKS PAID section transactions:', checksPaidSection.length);
    console.log('💳 checks code transactions:', checksCode.length);
    
    res.json({
      success: true,
      message: 'Transaction sections analyzed',
      allSections: Object.keys(sectionGroups),
      allSectionCodes: Object.keys(sectionCodeGroups),
      sectionCounts: Object.fromEntries(
        Object.entries(sectionGroups).map(([key, value]) => [key, value.length])
      ),
      sectionCodeCounts: Object.fromEntries(
        Object.entries(sectionCodeGroups).map(([key, value]) => [key, value.length])
      ),
      checksPaidTransactions: checksPaidSection,
      checksCodeTransactions: checksCode,
      totalTransactions: transactions.length
    });
  } catch (error) {
    console.error('❌ Error analyzing sections:', error);
    res.status(500).json({
      error: 'Section analysis failed',
      message: error.message
    });
  }
});

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
  
  // Start the scheduler for automatic receipt cleanup (2-year retention)
  schedulerService.start();
});
