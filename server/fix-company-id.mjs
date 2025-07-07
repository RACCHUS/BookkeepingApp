/**
 * Fix script to correct company with empty string ID
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

async function fixCompanyData() {
  try {
    console.log('🔧 Fixing company data...\n');

    // Get all companies to see what we have
    const companiesRef = db.collection('companies');
    const snapshot = await companiesRef.get();
    
    console.log(`Found ${snapshot.size} companies in database\n`);
    
    // Check each company
    const companiesToFix = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('🏢 Company:');
      console.log('  Document ID:', doc.id);
      console.log('  Name:', data.name);
      console.log('  User ID:', data.userId);
      console.log('  Created At:', data.createdAt?.toDate?.() || data.createdAt);
      
      if (doc.id === '' || doc.id.length < 10) {
        console.log('  ❌ This company has an invalid ID!');
        companiesToFix.push({ docId: doc.id, data: data });
      }
      console.log('  ---');
    });

    if (companiesToFix.length > 0) {
      console.log(`\n🔧 Need to fix ${companiesToFix.length} company(ies)...\n`);
      
      for (const company of companiesToFix) {
        // Generate a new proper ID
        const newId = admin.firestore().collection('companies').doc().id;
        console.log(`Creating new company with ID: ${newId}`);
        
        // Create new company document with proper ID
        const newCompanyRef = db.collection('companies').doc(newId);
        await newCompanyRef.set({
          ...company.data,
          id: newId, // Make sure the id field matches the document ID
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Created new company: ${newId}`);
        
        // Try to delete the old one (this might fail if ID is empty string)
        try {
          if (company.docId && company.docId.length > 0) {
            await db.collection('companies').doc(company.docId).delete();
            console.log(`✅ Deleted old company: ${company.docId}`);
          }
        } catch (deleteError) {
          console.log(`⚠️  Could not delete old company (${company.docId}):`, deleteError.message);
        }
      }
    } else {
      console.log('✅ All companies have valid IDs');
    }

    console.log('\n🎉 Company fix completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixCompanyData();
