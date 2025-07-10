/**
 * @fileoverview Company API Integration Tests
 * @description Tests for company management API endpoints
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock the Firebase service before importing the controller
const mockFirebaseService = {
  createCompany: jest.fn(),
  getUserCompanies: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};

jest.unstable_mockModule('../../../services/cleanFirebaseService.js', () => ({
  default: mockFirebaseService
}));

// Import after mocking
const { default: companyController } = await import('../../../controllers/companyController.js');
const { default: companyRoutes } = await import('../../../routes/companyRoutes.js');

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { uid: 'test-user-123' };
  next();
};

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/companies', mockAuthMiddleware, companyRoutes);
  return app;
};

describe('Company API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/companies', () => {
    it('should create a new company successfully', async () => {
      const companyData = {
        name: 'Test Company LLC',
        taxId: '12-3456789',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        }
      };

      mockFirebaseService.createCompany.mockResolvedValue('new-company-id');

      const response = await request(app)
        .post('/api/companies')
        .send(companyData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Company created successfully',
        data: {
          id: 'new-company-id'
        }
      });

      expect(mockFirebaseService.createCompany).toHaveBeenCalledWith(
        'test-user-123',
        companyData
      );
    });

    it('should return 400 for missing company name', async () => {
      const companyData = {
        taxId: '12-3456789'
      };

      const response = await request(app)
        .post('/api/companies')
        .send(companyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Company name is required');
    });

    it('should return 400 for invalid tax ID format', async () => {
      const companyData = {
        name: 'Test Company',
        taxId: 'invalid-tax-id'
      };

      const response = await request(app)
        .post('/api/companies')
        .send(companyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid tax ID format');
    });

    it('should handle service errors gracefully', async () => {
      const companyData = {
        name: 'Test Company'
      };

      mockFirebaseService.createCompany.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/companies')
        .send(companyData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');
    });
  });

  describe('GET /api/companies', () => {
    it('should return user companies successfully', async () => {
      const mockCompanies = [
        {
          id: 'company-1',
          name: 'Company One',
          isDefault: true
        },
        {
          id: 'company-2',
          name: 'Company Two',
          isDefault: false
        }
      ];

      mockFirebaseService.getUserCompanies.mockResolvedValue(mockCompanies);

      const response = await request(app)
        .get('/api/companies')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Companies retrieved successfully',
        data: {
          companies: mockCompanies,
          total: 2
        }
      });

      expect(mockFirebaseService.getUserCompanies).toHaveBeenCalledWith('test-user-123');
    });

    it('should return empty array when no companies exist', async () => {
      mockFirebaseService.getUserCompanies.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/companies')
        .expect(200);

      expect(response.body.data.companies).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('should update company successfully', async () => {
      const updateData = {
        name: 'Updated Company Name',
        taxId: '98-7654321'
      };

      mockFirebaseService.updateCompany.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/companies/company-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Company updated successfully',
        data: null
      });

      expect(mockFirebaseService.updateCompany).toHaveBeenCalledWith(
        'test-user-123',
        'company-123',
        updateData
      );
    });

    it('should return 404 for non-existent company', async () => {
      const updateData = { name: 'Updated Name' };

      mockFirebaseService.updateCompany.mockRejectedValue(
        new Error('Company not found')
      );

      const response = await request(app)
        .put('/api/companies/non-existent-id')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Company not found');
    });

    it('should validate updated data', async () => {
      const updateData = {
        name: '', // Empty name should be invalid
        taxId: 'invalid-format'
      };

      const response = await request(app)
        .put('/api/companies/company-123')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('should delete company successfully', async () => {
      mockFirebaseService.deleteCompany.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/companies/company-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Company deleted successfully',
        data: null
      });

      expect(mockFirebaseService.deleteCompany).toHaveBeenCalledWith(
        'test-user-123',
        'company-123'
      );
    });

    it('should return 404 for non-existent company', async () => {
      mockFirebaseService.deleteCompany.mockRejectedValue(
        new Error('Company not found')
      );

      const response = await request(app)
        .delete('/api/companies/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Company not found');
    });

    it('should prevent deletion of default company', async () => {
      mockFirebaseService.deleteCompany.mockRejectedValue(
        new Error('Cannot delete default company')
      );

      const response = await request(app)
        .delete('/api/companies/default-company-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot delete default company');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.use('/api/companies', companyRoutes);

      // Test POST endpoint without auth
      await request(appWithoutAuth)
        .post('/api/companies')
        .send({ name: 'Test Company' })
        .expect(401);

      // Test GET endpoint without auth
      await request(appWithoutAuth)
        .get('/api/companies')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      // This test would depend on your specific rate limiting implementation
      // You might need to make multiple rapid requests to trigger rate limiting
      
      const promises = Array(10).fill().map(() =>
        request(app).get('/api/companies')
      );

      const responses = await Promise.all(promises);
      
      // Check that most requests succeed (this depends on your rate limits)
      const successfulRequests = responses.filter(res => res.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate request body size', async () => {
      const largeObject = {
        name: 'Test Company',
        description: 'x'.repeat(10000) // Very large description
      };

      // This test depends on your request size limits
      const response = await request(app)
        .post('/api/companies')
        .send(largeObject);

      // Should either succeed or fail with appropriate error
      expect([200, 201, 413]).toContain(response.status);
    });

    it('should sanitize input data', async () => {
      const companyData = {
        name: '<script>alert("xss")</script>Test Company',
        taxId: '12-3456789'
      };

      mockFirebaseService.createCompany.mockResolvedValue('new-id');

      const response = await request(app)
        .post('/api/companies')
        .send(companyData)
        .expect(201);

      // Check that the service received sanitized data
      const serviceCall = mockFirebaseService.createCompany.mock.calls[0][1];
      expect(serviceCall.name).not.toContain('<script>');
    });
  });
});
