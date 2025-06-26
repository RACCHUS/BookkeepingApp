import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// Basic CORS and JSON parsing
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({
    message: 'Minimal server is working!',
    timestamp: new Date().toISOString()
  });
});

// Simple transaction routes
app.get('/api/transactions', (req, res) => {
  console.log('GET /api/transactions called');
  res.json({
    success: true,
    data: {
      transactions: []
    }
  });
});

app.get('/api/transactions/summary', (req, res) => {
  console.log('GET /api/transactions/summary called');
  res.json({
    success: true,
    data: {
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: 0
      }
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 for:', req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/api/test`);
});
