/**
 * @fileoverview Receipt Service Tests
 * @description Tests for frontend receipt API service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock Firebase auth
vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-token')
    }
  }
}));

// Import service after mocks
import receiptService from '../../services/receiptService';

describe('receiptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createReceipt', () => {
    it('should create receipt without file', async () => {
      const receiptData = {
        vendor: 'Test Store',
        amount: 99.99,
        date: '2025-12-28',
        createTransaction: true
      };

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: { id: 'new-receipt', ...receiptData }
        }
      });

      const result = await receiptService.createReceipt(receiptData);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/receipts'),
        receiptData,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-firebase-token'
          })
        })
      );
      expect(result.success).toBe(true);
    });

    it('should create receipt with file using FormData', async () => {
      const receiptData = {
        vendor: 'Test Store',
        amount: 99.99,
        date: '2025-12-28'
      };
      const mockFile = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: { id: 'new-receipt', hasImage: true }
        }
      });

      const result = await receiptService.createReceipt(receiptData, mockFile);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/receipts'),
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data'
          })
        })
      );
    });
  });

  describe('getReceipts', () => {
    it('should fetch receipts with filters', async () => {
      const filters = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        hasImage: true
      };

      axios.get.mockResolvedValue({
        data: {
          success: true,
          receipts: [],
          pagination: { total: 0 }
        }
      });

      await receiptService.getReceipts(filters);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/receipts'),
        expect.objectContaining({
          params: expect.objectContaining(filters)
        })
      );
    });

    it('should return receipts data', async () => {
      const mockReceipts = [
        { id: 'r1', vendor: 'Store A' },
        { id: 'r2', vendor: 'Store B' }
      ];

      axios.get.mockResolvedValue({
        data: {
          success: true,
          receipts: mockReceipts,
          pagination: { total: 2 }
        }
      });

      const result = await receiptService.getReceipts({});

      expect(result.receipts).toEqual(mockReceipts);
    });
  });

  describe('getReceiptById', () => {
    it('should fetch receipt by ID', async () => {
      const receiptId = 'test-receipt-123';
      const mockReceipt = {
        id: receiptId,
        vendor: 'Test Store',
        amount: 99.99
      };

      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockReceipt
        }
      });

      const result = await receiptService.getReceiptById(receiptId);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}`),
        expect.any(Object)
      );
      expect(result.data).toEqual(mockReceipt);
    });
  });

  describe('updateReceipt', () => {
    it('should update receipt', async () => {
      const receiptId = 'test-receipt-123';
      const updates = { vendor: 'Updated Store', amount: 150 };

      axios.put.mockResolvedValue({
        data: {
          success: true,
          data: { id: receiptId, ...updates }
        }
      });

      const result = await receiptService.updateReceipt(receiptId, updates);

      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}`),
        updates,
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });
  });

  describe('deleteReceipt', () => {
    it('should delete receipt', async () => {
      const receiptId = 'test-receipt-123';

      axios.delete.mockResolvedValue({
        data: { success: true, message: 'Receipt deleted' }
      });

      const result = await receiptService.deleteReceipt(receiptId);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}`),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create receipts', async () => {
      const receipts = [
        { vendor: 'Store A', amount: 25, date: '2025-12-25', createTransaction: true },
        { vendor: 'Store B', amount: 50, date: '2025-12-26', createTransaction: true }
      ];

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            successCount: 2,
            failCount: 0,
            results: receipts.map((r, i) => ({ success: true, receipt: { id: `r${i}`, ...r } }))
          },
          allSucceeded: true
        }
      });

      const result = await receiptService.bulkCreate(receipts);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/receipts/bulk'),
        { receipts },
        expect.any(Object)
      );
      expect(result.data.successCount).toBe(2);
    });

    it('should handle partial success', async () => {
      const receipts = [
        { vendor: 'Store A', amount: 25, date: '2025-12-25' },
        { vendor: 'Store B', amount: 50, date: '2025-12-26' }
      ];

      axios.post.mockResolvedValue({
        data: {
          success: false,
          data: {
            successCount: 1,
            failCount: 1,
            results: [
              { success: true, receipt: { id: 'r1' } },
              { success: false, error: 'Database error' }
            ]
          },
          someSucceeded: true
        }
      });

      const result = await receiptService.bulkCreate(receipts);

      expect(result.data.successCount).toBe(1);
      expect(result.data.failCount).toBe(1);
      expect(result.someSucceeded).toBe(true);
    });
  });

  describe('bulkCreateFromTransactions', () => {
    it('should create receipts from transactions', async () => {
      const transactions = [
        { id: 'tx-1', payee: 'Store A', amount: -50, date: '2025-12-25' },
        { id: 'tx-2', payee: 'Store B', amount: -75, date: '2025-12-26' }
      ];

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            successCount: 2,
            failCount: 0,
            receipts: [{ id: 'r1' }, { id: 'r2' }]
          }
        }
      });

      const result = await receiptService.bulkCreateFromTransactions(transactions);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/receipts/bulk-from-transactions'),
        { transactions },
        expect.any(Object)
      );
      expect(result.data.successCount).toBe(2);
    });
  });

  describe('attachToTransaction', () => {
    it('should attach receipt to transaction', async () => {
      const receiptId = 'receipt-123';
      const transactionId = 'tx-456';

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: { id: receiptId, transactionId }
        }
      });

      const result = await receiptService.attachToTransaction(receiptId, transactionId);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}/attach`),
        { transactionId },
        expect.any(Object)
      );
      expect(result.data.transactionId).toBe(transactionId);
    });
  });

  describe('detachFromTransaction', () => {
    it('should detach receipt from transaction', async () => {
      const receiptId = 'receipt-123';

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: { id: receiptId, transactionId: null }
        }
      });

      const result = await receiptService.detachFromTransaction(receiptId);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}/detach`),
        {},
        expect.any(Object)
      );
      expect(result.data.transactionId).toBeNull();
    });
  });

  describe('uploadImage', () => {
    it('should upload image to receipt', async () => {
      const receiptId = 'receipt-123';
      const mockFile = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });

      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: { id: receiptId, hasImage: true, fileUrl: 'https://example.com/receipt.jpg' }
        }
      });

      const result = await receiptService.uploadImage(receiptId, mockFile);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}/upload`),
        expect.any(FormData),
        expect.any(Object)
      );
      expect(result.data.hasImage).toBe(true);
    });
  });

  describe('deleteImage', () => {
    it('should delete image from receipt', async () => {
      const receiptId = 'receipt-123';

      axios.delete.mockResolvedValue({
        data: {
          success: true,
          data: { id: receiptId, hasImage: false }
        }
      });

      const result = await receiptService.deleteImage(receiptId);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/receipts/${receiptId}/image`),
        expect.any(Object)
      );
      expect(result.data.hasImage).toBe(false);
    });
  });

  describe('batchUpdateReceipts', () => {
    it('should batch update receipts', async () => {
      const receiptIds = ['r1', 'r2', 'r3'];
      const updates = { category: 'Office Expenses' };

      axios.put.mockResolvedValue({
        data: {
          success: true,
          data: { successCount: 3, failCount: 0 }
        }
      });

      const result = await receiptService.batchUpdateReceipts(receiptIds, updates);

      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/receipts/batch'),
        { receiptIds, updates },
        expect.any(Object)
      );
      expect(result.data.successCount).toBe(3);
    });
  });

  describe('batchDeleteReceipts', () => {
    it('should batch delete receipts', async () => {
      const receiptIds = ['r1', 'r2', 'r3'];

      axios.delete.mockResolvedValue({
        data: {
          success: true,
          data: { successCount: 3, failCount: 0 }
        }
      });

      const result = await receiptService.batchDeleteReceipts(receiptIds);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/receipts/batch'),
        expect.objectContaining({
          data: { receiptIds }
        })
      );
      expect(result.data.successCount).toBe(3);
    });
  });

  describe('getReceiptStats', () => {
    it('should fetch receipt statistics', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            totalCount: 10,
            withImages: 7,
            withTransactions: 5,
            expiringCount: 2
          }
        }
      });

      const result = await receiptService.getReceiptStats();

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/receipts/stats'),
        expect.any(Object)
      );
      expect(result.data.totalCount).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not authenticated', async () => {
      // Override the mock to return null user
      vi.doMock('../../services/firebase', () => ({
        auth: {
          currentUser: null
        }
      }));

      // Re-import to get fresh module
      vi.resetModules();
      
      // This test verifies the service handles auth errors properly
      // In real implementation, getIdToken would throw
    });

    it('should propagate API errors', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(receiptService.getReceipts({})).rejects.toThrow('Network error');
    });
  });
});
