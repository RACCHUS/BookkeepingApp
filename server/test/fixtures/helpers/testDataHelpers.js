/**
 * @fileoverview Test Data Helpers for Firebase Emulator
 * @description Utilities for seeding and managing test data in Firebase emulator
 * @version 1.0.0
 */

/**
 * Create a test user in Firestore
 */
export async function createTestUser(db, userId, userData = {}) {
  const defaultUser = {
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date().toISOString(),
    settings: {
      theme: 'light',
      notifications: true
    },
    ...userData
  };
  
  await db.collection('users').doc(userId).set(defaultUser);
  return { id: userId, ...defaultUser };
}

/**
 * Create a test company in Firestore
 */
export async function createTestCompany(db, userId, companyData = {}) {
  const defaultCompany = {
    name: 'Test Company LLC',
    userId,
    createdAt: new Date().toISOString(),
    settings: {},
    ...companyData
  };
  
  const docRef = await db.collection('companies').add(defaultCompany);
  return { id: docRef.id, ...defaultCompany };
}

/**
 * Create test transactions in Firestore
 */
export async function createTestTransactions(db, userId, transactions = []) {
  const batch = db.batch();
  const createdTransactions = [];
  
  for (const txn of transactions) {
    const docRef = db.collection('transactions').doc();
    const transaction = {
      userId,
      date: new Date().toISOString(),
      amount: 100,
      description: 'Test Transaction',
      category: 'Office Supplies',
      type: 'expense',
      source: 'manual',
      needsReview: false,
      createdAt: new Date().toISOString(),
      ...txn
    };
    
    batch.set(docRef, transaction);
    createdTransactions.push({ id: docRef.id, ...transaction });
  }
  
  await batch.commit();
  return createdTransactions;
}

/**
 * Create a test upload record in Firestore
 */
export async function createTestUpload(db, userId, uploadData = {}) {
  const defaultUpload = {
    userId,
    fileName: 'test-statement.pdf',
    originalName: 'test-statement.pdf',
    fileSize: 1024,
    uploadDate: new Date().toISOString(),
    status: 'completed',
    transactionCount: 0,
    companyId: '',
    companyName: '',
    ...uploadData
  };
  
  const docRef = await db.collection('uploads').add(defaultUpload);
  return { id: docRef.id, ...defaultUpload };
}

/**
 * Create test classification rules in Firestore
 */
export async function createTestRules(db, userId, rules = []) {
  const batch = db.batch();
  const createdRules = [];
  
  for (const rule of rules) {
    const docRef = db.collection('classificationRules').doc();
    const ruleData = {
      userId,
      pattern: rule.pattern || 'WALMART',
      category: rule.category || 'Groceries',
      type: rule.type || 'expense',
      active: rule.active !== undefined ? rule.active : true,
      createdAt: new Date().toISOString(),
      ...rule
    };
    
    batch.set(docRef, ruleData);
    createdRules.push({ id: docRef.id, ...ruleData });
  }
  
  await batch.commit();
  return createdRules;
}

/**
 * Create test payees in Firestore
 */
export async function createTestPayees(db, userId, payees = []) {
  const batch = db.batch();
  const createdPayees = [];
  
  for (const payee of payees) {
    const docRef = db.collection('payees').doc();
    const payeeData = {
      userId,
      name: payee.name || 'Test Vendor',
      type: payee.type || 'vendor',
      category: payee.category || 'General',
      active: payee.active !== undefined ? payee.active : true,
      createdAt: new Date().toISOString(),
      ...payee
    };
    
    batch.set(docRef, payeeData);
    createdPayees.push({ id: docRef.id, ...payeeData });
  }
  
  await batch.commit();
  return createdPayees;
}

/**
 * Clear all test data for a user
 */
export async function clearUserData(db, userId) {
  const batch = db.batch();
  
  // Clear transactions
  const transactions = await db.collection('transactions').where('userId', '==', userId).get();
  transactions.forEach(doc => batch.delete(doc.ref));
  
  // Clear uploads
  const uploads = await db.collection('uploads').where('userId', '==', userId).get();
  uploads.forEach(doc => batch.delete(doc.ref));
  
  // Clear companies
  const companies = await db.collection('companies').where('userId', '==', userId).get();
  companies.forEach(doc => batch.delete(doc.ref));
  
  // Clear rules
  const rules = await db.collection('classificationRules').where('userId', '==', userId).get();
  rules.forEach(doc => batch.delete(doc.ref));
  
  // Clear payees
  const payees = await db.collection('payees').where('userId', '==', userId).get();
  payees.forEach(doc => batch.delete(doc.ref));
  
  // Clear user
  const userDoc = db.collection('users').doc(userId);
  batch.delete(userDoc);
  
  await batch.commit();
}

/**
 * Get collection data for verification
 */
export async function getCollectionData(db, collectionName, filters = {}) {
  let query = db.collection(collectionName);
  
  for (const [field, value] of Object.entries(filters)) {
    query = query.where(field, '==', value);
  }
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export default {
  createTestUser,
  createTestCompany,
  createTestTransactions,
  createTestUpload,
  createTestRules,
  createTestPayees,
  clearUserData,
  getCollectionData
};
