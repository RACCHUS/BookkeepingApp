/**
 * Fix the current upload to have proper company information
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
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
}

const db = admin.firestore();

async function fixCurrentUpload() {
  try {
    console.log('🔧 Fixing current upload with company information...\n');

    // Company details
    const companyId = 'N4ikdZ8TQJZ3Duqipk2n';
    const companyName = 'Shamdat Construction';
    
    console.log(`🏢 Using company: ${companyName} (${companyId})`);

    // Get all uploads to find the current one
    const uploadsRef = db.collection('uploads');
    const uploadsSnapshot = await uploadsRef.get();
    
    if (uploadsSnapshot.empty) {
      console.log('❌ No uploads found');
      return;
    }

    console.log(`📄 Found ${uploadsSnapshot.size} upload(s)`);
    
    // Fix each upload
    for (const doc of uploadsSnapshot.docs) {
      const uploadData = doc.data();
      const uploadId = doc.id;
      
      console.log(`\n📄 Processing upload: ${uploadId}`);
      console.log(`   Current company: ${uploadData.companyName || 'None'}`);
      
      // Update upload with company info
      await doc.ref.update({
        companyId: companyId,
        companyName: companyName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Updated upload: ${uploadId}`);
      
      // Now find and update associated transactions
      // Check both uploadId and statementId patterns
      const transactionsRef = db.collection('transactions');
      
      // Try with exact uploadId
      let transactionsSnapshot = await transactionsRef.where('uploadId', '==', uploadId).get();
      
      // If no transactions found with uploadId, try with statementId
      if (transactionsSnapshot.empty) {
        transactionsSnapshot = await transactionsRef.where('statementId', '==', uploadId).get();
      }
      
      console.log(`   Found ${transactionsSnapshot.size} transactions`);
      
      // Update transactions
      for (const txnDoc of transactionsSnapshot.docs) {
        await txnDoc.ref.update({
          companyId: companyId,
          companyName: companyName,
          uploadId: uploadId, // Ensure uploadId is set correctly
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`✅ Updated ${transactionsSnapshot.size} transactions`);
    }

    console.log('\n🎉 Fix completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixCurrentUpload();
