/**
 * @fileoverview Tests for CheckController
 * @description Unit tests for check API controller functions
 * @version 1.0.0
 * 
 * Tests cover:
 * - All CRUD endpoints
 * - Error handling
 * - Input validation
 * - Authentication
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');
const controllersPath = path.resolve(__dirname, '../../../controllers');

// Mock the check service
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

jest.unstable_mockModule(path.join(servicesPath, 'checkService.js'), () => ({
  default: mockCheckService
}));

// Mock logger
jest.unstable_mockModule(path.join(configPath, 'logger.js'), () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import controller after mocking
const checkController = await import(path.join(controllersPath, 'checkController.js'));

// Mock data
const mockUser = { uid: 'user-123' };

const mockCheck = {
  id: 'check-1',
  userId: 'user-123',
  payee: 'Test Payee',
  amount: 100.00,
  date: '2024-01-15',
  type: 'expense',
  status: 'pending',
  checkNumber: '1234',
  hasImage: false
};

const validCheckData = {
  payee: 'New Payee',
  amount: 250.00,
  date: '2024-02-01',
  type: 'expense',
  checkNumber: '5678'
};

describe('CheckController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      user: mockUser,
      params: {},
      query: {},
      body: {},
      file: null
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ============================================
  // CREATE CHECK TESTS
  // ============================================
  describe('createCheck', () => {
    it('should create check successfully', async () => {
      mockReq.body = validCheckData;
      mockCheckService.createCheck.mockResolvedValue({
        id: 'new-check',
        ...validCheckData
      });

      await checkController.createCheck(mockReq, mockRes);

      expect(mockCheckService.createCheck).toHaveBeenCalledWith(
        mockUser.uid,
        validCheckData,
        null
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should create check with file upload', async () => {
      mockReq.body = validCheckData;
      mockReq.file = {
        originalname: 'check.jpg',
        mimetype: 'image/jpeg',
        size: 1024000
      };
      mockCheckService.createCheck.mockResolvedValue({
        id: 'new-check',
        ...validCheckData,
        hasImage: true
      });

      await checkController.createCheck(mockReq, mockRes);

      expect(mockCheckService.createCheck).toHaveBeenCalledWith(
        mockUser.uid,
        validCheckData,
        mockReq.file
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle expense type correctly', async () => {
      mockReq.body = { ...validCheckData, type: 'expense' };
      mockCheckService.createCheck.mockResolvedValue({
        id: 'new-check',
        ...validCheckData,
        type: 'expense'
      });

      await checkController.createCheck(mockReq, mockRes);

      expect(mockCheckService.createCheck).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({ type: 'expense' }),
        null
      );
    });

    it('should handle income type correctly', async () => {
      mockReq.body = { ...validCheckData, type: 'income' };
      mockCheckService.createCheck.mockResolvedValue({
        id: 'new-check',
        ...validCheckData,
        type: 'income'
      });

      await checkController.createCheck(mockReq, mockRes);

      expect(mockCheckService.createCheck).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({ type: 'income' }),
        null
      );
    });

    it('should handle service errors', async () => {
      mockReq.body = validCheckData;
      mockCheckService.createCheck.mockRejectedValue(new Error('Validation failed'));

      await checkController.createCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Validation failed')
        })
      );
    });
  });

  // ============================================
  // GET CHECK TESTS
  // ============================================
  describe('getCheck', () => {
    it('should return check by ID', async () => {
      mockReq.params.id = 'check-1';
      mockCheckService.getCheck.mockResolvedValue(mockCheck);

      await checkController.getCheck(mockReq, mockRes);

      expect(mockCheckService.getCheck).toHaveBeenCalledWith(mockUser.uid, 'check-1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCheck
        })
      );
    });

    it('should return 404 for non-existent check', async () => {
      mockReq.params.id = 'non-existent';
      mockCheckService.getCheck.mockResolvedValue(null);

      await checkController.getCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for unauthorized access', async () => {
      mockReq.params.id = 'check-1';
      mockCheckService.getCheck.mockRejectedValue(new Error('Unauthorized access'));

      await checkController.getCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // GET CHECKS (LIST) TESTS
  // ============================================
  describe('getChecks', () => {
    it('should return list of checks', async () => {
      mockCheckService.getChecks.mockResolvedValue({
        checks: [mockCheck],
        total: 1
      });

      await checkController.getChecks(mockReq, mockRes);

      expect(mockCheckService.getChecks).toHaveBeenCalledWith(
        mockUser.uid,
        expect.any(Object)
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should pass filters to service', async () => {
      mockReq.query = {
        type: 'expense',
        status: 'cleared',
        companyId: 'company-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      mockCheckService.getChecks.mockResolvedValue({ checks: [], total: 0 });

      await checkController.getChecks(mockReq, mockRes);

      expect(mockCheckService.getChecks).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          type: 'expense',
          status: 'cleared',
          companyId: 'company-1',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
      );
    });

    it('should handle hasImage filter', async () => {
      mockReq.query = { hasImage: 'true' };
      mockCheckService.getChecks.mockResolvedValue({ checks: [], total: 0 });

      await checkController.getChecks(mockReq, mockRes);

      expect(mockCheckService.getChecks).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          hasImage: true
        })
      );
    });
  });

  // ============================================
  // UPDATE CHECK TESTS
  // ============================================
  describe('updateCheck', () => {
    it('should update check successfully', async () => {
      mockReq.params.id = 'check-1';
      mockReq.body = { status: 'cleared', memo: 'Updated' };
      mockCheckService.updateCheck.mockResolvedValue({
        ...mockCheck,
        status: 'cleared',
        memo: 'Updated'
      });

      await checkController.updateCheck(mockReq, mockRes);

      expect(mockCheckService.updateCheck).toHaveBeenCalledWith(
        mockUser.uid,
        'check-1',
        { status: 'cleared', memo: 'Updated' }
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Check updated successfully'
        })
      );
    });

    it('should return 404 for non-existent check', async () => {
      mockReq.params.id = 'non-existent';
      mockReq.body = { status: 'cleared' };
      mockCheckService.updateCheck.mockRejectedValue(new Error('Check not found'));

      await checkController.updateCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================
  // DELETE CHECK TESTS
  // ============================================
  describe('deleteCheck', () => {
    it('should delete check successfully', async () => {
      mockReq.params.id = 'check-1';
      mockCheckService.deleteCheck.mockResolvedValue(true);

      await checkController.deleteCheck(mockReq, mockRes);

      expect(mockCheckService.deleteCheck).toHaveBeenCalledWith(mockUser.uid, 'check-1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Check deleted successfully'
        })
      );
    });

    it('should return 404 for non-existent check', async () => {
      mockReq.params.id = 'non-existent';
      mockCheckService.deleteCheck.mockRejectedValue(new Error('Check not found'));

      await checkController.deleteCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================
  // IMAGE OPERATIONS TESTS
  // ============================================
  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      mockReq.params.id = 'check-1';
      mockReq.file = {
        originalname: 'check.jpg',
        mimetype: 'image/jpeg',
        size: 1024000
      };
      mockCheckService.uploadImage.mockResolvedValue({
        ...mockCheck,
        hasImage: true,
        fileUrl: 'https://example.com/check.jpg'
      });

      await checkController.uploadImage(mockReq, mockRes);

      expect(mockCheckService.uploadImage).toHaveBeenCalledWith(
        mockUser.uid,
        'check-1',
        mockReq.file
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Image uploaded successfully'
        })
      );
    });

    it('should return 400 when no file provided', async () => {
      mockReq.params.id = 'check-1';
      mockReq.file = null;

      await checkController.uploadImage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No file uploaded'
        })
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      mockReq.params.id = 'check-1';
      mockCheckService.deleteImage.mockResolvedValue({
        ...mockCheck,
        hasImage: false,
        fileUrl: ''
      });

      await checkController.deleteImage(mockReq, mockRes);

      expect(mockCheckService.deleteImage).toHaveBeenCalledWith(mockUser.uid, 'check-1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Image deleted successfully'
        })
      );
    });
  });

  // ============================================
  // BULK OPERATIONS TESTS
  // ============================================
  describe('bulkCreate', () => {
    it('should create multiple checks', async () => {
      mockReq.body = {
        checks: [
          { payee: 'Payee 1', amount: 100, date: '2024-01-15', type: 'expense' },
          { payee: 'Payee 2', amount: 200, date: '2024-01-16', type: 'income' }
        ]
      };
      mockCheckService.bulkCreate.mockResolvedValue({
        allSucceeded: true,
        successCount: 2,
        failCount: 0,
        results: []
      });

      await checkController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('2 checks created')
        })
      );
    });

    it('should return 400 when checks array is empty', async () => {
      mockReq.body = { checks: [] };

      await checkController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when checks is not an array', async () => {
      mockReq.body = { checks: 'not an array' };

      await checkController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when exceeding max checks limit', async () => {
      mockReq.body = {
        checks: Array(51).fill({ payee: 'P', amount: 100, date: '2024-01-01', type: 'expense' })
      };

      await checkController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Maximum 50')
        })
      );
    });

    it('should return 207 for partial success', async () => {
      mockReq.body = {
        checks: [
          { payee: 'Valid', amount: 100, date: '2024-01-15', type: 'expense' },
          { payee: '', amount: 200, date: '2024-01-16', type: 'expense' }
        ]
      };
      mockCheckService.bulkCreate.mockResolvedValue({
        allSucceeded: false,
        successCount: 1,
        failCount: 1,
        results: []
      });

      await checkController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(207);
    });
  });

  describe('bulkCreateFromTransactions', () => {
    it('should create checks from transactions', async () => {
      mockReq.body = {
        transactions: [
          { id: 'tx-1', payee: 'Payee 1', amount: -100, date: '2024-01-15' },
          { id: 'tx-2', payee: 'Payee 2', amount: 200, date: '2024-01-16' }
        ]
      };
      mockCheckService.bulkCreateFromTransactions.mockResolvedValue({
        successful: ['check-1', 'check-2'],
        failed: [],
        checks: []
      });

      await checkController.bulkCreateFromTransactions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when transactions array is empty', async () => {
      mockReq.body = { transactions: [] };

      await checkController.bulkCreateFromTransactions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // LINK TO TRANSACTION TESTS
  // ============================================
  describe('linkToTransaction', () => {
    it('should link check to transaction', async () => {
      mockReq.params = { id: 'check-1', transactionId: 'tx-1' };
      mockCheckService.linkToTransaction.mockResolvedValue({
        ...mockCheck,
        transactionId: 'tx-1'
      });

      await checkController.linkToTransaction(mockReq, mockRes);

      expect(mockCheckService.linkToTransaction).toHaveBeenCalledWith(
        mockUser.uid,
        'check-1',
        'tx-1'
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Check linked to transaction successfully'
        })
      );
    });
  });

  // ============================================
  // STATS TESTS
  // ============================================
  describe('getStats', () => {
    it('should return check statistics', async () => {
      mockCheckService.getStats.mockResolvedValue({
        totalChecks: 10,
        incomeCount: 4,
        incomeTotal: 1500,
        expenseCount: 6,
        expenseTotal: 2500,
        byStatus: {
          pending: 3,
          cleared: 6,
          bounced: 1
        }
      });

      await checkController.getStats(mockReq, mockRes);

      expect(mockCheckService.getStats).toHaveBeenCalledWith(
        mockUser.uid,
        expect.any(Object)
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalChecks: 10
          })
        })
      );
    });

    it('should pass date filters to stats', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        companyId: 'company-1'
      };
      mockCheckService.getStats.mockResolvedValue({});

      await checkController.getStats(mockReq, mockRes);

      expect(mockCheckService.getStats).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          companyId: 'company-1'
        })
      );
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('Error Handling', () => {
    it('should handle generic errors gracefully', async () => {
      mockReq.body = validCheckData;
      mockCheckService.createCheck.mockRejectedValue(new Error('Database connection failed'));

      await checkController.createCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should handle missing user gracefully', async () => {
      mockReq.user = null;
      mockReq.body = validCheckData;

      await checkController.createCheck(mockReq, mockRes);

      // Should fail due to missing user.uid
      expect(mockRes.status).toHaveBeenCalled();
    });
  });
});
