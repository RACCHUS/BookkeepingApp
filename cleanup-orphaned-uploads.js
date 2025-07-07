import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from './server/config/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = admin ? admin.firestore() : null;

async function cleanupOrphanedUploads() {
  try {
    console.log('🧹 Starting cleanup of orphaned upload records...');
    
    if (!db) {
      console.log('❌ Firebase not initialized. Cannot clean up Firestore records.');
      console.log('   This script requires Firebase to be properly configured.');
      return;
    }
    
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Get all actual files in uploads directory
    let actualFiles = [];
    try {
      const files = await fs.readdir(uploadsDir);
      actualFiles = files.filter(file => file.endsWith('.pdf'));
      console.log(`📁 Found ${actualFiles.length} actual PDF files`);
    } catch (error) {
      console.log('📁 No uploads directory or no files found');
    }
    
    // Extract upload IDs from filenames (format: uploadId-originalname.pdf)
    const actualUploadIds = actualFiles.map(filename => {
      // Split by first dash to get the upload ID
      const firstDashIndex = filename.indexOf('-');
      if (firstDashIndex > 0) {
        return filename.substring(0, firstDashIndex);
      }
      return null;
    }).filter(Boolean);
    
    console.log(`🔍 Extracted ${actualUploadIds.length} upload IDs from filenames`);
    
    // Get all upload records from Firestore
    const uploadsSnapshot = await db.collection('uploads').get();
    console.log(`📋 Found ${uploadsSnapshot.size} upload records in Firestore`);
    
    const orphanedUploads = [];
    const validUploads = [];
    
    uploadsSnapshot.forEach(doc => {
      const uploadId = doc.id;
      const uploadData = doc.data();
      
      if (actualUploadIds.includes(uploadId)) {
        validUploads.push({ id: uploadId, data: uploadData });
      } else {
        orphanedUploads.push({ id: uploadId, data: uploadData });
      }
    });
    
    console.log(`✅ Valid uploads: ${validUploads.length}`);
    console.log(`🗑️  Orphaned uploads: ${orphanedUploads.length}`);
    
    if (orphanedUploads.length > 0) {
      console.log('\n📋 Orphaned uploads to be deleted:');
      orphanedUploads.forEach(upload => {
        console.log(`  - ${upload.id}: ${upload.data.originalName || upload.data.fileName || 'Unknown'}`);
      });
      
      // Delete orphaned uploads
      const batch = db.batch();
      orphanedUploads.forEach(upload => {
        const uploadRef = db.collection('uploads').doc(upload.id);
        batch.delete(uploadRef);
      });
      
      await batch.commit();
      console.log(`\n✅ Successfully deleted ${orphanedUploads.length} orphaned upload records`);
    } else {
      console.log('\n✅ No orphaned uploads found - database is clean!');
    }
    
    console.log('\n🎉 Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupOrphanedUploads().then(() => {
  console.log('👋 Cleanup script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Cleanup script failed:', error);
  process.exit(1);
});
