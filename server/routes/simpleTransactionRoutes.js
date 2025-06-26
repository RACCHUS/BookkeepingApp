import express from 'express';

const router = express.Router();

// Simple test route for transactions
router.get('/', (req, res) => {
  console.log('GET /api/transactions called');
  try {
    res.json({
      success: true,
      message: 'Transactions endpoint working',
      data: {
        transactions: []
      }
    });
  } catch (error) {
    console.error('Error in transactions route:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Simple summary route
router.get('/summary', (req, res) => {
  console.log('GET /api/transactions/summary called');
  try {
    res.json({
      success: true,
      message: 'Summary endpoint working',
      data: {
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
          transactionCount: 0
        }
      }
    });
  } catch (error) {
    console.error('Error in summary route:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
