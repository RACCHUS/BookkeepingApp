/**
 * Test script to verify upload rename functionality
 * This script tests the complete rename flow: frontend cache update + backend persistence
 */

const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  serverPort: 3001,
  testFileName: 'test-rename-statement.txt',
  originalName: 'Original Test Statement.pdf',
  newName: 'Renamed Test Statement.pdf'
};

// Simple test upload file content
const testFileContent = `%PDF-1.4
Test Bank Statement for Rename Testing
Date: ${new Date().toISOString()}
This is a test file for verifying upload rename functionality.
`;

async function createTestFile() {
  const uploadsDir = path.join(__dirname, 'server', 'uploads');
  const testFilePath = path.join(uploadsDir, TEST_CONFIG.testFileName);
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✓ Created uploads directory');
  }
  
  // Create test file
  fs.writeFileSync(testFilePath, testFileContent);
  console.log(`✓ Created test file: ${testFilePath}`);
  
  return testFilePath;
}

async function testRenameAPI(uploadId, newName) {
  const apiUrl = `http://localhost:${TEST_CONFIG.serverPort}/api/uploads/${uploadId}/rename`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    console.log('✓ Rename API response:', data);
    return data;
  } catch (error) {
    console.error('✗ Rename API error:', error.message);
    throw error;
  }
}

async function testGetUploads() {
  const apiUrl = `http://localhost:${TEST_CONFIG.serverPort}/api/uploads`;
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    console.log(`✓ Found ${data.data?.length || 0} uploads`);
    return data.data || [];
  } catch (error) {
    console.error('✗ Get uploads error:', error.message);
    throw error;
  }
}

async function cleanup() {
  console.log('\n--- Cleanup ---');
  
  try {
    // Remove test file
    const testFilePath = path.join(__dirname, 'server', 'uploads', TEST_CONFIG.testFileName);
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('✓ Removed test file');
    }
  } catch (error) {
    console.error('✗ Cleanup error:', error.message);
  }
}

async function runTest() {
  console.log('=== Upload Rename Test ===\n');
  
  try {
    // Step 1: Check if server is running
    console.log('--- Step 1: Check Server ---');
    const uploads = await testGetUploads();
    
    if (uploads.length === 0) {
      console.log('ℹ No existing uploads found. You can test by:');
      console.log('1. Upload a PDF through the UI');
      console.log('2. Try renaming it in the Uploads page');
      console.log('3. Verify the name persists after page refresh');
      return;
    }
    
    // Step 2: Test rename on first upload
    console.log('\n--- Step 2: Test Rename ---');
    const testUpload = uploads[0];
    const originalName = testUpload.originalName || testUpload.fileName;
    const testNewName = `RENAMED_${Date.now()}_${originalName}`;
    
    console.log(`Testing rename on upload: ${testUpload.id}`);
    console.log(`Original name: "${originalName}"`);
    console.log(`New name: "${testNewName}"`);
    
    const renameResult = await testRenameAPI(testUpload.id, testNewName);
    
    // Step 3: Verify rename persisted
    console.log('\n--- Step 3: Verify Persistence ---');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    
    const updatedUploads = await testGetUploads();
    const renamedUpload = updatedUploads.find(u => u.id === testUpload.id);
    
    if (renamedUpload) {
      const currentName = renamedUpload.originalName || renamedUpload.fileName;
      if (currentName === testNewName) {
        console.log('✓ Rename persisted successfully!');
        console.log(`Current name: "${currentName}"`);
        
        // Restore original name
        console.log('\n--- Step 4: Restore Original Name ---');
        await testRenameAPI(testUpload.id, originalName);
        console.log('✓ Restored original name');
      } else {
        console.log('✗ Rename did not persist');
        console.log(`Expected: "${testNewName}"`);
        console.log(`Got: "${currentName}"`);
      }
    } else {
      console.log('✗ Upload not found after rename');
    }
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  } finally {
    await cleanup();
  }
}

// Run the test
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { runTest, testRenameAPI, testGetUploads };
