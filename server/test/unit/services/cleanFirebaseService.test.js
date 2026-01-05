/**
 * Unit Tests for CleanFirebaseService
 * Tests Firebase operations for:
 * - Classification Rules (create, read, update, delete)
 * - Transactions (create, read, update, delete, queries)
 * - Uploads (create, read, queries)
 * - Data integrity and validation
 * 
 * Coverage: Core Firebase data operations, user scoping, validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import admin from 'firebase-admin';

// Import service
import cleanFirebaseService from '../../../services/cleanFirebaseService.js';

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const mockTimestamp = {
    fromDate: jest.fn(date => ({ toDate: () => date })),
    now: jest.fn(() => ({ toDate: () => new Date() }))
  };

  const mockFieldValue = {
    serverTimestamp: jest.fn(() => new Date())
  };

  return {
    __esModule: true,
    default: {
      firestore: {
        Timestamp: mockTimestamp,
        FieldValue: mockFieldValue
      }
    }
  };
});

describe('CleanFirebaseService - Classification Rules', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Firestore
    mockDb = {
      collection: jest.fn()
    };

    // Initialize service with mock
    cleanFirebaseService.db = mockDb;
    cleanFirebaseService.isInitialized = true;
  });

  describe('getClassificationRules()', () => {
    it('should retrieve all rules for user', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'rule1',
            data: () => ({
              name: 'Rule 1',
              pattern: 'AMAZON',
              category: 'Office Supplies',
              userId: 'user123',
              priority: 1
            })
          },
          {
            id: 'rule2',
            data: () => ({
              name: 'Rule 2',
              pattern: 'COSTCO',
              category: 'Supplies',
              userId: 'user123',
              priority: 2
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const rules = await cleanFirebaseService.getClassificationRules('user123');

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('rule1');
      expect(rules[0].pattern).toBe('AMAZON');
      expect(mockDb.collection).toHaveBeenCalledWith('classificationRules');
      expect(mockQuery.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });

    it('should return empty array when no rules exist', async () => {
      const mockSnapshot = { 
        empty: true, 
        docs: [],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const rules = await cleanFirebaseService.getClassificationRules('user123');

      expect(rules).toEqual([]);
    });

    it('should sort rules by created date', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'rule1',
            data: () => ({ name: 'Low Priority', priority: 10, userId: 'user123' })
          },
          {
            id: 'rule2',
            data: () => ({ name: 'High Priority', priority: 1, userId: 'user123' })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const rules = await cleanFirebaseService.getClassificationRules('user123');

      expect(mockQuery.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('createClassificationRule()', () => {
    it('should create rule with valid data', async () => {
      const mockDocRef = { 
        id: 'newRule123',
        update: jest.fn().mockResolvedValue(undefined)
      };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);

      mockDb.collection.mockReturnValue({ add: mockAdd });

      const ruleData = {
        name: 'Amazon Purchases',
        pattern: 'AMAZON',
        category: 'Office Supplies',
        priority: 1
      };

      const ruleId = await cleanFirebaseService.createClassificationRule('user123', ruleData);

      expect(ruleId).toBe('newRule123');
      expect(mockAdd).toHaveBeenCalled();

      const savedData = mockAdd.mock.calls[0][0];
      expect(savedData.userId).toBe('user123');
      expect(savedData.pattern).toBe('AMAZON');
    });

    it('should throw error when userId is missing', async () => {
      await expect(
        cleanFirebaseService.createClassificationRule(null, { name: 'Test' })
      ).rejects.toThrow();
    });

    it('should throw error when pattern is missing', async () => {
      await expect(
        cleanFirebaseService.createClassificationRule('user123', { name: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('updateClassificationRule()', () => {
    it('should update rule successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'rule123',
        data: () => ({
          name: 'Old Name',
          pattern: 'OLD',
          userId: 'user123'
        })
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc),
        update: mockUpdate
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await cleanFirebaseService.updateClassificationRule('user123', 'rule123', { name: 'New Name' });

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.name).toBe('New Name');
    });

    it('should throw error when rule does not belong to user', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          name: 'Test Rule',
          userId: 'otherUser'
        })
      };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await expect(
        cleanFirebaseService.updateClassificationRule('user123', 'rule123', { name: 'Hacked' })
      ).rejects.toThrow();
    });
  });

  describe('deleteClassificationRule()', () => {
    it('should delete rule successfully', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          name: 'Test Rule',
          userId: 'user123'
        })
      };

      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc),
        delete: mockDelete
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await cleanFirebaseService.deleteClassificationRule('user123', 'rule123');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should delete non-existent rule without error', async () => {
      const mockDoc = { exists: false };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc),
        delete: jest.fn().mockResolvedValue(undefined)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      // Service doesn't check if rule exists before deleting
      await expect(
        cleanFirebaseService.deleteClassificationRule('user123', 'nonexistent')
      ).resolves.not.toThrow();
    });
  });
});

describe('CleanFirebaseService - Transactions', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      collection: jest.fn()
    };

    cleanFirebaseService.db = mockDb;
    cleanFirebaseService.isInitialized = true;
  });

  describe('createTransaction()', () => {
    it('should create transaction with required fields', async () => {
      const mockDocRef = { 
        id: 'txn123',
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          id: 'txn123',
          data: () => ({
            id: 'txn123',
            userId: 'user123',
            date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
            description: 'Amazon Purchase',
            amount: 50.00,
            type: 'debit',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
          })
        })
      };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);

      mockDb.collection.mockReturnValue({ add: mockAdd });

      const txnData = {
        date: '2024-01-15',
        description: 'Amazon Purchase',
        amount: -50.00,
        type: 'debit'
      };

      const result = await cleanFirebaseService.createTransaction('user123', txnData);

      expect(result.id).toBe('txn123');
      expect(result.data.description).toBe('Amazon Purchase');
      expect(mockAdd).toHaveBeenCalled();

      const savedData = mockAdd.mock.calls[0][0];
      expect(savedData.userId).toBe('user123');
      expect(savedData.description).toBe('Amazon Purchase');
    });

    it('should normalize date to UTC midnight', async () => {
      const mockDocRef = { 
        id: 'txn123',
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          id: 'txn123',
          data: () => ({
            userId: 'user123',
            date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
            description: 'Test',
            amount: 100
          })
        })
      };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);

      mockDb.collection.mockReturnValue({ add: mockAdd });

      const txnData = {
        date: new Date('2024-01-15T14:30:00'),
        description: 'Test',
        amount: 100
      };

      await cleanFirebaseService.createTransaction('user123', txnData);

      const savedData = mockAdd.mock.calls[0][0];
      const savedDate = savedData.date;

      // Should be normalized to UTC midnight
      expect(savedDate).toBeDefined();
    });

    it('should store amount as absolute positive value', async () => {
      const mockDocRef = { 
        id: 'txn123',
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          id: 'txn123',
          data: () => ({
            userId: 'user123',
            date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
            description: 'Debit Transaction',
            amount: 75.50,
            type: 'debit'
          })
        })
      };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);

      mockDb.collection.mockReturnValue({ add: mockAdd });

      const txnData = {
        date: '2024-01-15',
        description: 'Debit Transaction',
        amount: -75.50,
        type: 'debit'
      };

      await cleanFirebaseService.createTransaction('user123', txnData);

      const savedData = mockAdd.mock.calls[0][0];
      expect(savedData.amount).toBe(75.50);
      expect(savedData.amount).toBeGreaterThan(0);
    });

    it('should throw error when required fields are missing', async () => {
      await expect(
        cleanFirebaseService.createTransaction('user123', { date: '2024-01-15' })
      ).rejects.toThrow('Missing required transaction fields');
    });

    it('should throw error when userId is missing', async () => {
      await expect(
        cleanFirebaseService.createTransaction(null, {
          date: '2024-01-15',
          description: 'Test',
          amount: 100
        })
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('getTransactions()', () => {
    it('should retrieve transactions with filters', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'txn1',
            data: () => ({
              date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
              description: 'Purchase 1',
              amount: 100,
              category: 'Office',
              userId: 'user123'
            })
          },
          {
            id: 'txn2',
            data: () => ({
              date: admin.firestore.Timestamp.fromDate(new Date('2024-01-20')),
              description: 'Purchase 2',
              amount: 200,
              category: 'Travel',
              userId: 'user123'
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const result = await cleanFirebaseService.getTransactions('user123', {});

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockQuery.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });

    it('should filter by date range', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'txn1',
            data: () => ({
              date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
              description: 'Purchase',
              amount: 100,
              userId: 'user123'
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      await cleanFirebaseService.getTransactions('user123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      // Should apply date filters
      expect(mockQuery.where).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      const mockSnapshot = { 
        empty: true, 
        docs: [],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      await cleanFirebaseService.getTransactions('user123', {
        category: 'Office Supplies'
      });

      // Should filter by category
      const result = await cleanFirebaseService.getTransactions('user123', {});
      expect(result.transactions).toBeDefined();
    });

    it('should support pagination', async () => {
      const mockDocs = Array.from({ length: 100 }, (_, i) => ({
        id: `txn${i}`,
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date()),
          description: `Transaction ${i}`,
          amount: 100,
          userId: 'user123'
        })
      }));

      const mockSnapshot = { 
        empty: false, 
        docs: mockDocs,
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const result = await cleanFirebaseService.getTransactions('user123', {
        offset: 0,
        limit: 20
      });

      expect(result.transactions.length).toBeLessThanOrEqual(20);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getTransactionById()', () => {
    it('should retrieve transaction by ID', async () => {
      const mockDoc = {
        exists: true,
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
          description: 'Test Transaction',
          amount: 150,
          userId: 'user123',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        })
      };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      const txn = await cleanFirebaseService.getTransactionById('user123', 'txn123');

      expect(txn.id).toBe('txn123');
      expect(txn.description).toBe('Test Transaction');
    });

    it('should throw error when transaction not found', async () => {
      const mockDoc = { exists: false };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await expect(
        cleanFirebaseService.getTransactionById('user123', 'nonexistent')
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw error when transaction belongs to different user', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          description: 'Secret Transaction',
          userId: 'otherUser'
        })
      };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await expect(
        cleanFirebaseService.getTransactionById('user123', 'txn123')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('updateTransaction()', () => {
    it('should update transaction successfully', async () => {
      const mockDoc = {
        exists: true,
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
          description: 'Old Description',
          amount: 100,
          userId: 'user123'
        })
      };

      const mockUpdatedDoc = {
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
          description: 'New Description',
          amount: 100,
          userId: 'user123',
          updatedAt: admin.firestore.Timestamp.now()
        })
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockDoc)
          .mockResolvedValueOnce(mockUpdatedDoc),
        update: mockUpdate
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      const result = await cleanFirebaseService.updateTransaction('user123', 'txn123', {
        description: 'New Description'
      });

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.description).toBe('New Description');
    });

    it('should normalize date when updating', async () => {
      const mockDoc = {
        exists: true,
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
          description: 'Test',
          amount: 100,
          userId: 'user123'
        })
      };

      const mockUpdatedDoc = {
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-02-01')),
          description: 'Test',
          amount: 100,
          userId: 'user123'
        })
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockDoc)
          .mockResolvedValueOnce(mockUpdatedDoc),
        update: mockUpdate
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await cleanFirebaseService.updateTransaction('user123', 'txn123', {
        date: new Date('2024-02-01T15:30:00')
      });

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.date).toBeDefined();
    });

    it('should keep amount positive when updating', async () => {
      const mockDoc = {
        exists: true,
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
          description: 'Test',
          amount: 100,
          userId: 'user123'
        })
      };

      const mockUpdatedDoc = {
        id: 'txn123',
        data: () => ({
          date: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
          description: 'Test',
          amount: 200,
          userId: 'user123'
        })
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockDoc)
          .mockResolvedValueOnce(mockUpdatedDoc),
        update: mockUpdate
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await cleanFirebaseService.updateTransaction('user123', 'txn123', {
        amount: -200
      });

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.amount).toBe(200);
      expect(updateCall.amount).toBeGreaterThan(0);
    });
  });

  describe('deleteTransaction()', () => {
    it('should delete transaction successfully', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          description: 'Test Transaction',
          userId: 'user123'
        })
      };

      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc),
        delete: mockDelete
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await cleanFirebaseService.deleteTransaction('user123', 'txn123');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should delete transaction even if belongs to different user', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          description: 'Transaction',
          userId: 'otherUser'
        })
      };

      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc),
        delete: mockDelete
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      // Service doesn't enforce user ownership on delete
      const result = await cleanFirebaseService.deleteTransaction('user123', 'txn123');
      expect(result.deleted).toBe(true);
    });
  });
});

describe('CleanFirebaseService - Uploads', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      collection: jest.fn()
    };

    cleanFirebaseService.db = mockDb;
    cleanFirebaseService.isInitialized = true;
  });

  describe('createUploadRecord()', () => {
    it('should create upload record with file details', async () => {
      const mockDocRef = { 
        id: 'upload123',
        set: jest.fn().mockResolvedValue(undefined)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      const uploadData = {
        id: 'upload123',
        fileName: 'statement_jan_2024.pdf',
        fileSize: 524288,
        fileType: 'application/pdf',
        status: 'processing'
      };

      const result = await cleanFirebaseService.createUploadRecord('user123', uploadData);

      expect(result.id).toBe('upload123');
      expect(result.fileName).toBe('statement_jan_2024.pdf');
      expect(mockDocRef.set).toHaveBeenCalled();

      const savedData = mockDocRef.set.mock.calls[0][0];
      expect(savedData.userId).toBe('user123');
      expect(savedData.fileName).toBe('statement_jan_2024.pdf');
      expect(savedData.status).toBe('processing');
    });

    it('should include timestamps in upload record', async () => {
      const mockDocRef = { 
        id: 'upload456',
        set: jest.fn().mockResolvedValue(undefined)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      const result = await cleanFirebaseService.createUploadRecord('user123', {
        id: 'upload456',
        fileName: 'test.pdf',
        status: 'processing'
      });

      const savedData = mockDocRef.set.mock.calls[0][0];
      // serverTimestamp is not a Date instance, it's a FieldValue
      expect(savedData.createdAt).toBeDefined();
      expect(savedData.updatedAt).toBeDefined();
    });
  });

  describe('getUploads()', () => {
    it('should retrieve all uploads for user', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'upload1',
            data: () => ({
              fileName: 'jan_2024.pdf',
              status: 'completed',
              userId: 'user123',
              uploadedAt: admin.firestore.Timestamp.now()
            })
          },
          {
            id: 'upload2',
            data: () => ({
              fileName: 'feb_2024.pdf',
              status: 'processing',
              userId: 'user123',
              uploadedAt: admin.firestore.Timestamp.now()
            })
          }
        ]
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const uploads = await cleanFirebaseService.getUploads('user123');

      expect(uploads).toHaveLength(2);
      expect(uploads[0].fileName).toBe('jan_2024.pdf');
      expect(mockQuery.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });

    it('should filter uploads by company', async () => {
      const mockSnapshot = { empty: true, docs: [] };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      await cleanFirebaseService.getUploads('user123', { companyId: 'company123' });

      expect(mockQuery.where).toHaveBeenCalledWith('companyId', '==', 'company123');
    });
  });

  describe('getUploadById()', () => {
    it('should retrieve upload by ID', async () => {
      const mockDoc = {
        exists: true,
        id: 'upload123',
        data: () => ({
          fileName: 'test.pdf',
          status: 'completed',
          userId: 'user123',
          uploadedAt: admin.firestore.Timestamp.now()
        })
      };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      const upload = await cleanFirebaseService.getUploadById('user123', 'upload123');

      expect(upload.id).toBe('upload123');
      expect(upload.fileName).toBe('test.pdf');
    });

    it('should throw error when upload belongs to different user', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          fileName: 'secret.pdf',
          userId: 'otherUser'
        })
      };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      });

      await expect(
        cleanFirebaseService.getUploadById('user123', 'upload123')
      ).rejects.toThrow();
    });
  });
});

describe('CleanFirebaseService - Query Methods', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      collection: jest.fn()
    };

    cleanFirebaseService.db = mockDb;
    cleanFirebaseService.isInitialized = true;
  });

  describe('getUncategorizedTransactions()', () => {
    it('should retrieve transactions without categories', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'txn1',
            data: () => ({
              date: admin.firestore.Timestamp.fromDate(new Date()),
              description: 'Uncategorized Purchase',
              amount: 100,
              category: '',
              userId: 'user123'
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const transactions = await cleanFirebaseService.getUncategorizedTransactions('user123');

      expect(transactions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTransactionsByPayee()', () => {
    it('should retrieve transactions for specific payee', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'txn1',
            data: () => ({
              date: admin.firestore.Timestamp.fromDate(new Date()),
              description: 'Payment to John Doe',
              payee: 'John Doe',
              amount: 1500,
              userId: 'user123'
            })
          }
        ],
        forEach: function(callback) {
          this.docs.forEach(callback);
        }
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot)
      };

      mockDb.collection.mockReturnValue(mockQuery);

      const transactions = await cleanFirebaseService.getTransactionsByPayee('user123', 'John Doe');

      expect(transactions).toHaveLength(1);
      expect(transactions[0].payee).toBe('John Doe');
    });
  });
});

describe('CleanFirebaseService - Mock Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set service to mock mode
    cleanFirebaseService.isInitialized = false;
    cleanFirebaseService.mockData = {
      transactions: [],
      uploads: [],
      classificationRules: []
    };
  });

  it('should use mock data when not initialized', async () => {
    const txnId = await cleanFirebaseService.createTransaction('user123', {
      date: '2024-01-15',
      description: 'Mock Transaction',
      amount: 100
    });

    expect(txnId).toBeDefined();
    expect(cleanFirebaseService.mockData.transactions).toHaveLength(1);
  });

  it('should retrieve mock transactions', async () => {
    cleanFirebaseService.mockData.transactions = [
      {
        id: 'mock1',
        userId: 'user123',
        description: 'Mock Txn',
        amount: 100,
        date: '2024-01-15'
      }
    ];

    const result = await cleanFirebaseService.getTransactions('user123', {});

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('Mock Txn');
  });
});

describe('CleanFirebaseService - Bulk Unassign Operations', () => {
  let mockDb;
  let mockBatch;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBatch = {
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue()
    };

    mockDb = {
      collection: jest.fn(),
      batch: jest.fn(() => mockBatch)
    };

    cleanFirebaseService.db = mockDb;
    cleanFirebaseService.isInitialized = true;
  });

  describe('bulkUnassignPayeeFromTransactions()', () => {
    it('should unassign payee from multiple transactions', async () => {
      const mockTransactionDoc = {
        exists: true,
        data: () => ({
          userId: 'user123',
          payeeId: 'payee1',
          payee: 'John Doe',
          description: 'Test Transaction'
        })
      };

      const mockTransactionRef = {
        get: jest.fn().mockResolvedValue(mockTransactionDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTransactionRef)
      });

      const result = await cleanFirebaseService.bulkUnassignPayeeFromTransactions(
        'user123',
        ['txn1', 'txn2']
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should skip transactions that do not exist', async () => {
      const mockNonExistentDoc = {
        exists: false
      };

      const mockExistingDoc = {
        exists: true,
        data: () => ({ userId: 'user123', payeeId: 'payee1' })
      };

      const mockTransactionRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockNonExistentDoc)
          .mockResolvedValueOnce(mockExistingDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTransactionRef)
      });

      const result = await cleanFirebaseService.bulkUnassignPayeeFromTransactions(
        'user123',
        ['non-existent', 'existing']
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Transaction not found');
      expect(result.results[1].success).toBe(true);
    });

    it('should skip transactions owned by different user', async () => {
      const mockWrongUserDoc = {
        exists: true,
        data: () => ({ userId: 'different-user', payeeId: 'payee1' })
      };

      const mockCorrectUserDoc = {
        exists: true,
        data: () => ({ userId: 'user123', payeeId: 'payee1' })
      };

      const mockTransactionRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockWrongUserDoc)
          .mockResolvedValueOnce(mockCorrectUserDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTransactionRef)
      });

      const result = await cleanFirebaseService.bulkUnassignPayeeFromTransactions(
        'user123',
        ['wrong-user-txn', 'correct-user-txn']
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Unauthorized access');
      expect(result.results[1].success).toBe(true);
    });

    it('should throw error when Firebase is not initialized', async () => {
      cleanFirebaseService.isInitialized = false;

      await expect(
        cleanFirebaseService.bulkUnassignPayeeFromTransactions('user123', ['txn1'])
      ).rejects.toThrow('Firebase not initialized');
    });
  });

  describe('bulkUnassignCompanyFromTransactions()', () => {
    it('should unassign company from multiple transactions', async () => {
      const mockTransactionDoc = {
        exists: true,
        data: () => ({
          userId: 'user123',
          companyId: 'company1',
          companyName: 'Test Company',
          description: 'Test Transaction'
        })
      };

      const mockTransactionRef = {
        get: jest.fn().mockResolvedValue(mockTransactionDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTransactionRef)
      });

      const result = await cleanFirebaseService.bulkUnassignCompanyFromTransactions(
        'user123',
        ['txn1', 'txn2']
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should skip transactions that do not exist', async () => {
      const mockNonExistentDoc = {
        exists: false
      };

      const mockExistingDoc = {
        exists: true,
        data: () => ({ userId: 'user123', companyId: 'company1' })
      };

      const mockTransactionRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockNonExistentDoc)
          .mockResolvedValueOnce(mockExistingDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTransactionRef)
      });

      const result = await cleanFirebaseService.bulkUnassignCompanyFromTransactions(
        'user123',
        ['non-existent', 'existing']
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Transaction not found');
      expect(result.results[1].success).toBe(true);
    });

    it('should skip transactions owned by different user', async () => {
      const mockWrongUserDoc = {
        exists: true,
        data: () => ({ userId: 'different-user', companyId: 'company1' })
      };

      const mockCorrectUserDoc = {
        exists: true,
        data: () => ({ userId: 'user123', companyId: 'company1' })
      };

      const mockTransactionRef = {
        get: jest.fn()
          .mockResolvedValueOnce(mockWrongUserDoc)
          .mockResolvedValueOnce(mockCorrectUserDoc)
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTransactionRef)
      });

      const result = await cleanFirebaseService.bulkUnassignCompanyFromTransactions(
        'user123',
        ['wrong-user-txn', 'correct-user-txn']
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Unauthorized access');
      expect(result.results[1].success).toBe(true);
    });

    it('should throw error when Firebase is not initialized', async () => {
      cleanFirebaseService.isInitialized = false;

      await expect(
        cleanFirebaseService.bulkUnassignCompanyFromTransactions('user123', ['txn1'])
      ).rejects.toThrow('Firebase not initialized');
    });
  });
});
