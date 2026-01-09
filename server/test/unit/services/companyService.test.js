/**
 * @fileoverview Tests for CompanyService
 * @description Comprehensive test suite for company management operations
 * 
 * Strategy: Use jest.unstable_mockModule BEFORE imports (proper ES module mocking)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// We need to mock firebase-admin/firestore BEFORE importing the service
// Using unstable_mockModule with a factory that returns our mock
const mockGetFirestore = jest.fn();
await jest.unstable_mockModule('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore
}));

// NOW import the service - the mock will be in place
const { CompanyService } = await import('../../../services/companyService.js');
import cache from '../../../utils/serverCache.js';

describe('CompanyService', () => {
  let companyService;
  let mockDb;
  let mockCollection;
  let mockDocRef;
  let mockSnapshot;
  let mockBatch;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Clear cache to prevent test interference
    cache.clearAll();

    // Create mock batch
    mockBatch = {
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };

    // Create mock document reference
    mockDocRef = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined)
    };

    // Create mock snapshot
    mockSnapshot = {
      empty: false,
      size: 0,
      docs: [],
      forEach: function(callback) {
        this.docs.forEach(callback);
      },
      data: jest.fn().mockReturnValue({ count: 0 })
    };

    // Create mock collection
    mockCollection = {
      add: jest.fn().mockResolvedValue({ id: 'company123' }),
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot),
      count: jest.fn().mockReturnThis()
    };

    // Create mock db
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue(mockBatch)
    };

    // Configure the mock to return our mockDb
    mockGetFirestore.mockReturnValue(mockDb);

    // Create fresh service instance (will use our mocked getFirestore)
    companyService = new CompanyService();
  });

  describe('createCompany', () => {
    it('should create a new company with required fields', async () => {
      const userId = 'user123';
      const companyData = {
        name: 'Test Company LLC',
        type: 'business'
      };

      // Mock empty existing companies (first company will be default)
      mockSnapshot.empty = true;
      mockSnapshot.docs = [];

      const companyId = await companyService.createCompany(userId, companyData);

      expect(companyId).toBe('company123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Company LLC',
          type: 'business',
          userId: 'user123',
          isDefault: true,
          createdBy: userId,
          lastModifiedBy: userId
        })
      );
    });

    it('should auto-set first company as default', async () => {
      const userId = 'user123';
      const companyData = { name: 'First Company' };

      mockSnapshot.empty = true;
      mockSnapshot.docs = [];

      await companyService.createCompany(userId, companyData);

      const callArgs = mockCollection.add.mock.calls[0][0];
      expect(callArgs.isDefault).toBe(true);
    });

    it('should not set non-first company as default', async () => {
      const userId = 'user123';
      const companyData = { name: 'Second Company' };

      // Mock existing company
      mockSnapshot.empty = false;
      mockSnapshot.docs = [{
        id: 'existing-company',
        data: () => ({ name: 'Existing Company', userId, isActive: true, isDefault: true })
      }];

      await companyService.createCompany(userId, companyData);

      const callArgs = mockCollection.add.mock.calls[0][0];
      // Service sets isDefault to false for non-first companies (not undefined)
      expect(callArgs.isDefault).toBe(false);
    });

    it('should throw error if userId is missing', async () => {
      await expect(
        companyService.createCompany(null, { name: 'Test' })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error if company name is missing', async () => {
      await expect(
        companyService.createCompany('user123', {})
      ).rejects.toThrow('Company name is required');
    });

    it('should include timestamps', async () => {
      const userId = 'user123';
      const companyData = { name: 'Test Company' };

      mockSnapshot.empty = true;

      await companyService.createCompany(userId, companyData);

      const callArgs = mockCollection.add.mock.calls[0][0];
      expect(callArgs.createdAt).toBeInstanceOf(Date);
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getUserCompanies', () => {
    it('should return all active companies for user', async () => {
      const userId = 'user123';
      const companies = [
        { id: 'c1', name: 'Alpha Company', isDefault: false, isActive: true, userId },
        { id: 'c2', name: 'Beta Company', isDefault: true, isActive: true, userId }
      ];

      mockSnapshot.docs = companies.map(c => ({
        id: c.id,
        data: () => ({ ...c })
      }));

      const result = await companyService.getUserCompanies(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c1');
      expect(result[1].id).toBe('c2');
    });

    it('should use primary query with orderBy when index exists', async () => {
      const userId = 'user123';
      
      mockSnapshot.docs = [{
        id: 'c1',
        data: () => ({ name: 'Test', userId, isActive: true, isDefault: false })
      }];

      await companyService.getUserCompanies(userId);

      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', userId);
      expect(mockCollection.where).toHaveBeenCalledWith('isActive', '==', true);
      expect(mockCollection.orderBy).toHaveBeenCalledWith('isDefault', 'desc');
      expect(mockCollection.orderBy).toHaveBeenCalledWith('name', 'asc');
    });

    it('should fall back to in-memory sorting if index missing', async () => {
      const userId = 'user123';

      // First query fails with index error
      let callCount = 0;
      mockCollection.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({ code: 9 });
        }
        
        const companies = [
          { id: 'c1', name: 'Zebra', isDefault: false, isActive: true, userId },
          { id: 'c2', name: 'Alpha', isDefault: true, isActive: true, userId }
        ];

        mockSnapshot.docs = companies.map(c => ({
          id: c.id,
          data: () => ({ ...c })
        }));
        
        return Promise.resolve(mockSnapshot);
      });

      const result = await companyService.getUserCompanies(userId);

      // Should be sorted: default first, then alphabetically
      expect(result[0].name).toBe('Alpha');
      expect(result[0].isDefault).toBe(true);
      expect(result[1].name).toBe('Zebra');
    });

    it('should return empty array if all queries fail', async () => {
      const userId = 'user123';

      mockCollection.get.mockRejectedValue(new Error('Database error'));

      const result = await companyService.getUserCompanies(userId);

      expect(result).toEqual([]);
    });

    it('should preserve document ID in results', async () => {
      const userId = 'user123';

      mockSnapshot.docs = [{
        id: 'correct-id',
        data: () => ({ name: 'Test', userId, isActive: true, id: 'wrong-id' })
      }];

      const result = await companyService.getUserCompanies(userId);

      expect(result[0].id).toBe('correct-id');
    });
  });

  describe('getCompanyById', () => {
    it('should return company by ID', async () => {
      const companyId = 'company123';
      const userId = 'user123';

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: companyId,
        data: () => ({ name: 'Test Company', userId })
      });

      const result = await companyService.getCompanyById(companyId, userId);

      expect(result.id).toBe(companyId);
      expect(result.name).toBe('Test Company');
      expect(mockCollection.doc).toHaveBeenCalledWith(companyId);
    });

    it('should throw error if company not found', async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await expect(
        companyService.getCompanyById('nonexistent', 'user123')
      ).rejects.toThrow('Company not found');
    });

    it('should throw error if user does not own company', async () => {
      const companyId = 'company123';

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: companyId,
        data: () => ({ name: 'Test', userId: 'other-user' })
      });

      await expect(
        companyService.getCompanyById(companyId, 'user123')
      ).rejects.toThrow('Access denied');
    });
  });

  describe('updateCompany', () => {
    beforeEach(() => {
      // Mock getCompanyById to verify ownership
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'company123',
        data: () => ({ name: 'Test', userId: 'user123' })
      });
    });

    it('should update company data', async () => {
      const companyId = 'company123';
      const userId = 'user123';
      const updateData = { name: 'Updated Name' };

      await companyService.updateCompany(companyId, userId, updateData);

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          lastModifiedBy: userId,
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should unset other defaults when setting new default', async () => {
      const companyId = 'company123';
      const userId = 'user123';

      // Mock existing default companies
      mockSnapshot.docs = [{
        ref: { update: jest.fn() },
        data: () => ({ isDefault: true })
      }];

      await companyService.updateCompany(companyId, userId, { isDefault: true });

      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should verify ownership before updating', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'company123',
        data: () => ({ userId: 'other-user' })
      });

      await expect(
        companyService.updateCompany('company123', 'user123', { name: 'New' })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteCompany', () => {
    beforeEach(() => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'company123',
        data: () => ({ name: 'Test', userId: 'user123' })
      });
    });

    it('should soft delete company if no transactions', async () => {
      const companyId = 'company123';
      const userId = 'user123';

      // Mock zero transactions
      mockSnapshot.data.mockReturnValue({ count: 0 });

      await companyService.deleteCompany(companyId, userId);

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date)
        })
      );
    });

    it('should throw error if company has transactions', async () => {
      const companyId = 'company123';
      const userId = 'user123';

      // Mock transactions exist
      mockSnapshot.data.mockReturnValue({ count: 5 });

      await expect(
        companyService.deleteCompany(companyId, userId)
      ).rejects.toThrow('Cannot delete company with existing transactions');
    });
  });

  describe('getDefaultCompany', () => {
    it('should return default company', async () => {
      const userId = 'user123';

      mockSnapshot.empty = false;
      mockSnapshot.docs = [{
        id: 'default-company',
        data: () => ({ name: 'Default', userId, isDefault: true, isActive: true })
      }];

      const result = await companyService.getDefaultCompany(userId);

      expect(result.id).toBe('default-company');
      expect(result.isDefault).toBe(true);
    });

    it('should return first active company if no default set', async () => {
      const userId = 'user123';

      // No default company (first query)
      let callCount = 0;
      mockSnapshot.empty = true;
      
      mockCollection.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ...mockSnapshot, empty: true, docs: [] });
        }
        // Second call from getUserCompanies
        return Promise.resolve({
          ...mockSnapshot,
          empty: false,
          docs: [{
            id: 'first',
            data: () => ({ name: 'First Company', isActive: true, userId })
          }]
        });
      });

      const result = await companyService.getDefaultCompany(userId);

      expect(result.id).toBe('first');
    });

    it('should return null if no companies exist', async () => {
      const userId = 'user123';

      mockSnapshot.empty = true;
      mockSnapshot.docs = [];
      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await companyService.getDefaultCompany(userId);

      expect(result).toBeNull();
    });
  });

  describe('extractCompanyFromChaseStatement', () => {
    it('should extract company name with LLC', () => {
      const pdfText = `
        Account ending in 1234
        SHAMDAT CONSTRUCTION, LLC
        7411 NW 23RD ST
        SUNRISE FL 33313-2811
      `;

      const result = companyService.extractCompanyFromChaseStatement(pdfText);

      expect(result.name).toContain('LLC');
      expect(result.extracted).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should extract company name with INC', () => {
      const pdfText = `
        ACME SERVICES, INC.
        123 MAIN STREET
        NEW YORK NY 10001
      `;

      const result = companyService.extractCompanyFromChaseStatement(pdfText);

      expect(result.name).toContain('INC');
      expect(result.extracted).toBe(true);
    });

    it('should extract street address', () => {
      const pdfText = `
        TEST COMPANY LLC
        7411 NW 23RD ST
        SUNRISE FL 33313
      `;

      const result = companyService.extractCompanyFromChaseStatement(pdfText);

      expect(result.address.street).toContain('ST');
    });

    it('should parse city, state, zip', () => {
      const pdfText = `
        TEST COMPANY LLC
        123 MAIN ST
        SUNRISE FL 33313-2811
      `;

      const result = companyService.extractCompanyFromChaseStatement(pdfText);

      expect(result.address.city).toBe('SUNRISE');
      expect(result.address.state).toBe('FL');
      expect(result.address.zipCode).toBe('33313-2811');
    });

    it('should return empty result if no company name found', () => {
      // Use text without business indicators or uppercase
      const pdfText = 'this is just random text without any business identifiers';

      const result = companyService.extractCompanyFromChaseStatement(pdfText);

      expect(result.name).toBe('');
      expect(result.extracted).toBe(true); // extracted=true even if name is empty
      expect(result.confidence).toBe(0.1); // Confidence is 0.1 when companyName is empty
    });

    it('should handle errors gracefully', () => {
      const result = companyService.extractCompanyFromChaseStatement(null);

      expect(result.extracted).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('isBusinessName', () => {
    it('should identify business names with LLC', () => {
      expect(companyService.isBusinessName('TEST COMPANY, LLC')).toBe(true);
    });

    it('should identify business names with INC', () => {
      expect(companyService.isBusinessName('ACME CORP., INC.')).toBe(true);
    });

    it('should identify business names with CORPORATION', () => {
      expect(companyService.isBusinessName('GLOBAL CORPORATION')).toBe(true);
    });

    it('should identify all caps business names', () => {
      expect(companyService.isBusinessName('SHAMDAT CONSTRUCTION')).toBe(true);
    });

    it('should reject short strings', () => {
      expect(companyService.isBusinessName('AB')).toBe(false);
    });

    it('should reject lowercase personal names', () => {
      expect(companyService.isBusinessName('John Smith')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(companyService.isBusinessName('')).toBe(false);
      expect(companyService.isBusinessName(null)).toBe(false);
    });
  });

  describe('isStreetAddress', () => {
    it('should identify street addresses', () => {
      expect(companyService.isStreetAddress('7411 NW 23RD ST')).toBe(true);
      expect(companyService.isStreetAddress('123 MAIN STREET')).toBe(true);
      expect(companyService.isStreetAddress('456 OAK AVENUE')).toBe(true);
    });

    it('should require number at start', () => {
      expect(companyService.isStreetAddress('MAIN STREET')).toBe(false);
    });

    it('should require street indicator', () => {
      expect(companyService.isStreetAddress('123 RANDOM')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(companyService.isStreetAddress('')).toBe(false);
      expect(companyService.isStreetAddress(null)).toBe(false);
    });
  });

  describe('isCityStateZip', () => {
    it('should identify city, state, zip format', () => {
      expect(companyService.isCityStateZip('SUNRISE FL 33313')).toBe(true);
      expect(companyService.isCityStateZip('NEW YORK NY 10001')).toBe(true);
    });

    it('should handle zip+4 format', () => {
      expect(companyService.isCityStateZip('SUNRISE FL 33313-2811')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(companyService.isCityStateZip('SUNRISE 33313')).toBe(false);
      expect(companyService.isCityStateZip('FL 33313')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(companyService.isCityStateZip('')).toBe(false);
      expect(companyService.isCityStateZip(null)).toBe(false);
    });
  });

  describe('findCompanyByName', () => {
    beforeEach(() => {
      const userId = 'user123';
      const companies = [
        { id: 'c1', name: 'Test Company', legalName: 'Test Company LLC', userId, isActive: true },
        { id: 'c2', name: 'Shamdat Construction LLC', legalName: 'SHAMDAT CONSTRUCTION, LLC', userId, isActive: true }
      ];

      mockSnapshot.docs = companies.map(c => ({
        id: c.id,
        data: () => ({ ...c })
      }));
    });

    it('should find exact match by name', async () => {
      const result = await companyService.findCompanyByName('user123', 'Test Company');
      expect(result.id).toBe('c1');
    });

    it('should find exact match by legal name', async () => {
      const result = await companyService.findCompanyByName('user123', 'Test Company LLC');
      expect(result.id).toBe('c1');
    });

    it('should perform fuzzy matching', async () => {
      const result = await companyService.findCompanyByName('user123', 'shamdat');
      expect(result.id).toBe('c2');
    });

    it('should return null if no match found', async () => {
      const result = await companyService.findCompanyByName('user123', 'Nonexistent');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const result = await companyService.findCompanyByName('user123', 'test company');
      expect(result.id).toBe('c1');
    });
  });

  describe('getCompanyTransactionCount', () => {
    it('should return transaction count', async () => {
      const companyId = 'company123';

      mockSnapshot.data.mockReturnValue({ count: 42 });

      const result = await companyService.getCompanyTransactionCount(companyId);

      expect(result).toBe(42);
      expect(mockCollection.where).toHaveBeenCalledWith('companyId', '==', companyId);
    });

    it('should return 0 on error', async () => {
      const companyId = 'company123';

      mockCollection.count.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const result = await companyService.getCompanyTransactionCount(companyId);

      expect(result).toBe(0);
    });
  });

  describe('findOrCreateFromPDFData', () => {
    it('should find existing company by name', async () => {
      const userId = 'user123';
      const pdfData = { name: 'Existing Company', address: '123 Main St' };

      mockSnapshot.docs = [{
        id: 'c1',
        data: () => ({ id: 'c1', name: 'Existing Company', userId, isActive: true })
      }];

      const result = await companyService.findOrCreateFromPDFData(userId, pdfData);

      expect(result.id).toBe('c1');
      expect(mockCollection.add).not.toHaveBeenCalled();
    });

    it('should create new company if not found', async () => {
      const userId = 'user123';
      const pdfData = { name: 'New Company', address: '123 Main St' };

      // No existing companies
      mockSnapshot.docs = [];

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'new-company-id',
        data: () => ({ name: 'New Company', userId })
      });

      const result = await companyService.findOrCreateFromPDFData(userId, pdfData);

      expect(mockCollection.add).toHaveBeenCalled();
      expect(result.name).toBe('New Company');
    });

    it('should return default company if no name in PDF data', async () => {
      const userId = 'user123';
      const pdfData = { name: '', address: '' };

      mockSnapshot.empty = false;
      mockSnapshot.docs = [{
        id: 'default',
        data: () => ({ id: 'default', name: 'Default Company', isDefault: true, userId, isActive: true })
      }];

      const result = await companyService.findOrCreateFromPDFData(userId, pdfData);

      expect(result.id).toBe('default');
      expect(mockCollection.add).not.toHaveBeenCalled();
    });

    it('should mark auto-created company with source metadata', async () => {
      const userId = 'user123';
      const pdfData = { name: 'PDF Company', address: '123 Main' };

      mockSnapshot.docs = [];

      mockDocRef.get.mockResolvedValue({
        exists: true,
        id: 'new-id',
        data: () => ({ name: 'PDF Company', userId })
      });

      await companyService.findOrCreateFromPDFData(userId, pdfData);

      const callArgs = mockCollection.add.mock.calls[0][0];
      expect(callArgs.source).toBe('pdf_import');
      expect(callArgs.extractedFromPDF).toBe(true);
    });
  });
});
