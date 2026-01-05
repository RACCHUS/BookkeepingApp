/**
 * @fileoverview Check API Integration Tests
 * @description End-to-end tests for check management API endpoints
 * @version 1.0.0
 * 
 * Tests the full request/response cycle including:
 * - Route handling
 * - Authentication middleware
 * - Validation middleware
 * - Controller logic
 * - Response formatting
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');
const middlewaresPath = path.resolve(__dirname, '../../../middlewares');
const routesPath = path.resolve(__dirname, '../../../routes');

// Mock check service
const mockCheckService = {
  createCheck: jest.fn(),
  getCheck: jest.fn(),
  getChecks: jest.fn(),
  updateCheck: jest.fn(),
  deleteCheck: jest.fn(),
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  bulkCreate: jest.fn(),
  bulkCreateFromTransactions: jest.fn(),
  linkToTransaction: jest.fn(),
  getStats: jest.fn()
};

// Setup mocks before imports
jest.unstable_mockModule(path.join(servicesPath, 'checkService.js'), () => ({
  default: mockCheckService
}));

jest.unstable_mockModule(path.join(configPath, 'logger.js'), () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock auth middleware
jest.unstable_mockModule(path.join(middlewaresPath, 'authMiddleware.js'), () => ({
  default: (req, res, next) => {
    req.user = { uid: 'test-user-123' };
    next();
  }
}));

// Import supertest dynamically
const { default: request } = await import('supertest');

// Import routes after mocking
const { default: checkRoutes } = await import(path.join(routesPath, 'checkRoutes.js'));

describe('Check API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/checks', checkRoutes);
    
    // Error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // CREATE CHECK TESTS
  // ============================================
  describe('POST /api/checks', () => {
    it('should create a check successfully', async () => {
      const checkData = {
        payee: 'Test Payee',
        amount: 150.00,
        date: '2024-02-15',
        type: 'expense',
        checkNumber: '1234'
      };

      mockCheckService.createCheck.mockResolvedValue({
        id: 'new-check-id',
        ...checkData
      });

      const response = await request(app)
        .post('/api/checks')
        .send(checkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'new-check-id');
      expect(mockCheckService.createCheck).toHaveBeenCalledWith(
        'test-user-123',
        checkData,
        null
      );
    });

    it('should create an income check', async () => {
      const incomeCheck = {
        payee: 'Client ABC',
        amount: 500.00,
        date: '2024-02-20',
        type: 'income',
        checkNumber: '9876'
      };

      mockCheckService.createCheck.mockResolvedValue({
        id: 'income-check-id',
        ...incomeCheck
      });

      const response = await request(app)
        .post('/api/checks')
        .send(incomeCheck)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('income');
    });

    it('should handle validation errors', async () => {
      mockCheckService.createCheck.mockRejectedValue(new Error('Payee is required'));

      const response = await request(app)
        .post('/api/checks')
        .send({ amount: 100 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // GET CHECK BY ID TESTS
  // ============================================
  describe('GET /api/checks/:id', () => {
    it('should return check by ID', async () => {
      const mockCheck = {
        id: 'check-1',
        payee: 'Test Payee',
        amount: 100,
        type: 'expense'
      };

      mockCheckService.getCheck.mockResolvedValue(mockCheck);

      const response = await request(app)
        .get('/api/checks/check-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('check-1');
    });

    it('should return 404 for non-existent check', async () => {
      mockCheckService.getCheck.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/checks/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // GET CHECKS (LIST) TESTS
  // ============================================
  describe('GET /api/checks', () => {
    it('should return list of checks', async () => {
      mockCheckService.getChecks.mockResolvedValue({
        checks: [
          { id: '1', payee: 'P1', amount: 100, type: 'expense' },
          { id: '2', payee: 'P2', amount: 200, type: 'income' }
        ],
        total: 2
      });

      const response = await request(app)
        .get('/api/checks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.checks).toHaveLength(2);
    });

    it('should pass query filters to service', async () => {
      mockCheckService.getChecks.mockResolvedValue({ checks: [], total: 0 });

      await request(app)
        .get('/api/checks')
        .query({
          type: 'expense',
          status: 'cleared',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(mockCheckService.getChecks).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({
          type: 'expense',
          status: 'cleared',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
      );
    });
  });

  // ============================================
  // UPDATE CHECK TESTS
  // ============================================
  describe('PUT /api/checks/:id', () => {
    it('should update check', async () => {
      mockCheckService.updateCheck.mockResolvedValue({
        id: 'check-1',
        status: 'cleared'
      });

      const response = await request(app)
        .put('/api/checks/check-1')
        .send({ status: 'cleared' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should return 404 for non-existent check', async () => {
      mockCheckService.updateCheck.mockRejectedValue(new Error('Check not found'));

      await request(app)
        .put('/api/checks/non-existent')
        .send({ status: 'cleared' })
        .expect(404);
    });
  });

  // ============================================
  // DELETE CHECK TESTS
  // ============================================
  describe('DELETE /api/checks/:id', () => {
    it('should delete check', async () => {
      mockCheckService.deleteCheck.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/checks/check-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  // ============================================
  // BULK CREATE TESTS
  // ============================================
  describe('POST /api/checks/bulk', () => {
    it('should bulk create checks', async () => {
      const checks = [
        { payee: 'P1', amount: 100, date: '2024-01-15', type: 'expense' },
        { payee: 'P2', amount: 200, date: '2024-01-16', type: 'income' }
      ];

      mockCheckService.bulkCreate.mockResolvedValue({
        allSucceeded: true,
        successCount: 2,
        failCount: 0,
        results: []
      });

      const response = await request(app)
        .post('/api/checks/bulk')
        .send({ checks })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('2 checks created');
    });

    it('should return 400 for empty array', async () => {
      const response = await request(app)
        .post('/api/checks/bulk')
        .send({ checks: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 207 for partial success', async () => {
      mockCheckService.bulkCreate.mockResolvedValue({
        allSucceeded: false,
        successCount: 1,
        failCount: 1,
        results: []
      });

      const response = await request(app)
        .post('/api/checks/bulk')
        .send({
          checks: [
            { payee: 'Valid', amount: 100, date: '2024-01-15', type: 'expense' },
            { payee: '', amount: 200, date: '2024-01-16', type: 'expense' }
          ]
        })
        .expect(207);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // BULK CREATE FROM TRANSACTIONS TESTS
  // ============================================
  describe('POST /api/checks/from-transactions', () => {
    it('should create checks from transactions', async () => {
      const transactions = [
        { id: 'tx-1', payee: 'P1', amount: -100, date: '2024-01-15' }
      ];

      mockCheckService.bulkCreateFromTransactions.mockResolvedValue({
        successful: ['check-1'],
        failed: [],
        checks: [{ id: 'check-1' }]
      });

      const response = await request(app)
        .post('/api/checks/from-transactions')
        .send({ transactions })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // LINK TO TRANSACTION TESTS
  // ============================================
  describe('POST /api/checks/:id/link/:transactionId', () => {
    it('should link check to transaction', async () => {
      mockCheckService.linkToTransaction.mockResolvedValue({
        id: 'check-1',
        transactionId: 'tx-1'
      });

      const response = await request(app)
        .post('/api/checks/check-1/link/tx-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('linked');
    });
  });

  // ============================================
  // STATS TESTS
  // ============================================
  describe('GET /api/checks/stats', () => {
    it('should return check statistics', async () => {
      mockCheckService.getStats.mockResolvedValue({
        totalChecks: 10,
        incomeTotal: 1500,
        expenseTotal: 2500,
        byStatus: { pending: 3, cleared: 7 }
      });

      const response = await request(app)
        .get('/api/checks/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalChecks', 10);
    });
  });

  // ============================================
  // IMAGE OPERATIONS TESTS
  // ============================================
  describe('POST /api/checks/:id/image', () => {
    it('should return 400 when no file uploaded', async () => {
      const response = await request(app)
        .post('/api/checks/check-1/image')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No file');
    });
  });

  describe('DELETE /api/checks/:id/image', () => {
    it('should delete image from check', async () => {
      mockCheckService.deleteImage.mockResolvedValue({
        id: 'check-1',
        hasImage: false
      });

      const response = await request(app)
        .delete('/api/checks/check-1/image')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockCheckService.getChecks.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/checks')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for unauthorized access', async () => {
      mockCheckService.getCheck.mockRejectedValue(new Error('Unauthorized access'));

      const response = await request(app)
        .get('/api/checks/other-user-check')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
