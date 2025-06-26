import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('✅ Starting simplified server...');

// Load environment variables from root directory
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint (no auth required)
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple transactions endpoint
app.get('/api/transactions', (req, res) => {
  console.log('GET /api/transactions called');
  res.json({
    success: true,
    message: 'Transactions endpoint working',
    data: {
      transactions: []
    }
  });
});

// Simple transactions summary endpoint
app.get('/api/transactions/summary', (req, res) => {
  console.log('GET /api/transactions/summary called');
  res.json({
    success: true,
    message: 'Summary endpoint working',
    data: {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      transactionCount: 0,
      categories: {}
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simplified server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

export default app;
