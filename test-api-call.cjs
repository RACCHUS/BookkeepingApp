/**
 * Simple test to check what the API returns for upload details
 */

const https = require('https');

const uploadId = '32652371-decd-4c56-8c3e-60a981a2f50e';
const apiUrl = `http://localhost:5000/api/pdf/uploads/${uploadId}`;

console.log(`🔍 Testing API call: GET ${apiUrl}`);

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/pdf/uploads/${uploadId}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // You would need a real auth token here for a full test
    // 'Authorization': 'Bearer your-token-here'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response status:', res.statusCode);
    console.log('📄 Response headers:', res.headers);
    try {
      const response = JSON.parse(data);
      console.log('📄 Response data:');
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.end();
