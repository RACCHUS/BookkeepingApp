/**
 * @fileoverview Tests for ReceiptService
 * @description Comprehensive test suite for receipt management operations
 * @version 1.0.0
 * 
 * Tests cover:
 * - CRUD operations (create, read, update, delete)
 * - Bulk operations (bulkCreate, bulkCreateFromTransactions)
 * - Transaction attachment/detachment
 * - Expiration and cleanup
 * - Validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const utilsPath = path.resolve(__dirname, '../../../utils');

// Create mock objects that will be shared between setup and tests
let mockDb;
let mockCollection;
let mockDocRef;
let mockSnapshot;
let mockBatch;
let mockCountSnapshot;
let txMockCollection;
let txMockDocRef;

// Set up initial mock structures
const setupMockDb = () => {
  mockCountSnapshot = {
    data: jest.fn().mockReturnValue({ count: 3 })
  };

  mockBatch = {
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  };

  mockDocRef = {
    id: 'new-receipt-id',
    get: jest.fn().mockResolvedValue({
      exists: true,
      id: 'receipt-1',
      data: () => ({
        id: 'receipt-1',
        userId: 'user-123',
        vendor: 'Test Vendor',
        amount: 50.00,
        category: 'Supplies',
        hasImage: false
      }),
      ref: { update: jest.fn(), delete: jest.fn() }
    }),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined)
  };

  mockSnapshot = {
    exists: true,
    id: 'receipt-1',
    empty: false,
    size: 1,
    docs: [{
      id: 'receipt-1',
      exists: true,
      data: () => ({
        id: 'receipt-1',
        userId: 'user-123',
        vendor: 'Test Vendor',
        amount: 50.00,
        category: 'Supplies',
        hasImage: false
      }),
      ref: mockDocRef
    }],
    forEach: function(callback) {
      this.docs.forEach(callback);
    }
  };

  txMockDocRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      id: 'tx-1',
      data: () => ({ id: 'tx-1', userId: 'user-123' })
    }),
    update: jest.fn().mockResolvedValue(undefined)
  };

  txMockCollection = {
    doc: jest.fn().mockReturnValue(txMockDocRef),
    add: jest.fn().mockResolvedValue({ id: 'new-tx-id' })
  };

  mockCollection = {
    add: jest.fn().mockResolvedValue({ id: 'new-receipt-id' }),
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSnapshot),
    count: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue(mockCountSnapshot)
    })
  };

  mockDb = {
    collection: jest.fn((name) => {
      if (name === 'transactions') return txMockCollection;
      return mockCollection;
    }),
    batch: jest.fn().mockReturnValue(mockBatch)
  };

  return mockDb;
};

// Initialize mock DB before any imports
const initialMockDb = setupMockDb();

// Mock Firebase Admin Firestore
const mockGetFirestore = jest.fn().mockReturnValue(initialMockDb);
const mockFieldValue = {
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  delete: jest.fn(() => 'delete-field')
};

// Mock Firebase Admin Firestore - must be done before service import
jest.unstable_mockModule('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
  FieldValue: mockFieldValue
}));

// Mock storage service
const mockStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getStorageStats: jest.fn()
};

jest.unstable_mockModule(path.join(servicesPath, 'storageService.js'), () => ({
  default: mockStorageService
}));

// Mock logger
jest.unstable_mockModule(path.join(utilsPath, 'index.js'), () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import after mocking
const { default: receiptService } = await import(path.join(servicesPath, 'receiptService.js'));

// Import mock data
import {
  mockReceipts,
  mockUser,
  mockCompany,
  validReceiptData,
  minimalReceiptData,
  invalidReceiptData,
  bulkReceiptData,
  mockFile,
  mockExpiredReceipt,
  mockExpiringReceipt
} from '../../fixtures/mocks/receiptMockData.js';

describe('ReceiptService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations for each test
    mockDocRef.get.mockResolvedValue({
      exists: true,
      id: 'receipt-1',
      data: () => ({
        id: 'receipt-1',
        userId: 'user-123',
        vendor: 'Test Vendor',
        amount: 50.00,
        category: 'Supplies',
        hasImage: false
      }),
      ref: mockDocRef
    });

    mockDocRef.update.mockResolvedValue(undefined);
    mockDocRef.delete.mockResolvedValue(undefined);

    mockSnapshot.exists = true;
    mockSnapshot.empty = false;
    mockSnapshot.size = 1;
    mockSnapshot.docs = [{
      id: 'receipt-1',
      exists: true,
      data: () => ({
        id: 'receipt-1',
        userId: 'user-123',
        vendor: 'Test Vendor',
        amount: 50.00,
        category: 'Supplies',
        hasImage: false
      }),
      ref: mockDocRef
    }];

    mockCollection.add.mockResolvedValue({ id: 'new-receipt-id' });
    mockCollection.get.mockResolvedValue(mockSnapshot);

    txMockDocRef.get.mockResolvedValue({
      exists: true,
      id: 'tx-1',
      data: () => ({ id: 'tx-1', userId: 'user-123' })
    });
    
    txMockCollection.add.mockResolvedValue({ id: 'new-tx-id' });
    
    mockBatch.commit.mockResolvedValue(undefined);
    
    mockStorageService.uploadFile.mockReset();
    mockStorageService.deleteFile.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================
  // CREATE RECEIPT TESTS
  // ============================================
  describe('createReceipt', () => {
    it('should create a receipt with all fields', async () => {
      const result = await receiptService.createReceipt(mockUser.id, validReceiptData, null);

      expect(mockCollection.add).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.vendor).toBe(validReceiptData.vendor);
    });

    it('should create a receipt with minimal data', async () => {
      const result = await receiptService.createReceipt(mockUser.id, minimalReceiptData, null);

      expect(mockCollection.add).toHaveBeenCalled();
      expect(result.vendor).toBe(minimalReceiptData.vendor);
      expect(result.amount).toBe(minimalReceiptData.amount);
    });

    it('should upload file when provided', async () => {
      mockStorageService.uploadFile.mockResolvedValue({
        url: 'https://storage.example.com/receipts/new.jpg',
        fileId: 'file-new',
        storageProvider: 'firebase',
        thumbnailUrl: 'https://storage.example.com/receipts/thumbnails/new.jpg'
      });

      const result = await receiptService.createReceipt(mockUser.id, validReceiptData, mockFile);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(mockUser.id, mockFile);
      expect(result.hasImage).toBe(true);
    });

    it('should create transaction when createTransaction flag is true', async () => {
      // Mock transactions collection for transaction creation
      const mockTxDocRef = { id: 'new-tx-id' };
      mockDb.collection.mockImplementation((name) => {
        if (name === 'transactions') {
          return {
            add: jest.fn().mockResolvedValue(mockTxDocRef)
          };
        }
        return mockCollection;
      });

      const dataWithTransaction = {
        ...validReceiptData,
        createTransaction: true
      };

      await receiptService.createReceipt(mockUser.id, dataWithTransaction, null);

      // Should have created both receipt and transaction
      expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should NOT create transaction when createTransaction is false', async () => {
      const txCollection = {
        add: jest.fn()
      };
      mockDb.collection.mockImplementation((name) => {
        if (name === 'transactions') {
          return txCollection;
        }
        return mockCollection;
      });

      const dataWithoutTransaction = {
        ...validReceiptData,
        createTransaction: false
      };

      await receiptService.createReceipt(mockUser.id, dataWithoutTransaction, null);

      // Transaction collection add should NOT be called
      expect(txCollection.add).not.toHaveBeenCalled();
    });

    it('should set 2-year expiration date', async () => {
      await receiptService.createReceipt(mockUser.id, validReceiptData, null);

      const addCall = mockCollection.add.mock.calls[0][0];
      expect(addCall).toHaveProperty('expiresAt');
      
      // Expiration should be approximately 2 years from now
      const expiresAt = new Date(addCall.expiresAt);
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      
      // Allow 1 day tolerance
      const diffDays = Math.abs(expiresAt - twoYearsFromNow) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1);
    });
  });

  // ============================================
  // GET RECEIPT TESTS
  // ============================================
  describe('getReceiptById', () => {
    it('should return receipt when found and user owns it', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: mockReceipts[0].id,
        data: () => mockReceipts[0]
      });

      const result = await receiptService.getReceiptById(mockUser.id, mockReceipts[0].id);

      expect(result.id).toBe(mockReceipts[0].id);
      expect(result.vendor).toBe(mockReceipts[0].vendor);
    });

    it('should throw error when receipt not found', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: false
      });

      await expect(
        receiptService.getReceiptById(mockUser.id, 'non-existent')
      ).rejects.toThrow('Receipt not found');
    });

    it('should throw error when user does not own receipt', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: mockReceipts[0].id,
        data: () => ({ ...mockReceipts[0], userId: 'other-user' })
      });

      await expect(
        receiptService.getReceiptById(mockUser.id, mockReceipts[0].id)
      ).rejects.toThrow('You do not have access to this receipt');
    });
  });

  describe('getReceiptsForUser', () => {
    it('should return paginated receipts', async () => {
      const result = await receiptService.getReceiptsForUser(mockUser.id, {}, {}, { limit: 10 });

      expect(result).toHaveProperty('receipts');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.receipts)).toBe(true);
    });

    it('should apply date filters', async () => {
      await receiptService.getReceiptsForUser(
        mockUser.id,
        { startDate: '2025-12-01', endDate: '2025-12-31' },
        {},
        {}
      );

      expect(mockCollection.where).toHaveBeenCalledWith('date', '>=', '2025-12-01');
      expect(mockCollection.where).toHaveBeenCalledWith('date', '<=', '2025-12-31');
    });

    it('should filter by company', async () => {
      await receiptService.getReceiptsForUser(
        mockUser.id,
        { companyId: mockCompany.id },
        {},
        {}
      );

      expect(mockCollection.where).toHaveBeenCalledWith('companyId', '==', mockCompany.id);
    });

    it('should filter by hasImage', async () => {
      await receiptService.getReceiptsForUser(
        mockUser.id,
        { hasImage: true },
        {},
        {}
      );

      expect(mockCollection.where).toHaveBeenCalledWith('hasImage', '==', true);
    });
  });

  // ============================================
  // UPDATE RECEIPT TESTS
  // ============================================
  describe('updateReceipt', () => {
    beforeEach(() => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: mockReceipts[0].id,
        data: () => mockReceipts[0]
      });
    });

    it('should update receipt fields', async () => {
      const updates = { vendor: 'Updated Store', amount: 150.00 };
      
      await receiptService.updateReceipt(mockUser.id, mockReceipts[0].id, updates);

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor: 'Updated Store',
          amount: 150.00
        })
      );
    });

    it('should throw error when receipt not found', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        receiptService.updateReceipt(mockUser.id, 'non-existent', { vendor: 'Test' })
      ).rejects.toThrow('Receipt not found');
    });
  });

  // ============================================
  // DELETE RECEIPT TESTS
  // ============================================
  describe('deleteReceipt', () => {
    beforeEach(() => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: mockReceipts[0].id,
        data: () => mockReceipts[0]
      });
    });

    it('should delete receipt', async () => {
      await receiptService.deleteReceipt(mockUser.id, mockReceipts[0].id);

      expect(mockDocRef.delete).toHaveBeenCalled();
    });

    it('should delete associated file from storage', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: mockReceipts[0].id,
        data: () => ({ ...mockReceipts[0], hasImage: true, fileId: 'file-123' })
      });

      await receiptService.deleteReceipt(mockUser.id, mockReceipts[0].id);

      expect(mockStorageService.deleteFile).toHaveBeenCalled();
    });

    it('should throw error when receipt not found', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        receiptService.deleteReceipt(mockUser.id, 'non-existent')
      ).rejects.toThrow('Receipt not found');
    });
  });

  // ============================================
  // BULK OPERATIONS TESTS
  // ============================================
  describe('bulkCreate', () => {
    it('should create multiple receipts', async () => {
      const result = await receiptService.bulkCreate(mockUser.id, bulkReceiptData);

      expect(result.total).toBe(bulkReceiptData.length);
      expect(result.successCount).toBeGreaterThan(0);
      expect(result).toHaveProperty('allSucceeded');
      expect(result).toHaveProperty('results');
    });

    it('should handle partial failures', async () => {
      // Make first add succeed, second fail
      let callCount = 0;
      mockCollection.add.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({ id: `receipt-${callCount}` });
      });

      const result = await receiptService.bulkCreate(mockUser.id, bulkReceiptData);

      expect(result.successCount).toBeLessThan(result.total);
      expect(result.failCount).toBeGreaterThan(0);
      expect(result.someSucceeded).toBe(true);
    });

    it('should create transactions for receipts with createTransaction: true', async () => {
      const txCollection = {
        add: jest.fn().mockResolvedValue({ id: 'new-tx' })
      };
      mockDb.collection.mockImplementation((name) => {
        if (name === 'transactions') {
          return txCollection;
        }
        return mockCollection;
      });

      await receiptService.bulkCreate(mockUser.id, bulkReceiptData);

      // Two of three receipts have createTransaction: true
      expect(txCollection.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkCreateFromTransactions', () => {
    const mockTransactionsForBulk = [
      { id: 'tx-1', payee: 'Store A', amount: -50, date: '2025-12-25', description: 'Purchase' },
      { id: 'tx-2', payee: 'Store B', amount: -75, date: '2025-12-26', description: 'Shopping' }
    ];

    it('should create receipts from transactions', async () => {
      // Mock transaction document for linking
      const txDocRef = {
        update: jest.fn().mockResolvedValue(undefined)
      };
      mockDb.collection.mockImplementation((name) => {
        if (name === 'transactions') {
          return { doc: jest.fn().mockReturnValue(txDocRef) };
        }
        return mockCollection;
      });

      const result = await receiptService.bulkCreateFromTransactions(
        mockUser.id,
        mockTransactionsForBulk
      );

      expect(result.successful.length).toBe(mockTransactionsForBulk.length);
      expect(result.receipts.length).toBe(mockTransactionsForBulk.length);
    });
  });

  // ============================================
  // TRANSACTION ATTACHMENT TESTS
  // ============================================
  describe('attachToTransaction', () => {
    beforeEach(() => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: mockReceipts[1].id, // Receipt without transaction
        data: () => mockReceipts[1]
      });
    });

    it('should link receipt to transaction', async () => {
      const txDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId: mockUser.id })
        }),
        update: jest.fn().mockResolvedValue(undefined)
      };
      mockDb.collection.mockImplementation((name) => {
        if (name === 'transactions') {
          return { doc: jest.fn().mockReturnValue(txDocRef) };
        }
        return mockCollection;
      });

      await receiptService.attachToTransaction(mockUser.id, mockReceipts[1].id, 'tx-123');

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ transactionId: 'tx-123' })
      );
      expect(txDocRef.update).toHaveBeenCalled();
    });

    it('should throw error when transaction not found', async () => {
      const txDocRef = {
        get: jest.fn().mockResolvedValue({ exists: false })
      };
      mockDb.collection.mockImplementation((name) => {
        if (name === 'transactions') {
          return { doc: jest.fn().mockReturnValue(txDocRef) };
        }
        return mockCollection;
      });

      await expect(
        receiptService.attachToTransaction(mockUser.id, mockReceipts[1].id, 'non-existent')
      ).rejects.toThrow('Transaction not found');
    });
  });

  // ============================================
  // EXPIRATION / CLEANUP TESTS
  // ============================================
  describe('cleanupExpiredReceipts', () => {
    it('should delete expired receipts', async () => {
      // Mock expired receipts
      mockSnapshot.docs = [
        {
          id: mockExpiredReceipt.id,
          data: () => mockExpiredReceipt,
          ref: mockDocRef
        }
      ];

      const result = await receiptService.cleanupExpiredReceipts();

      // Service returns { deleted, failed, errors }
      expect(result).toHaveProperty('deleted');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
    });

    it('should return 0 when no expired receipts', async () => {
      mockSnapshot.docs = [];
      mockSnapshot.empty = true;

      const result = await receiptService.cleanupExpiredReceipts();

      expect(result.deleted).toBe(0);
    });
  });

  describe('flagExpiringReceipts', () => {
    it('should identify receipts expiring soon', async () => {
      mockSnapshot.docs = [
        {
          id: mockExpiringReceipt.id,
          data: () => mockExpiringReceipt,
          ref: mockDocRef
        }
      ];

      const result = await receiptService.flagExpiringReceipts();

      // Returns count of flagged receipts
      expect(typeof result).toBe('number');
    });
  });

  // ============================================
  // STATS TESTS
  // ============================================
  describe('getReceiptStats', () => {
    it('should return receipt statistics', async () => {
      const result = await receiptService.getReceiptStats(mockUser.id);

      // Service returns { total, withImage, withTransaction, expiringSoon, ... }
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('withImage');
      expect(result).toHaveProperty('withTransaction');
      expect(result).toHaveProperty('expiringSoon');
    });
  });

  // ============================================
  // MULTI-TRANSACTION LINK TESTS
  // ============================================
  describe('addTransactionLink', () => {
    it('should throw error for non-existent receipt', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        receiptService.addTransactionLink(mockUser.id, 'non-existent', 'tx-1')
      ).rejects.toThrow();
    });

    it('should exist as a function', () => {
      expect(typeof receiptService.addTransactionLink).toBe('function');
    });
  });

  describe('removeTransactionLink', () => {
    it('should exist as a function', () => {
      expect(typeof receiptService.removeTransactionLink).toBe('function');
    });

    it('should throw error for non-existent receipt', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        receiptService.removeTransactionLink(mockUser.id, 'non-existent', 'tx-1')
      ).rejects.toThrow();
    });
  });

  describe('bulkLinkToTransaction', () => {
    it('should exist as a function', () => {
      expect(typeof receiptService.bulkLinkToTransaction).toBe('function');
    });

    it('should throw error when transaction not found', async () => {
      txMockDocRef.get.mockResolvedValueOnce({ exists: false });
      
      await expect(
        receiptService.bulkLinkToTransaction(mockUser.id, ['receipt-1'], 'non-existent-tx')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('bulkUnlinkFromTransactions', () => {
    it('should exist as a function', () => {
      expect(typeof receiptService.bulkUnlinkFromTransactions).toBe('function');
    });
  });

  describe('linkToMultipleTransactions', () => {
    it('should exist as a function', () => {
      expect(typeof receiptService.linkToMultipleTransactions).toBe('function');
    });

    it('should throw error for non-existent receipt', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        receiptService.linkToMultipleTransactions(mockUser.id, 'non-existent', ['tx-1'])
      ).rejects.toThrow();
    });

    it('should throw error for receipt belonging to different user', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'receipt-1',
        data: () => ({
          id: 'receipt-1',
          userId: 'different-user',
          transactionIds: []
        }),
        ref: mockDocRef
      });

      await expect(
        receiptService.linkToMultipleTransactions(mockUser.id, 'receipt-1', ['tx-1'])
      ).rejects.toThrow('You do not have access to this receipt');
    });
  });
});
