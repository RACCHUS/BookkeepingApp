import express from 'express';
import cors from 'cors';

console.log('🚀 Starting debug server...');

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test route hit');
  res.json({ message: 'Debug server working!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple transactions route
app.get('/api/transactions', (req, res) => {
  console.log('Transactions route hit');
  res.json({
    success: true,
    data: {
      transactions: []
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
});
