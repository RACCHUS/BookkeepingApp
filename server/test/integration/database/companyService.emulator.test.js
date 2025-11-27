/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeEmulators, cleanEmulatorData, areEmulatorsRunning } from '../../setup/emulatorSetup.js';
import { createTestUser, createTestCompany, createTestTransactions, clearUserData } from '../../fixtures/helpers/testDataHelpers.js';

/**
 * Example Integration Test using Firebase Emulators
 * 
 * To run this test:
 * 1. Start emulators: npm run emulator:start
 * 2. Run tests: npm run test:emulator:integration
 * 
 * Or use the emulator UI: npm run emulator:start:ui (opens at http://localhost:4000)
 */
describe('Company Service Integration Tests (with Emulator)', () => {
  let db;
  let auth;
  const TEST_USER_ID = 'test-user-company-integration';
  
  beforeAll(async () => {
    // Check if emulators are running
    const emulatorsRunning = await areEmulatorsRunning();
    if (!emulatorsRunning) {
      console.error('\n❌ Firebase emulators are not running!');
      console.error('Please start them with: npm run emulator:start\n');
      throw new Error('Firebase emulators not running');
    }
    
    // Initialize Firebase with emulator connection
    const firebase = initializeEmulators();
    db = firebase.db;
    auth = firebase.auth;
  });
  
  beforeEach(async () => {
    // Clean emulator data before each test
    await cleanEmulatorData();
  });
  
  afterAll(async () => {
    // Final cleanup
    await clearUserData(db, TEST_USER_ID);
  });
  
  describe('Company CRUD Operations', () => {
    it('should create a company in Firestore', async () => {
      // Create test user
      await createTestUser(db, TEST_USER_ID);
      
      // Create company
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Integration Test Company'
      });
      
      expect(company).toBeDefined();
      expect(company.id).toBeDefined();
      expect(company.name).toBe('Integration Test Company');
      expect(company.userId).toBe(TEST_USER_ID);
      
      // Verify in Firestore
      const doc = await db.collection('companies').doc(company.id).get();
      expect(doc.exists).toBe(true);
      expect(doc.data().name).toBe('Integration Test Company');
    });
    
    it('should list companies for a user', async () => {
      // Create test user
      await createTestUser(db, TEST_USER_ID);
      
      // Create multiple companies
      await createTestCompany(db, TEST_USER_ID, { name: 'Company A' });
      await createTestCompany(db, TEST_USER_ID, { name: 'Company B' });
      await createTestCompany(db, TEST_USER_ID, { name: 'Company C' });
      
      // Query companies
      const snapshot = await db.collection('companies')
        .where('userId', '==', TEST_USER_ID)
        .get();
      
      expect(snapshot.size).toBe(3);
      const companyNames = snapshot.docs.map(doc => doc.data().name);
      expect(companyNames).toContain('Company A');
      expect(companyNames).toContain('Company B');
      expect(companyNames).toContain('Company C');
    });
    
    it('should update a company', async () => {
      // Create test user and company
      await createTestUser(db, TEST_USER_ID);
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Original Name'
      });
      
      // Update company
      await db.collection('companies').doc(company.id).update({
        name: 'Updated Name'
      });
      
      // Verify update
      const doc = await db.collection('companies').doc(company.id).get();
      expect(doc.data().name).toBe('Updated Name');
    });
    
    it('should delete a company', async () => {
      // Create test user and company
      await createTestUser(db, TEST_USER_ID);
      const company = await createTestCompany(db, TEST_USER_ID);
      
      // Verify company exists
      let doc = await db.collection('companies').doc(company.id).get();
      expect(doc.exists).toBe(true);
      
      // Delete company
      await db.collection('companies').doc(company.id).delete();
      
      // Verify deletion
      doc = await db.collection('companies').doc(company.id).get();
      expect(doc.exists).toBe(false);
    });
  });
  
  describe('Transaction Operations with Company', () => {
    it('should create transactions linked to a company', async () => {
      // Create test user and company
      await createTestUser(db, TEST_USER_ID);
      const company = await createTestCompany(db, TEST_USER_ID, {
        name: 'Test Business LLC'
      });
      
      // Create transactions
      const transactions = await createTestTransactions(db, TEST_USER_ID, [
        {
          description: 'Office Rent',
          amount: 1500,
          category: 'Rent',
          companyId: company.id,
          companyName: company.name
        },
        {
          description: 'Utilities',
          amount: 200,
          category: 'Utilities',
          companyId: company.id,
          companyName: company.name
        }
      ]);
      
      expect(transactions.length).toBe(2);
      
      // Query transactions for company
      const snapshot = await db.collection('transactions')
        .where('userId', '==', TEST_USER_ID)
        .where('companyId', '==', company.id)
        .get();
      
      expect(snapshot.size).toBe(2);
      const amounts = snapshot.docs.map(doc => doc.data().amount);
      expect(amounts).toContain(1500);
      expect(amounts).toContain(200);
    });
    
    it('should filter transactions by date range', async () => {
      // Create test user
      await createTestUser(db, TEST_USER_ID);
      
      // Create transactions with different dates
      await createTestTransactions(db, TEST_USER_ID, [
        {
          description: 'January Transaction',
          date: '2024-01-15T12:00:00',
          amount: 100
        },
        {
          description: 'February Transaction',
          date: '2024-02-15T12:00:00',
          amount: 200
        },
        {
          description: 'March Transaction',
          date: '2024-03-15T12:00:00',
          amount: 300
        }
      ]);
      
      // Query transactions in February
      const snapshot = await db.collection('transactions')
        .where('userId', '==', TEST_USER_ID)
        .where('date', '>=', '2024-02-01T00:00:00')
        .where('date', '<', '2024-03-01T00:00:00')
        .get();
      
      expect(snapshot.size).toBe(1);
      expect(snapshot.docs[0].data().description).toBe('February Transaction');
    });
  });
  
  describe('Emulator Data Isolation', () => {
    it('should isolate data between tests', async () => {
      // This test verifies that beforeEach cleanup works
      
      // Query should find no companies
      const snapshot = await db.collection('companies')
        .where('userId', '==', TEST_USER_ID)
        .get();
      
      expect(snapshot.empty).toBe(true);
    });
  });
});
