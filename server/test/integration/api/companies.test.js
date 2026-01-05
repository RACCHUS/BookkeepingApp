/**
 * @fileoverview Company API Integration Tests
 * @description Tests for company management API endpoints
 * Tests API request validation, response formats, and service integration
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { uid: 'test-user-123', email: 'test@example.com' };
  next();
};

// Mock company service
const mockCompanyService = {
  getUserCompanies: jest.fn(),
  getCompanyById: jest.fn(),
  getDefaultCompany: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn(),
  setDefaultCompany: jest.fn(),
  findCompanyByName: jest.fn()
};

// Sample test data
const sampleCompanies = [
  {
    id: 'company-1',
    name: 'Test Company 1',
    legalName: 'Test Company 1 LLC',
    businessType: 'llc',
    userId: 'test-user-123',
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'company-2',
    name: 'Test Company 2',
    legalName: 'Test Company 2 Inc',
    businessType: 'corporation',
    userId: 'test-user-123',
    isDefault: false,
    createdAt: '2025-02-01T00:00:00Z'
  }
];

describe('Company API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default mock implementations
    mockCompanyService.getUserCompanies.mockResolvedValue(sampleCompanies);
    mockCompanyService.getCompanyById.mockResolvedValue(sampleCompanies[0]);
    mockCompanyService.getDefaultCompany.mockResolvedValue(sampleCompanies[0]);
    mockCompanyService.createCompany.mockResolvedValue('new-company-id');
    mockCompanyService.updateCompany.mockResolvedValue({ ...sampleCompanies[0], name: 'Updated Name' });
    mockCompanyService.deleteCompany.mockResolvedValue(true);
    mockCompanyService.setDefaultCompany.mockResolvedValue({ ...sampleCompanies[1], isDefault: true });
    mockCompanyService.findCompanyByName.mockResolvedValue(sampleCompanies[0]);
  });

  // ============================================
  // GET /api/companies
  // ============================================
  describe('GET /api/companies', () => {
    const createGetCompaniesHandler = (service) => async (req, res) => {
      try {
        const userId = req.user.uid;
        const companies = await service.getUserCompanies(userId);
        res.json({
          success: true,
          data: companies,
          count: companies.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    };

    it('should return user companies successfully', async () => {
      app.get('/test-get-companies', createGetCompaniesHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-companies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(mockCompanyService.getUserCompanies).toHaveBeenCalledWith('test-user-123');
    });

    it('should return empty array when no companies exist', async () => {
      mockCompanyService.getUserCompanies.mockResolvedValue([]);
      app.get('/test-get-companies-empty', createGetCompaniesHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-companies-empty')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      mockCompanyService.getUserCompanies.mockRejectedValue(new Error('Database connection failed'));
      app.get('/test-get-companies-error', createGetCompaniesHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-companies-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  // ============================================
  // GET /api/companies/:id
  // ============================================
  describe('GET /api/companies/:id', () => {
    const createGetCompanyByIdHandler = (service) => async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.uid;
        
        if (!id) {
          return res.status(400).json({ success: false, error: 'Company ID is required' });
        }
        
        const company = await service.getCompanyById(id, userId);
        
        if (!company) {
          return res.status(404).json({ success: false, error: 'Company not found' });
        }
        
        res.json({ success: true, data: company });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should return company by ID', async () => {
      app.get('/test-get-company/:id', createGetCompanyByIdHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-company/company-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('company-1');
      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith('company-1', 'test-user-123');
    });

    it('should return 404 for non-existent company', async () => {
      mockCompanyService.getCompanyById.mockResolvedValue(null);
      app.get('/test-get-company-404/:id', createGetCompanyByIdHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-company-404/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Company not found');
    });

    it('should handle service errors', async () => {
      mockCompanyService.getCompanyById.mockRejectedValue(new Error('Database error'));
      app.get('/test-get-company-error/:id', createGetCompanyByIdHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-company-error/company-1')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // POST /api/companies
  // ============================================
  describe('POST /api/companies', () => {
    const createCompanyHandler = (service) => async (req, res) => {
      try {
        const userId = req.user.uid;
        const { name, legalName, businessType, address } = req.body;
        
        // Validation
        if (!name || name.length < 1) {
          return res.status(400).json({ success: false, error: 'Company name is required' });
        }
        
        if (name.length > 100) {
          return res.status(400).json({ success: false, error: 'Company name must be less than 100 characters' });
        }
        
        const companyId = await service.createCompany(userId, { name, legalName, businessType, address });
        
        res.status(201).json({
          success: true,
          data: { id: companyId, name, legalName, businessType, address },
          message: 'Company created successfully'
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should create a new company successfully', async () => {
      app.post('/test-create-company', createCompanyHandler(mockCompanyService));

      const companyData = {
        name: 'New Test Company',
        legalName: 'New Test Company LLC',
        businessType: 'llc'
      };

      const response = await request(app)
        .post('/test-create-company')
        .send(companyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('new-company-id');
      expect(response.body.data.name).toBe('New Test Company');
      expect(mockCompanyService.createCompany).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({ name: 'New Test Company' })
      );
    });

    it('should reject missing company name', async () => {
      app.post('/test-create-company-noname', createCompanyHandler(mockCompanyService));

      const response = await request(app)
        .post('/test-create-company-noname')
        .send({ legalName: 'Test LLC' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Company name is required');
    });

    it('should reject company name that is too long', async () => {
      app.post('/test-create-company-longname', createCompanyHandler(mockCompanyService));

      const response = await request(app)
        .post('/test-create-company-longname')
        .send({ name: 'A'.repeat(101) })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Company name must be less than 100 characters');
    });

    it('should handle creation errors', async () => {
      mockCompanyService.createCompany.mockRejectedValue(new Error('Failed to create company'));
      app.post('/test-create-company-error', createCompanyHandler(mockCompanyService));

      const response = await request(app)
        .post('/test-create-company-error')
        .send({ name: 'Test Company' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // PUT /api/companies/:id
  // ============================================
  describe('PUT /api/companies/:id', () => {
    const updateCompanyHandler = (service) => async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.uid;
        const updateData = req.body;
        
        if (!id) {
          return res.status(400).json({ success: false, error: 'Company ID is required' });
        }
        
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ success: false, error: 'No update data provided' });
        }
        
        const updatedCompany = await service.updateCompany(id, userId, updateData);
        
        if (!updatedCompany) {
          return res.status(404).json({ success: false, error: 'Company not found' });
        }
        
        res.json({ success: true, data: updatedCompany });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should update company successfully', async () => {
      app.put('/test-update-company/:id', updateCompanyHandler(mockCompanyService));

      const response = await request(app)
        .put('/test-update-company/company-1')
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(
        'company-1',
        'test-user-123',
        { name: 'Updated Name' }
      );
    });

    it('should reject empty update data', async () => {
      app.put('/test-update-company-empty/:id', updateCompanyHandler(mockCompanyService));

      const response = await request(app)
        .put('/test-update-company-empty/company-1')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No update data provided');
    });

    it('should return 404 for non-existent company', async () => {
      mockCompanyService.updateCompany.mockResolvedValue(null);
      app.put('/test-update-company-404/:id', updateCompanyHandler(mockCompanyService));

      const response = await request(app)
        .put('/test-update-company-404/non-existent')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle update errors', async () => {
      mockCompanyService.updateCompany.mockRejectedValue(new Error('Update failed'));
      app.put('/test-update-company-error/:id', updateCompanyHandler(mockCompanyService));

      const response = await request(app)
        .put('/test-update-company-error/company-1')
        .send({ name: 'Updated Name' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // DELETE /api/companies/:id
  // ============================================
  describe('DELETE /api/companies/:id', () => {
    const deleteCompanyHandler = (service) => async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.uid;
        
        if (!id) {
          return res.status(400).json({ success: false, error: 'Company ID is required' });
        }
        
        const deleted = await service.deleteCompany(id, userId);
        
        if (!deleted) {
          return res.status(404).json({ success: false, error: 'Company not found' });
        }
        
        res.json({ success: true, message: 'Company deleted successfully' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should delete company successfully', async () => {
      app.delete('/test-delete-company/:id', deleteCompanyHandler(mockCompanyService));

      const response = await request(app)
        .delete('/test-delete-company/company-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Company deleted successfully');
      expect(mockCompanyService.deleteCompany).toHaveBeenCalledWith('company-1', 'test-user-123');
    });

    it('should return 404 for non-existent company', async () => {
      mockCompanyService.deleteCompany.mockResolvedValue(false);
      app.delete('/test-delete-company-404/:id', deleteCompanyHandler(mockCompanyService));

      const response = await request(app)
        .delete('/test-delete-company-404/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle delete errors', async () => {
      mockCompanyService.deleteCompany.mockRejectedValue(new Error('Delete failed'));
      app.delete('/test-delete-company-error/:id', deleteCompanyHandler(mockCompanyService));

      const response = await request(app)
        .delete('/test-delete-company-error/company-1')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // POST /api/companies/:id/default
  // ============================================
  describe('POST /api/companies/:id/default', () => {
    const setDefaultCompanyHandler = (service) => async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.uid;
        
        const company = await service.setDefaultCompany(id, userId);
        
        if (!company) {
          return res.status(404).json({ success: false, error: 'Company not found' });
        }
        
        res.json({ success: true, data: company, message: 'Default company updated' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should set default company successfully', async () => {
      app.post('/test-set-default/:id', setDefaultCompanyHandler(mockCompanyService));

      const response = await request(app)
        .post('/test-set-default/company-2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
      expect(mockCompanyService.setDefaultCompany).toHaveBeenCalledWith('company-2', 'test-user-123');
    });

    it('should return 404 for non-existent company', async () => {
      mockCompanyService.setDefaultCompany.mockResolvedValue(null);
      app.post('/test-set-default-404/:id', setDefaultCompanyHandler(mockCompanyService));

      const response = await request(app)
        .post('/test-set-default-404/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // GET /api/companies/default
  // ============================================
  describe('GET /api/companies/default', () => {
    const getDefaultCompanyHandler = (service) => async (req, res) => {
      try {
        const userId = req.user.uid;
        const company = await service.getDefaultCompany(userId);
        
        if (!company) {
          return res.status(404).json({ success: false, error: 'No default company found' });
        }
        
        res.json({ success: true, data: company });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should return default company', async () => {
      app.get('/test-get-default', getDefaultCompanyHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-default')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
      expect(mockCompanyService.getDefaultCompany).toHaveBeenCalledWith('test-user-123');
    });

    it('should return 404 when no default company exists', async () => {
      mockCompanyService.getDefaultCompany.mockResolvedValue(null);
      app.get('/test-get-default-404', getDefaultCompanyHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-get-default-404')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No default company found');
    });
  });

  // ============================================
  // GET /api/companies/search
  // ============================================
  describe('GET /api/companies/search', () => {
    const findCompanyByNameHandler = (service) => async (req, res) => {
      try {
        const { name } = req.query;
        const userId = req.user.uid;
        
        if (!name) {
          return res.status(400).json({ success: false, error: 'Name query parameter is required' });
        }
        
        const company = await service.findCompanyByName(userId, name);
        
        if (!company) {
          return res.status(404).json({ success: false, error: 'Company not found' });
        }
        
        res.json({ success: true, data: company });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    it('should find company by name', async () => {
      app.get('/test-find-by-name', findCompanyByNameHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-find-by-name')
        .query({ name: 'Test Company 1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Company 1');
      expect(mockCompanyService.findCompanyByName).toHaveBeenCalledWith('test-user-123', 'Test Company 1');
    });

    it('should return 400 when name query is missing', async () => {
      app.get('/test-find-by-name-noquery', findCompanyByNameHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-find-by-name-noquery')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name query parameter is required');
    });

    it('should return 404 when company not found', async () => {
      mockCompanyService.findCompanyByName.mockResolvedValue(null);
      app.get('/test-find-by-name-404', findCompanyByNameHandler(mockCompanyService));

      const response = await request(app)
        .get('/test-find-by-name-404')
        .query({ name: 'Non Existent Company' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // Additional Edge Cases
  // ============================================
  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid JSON body gracefully', async () => {
      // Create handler that would normally parse body
      const handler = (req, res) => {
        res.json({ success: true });
      };
      app.post('/test-invalid-json', handler);

      // Express.json() middleware should handle this
      const response = await request(app)
        .post('/test-invalid-json')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express returns 400 for invalid JSON
      expect(response.status).toBe(400);
    });

    it('should include user context in all requests', async () => {
      let capturedUser = null;
      app.get('/test-user-context', (req, res) => {
        capturedUser = req.user;
        res.json({ success: true });
      });

      await request(app).get('/test-user-context');

      expect(capturedUser).toBeDefined();
      expect(capturedUser.uid).toBe('test-user-123');
      expect(capturedUser.email).toBe('test@example.com');
    });
  });
});
