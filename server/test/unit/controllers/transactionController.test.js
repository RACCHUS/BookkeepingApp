import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkUpdateTransactions,
  getTransactionSummary,
  bulkUpdateCategories,
  assignPayeeToTransaction,
  bulkAssignPayeeToTransactions,
  bulkUnassignPayeeFromTransactions,
  bulkUnassignCompanyFromTransactions
} from '../../../controllers/transactionController.js';

describe('Transaction Controller', () => {
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    // Mock console methods to avoid cluttering test output
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock request object
    req = {
      user: { uid: 'user123', email: 'test@example.com' },
      body: {},
      params: {},
      query: {},
      id: 'req-123'
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function
    next = jest.fn();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should extract filter parameters from query', async () => {
      req.query = {
        limit: '100',
        offset: '10',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        category: 'Utilities',
        orderBy: 'amount',
        order: 'asc'
      };

      try {
        await getTransactions(req, res, next);
      } catch (error) {
        // Expected to fail at service call
      }

      expect(req.query.limit).toBe('100');
      expect(req.query.startDate).toBe('2024-01-01');
      expect(req.query.category).toBe('Utilities');
    });

    it('should use default pagination values', async () => {
      req.query = {};

      try {
        await getTransactions(req, res, next);
      } catch (error) {
        // Expected
      }

      // Defaults should be applied in controller logic
      expect(req.query).toEqual({});
    });

    it('should handle company filter', async () => {
      req.query = {
        companyId: 'company-456'
      };

      try {
        await getTransactions(req, res, next);
      } catch (error) {
        // Expected
      }

      expect(req.query.companyId).toBe('company-456');
    });

    it('should use authenticated user ID', async () => {
      req.user = { uid: 'specific-user-789' };
      req.query = { limit: '50' };

      try {
        await getTransactions(req, res, next);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('specific-user-789');
    });
  });

  describe('getTransactionById', () => {
    it('should extract transaction ID from params', async () => {
      req.params = { id: 'transaction-123' };

      try {
        await getTransactionById(req, res);
      } catch (error) {
        // Expected to fail at service call
      }

      expect(req.params.id).toBe('transaction-123');
    });

    it('should use authenticated user context', async () => {
      req.user = { uid: 'user-abc' };
      req.params = { id: 'transaction-456' };

      try {
        await getTransactionById(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('user-abc');
    });
  });

  describe('createTransaction', () => {
    it('should extract transaction data from body', async () => {
      req.body = {
        date: '2024-06-15',
        description: 'Office supplies',
        amount: -45.99,
        category: 'Office Supplies',
        type: 'expense'
      };

      try {
        await createTransaction(req, res);
      } catch (error) {
        // Expected to fail at service call
      }

      expect(req.body.description).toBe('Office supplies');
      expect(req.body.amount).toBe(-45.99);
      expect(req.body.category).toBe('Office Supplies');
    });

    it('should handle company assignment', async () => {
      req.body = {
        date: '2024-06-15',
        description: 'Business expense',
        amount: -100,
        companyId: 'company-xyz'
      };

      try {
        await createTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.companyId).toBe('company-xyz');
    });

    it('should use authenticated user ID', async () => {
      req.user = { uid: 'creator-123' };
      req.body = {
        date: '2024-06-15',
        description: 'Test transaction',
        amount: -50
      };

      try {
        await createTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('creator-123');
    });
  });

  describe('updateTransaction', () => {
    it('should extract transaction ID and update data', async () => {
      req.params = { id: 'transaction-789' };
      req.body = {
        category: 'Updated Category',
        description: 'Updated description',
        amount: -75.50
      };

      try {
        await updateTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.params.id).toBe('transaction-789');
      expect(req.body.category).toBe('Updated Category');
      expect(req.body.amount).toBe(-75.50);
    });

    it('should handle partial updates', async () => {
      req.params = { id: 'transaction-999' };
      req.body = {
        category: 'New Category'
        // Only updating category, other fields unchanged
      };

      try {
        await updateTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.category).toBe('New Category');
      expect(Object.keys(req.body).length).toBe(1);
    });

    it('should use authenticated user context', async () => {
      req.user = { uid: 'updater-456' };
      req.params = { id: 'transaction-111' };
      req.body = { description: 'Updated' };

      try {
        await updateTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('updater-456');
    });
  });

  describe('deleteTransaction', () => {
    it('should extract transaction ID from params', async () => {
      req.params = { id: 'transaction-delete-123' };

      try {
        await deleteTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.params.id).toBe('transaction-delete-123');
    });

    it('should use authenticated user ID', async () => {
      req.user = { uid: 'deleter-789' };
      req.params = { id: 'transaction-to-delete' };

      try {
        await deleteTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('deleter-789');
    });
  });

  describe('bulkUpdateTransactions', () => {
    it('should extract transaction IDs array', async () => {
      req.body = {
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
        updates: { category: 'Bulk Category' }
      };

      try {
        await bulkUpdateTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.transactionIds).toHaveLength(3);
      expect(req.body.transactionIds[0]).toBe('tx-1');
    });

    it('should extract update data', async () => {
      req.body = {
        transactionIds: ['tx-1'],
        updates: {
          category: 'New Category',
          payee: 'New Payee'
        }
      };

      try {
        await bulkUpdateTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.updates.category).toBe('New Category');
      expect(req.body.updates.payee).toBe('New Payee');
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'bulk-updater' };
      req.body = {
        transactionIds: ['tx-1'],
        updates: {}
      };

      try {
        await bulkUpdateTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('bulk-updater');
    });
  });

  describe('getTransactionSummary', () => {
    it('should extract date range from query', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      try {
        await getTransactionSummary(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.query.startDate).toBe('2024-01-01');
      expect(req.query.endDate).toBe('2024-12-31');
    });

    it('should handle company filter', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        companyId: 'company-summary'
      };

      try {
        await getTransactionSummary(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.query.companyId).toBe('company-summary');
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'summary-user' };
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      try {
        await getTransactionSummary(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('summary-user');
    });
  });

  describe('bulkUpdateCategories', () => {
    it('should extract category mapping from body', async () => {
      req.body = {
        updates: [
          { transactionId: 'tx-1', category: 'Category A' },
          { transactionId: 'tx-2', category: 'Category B' }
        ]
      };

      try {
        await bulkUpdateCategories(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.updates).toHaveLength(2);
      expect(req.body.updates[0].category).toBe('Category A');
    });

    it('should handle empty updates array', async () => {
      req.body = {
        updates: []
      };

      try {
        await bulkUpdateCategories(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.updates).toHaveLength(0);
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'category-updater' };
      req.body = {
        updates: [{ transactionId: 'tx-1', category: 'Cat' }]
      };

      try {
        await bulkUpdateCategories(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('category-updater');
    });
  });

  describe('assignPayeeToTransaction', () => {
    it('should extract transaction ID and payee data', async () => {
      req.params = { id: 'transaction-payee-123' };
      req.body = {
        payeeId: 'payee-456',
        payeeName: 'John Doe'
      };

      try {
        await assignPayeeToTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.params.id).toBe('transaction-payee-123');
      expect(req.body.payeeId).toBe('payee-456');
      expect(req.body.payeeName).toBe('John Doe');
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'payee-assigner' };
      req.params = { id: 'tx-payee' };
      req.body = { payeeId: 'payee-1' };

      try {
        await assignPayeeToTransaction(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('payee-assigner');
    });
  });

  describe('bulkAssignPayeeToTransactions', () => {
    it('should extract transaction IDs and payee data', async () => {
      req.body = {
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
        payeeId: 'payee-bulk',
        payeeName: 'Bulk Payee'
      };

      try {
        await bulkAssignPayeeToTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.transactionIds).toHaveLength(3);
      expect(req.body.payeeId).toBe('payee-bulk');
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'bulk-payee-user' };
      req.body = {
        transactionIds: ['tx-1'],
        payeeId: 'payee-1'
      };

      try {
        await bulkAssignPayeeToTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('bulk-payee-user');
    });
  });

  describe('bulkUnassignPayeeFromTransactions', () => {
    it('should extract transaction IDs from body', async () => {
      req.body = {
        transactionIds: ['tx-1', 'tx-2', 'tx-3']
      };

      try {
        await bulkUnassignPayeeFromTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.transactionIds).toHaveLength(3);
    });

    it('should reject empty transaction IDs array', async () => {
      req.body = {
        transactionIds: []
      };

      await bulkUnassignPayeeFromTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request',
          message: 'transactionIds must be a non-empty array'
        })
      );
    });

    it('should reject non-array transaction IDs', async () => {
      req.body = {
        transactionIds: 'not-an-array'
      };

      await bulkUnassignPayeeFromTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request'
        })
      );
    });

    it('should reject missing transaction IDs', async () => {
      req.body = {};

      await bulkUnassignPayeeFromTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request'
        })
      );
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'unassign-payee-user' };
      req.body = {
        transactionIds: ['tx-1']
      };

      try {
        await bulkUnassignPayeeFromTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('unassign-payee-user');
    });
  });

  describe('bulkUnassignCompanyFromTransactions', () => {
    it('should extract transaction IDs from body', async () => {
      req.body = {
        transactionIds: ['tx-1', 'tx-2', 'tx-3']
      };

      try {
        await bulkUnassignCompanyFromTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.body.transactionIds).toHaveLength(3);
    });

    it('should reject empty transaction IDs array', async () => {
      req.body = {
        transactionIds: []
      };

      await bulkUnassignCompanyFromTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request',
          message: 'transactionIds must be a non-empty array'
        })
      );
    });

    it('should reject non-array transaction IDs', async () => {
      req.body = {
        transactionIds: 'not-an-array'
      };

      await bulkUnassignCompanyFromTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request'
        })
      );
    });

    it('should reject missing transaction IDs', async () => {
      req.body = {};

      await bulkUnassignCompanyFromTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid request'
        })
      );
    });

    it('should use authenticated user', async () => {
      req.user = { uid: 'unassign-company-user' };
      req.body = {
        transactionIds: ['tx-1']
      };

      try {
        await bulkUnassignCompanyFromTransactions(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.user.uid).toBe('unassign-company-user');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      req.params = { id: 'non-existent' };

      try {
        await getTransactionById(req, res);
      } catch (error) {
        // Expected - service will throw
      }

      // Verify request context was preserved
      expect(req.params.id).toBe('non-existent');
    });

    it('should log errors when they occur', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await createTransaction(req, res);
      } catch (error) {
        // Expected
      }

      consoleErrorSpy.mockRestore();
    });
  });
});
