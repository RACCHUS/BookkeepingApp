/**
 * @fileoverview Tests for Catalogue Service
 * @description Comprehensive test suite for catalogue item management operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services/invoicing');
const adaptersPath = path.resolve(__dirname, '../../../services/adapters');
const configPath = path.resolve(__dirname, '../../../config');

// Mock database adapter using higher-level methods
const mockQuery = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockDbAdapter = {
  query: mockQuery,
  getById: mockGetById,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete
};

await jest.unstable_mockModule(path.join(adaptersPath, 'index.js'), () => ({
  getDatabaseAdapter: jest.fn(() => mockDbAdapter)
}));

// Mock logger
await jest.unstable_mockModule(path.join(configPath, 'logger.js'), () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import the service after mocking
const catalogueService = await import(path.join(servicesPath, 'catalogueService.js'));

describe('CatalogueService', () => {
  const TEST_USER_ID = 'test-user-123';
  const TEST_COMPANY_ID = 'company-456';
  const TEST_ITEM_ID = 'item-001';

  const mockCatalogueItem = {
    id: TEST_ITEM_ID,
    user_id: TEST_USER_ID,
    company_id: TEST_COMPANY_ID,
    name: 'Web Development Hour',
    description: 'One hour of web development services',
    sku: 'WEB-DEV-HR',
    category: 'Services',
    unit_price: 150.00,
    unit: 'hour',
    tax_rate: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-08T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCatalogueItems', () => {
    it('should return all items for a user', async () => {
      mockQuery.mockResolvedValue([mockCatalogueItem]);

      const result = await catalogueService.getCatalogueItems(TEST_USER_ID);

      expect(mockQuery).toHaveBeenCalledWith('catalogue_items', expect.objectContaining({
        user_id: TEST_USER_ID,
        is_active: true
      }));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_ITEM_ID);
    });

    it('should filter by company ID', async () => {
      mockQuery.mockResolvedValue([mockCatalogueItem]);

      await catalogueService.getCatalogueItems(TEST_USER_ID, { companyId: TEST_COMPANY_ID });

      expect(mockQuery).toHaveBeenCalledWith('catalogue_items', expect.objectContaining({
        user_id: TEST_USER_ID,
        company_id: TEST_COMPANY_ID
      }));
    });

    it('should filter by category', async () => {
      mockQuery.mockResolvedValue([mockCatalogueItem]);

      await catalogueService.getCatalogueItems(TEST_USER_ID, { category: 'Services' });

      expect(mockQuery).toHaveBeenCalledWith('catalogue_items', expect.objectContaining({
        category: 'Services'
      }));
    });

    it('should filter active only by default', async () => {
      mockQuery.mockResolvedValue([mockCatalogueItem]);

      await catalogueService.getCatalogueItems(TEST_USER_ID);

      expect(mockQuery).toHaveBeenCalledWith('catalogue_items', expect.objectContaining({
        is_active: true
      }));
    });

    it('should search by name in results', async () => {
      const webItem = { ...mockCatalogueItem, id: 'item-1', name: 'Web Development Hour' };
      const otherItem = { ...mockCatalogueItem, id: 'item-2', name: 'Other Service', description: 'unrelated', sku: 'OTHER' };
      mockQuery.mockResolvedValue([webItem, otherItem]);

      const result = await catalogueService.getCatalogueItems(TEST_USER_ID, { search: 'web' });

      // Should only return items matching search (name, description, or sku)
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Web');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      await expect(catalogueService.getCatalogueItems(TEST_USER_ID))
        .rejects.toThrow('DB error');
    });

    it('should return empty array when no items found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await catalogueService.getCatalogueItems(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getCatalogueItem', () => {
    it('should return an item by ID', async () => {
      mockGetById.mockResolvedValue(mockCatalogueItem);

      const result = await catalogueService.getCatalogueItem(TEST_USER_ID, TEST_ITEM_ID);

      expect(mockGetById).toHaveBeenCalledWith('catalogue_items', TEST_ITEM_ID);
      expect(result).toEqual(mockCatalogueItem);
    });

    it('should return null for non-existent item', async () => {
      mockGetById.mockResolvedValue(null);

      const result = await catalogueService.getCatalogueItem(TEST_USER_ID, 'non-existent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockGetById.mockRejectedValue(new Error('DB error'));

      await expect(catalogueService.getCatalogueItem(TEST_USER_ID, TEST_ITEM_ID))
        .rejects.toThrow('DB error');
    });
  });

  describe('createCatalogueItem', () => {
    it('should create a new catalogue item', async () => {
      const createData = {
        name: 'New Service',
        unit_price: 200.00,
        company_id: TEST_COMPANY_ID
      };

      mockCreate.mockResolvedValue({ ...mockCatalogueItem, ...createData });

      const result = await catalogueService.createCatalogueItem(TEST_USER_ID, createData);

      expect(mockCreate).toHaveBeenCalledWith('catalogue_items', expect.objectContaining({
        user_id: TEST_USER_ID,
        name: 'New Service',
        unit_price: 200.00
      }));
      expect(result.name).toBe('New Service');
    });

    it('should require name field', async () => {
      await expect(catalogueService.createCatalogueItem(TEST_USER_ID, { unit_price: 100 }))
        .rejects.toThrow();
    });

    it('should default unit_price to 0 when not provided', async () => {
      mockCreate.mockResolvedValue({ ...mockCatalogueItem, unit_price: 0 });

      const result = await catalogueService.createCatalogueItem(TEST_USER_ID, { name: 'Test' });
      
      expect(result.unit_price).toBe(0);
    });

    it('should throw error on database failure', async () => {
      mockCreate.mockRejectedValue(new Error('Insert failed'));

      await expect(catalogueService.createCatalogueItem(TEST_USER_ID, {
        name: 'Test',
        unit_price: 100
      })).rejects.toThrow('Insert failed');
    });
  });

  describe('updateCatalogueItem', () => {
    it('should update an existing item', async () => {
      const updates = { unit_price: 175.00 };
      mockGetById.mockResolvedValue(mockCatalogueItem);
      mockUpdate.mockResolvedValue({ ...mockCatalogueItem, ...updates });

      const result = await catalogueService.updateCatalogueItem(TEST_USER_ID, TEST_ITEM_ID, updates);

      expect(result.unit_price).toBe(175.00);
    });

    it('should throw error on database failure', async () => {
      mockGetById.mockResolvedValue(mockCatalogueItem);
      mockUpdate.mockRejectedValue(new Error('Update failed'));

      await expect(catalogueService.updateCatalogueItem(TEST_USER_ID, TEST_ITEM_ID, { name: 'New Name' }))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deleteCatalogueItem', () => {
    it('should delete an item (soft delete)', async () => {
      mockGetById.mockResolvedValue(mockCatalogueItem);
      mockUpdate.mockResolvedValue({ ...mockCatalogueItem, is_active: false });

      const result = await catalogueService.deleteCatalogueItem(TEST_USER_ID, TEST_ITEM_ID);

      expect(result.is_active).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockGetById.mockResolvedValue(mockCatalogueItem);
      mockUpdate.mockRejectedValue(new Error('Delete failed'));

      await expect(catalogueService.deleteCatalogueItem(TEST_USER_ID, TEST_ITEM_ID))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('getCategories', () => {
    it('should return unique categories for a user', async () => {
      const items = [
        { ...mockCatalogueItem, category: 'Services' },
        { ...mockCatalogueItem, id: 'item-2', category: 'Products' },
        { ...mockCatalogueItem, id: 'item-3', category: 'Services' } // Duplicate
      ];
      mockQuery.mockResolvedValue(items);

      const result = await catalogueService.getCategories(TEST_USER_ID);

      expect(result).toContain('Services');
      expect(result).toContain('Products');
      expect(result.length).toBe(2); // Unique only
    });

    it('should return empty array when no categories', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await catalogueService.getCategories(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  // Note: deactivateCatalogueItem and reactivateCatalogueItem are not implemented
  // Use updateCatalogueItem with { is_active: false/true } instead
});
