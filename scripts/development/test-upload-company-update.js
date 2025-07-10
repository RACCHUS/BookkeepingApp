// Test script to verify the upload company update functionality
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000/api';

// Test update upload company endpoint
async function testUpdateUploadCompany() {
  console.log('🧪 Testing Upload Company Update Functionality...\n');

  try {
    // Find an existing upload ID from the uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = await fs.readdir(uploadsDir);
    const uploadFile = files.find(f => f.endsWith('.pdf') && !f.endsWith('.meta.json'));
    
    if (!uploadFile) {
      console.log('❌ No PDF uploads found to test with');
      return;
    }

    const uploadId = uploadFile.split('-')[0];
    console.log(`📄 Found upload to test with: ${uploadId}`);

    // Test 1: Update with company information
    console.log('🔍 Test 1: Updating upload with company information...');
    
    const testData = {
      companyId: 'test-company-123',
      companyName: 'Test Company LLC'
    };

    const updateResponse = await fetch(`${API_BASE}/pdf/uploads/${uploadId}/company`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would need proper auth token
      },
      body: JSON.stringify(testData)
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Update successful:', result);
    } else {
      const error = await updateResponse.text();
      console.log('❌ Update failed:', error);
    }

    // Test 2: Check if metadata file was updated
    console.log('\n🔍 Test 2: Checking if metadata file was updated...');
    
    const metaPath = path.join(uploadsDir, uploadFile + '.meta.json');
    try {
      const metaData = await fs.readFile(metaPath, 'utf-8');
      const metadata = JSON.parse(metaData);
      
      console.log('📋 Metadata file contents:');
      console.log('- Company ID:', metadata.companyId);
      console.log('- Company Name:', metadata.companyName);
      console.log('- Updated At:', metadata.updatedAt);
      
      if (metadata.companyId === testData.companyId) {
        console.log('✅ Metadata file updated correctly');
      } else {
        console.log('❌ Metadata file not updated correctly');
      }
    } catch (error) {
      console.log('❌ Could not read metadata file:', error.message);
    }

    // Test 3: Clear company information
    console.log('\n🔍 Test 3: Clearing company information...');
    
    const clearResponse = await fetch(`${API_BASE}/pdf/uploads/${uploadId}/company`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: '',
        companyName: ''
      })
    });

    if (clearResponse.ok) {
      const result = await clearResponse.json();
      console.log('✅ Clear successful:', result);
    } else {
      const error = await clearResponse.text();
      console.log('❌ Clear failed:', error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testUpdateUploadCompany().then(() => {
  console.log('\n🏁 Test completed');
}).catch(console.error);
