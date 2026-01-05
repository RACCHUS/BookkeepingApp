/**
 * @fileoverview Firebase Admin SDK Mock
 * @description Manual mock for firebase-admin that Jest will use automatically
 * This mock prevents Firebase initialization errors during testing
 */

// Mock Firestore database
const mockDb = {
  collection: jest.fn(),
  batch: jest.fn(),
  runTransaction: jest.fn()
};

// Mock getFirestore function
export const getFirestore = jest.fn(() => mockDb);

// Mock initializeApp
export const initializeApp = jest.fn(() => ({
  name: '[DEFAULT]',
  options: {}
}));

// Mock credential
export const credential = {
  cert: jest.fn(() => ({})),
  applicationDefault: jest.fn(() => ({}))
};

// Mock app methods
export const apps = [];

export default {
  initializeApp,
  credential,
  getFirestore,
  apps
};
