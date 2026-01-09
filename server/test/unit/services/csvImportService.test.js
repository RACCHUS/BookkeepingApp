/**
 * @fileoverview Tests for CSV Import Service
 * @description Comprehensive test suite for CSV import management operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');

// Mock Supabase before importing the service
const mockSupabaseQuery = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  single: jest.fn(),
};

// Make all mock methods chainable
Object.keys(mockSupabaseQuery).forEach(key => {
  mockSupabaseQuery[key].mockReturnValue(mockSupabaseQuery);
});

const mockGetSupabaseAdmin = jest.fn(() => mockSupabaseQuery);

await jest.unstable_mockModule(path.join(configPath, 'supabase.js'), () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin,
}));

await jest.unstable_mockModule(path.join(configPath, 'index.js'), () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import service after mocking
const csvImportService = await import(path.join(servicesPath, 'csvImportService.js'));

describe('CSV Import Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chainable mocks
    Object.keys(mockSupabaseQuery).forEach(key => {
      mockSupabaseQuery[key].mockClear();
      mockSupabaseQuery[key].mockReturnValue(mockSupabaseQuery);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCSVImport', () => {
    const userId = 'user-123';
    const validImportData = {
      fileName: 'transactions.csv',
      originalName: 'transactions.csv',
      fileSize: 1024,
      bankName: 'Chase',
      bankFormat: 'chase',
      companyId: 'company-1',
      companyName: 'Test Company',
      transactionCount: 10,
      duplicateCount: 2,
      errorCount: 0,
    };

    it('should create a CSV import record successfully', async () => {
      const mockCreated = {
        id: 'import-1',
        user_id: userId,
        file_name: validImportData.fileName,
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      mockSupabaseQuery.single.mockResolvedValue({ data: mockCreated, error: null });

      const result = await csvImportService.createCSVImport(userId, validImportData);

      expect(result).toEqual(mockCreated);
      expect(mockSupabaseQuery.from).toHaveBeenCalledWith('csv_imports');
      expect(mockSupabaseQuery.insert).toHaveBeenCalled();
    });

    it('should throw error when database insert fails', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(csvImportService.createCSVImport(userId, validImportData))
        .rejects.toEqual({ message: 'Database error' });
    });

    it('should throw error when userId is missing', async () => {
      await expect(csvImportService.createCSVImport('', validImportData))
        .rejects.toThrow('userId is required');
    });

    it('should throw error when importData is missing', async () => {
      await expect(csvImportService.createCSVImport(userId, null))
        .rejects.toThrow('importData is required');
    });

    it('should throw error when fileName is missing', async () => {
      await expect(csvImportService.createCSVImport(userId, {}))
        .rejects.toThrow('fileName is required');
    });

    it('should handle missing optional fields', async () => {
      const minimalData = { fileName: 'test.csv' };
      const mockCreated = {
        id: 'import-2',
        user_id: userId,
        file_name: 'test.csv',
        status: 'completed',
      };

      mockSupabaseQuery.single.mockResolvedValue({ data: mockCreated, error: null });

      const result = await csvImportService.createCSVImport(userId, minimalData);

      expect(result.file_name).toBe('test.csv');
    });
  });

  describe('getCSVImports', () => {
    const userId = 'user-123';

    it('should get all CSV imports for user', async () => {
      const mockImports = [
        { id: 'import-1', file_name: 'file1.csv' },
        { id: 'import-2', file_name: 'file2.csv' },
      ];

      mockSupabaseQuery.range.mockResolvedValue({ data: mockImports, error: null });
      // Mock count for linked transactions
      mockSupabaseQuery.select.mockImplementation((query) => {
        if (query && query.includes && query.includes('count')) {
          return { ...mockSupabaseQuery, count: 5 };
        }
        return mockSupabaseQuery;
      });

      await csvImportService.getCSVImports(userId);

      expect(mockSupabaseQuery.from).toHaveBeenCalledWith('csv_imports');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should throw error when userId is missing', async () => {
      await expect(csvImportService.getCSVImports(''))
        .rejects.toThrow('userId is required');
    });

    it('should filter by company ID', async () => {
      const companyId = 'company-1';
      mockSupabaseQuery.range.mockResolvedValue({ data: [], error: null });

      await csvImportService.getCSVImports(userId, { companyId });

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('company_id', companyId);
    });

    it('should filter by status', async () => {
      mockSupabaseQuery.range.mockResolvedValue({ data: [], error: null });

      await csvImportService.getCSVImports(userId, { status: 'deleted' });

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('status', 'deleted');
    });

    it('should apply pagination with safe limits', async () => {
      mockSupabaseQuery.range.mockResolvedValue({ data: [], error: null });

      await csvImportService.getCSVImports(userId, { limit: 10, offset: 20 });

      expect(mockSupabaseQuery.range).toHaveBeenCalledWith(20, 29);
    });

    it('should enforce max limit of 100', async () => {
      mockSupabaseQuery.range.mockResolvedValue({ data: [], error: null });

      await csvImportService.getCSVImports(userId, { limit: 500, offset: 0 });

      // Should cap at 100
      expect(mockSupabaseQuery.range).toHaveBeenCalledWith(0, 99);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseQuery.range.mockResolvedValue({ 
        data: null, 
        error: { message: 'Query failed' } 
      });

      await expect(csvImportService.getCSVImports(userId))
        .rejects.toEqual({ message: 'Query failed' });
    });
  });

  describe('getCSVImportById', () => {
    const userId = 'user-123';
    const importId = '12345678-1234-1234-1234-123456789012';

    it('should get CSV import by ID', async () => {
      const mockImport = { id: importId, file_name: 'test.csv' };
      mockSupabaseQuery.single.mockResolvedValue({ data: mockImport, error: null });
      mockSupabaseQuery.select.mockReturnValue({ ...mockSupabaseQuery, count: 5 });

      const result = await csvImportService.getCSVImportById(userId, importId);

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', importId);
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should throw error when importId is invalid UUID', async () => {
      await expect(csvImportService.getCSVImportById(userId, 'invalid-id'))
        .rejects.toThrow('importId must be a valid UUID');
    });

    it('should return null when import not found', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });

      const result = await csvImportService.getCSVImportById(userId, importId);

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'OTHER', message: 'Database error' } 
      });

      await expect(csvImportService.getCSVImportById(userId, importId))
        .rejects.toEqual({ code: 'OTHER', message: 'Database error' });
    });
  });

  describe('getTransactionsByCSVImport', () => {
    const userId = 'user-123';
    const importId = '12345678-1234-1234-1234-123456789012';

    it('should get transactions by CSV import ID', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', amount: 200 },
      ];
      mockSupabaseQuery.range.mockResolvedValue({ data: mockTransactions, error: null });

      const result = await csvImportService.getTransactionsByCSVImport(userId, importId);

      expect(mockSupabaseQuery.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('csv_import_id', importId);
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should return empty array when no transactions found', async () => {
      mockSupabaseQuery.range.mockResolvedValue({ data: null, error: null });

      const result = await csvImportService.getTransactionsByCSVImport(userId, importId);

      expect(result).toEqual([]);
    });

    it('should throw error for invalid importId', async () => {
      await expect(csvImportService.getTransactionsByCSVImport(userId, 'bad-id'))
        .rejects.toThrow('importId must be a valid UUID');
    });
  });

  describe('updateCSVImport', () => {
    const userId = 'user-123';
    const importId = '12345678-1234-1234-1234-123456789012';

    it('should update allowed fields', async () => {
      const updates = {
        company_id: 'new-company',
        company_name: 'New Company',
        transaction_count: 20,
      };
      const mockUpdated = { id: importId, ...updates };
      mockSupabaseQuery.single.mockResolvedValue({ data: mockUpdated, error: null });

      const result = await csvImportService.updateCSVImport(userId, importId, updates);

      expect(result).toEqual(mockUpdated);
      expect(mockSupabaseQuery.update).toHaveBeenCalled();
    });

    it('should throw error for invalid importId', async () => {
      await expect(csvImportService.updateCSVImport(userId, 'bad-id', {}))
        .rejects.toThrow('importId must be a valid UUID');
    });

    it('should throw error when updates is not an object', async () => {
      await expect(csvImportService.updateCSVImport(userId, importId, null))
        .rejects.toThrow('updates must be an object');
    });

    it('should throw error when import not found', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });

      await expect(csvImportService.updateCSVImport(userId, importId, { company_name: 'Test' }))
        .rejects.toThrow('CSV import not found or access denied');
    });
  });

  describe('deleteCSVImport', () => {
    const userId = 'user-123';
    const importId = '12345678-1234-1234-1234-123456789012';

    it('should throw error for invalid importId', async () => {
      await expect(csvImportService.deleteCSVImport(userId, 'bad-id'))
        .rejects.toThrow('importId must be a valid UUID');
    });

    it('should throw error when import not found', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      await expect(csvImportService.deleteCSVImport(userId, importId))
        .rejects.toThrow('CSV import not found or access denied');
    });
  });

  describe('deleteTransactionsByCSVImport', () => {
    const userId = 'user-123';
    const importId = '12345678-1234-1234-1234-123456789012';

    it('should throw error for invalid importId', async () => {
      await expect(csvImportService.deleteTransactionsByCSVImport(userId, 'bad-id'))
        .rejects.toThrow('importId must be a valid UUID');
    });

    it('should throw error when import not found', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      await expect(csvImportService.deleteTransactionsByCSVImport(userId, importId))
        .rejects.toThrow('CSV import not found or access denied');
    });
  });
});
