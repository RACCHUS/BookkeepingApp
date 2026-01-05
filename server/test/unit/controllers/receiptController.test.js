/**
 * @fileoverview Tests for ReceiptController
 * @description Unit tests for receipt API controller functions
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');
const controllersPath = path.resolve(__dirname, '../../../controllers');

// Mock the receipt service
const mockReceiptService = {
  createReceipt: jest.fn(),
  getReceiptById: jest.fn(),
  getReceiptsForUser: jest.fn(),
  updateReceipt: jest.fn(),
  deleteReceipt: jest.fn(),
  bulkCreate: jest.fn(),
  bulkCreateFromTransactions: jest.fn(),
  batchUpdateReceipts: jest.fn(),
  batchDeleteReceipts: jest.fn(),
  attachToTransaction: jest.fn(),
  detachFromTransaction: jest.fn(),
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  getReceiptStats: jest.fn(),
  cleanupExpiredReceipts: jest.fn()
};

jest.unstable_mockModule(path.join(servicesPath, 'receiptService.js'), () => ({
  default: mockReceiptService
}));

// Mock logger
jest.unstable_mockModule(path.join(configPath, 'index.js'), () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock express-validator
jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

// Import controller after mocking
const receiptController = await import(path.join(controllersPath, 'receiptController.js'));

// Import mock data
import {
  mockReceipts,
  mockUser,
  validReceiptData,
  bulkReceiptData
} from '../../fixtures/mocks/receiptMockData.js';

describe('ReceiptController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      user: { uid: mockUser.id },
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
  // CREATE RECEIPT TESTS
  // ============================================
  describe('createReceipt', () => {
    it('should create receipt successfully', async () => {
      mockReq.body = validReceiptData;
      mockReceiptService.createReceipt.mockResolvedValue({
        id: 'new-receipt',
        ...validReceiptData
      });

      await receiptController.createReceipt(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should handle file upload', async () => {
      mockReq.body = validReceiptData;
      mockReq.file = {
        originalname: 'receipt.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('fake-data')
      };
      mockReceiptService.createReceipt.mockResolvedValue({
        id: 'new-receipt',
        ...validReceiptData,
        hasImage: true
      });

      await receiptController.createReceipt(mockReq, mockRes);

      expect(mockReceiptService.createReceipt).toHaveBeenCalledWith(
        mockUser.id,
        validReceiptData,
        mockReq.file
      );
    });

    it('should return 500 on service error', async () => {
      mockReq.body = validReceiptData;
      mockReceiptService.createReceipt.mockRejectedValue(new Error('Database error'));

      await receiptController.createReceipt(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to create receipt'
        })
      );
    });
  });

  // ============================================
  // LIST RECEIPTS TESTS
  // ============================================
  describe('listReceipts', () => {
    it('should return paginated receipts', async () => {
      mockReceiptService.getReceiptsForUser.mockResolvedValue({
        receipts: mockReceipts,
        total: 3,
        limit: 25,
        offset: 0,
        hasMore: false
      });

      await receiptController.listReceipts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockReceipts
        })
      );
    });

    it('should pass filters to service', async () => {
      mockReq.query = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        vendor: 'Office',
        hasImage: 'true',
        hasTransaction: 'false'
      };
      mockReceiptService.getReceiptsForUser.mockResolvedValue({
        receipts: [],
        total: 0,
        limit: 25,
        offset: 0,
        hasMore: false
      });

      await receiptController.listReceipts(mockReq, mockRes);

      expect(mockReceiptService.getReceiptsForUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          startDate: '2025-12-01',
          endDate: '2025-12-31',
          vendor: 'Office',
          hasImage: true,
          hasTransaction: false
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // GET RECEIPT BY ID TESTS
  // ============================================
  describe('getReceiptById', () => {
    it('should return receipt when found', async () => {
      mockReq.params.id = mockReceipts[0].id;
      mockReceiptService.getReceiptById.mockResolvedValue(mockReceipts[0]);

      await receiptController.getReceiptById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockReceipts[0]
        })
      );
    });

    it('should return 404 when not found', async () => {
      mockReq.params.id = 'non-existent';
      mockReceiptService.getReceiptById.mockRejectedValue(new Error('Receipt not found'));

      await receiptController.getReceiptById(mockReq, mockRes);

      // Controller returns 404 for "not found" errors
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================
  // UPDATE RECEIPT TESTS
  // ============================================
  describe('updateReceipt', () => {
    it('should update receipt successfully', async () => {
      mockReq.params.id = mockReceipts[0].id;
      mockReq.body = { vendor: 'Updated Store', amount: 150 };
      mockReceiptService.updateReceipt.mockResolvedValue({
        ...mockReceipts[0],
        vendor: 'Updated Store',
        amount: 150
      });

      await receiptController.updateReceipt(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  // ============================================
  // DELETE RECEIPT TESTS
  // ============================================
  describe('deleteReceipt', () => {
    it('should delete receipt successfully', async () => {
      mockReq.params.id = mockReceipts[0].id;
      mockReceiptService.deleteReceipt.mockResolvedValue({ success: true });

      await receiptController.deleteReceipt(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Receipt deleted successfully'
        })
      );
    });
  });

  // ============================================
  // BULK CREATE TESTS
  // ============================================
  describe('bulkCreate', () => {
    it('should bulk create receipts successfully', async () => {
      mockReq.body = { receipts: bulkReceiptData };
      mockReceiptService.bulkCreate.mockResolvedValue({
        total: 3,
        successCount: 3,
        failCount: 0,
        allSucceeded: true,
        someSucceeded: false,
        results: bulkReceiptData.map((r, i) => ({
          success: true,
          receipt: { id: `receipt-${i}`, ...r }
        }))
      });

      await receiptController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            successCount: 3
          })
        })
      );
    });

    it('should return 400 when receipts array is empty', async () => {
      mockReq.body = { receipts: [] };

      await receiptController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'VALIDATION_ERROR'
        })
      );
    });

    it('should return 400 when receipts is not an array', async () => {
      mockReq.body = { receipts: 'not-an-array' };

      await receiptController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when exceeding 100 receipts limit', async () => {
      mockReq.body = { receipts: Array(101).fill(validReceiptData) };

      await receiptController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_EXCEEDED'
        })
      );
    });

    it('should return 400 when receipts have missing required fields', async () => {
      mockReq.body = {
        receipts: [
          { vendor: 'Store', amount: 50 }, // missing date
          { amount: 50, date: '2025-12-28' } // missing vendor
        ]
      };

      await receiptController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR'
        })
      );
    });

    it('should return 207 on partial success', async () => {
      mockReq.body = { receipts: bulkReceiptData };
      mockReceiptService.bulkCreate.mockResolvedValue({
        total: 3,
        successCount: 2,
        failCount: 1,
        allSucceeded: false,
        someSucceeded: true,
        results: [
          { success: true, receipt: { id: 'r1' } },
          { success: true, receipt: { id: 'r2' } },
          { success: false, error: 'Failed' }
        ]
      });

      await receiptController.bulkCreate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(207);
    });
  });

  // ============================================
  // BULK CREATE FROM TRANSACTIONS TESTS
  // ============================================
  describe('bulkCreateFromTransactions', () => {
    it('should create receipts from transactions', async () => {
      mockReq.body = {
        transactions: [
          { id: 'tx-1', payee: 'Store A', amount: -50, date: '2025-12-25' },
          { id: 'tx-2', payee: 'Store B', amount: -75, date: '2025-12-26' }
        ]
      };
      mockReceiptService.bulkCreateFromTransactions.mockResolvedValue({
        successful: ['tx-1', 'tx-2'],
        failed: [],
        receipts: [{ id: 'r1' }, { id: 'r2' }]
      });

      await receiptController.bulkCreateFromTransactions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when transactions is empty', async () => {
      mockReq.body = { transactions: [] };

      await receiptController.bulkCreateFromTransactions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // ATTACH TO TRANSACTION TESTS
  // ============================================
  describe('attachToTransaction', () => {
    it('should attach receipt to transaction', async () => {
      mockReq.params.id = mockReceipts[0].id;
      mockReq.body = { transactionId: 'tx-123' };
      mockReceiptService.attachToTransaction.mockResolvedValue({
        ...mockReceipts[0],
        transactionId: 'tx-123'
      });

      await receiptController.attachToTransaction(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should return 400 when transactionId is missing', async () => {
      mockReq.params.id = mockReceipts[0].id;
      mockReq.body = {};

      await receiptController.attachToTransaction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // GET STATS TESTS
  // ============================================
  describe('getReceiptStats', () => {
    it('should return receipt statistics', async () => {
      mockReceiptService.getReceiptStats.mockResolvedValue({
        totalCount: 10,
        withImages: 7,
        withTransactions: 5,
        expiringCount: 2,
        storageUsed: 1024000
      });

      await receiptController.getReceiptStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalCount: 10
          })
        })
      );
    });
  });

  // ============================================
  // CLEANUP TESTS
  // ============================================
  describe('cleanupExpiredReceipts', () => {
    it('should cleanup expired receipts', async () => {
      mockReceiptService.cleanupExpiredReceipts.mockResolvedValue({
        deletedCount: 5,
        freedSpace: 5120000
      });

      await receiptController.cleanupExpiredReceipts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            deletedCount: 5
          })
        })
      );
    });
  });
});
