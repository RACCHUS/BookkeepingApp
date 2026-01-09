/**
 * @fileoverview Tests for InventoryController
 * @description Comprehensive test suite for inventory HTTP handlers
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controllersPath = path.resolve(__dirname, '../../../controllers');
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');

// Mock inventoryService BEFORE importing controller
const mockInventoryService = {
  getItems: jest.fn(),
  getItemById: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  adjustStock: jest.fn(),
  recordSale: jest.fn(),
  recordPurchase: jest.fn(),
  getInventoryValuation: jest.fn(),
  getLowStockItems: jest.fn(),
  getTransactions: jest.fn(),
  getCategories: jest.fn()
};

await jest.unstable_mockModule(path.join(servicesPath, 'inventoryService.js'), () => ({
  default: mockInventoryService
}));

// Mock express-validator
await jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

// Mock logger
await jest.unstable_mockModule(path.join(configPath, 'index.js'), () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// NOW import controller
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  recordSale,
  recordPurchase,
  getValuation,
  getLowStock,
  getTransactions,
  getCategories
} = await import(path.join(controllersPath, 'inventoryController.js'));

describe('InventoryController', () => {
  let req, res;
  let consoleSpy;

  const TEST_USER_ID = 'user-123';
  const TEST_ITEM_ID = 'item-456';
  const TEST_COMPANY_ID = 'company-789';

  const mockItem = {
    id: TEST_ITEM_ID,
    userId: TEST_USER_ID,
    sku: 'SKU-001',
    name: 'Test Product',
    quantity: 100,
    unitCost: 10.00,
    sellingPrice: 15.00,
    reorderLevel: 20
  };

  const mockTransaction = {
    id: 'txn-001',
    itemId: TEST_ITEM_ID,
    type: 'purchase',
    quantity: 50,
    unitCost: 10.00
  };

  beforeEach(() => {
    // Suppress console output during tests
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.clearAllMocks();

    req = {
      user: { uid: TEST_USER_ID },
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
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('getItems', () => {
    it('should return inventory items for authenticated user', async () => {
      mockInventoryService.getItems.mockResolvedValue([mockItem]);

      await getItems(req, res);

      expect(mockInventoryService.getItems).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({})
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [mockItem],
        count: 1
      });
    });

    it('should pass filter parameters to service', async () => {
      req.query = {
        companyId: TEST_COMPANY_ID,
        category: 'Electronics',
        search: 'laptop',
        lowStock: 'true',
        limit: '50',
        offset: '10'
      };
      mockInventoryService.getItems.mockResolvedValue([]);

      await getItems(req, res);

      expect(mockInventoryService.getItems).toHaveBeenCalledWith(
        TEST_USER_ID,
        {
          companyId: TEST_COMPANY_ID,
          category: 'Electronics',
          search: 'laptop',
          lowStock: true,
          limit: 50,
          offset: 10
        }
      );
    });

    it('should return 500 on service error', async () => {
      mockInventoryService.getItems.mockRejectedValue(new Error('Database error'));

      await getItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Failed to get inventory items'
      }));
    });
  });

  describe('getItemById', () => {
    it('should return single item by ID', async () => {
      req.params.id = TEST_ITEM_ID;
      mockInventoryService.getItemById.mockResolvedValue(mockItem);

      await getItemById(req, res);

      expect(mockInventoryService.getItemById).toHaveBeenCalledWith(TEST_USER_ID, TEST_ITEM_ID);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockItem
      });
    });

    it('should return 404 when item not found', async () => {
      req.params.id = 'nonexistent';
      mockInventoryService.getItemById.mockRejectedValue(new Error('Item not found'));

      await getItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on other errors', async () => {
      req.params.id = TEST_ITEM_ID;
      mockInventoryService.getItemById.mockRejectedValue(new Error('Database connection failed'));

      await getItemById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createItem', () => {
    it('should create new item and return 201', async () => {
      req.body = {
        sku: 'SKU-001',
        name: 'Test Product',
        unitCost: 10.00
      };
      mockInventoryService.createItem.mockResolvedValue(mockItem);

      await createItem(req, res);

      expect(mockInventoryService.createItem).toHaveBeenCalledWith(TEST_USER_ID, req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockItem,
        message: 'Inventory item created successfully'
      });
    });

    it('should return 500 on creation error', async () => {
      req.body = { sku: 'SKU-001', name: 'Test' };
      mockInventoryService.createItem.mockRejectedValue(new Error('Duplicate SKU'));

      await createItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Failed to create inventory item'
      }));
    });
  });

  describe('updateItem', () => {
    it('should update existing item', async () => {
      req.params.id = TEST_ITEM_ID;
      req.body = { name: 'Updated Product', sellingPrice: 20.00 };
      const updatedItem = { ...mockItem, name: 'Updated Product', sellingPrice: 20.00 };
      mockInventoryService.updateItem.mockResolvedValue(updatedItem);

      await updateItem(req, res);

      expect(mockInventoryService.updateItem).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_ITEM_ID,
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedItem,
        message: 'Inventory item updated successfully'
      });
    });

    it('should return 404 when item not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { name: 'Updated' };
      mockInventoryService.updateItem.mockRejectedValue(new Error('Item not found'));

      await updateItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteItem', () => {
    it('should delete item and return success', async () => {
      req.params.id = TEST_ITEM_ID;
      mockInventoryService.deleteItem.mockResolvedValue(undefined);

      await deleteItem(req, res);

      expect(mockInventoryService.deleteItem).toHaveBeenCalledWith(TEST_USER_ID, TEST_ITEM_ID);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Inventory item deleted successfully'
      });
    });

    it('should return 500 when item not found', async () => {
      req.params.id = 'nonexistent';
      mockInventoryService.deleteItem.mockRejectedValue(new Error('Item not found'));

      await deleteItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock and return transaction', async () => {
      req.params.id = TEST_ITEM_ID;
      req.body = { quantity: 10, type: 'adjustment', notes: 'Correction', unitCost: 5.00 };
      mockInventoryService.adjustStock.mockResolvedValue(mockTransaction);

      await adjustStock(req, res);

      expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_ITEM_ID,
        10,
        'adjustment',
        'Correction',
        5.00
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransaction,
        message: 'Stock adjusted successfully'
      });
    });

    it('should return 500 for invalid adjustment type', async () => {
      req.params.id = TEST_ITEM_ID;
      req.body = { quantity: 10, type: 'invalid' };
      mockInventoryService.adjustStock.mockRejectedValue(new Error('Invalid transaction type'));

      await adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('recordSale', () => {
    it('should record sale transaction', async () => {
      req.params.id = TEST_ITEM_ID;
      req.body = { quantity: 5, transactionId: 'txn-123' };
      const saleTransaction = { ...mockTransaction, type: 'sale', quantity: -5 };
      mockInventoryService.recordSale.mockResolvedValue(saleTransaction);

      await recordSale(req, res);

      expect(mockInventoryService.recordSale).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_ITEM_ID,
        5,
        'txn-123'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: saleTransaction,
        message: 'Sale recorded successfully'
      });
    });
  });

  describe('recordPurchase', () => {
    it('should record purchase transaction', async () => {
      req.params.id = TEST_ITEM_ID;
      req.body = { quantity: 25, unitCost: 10.00, transactionId: 'txn-456' };
      const purchaseTransaction = { ...mockTransaction, type: 'purchase', quantity: 25 };
      mockInventoryService.recordPurchase.mockResolvedValue(purchaseTransaction);

      await recordPurchase(req, res);

      expect(mockInventoryService.recordPurchase).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_ITEM_ID,
        25,
        10.00,
        'txn-456'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: purchaseTransaction,
        message: 'Purchase recorded successfully'
      });
    });
  });

  describe('getValuation', () => {
    it('should return inventory valuation', async () => {
      const valuation = {
        totalValue: 1500.00,
        totalItems: 150,
        items: [mockItem]
      };
      mockInventoryService.getInventoryValuation.mockResolvedValue(valuation);

      await getValuation(req, res);

      expect(mockInventoryService.getInventoryValuation).toHaveBeenCalledWith(
        TEST_USER_ID,
        undefined
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: valuation
      });
    });

    it('should filter valuation by company', async () => {
      req.query.companyId = TEST_COMPANY_ID;
      mockInventoryService.getInventoryValuation.mockResolvedValue({ totalValue: 0 });

      await getValuation(req, res);

      expect(mockInventoryService.getInventoryValuation).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_COMPANY_ID
      );
    });
  });

  describe('getLowStock', () => {
    it('should return low stock items', async () => {
      const lowStockItems = [{ ...mockItem, quantity: 15 }];
      mockInventoryService.getLowStockItems.mockResolvedValue(lowStockItems);

      await getLowStock(req, res);

      expect(mockInventoryService.getLowStockItems).toHaveBeenCalledWith(
        TEST_USER_ID,
        undefined
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: lowStockItems,
        count: 1
      });
    });

    it('should filter by company', async () => {
      req.query.companyId = TEST_COMPANY_ID;
      mockInventoryService.getLowStockItems.mockResolvedValue([]);

      await getLowStock(req, res);

      expect(mockInventoryService.getLowStockItems).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_COMPANY_ID
      );
    });
  });

  describe('getTransactions', () => {
    it('should return inventory transactions', async () => {
      mockInventoryService.getTransactions.mockResolvedValue([mockTransaction]);

      await getTransactions(req, res);

      expect(mockInventoryService.getTransactions).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [mockTransaction],
        count: 1
      });
    });

    it('should pass filter parameters', async () => {
      req.query = {
        itemId: TEST_ITEM_ID,
        type: 'purchase',
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      };
      mockInventoryService.getTransactions.mockResolvedValue([]);

      await getTransactions(req, res);

      expect(mockInventoryService.getTransactions).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          itemId: TEST_ITEM_ID,
          type: 'purchase',
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        })
      );
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const categories = ['Electronics', 'Office Supplies', 'Furniture'];
      mockInventoryService.getCategories.mockResolvedValue(categories);

      await getCategories(req, res);

      expect(mockInventoryService.getCategories).toHaveBeenCalledWith(TEST_USER_ID);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: categories
      });
    });
  });
});
