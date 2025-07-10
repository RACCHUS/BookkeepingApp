/**
 * @fileoverview Company Service Unit Tests
 * @description Comprehensive unit tests for company service functionality
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { createMockFirebaseService, assertResponseSuccess, assertResponseError } from '../../fixtures/helpers/testHelpers.js';
import { mockCompany, mockUser, createMockData } from '../../fixtures/mocks/mockData.js';

// Mock the Firebase service
const mockFirebaseService = createMockFirebaseService({
  companies: [mockCompany]
});

jest.unstable_mockModule('../../../services/cleanFirebaseService.js', () => ({
  default: mockFirebaseService
}));

// Import the service after mocking
const { default: CompanyService } = await import('../../../services/companyService.js');

describe('CompanyService', () => {
  let companyService;

  beforeEach(() => {
    jest.clearAllMocks();
    companyService = new CompanyService();
  });

  describe('createCompany', () => {
    it('should create a company successfully with valid data', async () => {
      const companyData = {
        name: 'New Test Company',
        taxId: '98-7654321',
        address: {
          street: '456 New St',
          city: 'New City',
          state: 'NC',
          zipCode: '54321'
        }
      };

      // Mock getUserCompanies to return empty array (first company)
      companyService.getUserCompanies = jest.fn().mockResolvedValue([]);

      const result = await companyService.createCompany(mockUser.id, companyData);

      expect(result).toBe('new-company-id');
      expect(companyService.db.collection).toHaveBeenCalledWith('companies');
    });

    it('should throw error when userId is missing', async () => {
      const companyData = { name: 'Test Company' };

      await expect(
        companyService.createCompany(null, companyData)
      ).rejects.toThrow('Missing required fields: userId and companyData');
    });

    it('should throw error when company name is missing', async () => {
      const companyData = { taxId: '12-3456789' };

      await expect(
        companyService.createCompany(mockUser.id, companyData)
      ).rejects.toThrow('Company name is required');
    });

    it('should set isDefault to true for first company', async () => {
      const companyData = { name: 'First Company' };
      
      // Mock getUserCompanies to return empty array
      companyService.getUserCompanies = jest.fn().mockResolvedValue([]);
      companyService.db.collection().add = jest.fn().mockResolvedValue({ id: 'new-id' });

      await companyService.createCompany(mockUser.id, companyData);

      const addCall = companyService.db.collection().add.mock.calls[0][0];
      expect(addCall.isDefault).toBe(true);
    });

    it('should not set isDefault for subsequent companies', async () => {
      const companyData = { name: 'Second Company' };
      
      // Mock getUserCompanies to return existing company
      companyService.getUserCompanies = jest.fn().mockResolvedValue([mockCompany]);
      companyService.db.collection().add = jest.fn().mockResolvedValue({ id: 'new-id' });

      await companyService.createCompany(mockUser.id, companyData);

      const addCall = companyService.db.collection().add.mock.calls[0][0];
      expect(addCall.isDefault).toBeUndefined();
    });
  });

  describe('getUserCompanies', () => {
    it('should return companies for a user', async () => {
      const result = await companyService.getUserCompanies(mockUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(companyService.db.collection).toHaveBeenCalledWith('companies');
    });

    it('should throw error when userId is missing', async () => {
      await expect(
        companyService.getUserCompanies(null)
      ).rejects.toThrow('User ID is required');
    });
  });

  describe('updateCompany', () => {
    it('should update company successfully', async () => {
      const updateData = { name: 'Updated Company Name' };
      
      const result = await companyService.updateCompany(
        mockUser.id, 
        mockCompany.id, 
        updateData
      );

      expect(result).toBe(true);
    });

    it('should throw error when required parameters are missing', async () => {
      await expect(
        companyService.updateCompany(null, mockCompany.id, {})
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      const result = await companyService.deleteCompany(mockUser.id, mockCompany.id);

      expect(result).toBe(true);
    });

    it('should throw error when trying to delete non-existent company', async () => {
      // Mock company not found
      companyService.db.collection().doc().get = jest.fn().mockResolvedValue({
        exists: false
      });

      await expect(
        companyService.deleteCompany(mockUser.id, 'non-existent-id')
      ).rejects.toThrow('Company not found');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      companyService.db.collection().add = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        companyService.createCompany(mockUser.id, { name: 'Test' })
      ).rejects.toThrow('Database connection failed');
    });
  });
});
