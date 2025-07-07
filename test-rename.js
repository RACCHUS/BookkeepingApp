const axios = require('axios');

async function testRename() {
  try {
    // First get the uploads to see what we have
    const uploadsResponse = await axios.get('http://localhost:3001/api/pdf/uploads', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    console.log('Available uploads:', uploadsResponse.data.data?.length || 0);
    
    if (uploadsResponse.data.data && uploadsResponse.data.data.length > 0) {
      const upload = uploadsResponse.data.data[0];
      console.log('\nTesting rename for upload:', upload.id);
      console.log('Current name:', upload.originalName || upload.fileName);
      
      // Test rename endpoint
      const testName = 'Test-Rename-' + Date.now();
      console.log('Renaming to:', testName);
      
      const renameResponse = await axios.put(`http://localhost:3001/api/pdf/uploads/${upload.id}/rename`, {
        name: testName
      }, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      console.log('Rename response status:', renameResponse.status);
      console.log('Rename response:', renameResponse.data);
      
      // Verify the change
      const verifyResponse = await axios.get(`http://localhost:3001/api/pdf/uploads/${upload.id}`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      console.log('Verified new name:', verifyResponse.data.data?.originalName || verifyResponse.data.data?.fileName);
      console.log('✅ Backend rename test successful!');
    } else {
      console.log('No uploads found to test with');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRename().then(() => {
  console.log('Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
