#!/usr/bin/env node
/**
 * Test script to check if uploads are being saved to Firestore and if indexes are needed
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUploadsRetrieval() {
  console.log('🔍 Testing uploads retrieval and Firestore indexing...\n');
  
  try {
    // Import Firebase service with proper file URL
    const { default: firebaseService } = await import('./server/services/cleanFirebaseService.js');
    
    console.log('✅ Firebase service imported successfully');
    console.log('🔥 Firebase initialized:', firebaseService.isUsingFirebase());
    
    if (!firebaseService.isUsingFirebase()) {
      console.log('❌ Firebase is not initialized - using mock mode');
      console.log('This means uploads will not persist to Firestore');
      return;
    }
    
    // Test user ID (use a realistic one)
    const testUserId = 'dev-user-123';
    
    console.log(`\n🔍 Testing uploads retrieval for user: ${testUserId}`);
    
    // Test 1: Basic uploads query
    try {
      console.log('\n📋 Test 1: Basic uploads query...');
      const uploads = await firebaseService.getUploads(testUserId, {});
      console.log(`✅ Basic query succeeded: ${uploads.length} uploads found`);
      
      if (uploads.length > 0) {
        console.log('📄 Sample upload:', JSON.stringify(uploads[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Basic query failed:', error.message);
      if (error.message.includes('index')) {
        console.log('🔧 INDEX REQUIRED: This query needs a Firestore index');
        console.log('Create an index for: collection "uploads", fields: userId (asc), uploadedAt (desc)');
      }
    }
    
    // Test 2: Company filtered query
    try {
      console.log('\n📋 Test 2: Company filtered query...');
      const uploadsWithCompany = await firebaseService.getUploads(testUserId, {
        companyId: 'test-company-123'
      });
      console.log(`✅ Company filtered query succeeded: ${uploadsWithCompany.length} uploads found`);
    } catch (error) {
      console.log('❌ Company filtered query failed:', error.message);
      if (error.message.includes('index')) {
        console.log('🔧 INDEX REQUIRED: This query needs a Firestore index');
        console.log('Create an index for: collection "uploads", fields: userId (asc), companyId (asc), uploadedAt (desc)');
      }
    }
    
    // Test 3: Create a test upload record
    try {
      console.log('\n📋 Test 3: Creating test upload record...');
      const testUpload = {
        id: 'test-upload-' + Date.now(),
        name: 'Test Bank Statement.pdf',
        originalName: 'Test Bank Statement.pdf',
        fileName: 'test-upload-' + Date.now() + '-Test Bank Statement.pdf',
        fileSize: 123456,
        bankType: 'chase',
        status: 'uploaded',
        companyId: 'test-company-123',
        companyName: 'Test Company'
      };
      
      const result = await firebaseService.createUploadRecord(testUserId, testUpload);
      console.log('✅ Test upload created successfully:', result.id);
      
      // Now try to retrieve it
      const retrievedUpload = await firebaseService.getUploadById(testUserId, result.id);
      if (retrievedUpload) {
        console.log('✅ Test upload retrieved successfully');
        
        // Clean up - delete the test upload
        try {
          await firebaseService.deleteUpload(testUserId, result.id);
          console.log('✅ Test upload cleaned up');
        } catch (cleanupError) {
          console.log('⚠️ Failed to clean up test upload:', cleanupError.message);
        }
      } else {
        console.log('❌ Failed to retrieve created upload');
      }
      
    } catch (error) {
      console.log('❌ Failed to create/retrieve test upload:', error.message);
    }
    
    console.log('\n📋 Test Summary:');
    console.log('- If uploads are not appearing, check if Firebase is properly initialized');
    console.log('- If you see index errors, create the required Firestore indexes');
    console.log('- Use the Firebase Console to create indexes or deploy via Firebase CLI');
    
  } catch (error) {
    console.error('❌ Test script failed:', error.message);
    console.error(error.stack);
  }
}

// Check uploads directory too
async function checkUploadsDirectory() {
  console.log('\n🔍 Checking uploads directory...');
  
  const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
  
  try {
    const files = await fs.readdir(uploadsDir);
    console.log(`📁 Found ${files.length} files in uploads directory`);
    
    if (files.length > 0) {
      console.log('📄 Recent files:');
      const pdfFiles = files.filter(f => f.endsWith('.pdf')).slice(0, 5);
      const metaFiles = files.filter(f => f.endsWith('.meta.json')).slice(0, 5);
      
      pdfFiles.forEach(file => console.log(`  - ${file}`));
      console.log(`📋 Metadata files: ${metaFiles.length}`);
    }
  } catch (error) {
    console.log('❌ Uploads directory not found or not accessible:', error.message);
  }
}

// Run the tests
console.log('🧪 Uploads Firestore Index Test\n');
await checkUploadsDirectory();
await testUploadsRetrieval();
