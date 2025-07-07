/**
 * Create a new company with proper ID to replace the one with empty string ID
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    const serviceAccount = {
      type: process.env.FIREBASE_ADMIN_TYPE,
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
      token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    console.error('❌ Firebase Admin credentials not found');
    process.exit(1);
  }
}

const db = admin.firestore();

async function createNewCompany() {
  try {
    console.log('🏢 Creating new company with proper ID...\n');

    const userId = 'KAqbZ0AIowcTSd6cjqjSfGfjC2M2'; // From the logs
    
    const companyData = {
      name: 'Shamdat Construction',
      legalName: 'Shamdat Construction LLC',
      businessType: 'LLC',
      userId: userId,
      isDefault: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
      lastModifiedBy: userId
    };

    // Let Firestore auto-generate the ID
    const docRef = await db.collection('companies').add(companyData);
    
    console.log(`✅ Created new company: ${companyData.name}`);
    console.log(`   Company ID: ${docRef.id}`);
    console.log(`   User ID: ${userId}`);

    // Update the document to include the ID field for consistency
    await docRef.update({
      id: docRef.id
    });

    console.log('✅ Updated company with ID field');
    console.log('\n🎉 New company created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Delete old uploads and transactions');
    console.log('2. Upload new PDF - it should now include company information');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

createNewCompany();
