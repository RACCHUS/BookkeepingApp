/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { initializeEmulators, cleanEmulatorData, areEmulatorsRunning } from '../../setup/emulatorSetup.js';
import { createTestPayees, clearUserData } from '../../fixtures/helpers/testDataHelpers.js';
import payeeRoutes from '../../../routes/payeeRoutes.js';

/**
 * Payee Controller Integration Tests with Firebase Emulator
 * 
 * Prerequisites:
 * 1. Start emulators: npm run emulator:start
 * 2. Run tests: npm run test:emulator:integration
 */
describe('Payee Controller Integration Tests', () => {
  let app;
  let db;
  let auth;
  const TEST_USER_ID = 'test-user-payee-controller';
  
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
    
    // Create Express app with payee routes
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { uid: TEST_USER_ID };
      next();
    });
    
    app.use('/api/payees', payeeRoutes);
    
    // Create test user in Auth emulator
    try {
      await auth.createUser({
        uid: TEST_USER_ID,
        email: 'test-payee@example.com',
        displayName: 'Test Payee User'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  });
  
  beforeEach(async () => {
    await cleanEmulatorData();
  });
  
  afterAll(async () => {
    await clearUserData(db, TEST_USER_ID);
    try {
      await auth.deleteUser(TEST_USER_ID);
    } catch (error) {
      // Ignore
    }
  });
  
  describe('POST /api/payees - Create Payee', () => {
    it('should create a new employee payee', async () => {
      const response = await request(app)
        .post('/api/payees')
        .send({
          name: 'John Doe',
          type: 'employee',
          email: 'john@example.com',
          phone: '555-1234',
          isActive: true
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payee created successfully');
      expect(response.body.id).toBeDefined();
      expect(response.body.payee).toBeDefined();
      expect(response.body.payee.name).toBe('John Doe');
      expect(response.body.payee.type).toBe('employee');
    });
    
    it('should create a vendor payee', async () => {
      const response = await request(app)
        .post('/api/payees')
        .send({
          name: 'Office Supplies Inc',
          type: 'vendor',
          category: 'Office Supplies'
        })
        .expect(201);
      
      expect(response.body.payee.name).toBe('Office Supplies Inc');
      expect(response.body.payee.type).toBe('vendor');
      expect(response.body.payee.category).toBe('Office Supplies');
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/payees')
        .send({ type: 'employee' }) // Missing name
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });
  
  describe('GET /api/payees - Get All Payees', () => {
    it('should return empty array when no payees exist', async () => {
      const response = await request(app)
        .get('/api/payees')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.payees).toEqual([]);
      expect(response.body.count).toBe(0);
    });
    
    it('should return all payees for user', async () => {
      await createTestPayees(db, TEST_USER_ID, [
        { name: 'Employee 1', type: 'employee' },
        { name: 'Employee 2', type: 'employee' },
        { name: 'Vendor 1', type: 'vendor' }
      ]);
      
      const response = await request(app)
        .get('/api/payees')
        .expect(200);
      
      expect(response.body.payees).toHaveLength(3);
      expect(response.body.count).toBe(3);
    });
    
    it('should filter payees by type', async () => {
      await createTestPayees(db, TEST_USER_ID, [
        { name: 'Employee 1', type: 'employee' },
        { name: 'Employee 2', type: 'employee' },
        { name: 'Vendor 1', type: 'vendor' }
      ]);
      
      const response = await request(app)
        .get('/api/payees?type=employee')
        .expect(200);
      
      expect(response.body.payees).toHaveLength(2);
      expect(response.body.payees.every(p => p.type === 'employee')).toBe(true);
    });
    
    it('should filter payees by active status', async () => {
      await createTestPayees(db, TEST_USER_ID, [
        { name: 'Active Payee', active: true },
        { name: 'Inactive Payee', active: false }
      ]);
      
      const response = await request(app)
        .get('/api/payees?isActive=true')
        .expect(200);
      
      expect(response.body.payees).toHaveLength(1);
      expect(response.body.payees[0].name).toBe('Active Payee');
    });
    
    it('should search payees by name', async () => {
      await createTestPayees(db, TEST_USER_ID, [
        { name: 'John Smith' },
        { name: 'Jane Doe' },
        { name: 'Bob Johnson' }
      ]);
      
      const response = await request(app)
        .get('/api/payees?search=john')
        .expect(200);
      
      expect(response.body.payees.length).toBeGreaterThan(0);
      const names = response.body.payees.map(p => p.name.toLowerCase());
      expect(names.some(n => n.includes('john'))).toBe(true);
    });
  });
  
  describe('GET /api/payees/:id - Get Payee By ID', () => {
    it('should return specific payee', async () => {
      const [payee] = await createTestPayees(db, TEST_USER_ID, [
        { name: 'Specific Payee', type: 'employee' }
      ]);
      
      const response = await request(app)
        .get(`/api/payees/${payee.id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.payee.id).toBe(payee.id);
      expect(response.body.payee.name).toBe('Specific Payee');
    });
    
    it('should return 404 for non-existent payee', async () => {
      const response = await request(app)
        .get('/api/payees/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBe('Failed to get payee');
      expect(response.body.message).toContain('not found');
    });
    
    it('should return 403 when accessing other user payee', async () => {
      const [otherPayee] = await createTestPayees(db, 'other-user', [
        { name: 'Other User Payee' }
      ]);
      
      const response = await request(app)
        .get(`/api/payees/${otherPayee.id}`)
        .expect(403);
      
      expect(response.body.error).toBe('Failed to get payee');
      expect(response.body.message).toContain('Unauthorized');
    });
  });
  
  describe('PUT /api/payees/:id - Update Payee', () => {
    it('should update payee', async () => {
      const [payee] = await createTestPayees(db, TEST_USER_ID, [
        { name: 'Original Name', type: 'employee' }
      ]);
      
      const response = await request(app)
        .put(`/api/payees/${payee.id}`)
        .send({ name: 'Updated Name' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payee updated successfully');
      expect(response.body.payee.name).toBe('Updated Name');
    });
    
    it('should partially update payee', async () => {
      const [payee] = await createTestPayees(db, TEST_USER_ID, [
        { name: 'Payee Name', type: 'employee', email: 'old@example.com' }
      ]);
      
      const response = await request(app)
        .put(`/api/payees/${payee.id}`)
        .send({ email: 'new@example.com' })
        .expect(200);
      
      expect(response.body.payee.name).toBe('Payee Name'); // Unchanged
      expect(response.body.payee.email).toBe('new@example.com'); // Changed
    });
    
    it('should return 404 for non-existent payee', async () => {
      const response = await request(app)
        .put('/api/payees/non-existent-id')
        .send({ name: 'New Name' })
        .expect(404);
      
      expect(response.body.error).toBe('Failed to update payee');
    });
  });
  
  describe('DELETE /api/payees/:id - Delete Payee', () => {
    it('should delete payee', async () => {
      const [payee] = await createTestPayees(db, TEST_USER_ID, [
        { name: 'Payee to Delete' }
      ]);
      
      const response = await request(app)
        .delete(`/api/payees/${payee.id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payee deleted successfully');
      
      // Verify deletion
      const doc = await db.collection('payees').doc(payee.id).get();
      expect(doc.exists).toBe(false);
    });
    
    it('should return 404 for non-existent payee', async () => {
      const response = await request(app)
        .delete('/api/payees/non-existent-id')
        .expect(404);
      
      expect(response.body.error).toBe('Failed to delete payee');
    });
  });
  
  describe('GET /api/payees/stats - Get Payee Statistics', () => {
    it('should return payee statistics', async () => {
      await createTestPayees(db, TEST_USER_ID, [
        { name: 'Employee 1', type: 'employee', active: true },
        { name: 'Employee 2', type: 'employee', active: true },
        { name: 'Vendor 1', type: 'vendor', active: true },
        { name: 'Inactive Employee', type: 'employee', active: false }
      ]);
      
      const response = await request(app)
        .get('/api/payees/stats')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBe(4);
      expect(response.body.stats.byType).toBeDefined();
    });
  });
  
  describe('PUT /api/payees/:id/activate - Activate Payee', () => {
    it('should activate inactive payee', async () => {
      const [payee] = await createTestPayees(db, TEST_USER_ID, [
        { name: 'Inactive Payee', active: false }
      ]);
      
      const response = await request(app)
        .put(`/api/payees/${payee.id}/activate`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.payee.active).toBe(true);
    });
  });
  
  describe('PUT /api/payees/:id/deactivate - Deactivate Payee', () => {
    it('should deactivate active payee', async () => {
      const [payee] = await createTestPayees(db, TEST_USER_ID, [
        { name: 'Active Payee', active: true }
      ]);
      
      const response = await request(app)
        .put(`/api/payees/${payee.id}/deactivate`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.payee.active).toBe(false);
    });
  });
});
