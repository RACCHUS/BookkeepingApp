/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { initializeEmulators, cleanEmulatorData, areEmulatorsRunning } from '../../setup/emulatorSetup.js';
import { createTestTransactions, createTestCompany, clearUserData } from '../../fixtures/helpers/testDataHelpers.js';
import transactionRoutes from '../../../routes/transactionRoutes.js';

/**
 * Transaction Controller Integration Tests with Firebase Emulator
 * 
 * Prerequisites:
 * 1. Start emulators: npm run emulator:start
 * 2. Run tests: npm run test:emulator:integration
 */
describe('Transaction Controller Integration Tests', () => {
  let app;
  let db;
  let auth;
  const TEST_USER_ID = 'test-user-transaction-controller';
  
  beforeAll(async () => {
    // Check if emulators are running
    const emulatorsRunning = await areEmulatorsRunning();
    if (!emulatorsRunning) {
      console.error('\n❌ Firebase emulators not running!');
      console.error('Start with: npm run emulator:start\n');
      throw new Error('Firebase emulators not running');
    }
    
    // Initialize Firebase with emulator
    const firebase = initializeEmulators();
    db = firebase.db;
    auth = firebase.auth;
    
    // Create Express app with transaction routes
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { uid: TEST_USER_ID };
      next();
    });
    
    app.use('/api/transactions', transactionRoutes);
    
    // Create test user in Auth emulator
    try {
      await auth.createUser({
        uid: TEST_USER_ID,
        email: 'test-transaction@example.com',
        displayName: 'Test Transaction User'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  });
  
  beforeEach(async () => {
    await cleanEmulatorData();
  });
  
  afterAll(async () => {
    await clearUserData(db, TEST_USER_ID);
    try {
      await auth.deleteUser(TEST_USER_ID);
    } catch (error) {
      // Ignore
    }
  });
  
  describe('GET /api/transactions - Get Transactions', () => {
    it('should return empty array when no transactions exist', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.transactions).toEqual([]);
      expect(response.body.total).toBe(0);
    });
    
    it('should return all transactions for user', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Transaction 1', amount: 100 },
        { description: 'Transaction 2', amount: 200 },
        { description: 'Transaction 3', amount: 300 }
      ]);
      
      const response = await request(app)
        .get('/api/transactions')
        .expect(200);
      
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should filter transactions by date range', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Jan Transaction', date: '2024-01-15T12:00:00', amount: 100 },
        { description: 'Feb Transaction', date: '2024-02-15T12:00:00', amount: 200 },
        { description: 'Mar Transaction', date: '2024-03-15T12:00:00', amount: 300 }
      ]);
      
      const response = await request(app)
        .get('/api/transactions?startDate=2024-02-01&endDate=2024-02-28')
        .expect(200);
      
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(1);
      const febTransaction = response.body.transactions.find(t => t.description === 'Feb Transaction');
      expect(febTransaction).toBeDefined();
    });
    
    it('should filter transactions by category', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Office Supply', category: 'Office Supplies', amount: 100 },
        { description: 'Rent Payment', category: 'Rent', amount: 1500 },
        { description: 'Another Office Item', category: 'Office Supplies', amount: 50 }
      ]);
      
      const response = await request(app)
        .get('/api/transactions?category=Office%20Supplies')
        .expect(200);
      
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(2);
      expect(response.body.transactions.every(t => t.category === 'Office Supplies')).toBe(true);
    });
    
    it('should filter transactions by type', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Income 1', type: 'income', amount: 1000 },
        { description: 'Expense 1', type: 'expense', amount: 100 },
        { description: 'Income 2', type: 'income', amount: 2000 }
      ]);
      
      const response = await request(app)
        .get('/api/transactions?type=income')
        .expect(200);
      
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(2);
      expect(response.body.transactions.every(t => t.type === 'income')).toBe(true);
    });
    
    it('should support pagination with limit and offset', async () => {
      // Create 10 transactions
      const transactions = Array(10).fill(null).map((_, i) => ({
        description: `Transaction ${i + 1}`,
        amount: (i + 1) * 100
      }));
      await createTestTransactions(db, TEST_USER_ID, transactions);
      
      const response = await request(app)
        .get('/api/transactions?limit=5&offset=0')
        .expect(200);
      
      expect(response.body.transactions.length).toBeLessThanOrEqual(5);
    });
    
    it('should filter by companyId', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, { name: 'Test Company' });
      
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Company Transaction', companyId: company.id, amount: 100 },
        { description: 'No Company Transaction', companyId: '', amount: 200 }
      ]);
      
      const response = await request(app)
        .get(`/api/transactions?companyId=${company.id}`)
        .expect(200);
      
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(1);
      expect(response.body.transactions.every(t => t.companyId === company.id)).toBe(true);
    });
  });
  
  describe('GET /api/transactions/:id - Get Transaction By ID', () => {
    it('should return specific transaction', async () => {
      const [transaction] = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Specific Transaction', amount: 500 }
      ]);
      
      const response = await request(app)
        .get(`/api/transactions/${transaction.id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.id).toBe(transaction.id);
      expect(response.body.transaction.description).toBe('Specific Transaction');
    });
    
    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/transactions/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });
    
    it('should return 403 when accessing other user transaction', async () => {
      const [otherTransaction] = await createTestTransactions(db, 'other-user', [
        { description: 'Other User Transaction', amount: 100 }
      ]);
      
      const response = await request(app)
        .get(`/api/transactions/${otherTransaction.id}`)
        .expect(403);
      
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/transactions - Create Transaction', () => {
    it('should create a new transaction', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: '2024-03-15T12:00:00',
          description: 'New Transaction',
          amount: 250,
          category: 'Office Supplies',
          type: 'expense'
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.transaction).toBeDefined();
      expect(response.body.transaction.description).toBe('New Transaction');
      expect(response.body.transaction.amount).toBe(250);
      
      // Verify in Firestore
      const doc = await db.collection('transactions').doc(response.body.transaction.id).get();
      expect(doc.exists).toBe(true);
      expect(doc.data().description).toBe('New Transaction');
    });
    
    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          description: 'Invalid',
          // Missing required fields
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });
  
  describe('PUT /api/transactions/:id - Update Transaction', () => {
    it('should update transaction', async () => {
      const [transaction] = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Original Description', amount: 100, category: 'Original' }
      ]);
      
      const response = await request(app)
        .put(`/api/transactions/${transaction.id}`)
        .send({
          description: 'Updated Description',
          category: 'Updated Category'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.description).toBe('Updated Description');
      expect(response.body.transaction.category).toBe('Updated Category');
      
      // Verify in Firestore
      const doc = await db.collection('transactions').doc(transaction.id).get();
      expect(doc.data().description).toBe('Updated Description');
    });
    
    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .put('/api/transactions/non-existent-id')
        .send({ description: 'Updated' })
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('DELETE /api/transactions/:id - Delete Transaction', () => {
    it('should delete transaction', async () => {
      const [transaction] = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Transaction to Delete', amount: 100 }
      ]);
      
      const response = await request(app)
        .delete(`/api/transactions/${transaction.id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      
      // Verify deletion
      const doc = await db.collection('transactions').doc(transaction.id).get();
      expect(doc.exists).toBe(false);
    });
    
    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .delete('/api/transactions/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/transactions/bulk-update - Bulk Update Transactions', () => {
    it('should update multiple transactions', async () => {
      const transactions = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Transaction 1', category: 'Old', amount: 100 },
        { description: 'Transaction 2', category: 'Old', amount: 200 },
        { description: 'Transaction 3', category: 'Old', amount: 300 }
      ]);
      
      const updates = transactions.map(t => ({
        id: t.id,
        category: 'New Category'
      }));
      
      const response = await request(app)
        .post('/api/transactions/bulk-update')
        .send({ updates })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.updated).toBeGreaterThanOrEqual(3);
    });
  });
  
  describe('GET /api/transactions/summary - Get Transaction Summary', () => {
    it('should return summary statistics', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Income 1', type: 'income', amount: 1000 },
        { description: 'Income 2', type: 'income', amount: 2000 },
        { description: 'Expense 1', type: 'expense', amount: 500 },
        { description: 'Expense 2', type: 'expense', amount: 300 }
      ]);
      
      const response = await request(app)
        .get('/api/transactions/summary')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalIncome).toBeGreaterThan(0);
      expect(response.body.summary.totalExpenses).toBeGreaterThan(0);
    });
    
    it('should filter summary by date range', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Jan Income', type: 'income', amount: 1000, date: '2024-01-15T12:00:00' },
        { description: 'Feb Income', type: 'income', amount: 2000, date: '2024-02-15T12:00:00' }
      ]);
      
      const response = await request(app)
        .get('/api/transactions/summary?startDate=2024-02-01&endDate=2024-02-28')
        .expect(200);
      
      expect(response.body.summary).toBeDefined();
    });
  });
  
  describe('GET /api/transactions/category-stats - Get Category Statistics', () => {
    it('should return category breakdown', async () => {
      await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Office 1', category: 'Office Supplies', amount: 100 },
        { description: 'Office 2', category: 'Office Supplies', amount: 200 },
        { description: 'Rent', category: 'Rent', amount: 1500 }
      ]);
      
      const response = await request(app)
        .get('/api/transactions/category-stats')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(Array.isArray(response.body.stats)).toBe(true);
    });
  });
  
  describe('POST /api/transactions/bulk-update-categories - Bulk Update Categories', () => {
    it('should update categories for multiple transactions', async () => {
      const transactions = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'WALMART STORE', category: 'Uncategorized', amount: 100 },
        { description: 'WALMART SUPERCENTER', category: 'Uncategorized', amount: 150 }
      ]);
      
      const response = await request(app)
        .post('/api/transactions/bulk-update-categories')
        .send({
          transactionIds: transactions.map(t => t.id),
          category: 'Groceries'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.updated).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('PUT /api/transactions/:id/payee - Assign Payee to Transaction', () => {
    it('should assign payee to transaction', async () => {
      const [transaction] = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Transaction without payee', amount: 100 }
      ]);
      
      const response = await request(app)
        .put(`/api/transactions/${transaction.id}/payee`)
        .send({ payeeId: 'test-payee-id' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.payeeId).toBe('test-payee-id');
    });
  });
  
  describe('POST /api/transactions/bulk-assign-payee - Bulk Assign Payee', () => {
    it('should assign payee to multiple transactions', async () => {
      const transactions = await createTestTransactions(db, TEST_USER_ID, [
        { description: 'Transaction 1', amount: 100 },
        { description: 'Transaction 2', amount: 200 }
      ]);
      
      const response = await request(app)
        .post('/api/transactions/bulk-assign-payee')
        .send({
          transactionIds: transactions.map(t => t.id),
          payeeId: 'bulk-payee-id'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.updated).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/api/transactions?limit=invalid')
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
    });
    
    it('should handle service errors gracefully', async () => {
      const response = await request(app)
        .get('/api/transactions/invalid@id#format')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
    });
  });
});
