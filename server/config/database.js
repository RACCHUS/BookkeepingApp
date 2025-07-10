/**
 * Database Configuration
 * 
 * Centralized database connection and configuration management
 */

import admin from './firebaseAdmin.js';
import { DATABASE_CONFIG, SERVER_CONFIG } from './environment.js';

/**
 * Get Firestore instance with proper configuration
 * @returns {Object|null} Firestore instance or null if not available
 */
export const getFirestore = () => {
  if (!admin) {
    console.warn('⚠️  Firebase Admin not initialized - database operations will fail');
    return null;
  }

  try {
    const firestore = admin.firestore();
    
    // Configure Firestore settings
    firestore.settings({
      ignoreUndefinedProperties: true,
      merge: true
    });

    // Connect to emulator if configured
    if (DATABASE_CONFIG.USE_EMULATOR && DATABASE_CONFIG.FIRESTORE_EMULATOR_HOST) {
      firestore.useEmulator(
        DATABASE_CONFIG.FIRESTORE_EMULATOR_HOST,
        DATABASE_CONFIG.FIRESTORE_EMULATOR_PORT
      );
      console.log(`🔧 Using Firestore emulator at ${DATABASE_CONFIG.FIRESTORE_EMULATOR_HOST}:${DATABASE_CONFIG.FIRESTORE_EMULATOR_PORT}`);
    }

    return firestore;
  } catch (error) {
    console.error('❌ Error getting Firestore instance:', error);
    return null;
  }
};

/**
 * Get Firebase Storage instance
 * @returns {Object|null} Storage instance or null if not available
 */
export const getStorage = () => {
  if (!admin) {
    console.warn('⚠️  Firebase Admin not initialized - storage operations will fail');
    return null;
  }

  try {
    return admin.storage();
  } catch (error) {
    console.error('❌ Error getting Storage instance:', error);
    return null;
  }
};

/**
 * Get Firebase Auth instance
 * @returns {Object|null} Auth instance or null if not available
 */
export const getAuth = () => {
  if (!admin) {
    console.warn('⚠️  Firebase Admin not initialized - auth operations will fail');
    return null;
  }

  try {
    return admin.auth();
  } catch (error) {
    console.error('❌ Error getting Auth instance:', error);
    return null;
  }
};

/**
 * Collection name constants
 */
export const COLLECTIONS = {
  USERS: 'users',
  COMPANIES: 'companies',
  TRANSACTIONS: 'transactions',
  UPLOADS: 'uploads',
  CLASSIFICATION_RULES: 'classificationRules',
  PAYEES: 'payees',
  REPORTS: 'reports',
  AUDIT_LOGS: 'auditLogs'
};

/**
 * Default Firestore query limits
 */
export const QUERY_LIMITS = {
  DEFAULT: 50,
  MAX: 1000,
  TRANSACTIONS: 100,
  UPLOADS: 50,
  REPORTS: 20
};

/**
 * Firestore batch operation limits
 */
export const BATCH_LIMITS = {
  WRITE: 500,
  READ: 100
};

/**
 * Database health check
 * @returns {Promise<Object>} Health check result
 */
export const checkDatabaseHealth = async () => {
  const firestore = getFirestore();
  
  if (!firestore) {
    return {
      status: 'unavailable',
      message: 'Firebase Admin not initialized',
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Try to read from a collection to test connectivity
    const testCollection = firestore.collection('_health_check');
    const testDoc = testCollection.doc('test');
    
    // Attempt to read (this will fail gracefully if collection doesn't exist)
    await testDoc.get();
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      emulator: DATABASE_CONFIG.USE_EMULATOR
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      error: error.code || 'unknown'
    };
  }
};

/**
 * Initialize database with default settings
 * @returns {Promise<boolean>} Success status
 */
export const initializeDatabase = async () => {
  if (SERVER_CONFIG.NODE_ENV === 'development') {
    console.log('🗄️  Initializing database configuration...');
  }

  const health = await checkDatabaseHealth();
  
  if (health.status === 'healthy') {
    console.log('✅ Database connection established');
    return true;
  } else if (health.status === 'unavailable') {
    console.log('⚠️  Database not available - running without Firebase');
    return false;
  } else {
    console.error('❌ Database connection failed:', health.message);
    return false;
  }
};

/**
 * Create a transaction helper for atomic operations
 * @param {Function} updateFunction - Function to execute in transaction
 * @returns {Promise<any>} Transaction result
 */
export const runTransaction = async (updateFunction) => {
  const firestore = getFirestore();
  
  if (!firestore) {
    throw new Error('Database not available');
  }

  return firestore.runTransaction(updateFunction);
};

/**
 * Create a batch operation helper
 * @returns {Object|null} Batch instance or null if not available
 */
export const createBatch = () => {
  const firestore = getFirestore();
  
  if (!firestore) {
    console.warn('⚠️  Database not available - batch operations will fail');
    return null;
  }

  return firestore.batch();
};

/**
 * Utility function to validate document references
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {boolean} True if valid
 */
export const isValidDocumentRef = (collection, docId) => {
  if (!collection || !docId) return false;
  if (typeof collection !== 'string' || typeof docId !== 'string') return false;
  if (collection.trim() === '' || docId.trim() === '') return false;
  return true;
};

/**
 * Get database configuration summary
 * @returns {Object} Configuration summary
 */
export const getDatabaseConfig = () => {
  return {
    available: !!admin,
    emulator: DATABASE_CONFIG.USE_EMULATOR,
    collections: COLLECTIONS,
    limits: {
      query: QUERY_LIMITS,
      batch: BATCH_LIMITS
    }
  };
};

// Initialize database on module load
if (SERVER_CONFIG.NODE_ENV !== 'test') {
  initializeDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
  });
}
