import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: join(__dirname, '../../.env') });

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length === 0) {
      // Check if we have valid Firebase credentials
      const hasValidCredentials = 
        process.env.FIREBASE_ADMIN_PROJECT_ID && 
        process.env.FIREBASE_ADMIN_PROJECT_ID !== 'your_project_id' &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY && 
        process.env.FIREBASE_ADMIN_PRIVATE_KEY !== '"-----BEGIN PRIVATE KEY-----\\nyour_private_key\\n-----END PRIVATE KEY-----\\n"' &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL !== 'firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com';

      if (!hasValidCredentials) {
        console.log('⚠️  Firebase credentials not configured. Running in development mode without Firebase.');
        console.log('   To enable Firebase features:');
        console.log('   1. Create a Firebase project at https://console.firebase.google.com');
        console.log('   2. Generate a service account key');
        console.log('   3. Update the .env file with your Firebase credentials');
        return null;
      }

      const serviceAccount = {
        type: process.env.FIREBASE_ADMIN_TYPE,
        project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
        private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
        auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
        token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      console.log('✅ Firebase Admin SDK initialized successfully');
    }
    return admin;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    console.log('   Running in development mode without Firebase.');
    return null;
  }
};

// Initialize Firebase Admin
const firebaseAdmin = initializeFirebaseAdmin();

// Export admin instance for use in other modules (may be null in development mode)
export default firebaseAdmin;
