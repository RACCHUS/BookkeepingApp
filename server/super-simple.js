console.log('Starting super simple server...');

import express from 'express';

console.log('Express imported successfully');

const app = express();
const PORT = 5000;

console.log('Creating basic route...');

app.get('/api/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ message: 'Super simple server works!' });
});

console.log('Starting server...');

app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Server failed to start:', err);
  } else {
    console.log(`✅ Super simple server running on port ${PORT}`);
  }
});

console.log('Server setup complete.');
