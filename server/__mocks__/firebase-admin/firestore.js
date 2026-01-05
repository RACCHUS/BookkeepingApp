/**
 * @fileoverview Firebase Admin Firestore Module Mock
 * @description Mock for firebase-admin/firestore submodule
 * Note: Manual mocks don't have access to jest.fn() - tests must configure the mock
 */

// Mock Firestore database - will be configured by tests
const mockDb = {
  collection: () => {},
  batch: () => {},
  runTransaction: () => {}
};

// Mock getFirestore function - export as regular function, tests will spy/mock it
export function getFirestore() {
  return mockDb;
}

// Mock Timestamp
export const Timestamp = {
  now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
  fromDate: (date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
};

// Mock FieldValue
export const FieldValue = {
  serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
  delete: () => ({ _methodName: 'delete' }),
  increment: (n) => ({ _methodName: 'increment', _operand: n }),
  arrayUnion: (...elements) => ({ _methodName: 'arrayUnion', _elements: elements }),
  arrayRemove: (...elements) => ({ _methodName: 'arrayRemove', _elements: elements })
};

export default {
  getFirestore,
  Timestamp,
  FieldValue
};
