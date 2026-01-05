import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');

// Mock payeeService before importing controller
jest.unstable_mockModule(path.join(servicesPath, 'payeeService.js'), () => ({
  default: {
    createPayee: jest.fn(),
    getPayees: jest.fn(),
    searchPayees: jest.fn(),
    getPayeeById: jest.fn(),
    updatePayee: jest.fn(),
    deletePayee: jest.fn(),
    getTransactionsWithoutPayees: jest.fn(),
    getPayeesByType: jest.fn(),
    bulkAssignPayeeToTransactions: jest.fn()
  }
}));

// Mock logger
jest.unstable_mockModule(path.join(configPath, 'index.js'), () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}));

// Now dynamically import controller (after mocks are set up)
const {
  createPayee,
  getPayees,
  getPayeeById,
  updatePayee,
  deletePayee,
  getTransactionsWithoutPayees,
  getEmployees,
  getVendors,
  bulkAssignPayee
} = await import('../../../controllers/payeeController.js');

const payeeService = (await import('../../../services/payeeService.js')).default;

describe('Payee Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { uid: 'user-123' },
      params: {},
      body: {},
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayee', () => {
    it('should create a new payee', async () => {
      req.body = {
        name: 'John Doe',
        type: 'employee',
        email: 'john@example.com'
      };
      payeeService.createPayee.mockResolvedValue({
        id: 'payee-1',
        name: 'John Doe',
        type: 'employee'
      });

      await createPayee(req, res);

      expect(payeeService.createPayee).toHaveBeenCalledWith('user-123', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Payee created successfully'
      }));
    });

    it('should handle service errors', async () => {
      req.body = { name: 'John Doe', type: 'employee' };
      payeeService.createPayee.mockRejectedValue(new Error('Database error'));

      await createPayee(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Failed to create payee'
      }));
    });
  });

  describe('getPayees', () => {
    it('should return all payees for user', async () => {
      const payees = [
        { id: 'payee-1', name: 'Employee One', type: 'employee' },
        { id: 'payee-2', name: 'Vendor Two', type: 'vendor' }
      ];
      payeeService.getPayees.mockResolvedValue(payees);

      await getPayees(req, res);

      expect(payeeService.getPayees).toHaveBeenCalledWith('user-123', {});
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        payees,
        count: 2
      }));
    });

    it('should filter by type', async () => {
      req.query = { type: 'employee' };
      payeeService.getPayees.mockResolvedValue([
        { id: 'payee-1', name: 'Employee One', type: 'employee' }
      ]);

      await getPayees(req, res);

      expect(payeeService.getPayees).toHaveBeenCalledWith('user-123', { type: 'employee' });
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'company-1' };
      payeeService.getPayees.mockResolvedValue([]);

      await getPayees(req, res);

      expect(payeeService.getPayees).toHaveBeenCalledWith('user-123', { companyId: 'company-1' });
    });

    it('should filter by isActive', async () => {
      req.query = { isActive: 'true' };
      payeeService.getPayees.mockResolvedValue([]);

      await getPayees(req, res);

      expect(payeeService.getPayees).toHaveBeenCalledWith('user-123', { isActive: true });
    });

    it('should use search when provided', async () => {
      req.query = { search: 'john' };
      payeeService.searchPayees.mockResolvedValue([
        { id: 'payee-1', name: 'John Doe' }
      ]);

      await getPayees(req, res);

      expect(payeeService.searchPayees).toHaveBeenCalledWith('user-123', 'john', {});
    });

    it('should handle service errors', async () => {
      payeeService.getPayees.mockRejectedValue(new Error('Service error'));

      await getPayees(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPayeeById', () => {
    it('should return payee by ID', async () => {
      req.params.id = 'payee-1';
      payeeService.getPayeeById.mockResolvedValue({
        id: 'payee-1',
        name: 'John Doe',
        type: 'employee'
      });

      await getPayeeById(req, res);

      expect(payeeService.getPayeeById).toHaveBeenCalledWith('user-123', 'payee-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 404 when payee not found', async () => {
      req.params.id = 'nonexistent';
      payeeService.getPayeeById.mockRejectedValue(new Error('Payee not found'));

      await getPayeeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 on unauthorized access', async () => {
      req.params.id = 'payee-1';
      payeeService.getPayeeById.mockRejectedValue(new Error('Unauthorized access'));

      await getPayeeById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updatePayee', () => {
    it('should update a payee', async () => {
      req.params.id = 'payee-1';
      req.body = { name: 'Updated Name', email: 'updated@example.com' };
      payeeService.updatePayee.mockResolvedValue({
        id: 'payee-1',
        name: 'Updated Name'
      });

      await updatePayee(req, res);

      expect(payeeService.updatePayee).toHaveBeenCalledWith('user-123', 'payee-1', req.body);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Payee updated successfully'
      }));
    });

    it('should return 404 when payee not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { name: 'Updated' };
      payeeService.updatePayee.mockRejectedValue(new Error('Payee not found'));

      await updatePayee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deletePayee', () => {
    it('should delete a payee', async () => {
      req.params.id = 'payee-1';
      payeeService.deletePayee.mockResolvedValue({ id: 'payee-1' });

      await deletePayee(req, res);

      expect(payeeService.deletePayee).toHaveBeenCalledWith('user-123', 'payee-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Payee deleted successfully'
      }));
    });

    it('should return 404 when payee not found', async () => {
      req.params.id = 'nonexistent';
      payeeService.deletePayee.mockRejectedValue(new Error('Payee not found'));

      await deletePayee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTransactionsWithoutPayees', () => {
    it('should return transactions without payees', async () => {
      const transactions = [
        { id: 'tx-1', description: 'Check #123', amount: -500 },
        { id: 'tx-2', description: 'Check #456', amount: -750 }
      ];
      payeeService.getTransactionsWithoutPayees.mockResolvedValue(transactions);

      await getTransactionsWithoutPayees(req, res);

      expect(payeeService.getTransactionsWithoutPayees).toHaveBeenCalledWith('user-123', 'checks');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        transactions,
        count: 2
      }));
    });

    it('should use sectionCode from query', async () => {
      req.query.sectionCode = 'withdrawals';
      payeeService.getTransactionsWithoutPayees.mockResolvedValue([]);

      await getTransactionsWithoutPayees(req, res);

      expect(payeeService.getTransactionsWithoutPayees).toHaveBeenCalledWith('user-123', 'withdrawals');
    });
  });

  describe('getEmployees', () => {
    it('should return employees', async () => {
      const employees = [
        { id: 'emp-1', name: 'John Doe', type: 'employee' }
      ];
      payeeService.getPayeesByType.mockResolvedValue(employees);

      await getEmployees(req, res);

      expect(payeeService.getPayeesByType).toHaveBeenCalledWith('user-123', 'employee', undefined);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        employees,
        count: 1
      }));
    });

    it('should filter by companyId', async () => {
      req.query.companyId = 'company-1';
      payeeService.getPayeesByType.mockResolvedValue([]);

      await getEmployees(req, res);

      expect(payeeService.getPayeesByType).toHaveBeenCalledWith('user-123', 'employee', 'company-1');
    });
  });

  describe('getVendors', () => {
    it('should return vendors', async () => {
      const vendors = [
        { id: 'vendor-1', name: 'Acme Corp', type: 'vendor' }
      ];
      payeeService.getPayeesByType.mockResolvedValue(vendors);

      await getVendors(req, res);

      expect(payeeService.getPayeesByType).toHaveBeenCalledWith('user-123', 'vendor', undefined);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        vendors,
        count: 1
      }));
    });
  });

  describe('bulkAssignPayee', () => {
    it('should bulk assign payee to transactions', async () => {
      req.body = {
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
        payeeId: 'payee-1',
        payeeName: 'John Doe'
      };
      payeeService.bulkAssignPayeeToTransactions.mockResolvedValue({
        updatedCount: 3
      });

      await bulkAssignPayee(req, res);

      expect(payeeService.bulkAssignPayeeToTransactions).toHaveBeenCalledWith(
        'user-123',
        ['tx-1', 'tx-2', 'tx-3'],
        'payee-1',
        'John Doe'
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        updatedCount: 3
      }));
    });

    it('should return 400 when transactionIds is empty', async () => {
      req.body = {
        transactionIds: [],
        payeeId: 'payee-1'
      };

      await bulkAssignPayee(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'transactionIds is required and must be a non-empty array'
      });
    });

    it('should return 400 when transactionIds is not an array', async () => {
      req.body = {
        transactionIds: 'tx-1',
        payeeId: 'payee-1'
      };

      await bulkAssignPayee(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when payeeId is missing', async () => {
      req.body = {
        transactionIds: ['tx-1', 'tx-2']
      };

      await bulkAssignPayee(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'payeeId is required and must be a string'
      });
    });

    it('should handle service errors', async () => {
      req.body = {
        transactionIds: ['tx-1'],
        payeeId: 'payee-1'
      };
      payeeService.bulkAssignPayeeToTransactions.mockRejectedValue(new Error('Bulk update failed'));

      await bulkAssignPayee(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
