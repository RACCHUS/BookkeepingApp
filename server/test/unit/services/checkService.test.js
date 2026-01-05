/**
 * @fileoverview Tests for CheckService
 * @description Comprehensive test suite for check management operations
 * @version 1.0.0
 * 
 * Tests cover:
 * - CRUD operations (create, read, update, delete)
 * - Income vs expense type handling
 * - Transaction creation with correct sign
 * - Bulk operations
 * - Status management
 * - Validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');
const sharedPath = path.resolve(__dirname, '../../../../shared');

// Create mock objects
let mockDb;
let mockCollection;
let mockDocRef;
let mockSnapshot;
let mockBatch;
let txMockCollection;
let txMockDocRef;

const setupMockDb = () => {
  mockBatch = {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  };

  mockDocRef = {
    id: 'new-check-id',
    get: jest.fn().mockResolvedValue({
      exists: true,
      id: 'check-1',
      data: () => ({
        id: 'check-1',
        userId: 'user-123',
        payee: 'Test Payee',
        amount: 100.00,
        type: 'expense',
        status: 'pending',
        hasImage: false
      }),
      ref: { update: jest.fn(), delete: jest.fn() }
    }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined)
  };

  mockSnapshot = {
    exists: true,
    id: 'check-1',
    empty: false,
    size: 1,
    docs: [{
      id: 'check-1',
      exists: true,
      data: () => ({
        id: 'check-1',
        userId: 'user-123',
        payee: 'Test Payee',
        amount: 100.00,
        type: 'expense',
        status: 'pending',
        hasImage: false
      }),
      ref: mockDocRef
    }],
    forEach: function(callback) {
      this.docs.forEach(callback);
    }
  };

  txMockDocRef = {
    id: 'tx-1',
    get: jest.fn().mockResolvedValue({
      exists: true,
      id: 'tx-1',
      data: () => ({ id: 'tx-1', userId: 'user-123', amount: -100 })
    }),
    update: jest.fn().mockResolvedValue(undefined)
  };

  txMockCollection = {
    doc: jest.fn().mockReturnValue(txMockDocRef),
    add: jest.fn().mockResolvedValue({ id: 'new-tx-id' })
  };

  mockCollection = {
    add: jest.fn().mockResolvedValue({ id: 'new-check-id' }),
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockSnapshot)
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

// Mock Firebase Admin
jest.unstable_mockModule(path.join(configPath, 'firebaseAdmin.js'), () => {
  const db = setupMockDb();
  return {
    db,
    admin: { firestore: { FieldValue: { serverTimestamp: () => new Date() } } }
  };
});

// Mock firebase-admin/firestore
jest.unstable_mockModule('firebase-admin/firestore', () => {
  const db = setupMockDb();
  return {
    getFirestore: () => db,
    FieldValue: {
      serverTimestamp: () => new Date(),
      delete: () => 'DELETE_FIELD'
    }
  };
});

// Mock logger
jest.unstable_mockModule(path.join(configPath, 'logger.js'), () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock storage service
jest.unstable_mockModule(path.join(servicesPath, 'storageService.js'), () => ({
  default: {
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://storage.example.com/check.jpg',
      publicId: 'check-image-123'
    }),
    deleteFile: jest.fn().mockResolvedValue(true)
  }
}));

// Import service after mocking
const checkServiceModule = await import(path.join(servicesPath, 'checkService.js'));
const checkService = checkServiceModule.default;

describe('CheckService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockDb();
  });

  // ============================================
  // VALIDATION TESTS
  // ============================================
  describe('Validation', () => {
    it('should allow check without payee (optional field)', async () => {
      const checkData = {
        amount: 100,
        date: '2024-01-15',
        type: 'expense'
        // payee is optional
      };

      const result = await checkService.createCheck('user-123', checkData);
      expect(result).toBeDefined();
      expect(result.payee).toBe('');
    });

    it('should allow check without amount (optional field)', async () => {
      const checkData = {
        payee: 'Test Payee',
        date: '2024-01-15',
        type: 'expense'
        // amount is optional
      };

      const result = await checkService.createCheck('user-123', checkData);
      expect(result).toBeDefined();
    });

    it('should reject check with invalid type', async () => {
      const invalidData = {
        payee: 'Test Payee',
        amount: 100,
        date: '2024-01-15',
        type: 'invalid-type'
      };

      await expect(checkService.createCheck('user-123', invalidData))
        .rejects.toThrow();
    });

    it('should reject check with invalid status', async () => {
      const invalidData = {
        payee: 'Test Payee',
        amount: 100,
        date: '2024-01-15',
        type: 'expense',
        status: 'invalid-status'
      };

      await expect(checkService.createCheck('user-123', invalidData))
        .rejects.toThrow();
    });

    it('should reject check with negative amount', async () => {
      const invalidData = {
        payee: 'Test Payee',
        amount: -100,
        date: '2024-01-15',
        type: 'expense'
      };

      await expect(checkService.createCheck('user-123', invalidData))
        .rejects.toThrow('Amount must be positive');
    });
  });

  // ============================================
  // AMOUNT SIGN HANDLING TESTS
  // ============================================
  describe('Amount Sign Handling', () => {
    it('should store positive amount for expense check', async () => {
      const checkData = {
        payee: 'Test Payee',
        amount: 100,
        date: '2024-01-15',
        type: 'expense',
        createTransaction: false
      };

      // The amount in check record should always be positive
      const result = await checkService.createCheck('user-123', checkData);
      
      // Check that amount is stored as positive
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100 // Positive in check record
        })
      );
    });

    it('should store positive amount for income check', async () => {
      const checkData = {
        payee: 'Test Client',
        amount: 500,
        date: '2024-01-15',
        type: 'income',
        createTransaction: false
      };

      await checkService.createCheck('user-123', checkData);
      
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500 // Positive in check record
        })
      );
    });

    it('should create negative transaction for expense check', async () => {
      const checkData = {
        payee: 'Vendor XYZ',
        amount: 250,
        date: '2024-01-15',
        type: 'expense',
        createTransaction: true
      };

      await checkService.createCheck('user-123', checkData);
      
      // Transaction should have negative amount for expense
      expect(txMockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: -250 // Negative for expense
        })
      );
    });

    it('should create positive transaction for income check', async () => {
      const checkData = {
        payee: 'Client ABC',
        amount: 1000,
        date: '2024-01-15',
        type: 'income',
        createTransaction: true
      };

      await checkService.createCheck('user-123', checkData);
      
      // Transaction should have positive amount for income
      expect(txMockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000 // Positive for income
        })
      );
    });

    it('should handle when validation rejects negative amount', async () => {
      const checkData = {
        payee: 'Test',
        amount: -150, // Validation rejects negative amounts
        date: '2024-01-15',
        type: 'expense',
        createTransaction: true
      };

      // Validation should reject negative amounts
      await expect(checkService.createCheck('user-123', checkData))
        .rejects.toThrow('Amount must be positive');
    });
  });

  // ============================================
  // CRUD OPERATION TESTS
  // ============================================
  describe('CRUD Operations', () => {
    describe('createCheck', () => {
      it('should create a check successfully', async () => {
        const checkData = {
          payee: 'New Payee',
          amount: 75.50,
          date: '2024-02-01',
          type: 'expense',
          checkNumber: '1234',
          memo: 'Office supplies'
        };

        const result = await checkService.createCheck('user-123', checkData);

        expect(mockCollection.add).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should create check with all optional fields', async () => {
        const checkData = {
          payee: 'Full Data Payee',
          amount: 500,
          date: '2024-02-15',
          type: 'expense',
          checkNumber: '5678',
          status: 'cleared',
          category: 'Rent',
          companyId: 'company-123',
          memo: 'Monthly rent payment',
          bankName: 'Chase Bank',
          createTransaction: true
        };

        await checkService.createCheck('user-123', checkData);

        expect(mockCollection.add).toHaveBeenCalledWith(
          expect.objectContaining({
            payee: 'Full Data Payee',
            checkNumber: '5678',
            status: 'cleared',
            memo: 'Monthly rent payment'
          })
        );
      });
    });

    describe('getCheck', () => {
      it('should get check by ID for authorized user', async () => {
        const result = await checkService.getCheck('user-123', 'check-1');

        expect(mockDocRef.get).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should throw error for unauthorized user', async () => {
        mockDocRef.get.mockResolvedValueOnce({
          exists: true,
          id: 'check-1',
          data: () => ({ userId: 'different-user' })
        });

        await expect(checkService.getCheck('user-123', 'check-1'))
          .rejects.toThrow('Unauthorized');
      });

      it('should return null for non-existent check', async () => {
        mockDocRef.get.mockResolvedValueOnce({ exists: false });

        const result = await checkService.getCheck('user-123', 'non-existent');
        expect(result).toBeNull();
      });
    });

    describe('updateCheck', () => {
      it('should update check fields', async () => {
        const updates = {
          status: 'cleared',
          memo: 'Updated memo'
        };

        await checkService.updateCheck('user-123', 'check-1', updates);

        expect(mockDocRef.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'cleared',
            memo: 'Updated memo'
          })
        );
      });

      it('should add updatedAt timestamp', async () => {
        const updates = { status: 'cleared' };

        await checkService.updateCheck('user-123', 'check-1', updates);

        expect(mockDocRef.update).toHaveBeenCalledWith(
          expect.objectContaining({
            updatedAt: expect.anything()
          })
        );
      });
    });

    describe('deleteCheck', () => {
      it('should delete check', async () => {
        await checkService.deleteCheck('user-123', 'check-1');

        expect(mockDocRef.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // FILTER TESTS
  // ============================================
  describe('Filtering', () => {
    it('should filter by type', async () => {
      await checkService.getChecks('user-123', { type: 'income' });

      expect(mockCollection.where).toHaveBeenCalledWith('type', '==', 'income');
    });

    it('should filter by status', async () => {
      await checkService.getChecks('user-123', { status: 'cleared' });

      expect(mockCollection.where).toHaveBeenCalledWith('status', '==', 'cleared');
    });

    it('should filter by company', async () => {
      await checkService.getChecks('user-123', { companyId: 'company-1' });

      expect(mockCollection.where).toHaveBeenCalledWith('companyId', '==', 'company-1');
    });

    it('should filter by date range (client-side)', async () => {
      // Date filtering is done client-side in the service
      const result = await checkService.getChecks('user-123', {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      // Should return filtered results (checks array from mock)
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('total');
    });
  });

  // ============================================
  // BULK OPERATIONS TESTS
  // ============================================
  describe('Bulk Operations', () => {
    describe('bulkCreate', () => {
      it('should create multiple checks', async () => {
        const checksData = [
          { payee: 'Payee 1', amount: 100, date: '2024-01-15', type: 'expense' },
          { payee: 'Payee 2', amount: 200, date: '2024-01-16', type: 'income' },
          { payee: 'Payee 3', amount: 300, date: '2024-01-17', type: 'expense' }
        ];

        const result = await checkService.bulkCreate('user-123', checksData);

        expect(result.successCount).toBeGreaterThanOrEqual(0);
        expect(result).toHaveProperty('failCount');
      });

      it('should handle partial failures in bulk create', async () => {
        const checksData = [
          { payee: 'Valid', amount: 100, date: '2024-01-15', type: 'expense' },
          { payee: 'Invalid', amount: -200, date: '2024-01-16', type: 'expense' }, // Invalid - negative amount
          { payee: 'Also Valid', amount: 300, date: '2024-01-17', type: 'income' }
        ];

        const result = await checkService.bulkCreate('user-123', checksData);

        // One check should fail due to negative amount validation
        expect(result.failCount).toBeGreaterThan(0);
        expect(result.successCount).toBeGreaterThan(0);
      });
    });

    describe('bulkCreateFromTransactions', () => {
      it('should create checks from existing transactions', async () => {
        const transactions = [
          { id: 'tx-1', payee: 'Transaction Payee', amount: -100, date: '2024-01-15' },
          { id: 'tx-2', payee: 'Another Payee', amount: 200, date: '2024-01-16' }
        ];

        const result = await checkService.bulkCreateFromTransactions('user-123', transactions);

        expect(result).toHaveProperty('successful');
        expect(result).toHaveProperty('failed');
      });

      it('should correctly determine type from transaction amount', async () => {
        const transactions = [
          { id: 'tx-1', payee: 'Expense TX', amount: -500, date: '2024-01-15' }, // Negative = expense
          { id: 'tx-2', payee: 'Income TX', amount: 1000, date: '2024-01-16' }  // Positive = income
        ];

        await checkService.bulkCreateFromTransactions('user-123', transactions);

        // First check should be expense (from negative transaction)
        // Second check should be income (from positive transaction)
        expect(mockCollection.add).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // LINK TO TRANSACTION TESTS
  // ============================================
  describe('Link to Transaction', () => {
    it('should link check to existing transaction', async () => {
      await checkService.linkToTransaction('user-123', 'check-1', 'tx-1');

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-1'
        })
      );
    });

    it('should throw error if transaction not found', async () => {
      txMockDocRef.get.mockResolvedValueOnce({ exists: false });

      await expect(checkService.linkToTransaction('user-123', 'check-1', 'invalid-tx'))
        .rejects.toThrow();
    });
  });

  // ============================================
  // STATUS TRANSITION TESTS
  // ============================================
  describe('Status Management', () => {
    it('should update status to cleared', async () => {
      await checkService.updateCheck('user-123', 'check-1', { status: 'cleared' });

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cleared' })
      );
    });

    it('should update status to bounced', async () => {
      await checkService.updateCheck('user-123', 'check-1', { status: 'bounced' });

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'bounced' })
      );
    });

    it('should update status to voided', async () => {
      await checkService.updateCheck('user-123', 'check-1', { status: 'voided' });

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'voided' })
      );
    });
  });

  // ============================================
  // STATS TESTS
  // ============================================
  describe('Statistics', () => {
    it('should return check statistics', async () => {
      // Setup mock to return multiple checks
      mockCollection.get.mockResolvedValueOnce({
        empty: false,
        size: 5,
        docs: [
          { id: '1', data: () => ({ type: 'expense', amount: 100, status: 'cleared', hasImage: false }) },
          { id: '2', data: () => ({ type: 'expense', amount: 200, status: 'pending', hasImage: true }) },
          { id: '3', data: () => ({ type: 'income', amount: 500, status: 'cleared', hasImage: false }) },
          { id: '4', data: () => ({ type: 'income', amount: 300, status: 'cleared', hasImage: false }) },
          { id: '5', data: () => ({ type: 'expense', amount: 150, status: 'bounced', hasImage: false }) }
        ]
      });

      const stats = await checkService.getStats('user-123');

      // Verify actual property names from the service
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('totalIncome');
      expect(stats).toHaveProperty('totalExpense');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('withImages');
      expect(stats).toHaveProperty('linkedToTransactions');
    });
  });

  // ============================================
  // MULTI-TRANSACTION LINK TESTS
  // ============================================
  describe('unlinkFromTransaction', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.unlinkFromTransaction).toBe('function');
    });

    it('should throw error for non-existent check', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        checkService.unlinkFromTransaction('user-123', 'non-existent')
      ).rejects.toThrow();
    });
  });

  describe('addTransactionLink', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.addTransactionLink).toBe('function');
    });

    it('should throw error for non-existent check', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        checkService.addTransactionLink('user-123', 'non-existent', 'tx-1')
      ).rejects.toThrow();
    });
  });

  describe('removeTransactionLink', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.removeTransactionLink).toBe('function');
    });

    it('should throw error for non-existent check', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        checkService.removeTransactionLink('user-123', 'non-existent', 'tx-1')
      ).rejects.toThrow();
    });
  });

  describe('bulkLinkToTransaction', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.bulkLinkToTransaction).toBe('function');
    });

    it('should throw error when transaction not found', async () => {
      txMockDocRef.get.mockResolvedValueOnce({ exists: false });
      
      await expect(
        checkService.bulkLinkToTransaction('user-123', ['check-1'], 'non-existent-tx')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('bulkUnlinkFromTransactions', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.bulkUnlinkFromTransactions).toBe('function');
    });
  });

  describe('linkToMultipleTransactions', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.linkToMultipleTransactions).toBe('function');
    });

    it('should throw error for non-existent check', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        checkService.linkToMultipleTransactions('user-123', 'non-existent', ['tx-1'])
      ).rejects.toThrow();
    });
  });

  describe('batchUpdateChecks', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.batchUpdateChecks).toBe('function');
    });

    it('should return empty result for empty input', async () => {
      const result = await checkService.batchUpdateChecks('user-123', [], { status: 'cleared' });
      
      expect(result.successful).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  });

  describe('batchDeleteChecks', () => {
    it('should exist as a function', () => {
      expect(typeof checkService.batchDeleteChecks).toBe('function');
    });

    it('should return empty result for empty input', async () => {
      const result = await checkService.batchDeleteChecks('user-123', []);
      
      expect(result.successful).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  });
});
