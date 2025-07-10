/**
 * Firebase Admin SDK Configuration
 * 
 * Handles Firebase Admin SDK initialization with proper error handling
 * and environment variable management
 */

import admin from 'firebase-admin';
import { FIREBASE_CONFIG, FEATURE_FLAGS, SERVER_CONFIG } from './environment.js';

/**
 * Check if Firebase credentials are properly configured
 * @returns {boolean} True if credentials are valid
 */
const hasValidCredentials = () => {
  // Allow mocking in development/test
  if (FEATURE_FLAGS.MOCK_FIREBASE) {
    return false;
  }

  return !!(
    FIREBASE_CONFIG.PROJECT_ID && 
    FIREBASE_CONFIG.PROJECT_ID !== 'your_project_id' &&
    FIREBASE_CONFIG.PRIVATE_KEY && 
    FIREBASE_CONFIG.PRIVATE_KEY !== '"-----BEGIN PRIVATE KEY-----\\nyour_private_key\\n-----END PRIVATE KEY-----\\n"' &&
    FIREBASE_CONFIG.CLIENT_EMAIL && 
    FIREBASE_CONFIG.CLIENT_EMAIL !== 'firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com'
  );
};

/**
 * Create Firebase service account configuration
 * @returns {Object} Service account configuration
 */
const createServiceAccountConfig = () => {
  return {
    type: FIREBASE_CONFIG.ADMIN_TYPE,
    project_id: FIREBASE_CONFIG.PROJECT_ID,
    private_key_id: FIREBASE_CONFIG.ADMIN_PRIVATE_KEY_ID,
    private_key: FIREBASE_CONFIG.PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: FIREBASE_CONFIG.CLIENT_EMAIL,
    client_id: FIREBASE_CONFIG.ADMIN_CLIENT_ID,
    auth_uri: FIREBASE_CONFIG.ADMIN_AUTH_URI,
    token_uri: FIREBASE_CONFIG.ADMIN_TOKEN_URI,
    auth_provider_x509_cert_url: FIREBASE_CONFIG.ADMIN_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: FIREBASE_CONFIG.ADMIN_CLIENT_X509_CERT_URL
  };
};

/**
 * Initialize Firebase Admin SDK
 * @returns {Object|null} Firebase Admin instance or null if not configured
 */
const initializeFirebaseAdmin = () => {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin SDK already initialized');
      return admin;
    }

    // Check if we have valid Firebase credentials
    if (!hasValidCredentials()) {
      if (SERVER_CONFIG.NODE_ENV !== 'test') {
        console.log('⚠️  Firebase credentials not configured. Running in development mode without Firebase.');
        console.log('   To enable Firebase features:');
        console.log('   1. Create a Firebase project at https://console.firebase.google.com');
        console.log('   2. Generate a service account key');
        console.log('   3. Update the .env file with your Firebase credentials');
      }
      return null;
    }

    // Create service account configuration
    const serviceAccount = createServiceAccountConfig();

    // Initialize Firebase Admin
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
      databaseURL: FIREBASE_CONFIG.DATABASE_URL
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`   Project: ${FIREBASE_CONFIG.PROJECT_ID}`);
    console.log(`   Storage Bucket: ${FIREBASE_CONFIG.STORAGE_BUCKET || 'Not configured'}`);
    
    return admin;
    
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    
    if (SERVER_CONFIG.NODE_ENV === 'development') {
      console.log('   Common issues:');
      console.log('   - Check that FIREBASE_PRIVATE_KEY is properly formatted with \\n characters');
      console.log('   - Verify all required environment variables are set');
      console.log('   - Ensure the service account has proper permissions');
      console.log('   Running in development mode without Firebase.');
    }
    
    return null;
  }
};

/**
 * Get Firebase Admin app instance
 * @returns {Object|null} Firebase Admin app or null
 */
export const getFirebaseApp = () => {
  if (admin.apps.length === 0) {
    return null;
  }
  return admin.apps[0];
};

/**
 * Check if Firebase is available
 * @returns {boolean} True if Firebase is initialized and available
 */
export const isFirebaseAvailable = () => {
  return admin.apps.length > 0;
};

/**
 * Get Firebase project information
 * @returns {Object} Project information
 */
export const getProjectInfo = () => {
  return {
    projectId: FIREBASE_CONFIG.PROJECT_ID,
    storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
    databaseURL: FIREBASE_CONFIG.DATABASE_URL,
    available: isFirebaseAvailable(),
    mock: FEATURE_FLAGS.MOCK_FIREBASE
  };
};

// Initialize Firebase Admin
const firebaseAdmin = initializeFirebaseAdmin();

// Export admin instance for use in other modules (may be null in development mode)
export default firebaseAdmin;
