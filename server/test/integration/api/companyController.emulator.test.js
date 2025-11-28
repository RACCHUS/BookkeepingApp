/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { initializeEmulators, cleanEmulatorData, areEmulatorsRunning } from '../../setup/emulatorSetup.js';
import { createTestUser, createTestCompany, clearUserData } from '../../fixtures/helpers/testDataHelpers.js';
import companyRoutes from '../../../routes/companyRoutes.js';

/**
 * Company Controller Integration Tests with Firebase Emulator
 * 
 * Prerequisites:
 * 1. Start emulators: npm run emulator:start
 * 2. Run tests: npm run test:emulator:integration
 */
describe('Company Controller Integration Tests', () => {
  let app;
  let db;
  let auth;
  const TEST_USER_ID = 'test-user-company-controller';
  let testUserToken;
  
  beforeAll(async () => {
    // Check if emulators are running
    const emulatorsRunning = await areEmulatorsRunning();
    if (!emulatorsRunning) {
      console.error('\n❌ Firebase emulators not running!');
      console.error('Start with: npm run emulator:start\n');
      throw new Error('Firebase emulators not running');
    }
    
    // Initialize Firebase with emulator
    const firebase = initializeEmulators();
    db = firebase.db;
    auth = firebase.auth;
    
    // Create Express app with company routes
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { uid: TEST_USER_ID };
      next();
    });
    
    app.use('/api/companies', companyRoutes);
    
    // Create test user in Auth emulator
    try {
      await auth.createUser({
        uid: TEST_USER_ID,
        email: 'test-company@example.com',
        displayName: 'Test Company User'
      });
    } catch (error) {
      // User might already exist
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  });
  
  beforeEach(async () => {
    // Clean Firestore data before each test
    await cleanEmulatorData();
  });
  
  afterAll(async () => {
    // Final cleanup
    await clearUserData(db, TEST_USER_ID);
    try {
      await auth.deleteUser(TEST_USER_ID);
    } catch (error) {
      // Ignore if user doesn't exist
    }
  });
  
  describe('POST /api/companies - Create Company', () => {
    it('should create a new company', async () => {
      const response = await request(app)
        .post('/api/companies')
        .send({
          name: 'Test Company LLC',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701'
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Company LLC');
      expect(response.body.data.userId).toBe(TEST_USER_ID);
      expect(response.body.message).toBe('Company created successfully');
      
      // Verify in Firestore
      const doc = await db.collection('companies').doc(response.body.data.id).get();
      expect(doc.exists).toBe(true);
      expect(doc.data().name).toBe('Test Company LLC');
    });
    
    it('should create company with minimal data', async () => {
      const response = await request(app)
        .post('/api/companies')
        .send({ name: 'Minimal Company' })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Minimal Company');
    });
    
    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/companies')
        .send({ invalid: 'data' })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
    });
  });
  
  describe('GET /api/companies - Get All Companies', () => {
    it('should return empty array when no companies exist', async () => {
      const response = await request(app)
        .get('/api/companies')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body.message).toBe('No companies found. Create your first company to get started.');
    });
    
    it('should return all companies for user', async () => {
      // Create test companies
      await createTestCompany(db, TEST_USER_ID, { name: 'Company A' });
      await createTestCompany(db, TEST_USER_ID, { name: 'Company B' });
      await createTestCompany(db, TEST_USER_ID, { name: 'Company C' });
      
      const response = await request(app)
        .get('/api/companies')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.count).toBe(3);
      
      const companyNames = response.body.data.map(c => c.name);
      expect(companyNames).toContain('Company A');
      expect(companyNames).toContain('Company B');
      expect(companyNames).toContain('Company C');
    });
    
    it('should not return companies from other users', async () => {
      // Create companies for different users
      await createTestCompany(db, TEST_USER_ID, { name: 'My Company' });
      await createTestCompany(db, 'other-user', { name: 'Other Company' });
      
      const response = await request(app)
        .get('/api/companies')
        .expect(200);
      
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('My Company');
    });
  });
  
  describe('GET /api/companies/:id - Get Company By ID', () => {
    it('should return company by ID', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Specific Company',
        address: '456 Oak Ave'
      });
      
      const response = await request(app)
        .get(`/api/companies/${company.id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(company.id);
      expect(response.body.data.name).toBe('Specific Company');
      expect(response.body.data.address).toBe('456 Oak Ave');
    });
    
    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .get('/api/companies/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBe('Failed to get company');
      expect(response.body.message).toContain('not found');
    });
    
    it('should return 404 when accessing other user company', async () => {
      const otherCompany = await createTestCompany(db, 'other-user', {
        name: 'Other User Company'
      });
      
      const response = await request(app)
        .get(`/api/companies/${otherCompany.id}`)
        .expect(404);
      
      expect(response.body.error).toBe('Failed to get company');
    });
  });
  
  describe('PUT /api/companies/:id - Update Company', () => {
    it('should update company', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Original Name',
        address: 'Original Address'
      });
      
      const response = await request(app)
        .put(`/api/companies/${company.id}`)
        .send({
          name: 'Updated Name',
          address: 'Updated Address'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.address).toBe('Updated Address');
      expect(response.body.message).toBe('Company updated successfully');
      
      // Verify in Firestore
      const doc = await db.collection('companies').doc(company.id).get();
      expect(doc.data().name).toBe('Updated Name');
      expect(doc.data().address).toBe('Updated Address');
    });
    
    it('should partially update company', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Company Name',
        address: 'Original Address'
      });
      
      const response = await request(app)
        .put(`/api/companies/${company.id}`)
        .send({ address: 'New Address' })
        .expect(200);
      
      expect(response.body.data.name).toBe('Company Name'); // Unchanged
      expect(response.body.data.address).toBe('New Address'); // Changed
    });
    
    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .put('/api/companies/non-existent-id')
        .send({ name: 'New Name' })
        .expect(404);
      
      expect(response.body.error).toBe('Failed to update company');
    });
    
    it('should return 400 for invalid data', async () => {
      const company = await createTestCompany(db, TEST_USER_ID);
      
      const response = await request(app)
        .put(`/api/companies/${company.id}`)
        .send({ invalid: 'field' })
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
    });
  });
  
  describe('DELETE /api/companies/:id - Delete Company', () => {
    it('should delete company', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Company to Delete'
      });
      
      const response = await request(app)
        .delete(`/api/companies/${company.id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Company deleted successfully');
      
      // Verify deletion in Firestore
      const doc = await db.collection('companies').doc(company.id).get();
      expect(doc.exists).toBe(false);
    });
    
    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .delete('/api/companies/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBe('Failed to delete company');
    });
    
    it('should not delete other user company', async () => {
      const otherCompany = await createTestCompany(db, 'other-user', {
        name: 'Other User Company'
      });
      
      const response = await request(app)
        .delete(`/api/companies/${otherCompany.id}`)
        .expect(404);
      
      // Verify company still exists
      const doc = await db.collection('companies').doc(otherCompany.id).get();
      expect(doc.exists).toBe(true);
    });
  });
  
  describe('GET /api/companies/default - Get Default Company', () => {
    it('should return 404 when no default company set', async () => {
      const response = await request(app)
        .get('/api/companies/default')
        .expect(404);
      
      expect(response.body.error).toBe('No default company found');
      expect(response.body.message).toBe('Create a company first or set one as default');
    });
    
    it('should return default company', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Default Company',
        isDefault: true
      });
      
      const response = await request(app)
        .get('/api/companies/default')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(company.id);
      expect(response.body.data.isDefault).toBe(true);
    });
  });
  
  describe('PUT /api/companies/:id/default - Set Default Company', () => {
    it('should set company as default', async () => {
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'New Default Company'
      });
      
      const response = await request(app)
        .put(`/api/companies/${company.id}/default`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
      expect(response.body.message).toBe('Default company set successfully');
    });
    
    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .put('/api/companies/non-existent-id/default')
        .expect(404);
      
      expect(response.body.error).toBe('Failed to set default company');
    });
  });
  
  describe('POST /api/companies/extract - Extract Company from PDF', () => {
    it('should extract company info from PDF text', async () => {
      const pdfText = `
        ABC Construction LLC
        123 Main Street
        Springfield IL 62701
        
        Chase Bank Statement
        Account Summary
      `;
      
      const response = await request(app)
        .post('/api/companies/extract')
        .send({ pdfText })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toBe('Company information extracted from PDF');
    });
    
    it('should return 400 when pdfText is missing', async () => {
      const response = await request(app)
        .post('/api/companies/extract')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('PDF text is required');
      expect(response.body.message).toBe('Provide pdfText in request body');
    });
  });
  
  describe('GET /api/companies/find?name= - Find Company by Name', () => {
    it('should find company by exact name', async () => {
      await createTestCompany(db, TEST_USER_ID, { name: 'Acme Corporation' });
      
      const response = await request(app)
        .get('/api/companies/find?name=Acme Corporation')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Acme Corporation');
    });
    
    it('should return 404 when company not found', async () => {
      const response = await request(app)
        .get('/api/companies/find?name=Non-Existent Company')
        .expect(404);
      
      expect(response.body.error).toBe('Company not found');
      expect(response.body.message).toBe('No matching company found');
    });
    
    it('should return 400 when name parameter is missing', async () => {
      const response = await request(app)
        .get('/api/companies/find')
        .expect(400);
      
      expect(response.body.error).toBe('Company name is required');
      expect(response.body.message).toBe('Provide name as query parameter');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Test with invalid ID format to trigger error
      const response = await request(app)
        .get('/api/companies/invalid@id#format')
        .expect(404);
      
      expect(response.body.error).toBe('Failed to get company');
      expect(response.body.message).toBeDefined();
    });
  });
});
