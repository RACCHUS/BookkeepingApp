/**
 * @fileoverview Firebase Emulator Setup for Testing
 * @description Configures Firebase Admin SDK to use local emulators for testing
 * @version 1.0.0
 */

import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Emulator configuration (matches firebase.json)
const EMULATOR_CONFIG = {
  projectId: 'demo-test-project',
  auth: {
    host: 'localhost',
    port: 9099
  },
  firestore: {
    host: 'localhost',
    port: 8080
  },
  storage: {
    host: 'localhost',
    port: 9199
  }
};

/**
 * Initialize Firebase Admin SDK with emulator configuration
 */
export function initializeEmulators() {
  // Set environment variables for emulators
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${EMULATOR_CONFIG.storage.host}:${EMULATOR_CONFIG.storage.port}`;
  
  // Delete any existing apps
  const existingApps = getApps();
  existingApps.forEach(app => deleteApp(app));
  
  // Initialize Firebase Admin with test credentials
  const app = initializeApp({
    projectId: EMULATOR_CONFIG.projectId,
    // Use application default credentials for emulator
    credential: cert({
      projectId: EMULATOR_CONFIG.projectId,
      clientEmail: 'test@example.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W\n-----END PRIVATE KEY-----\n'
    })
  });
  
  return {
    app,
    db: getFirestore(app),
    auth: getAuth(app),
    storage: getStorage(app)
  };
}

/**
 * Clean up emulator data between tests
 */
export async function cleanEmulatorData() {
  try {
    // Clear Firestore data
    const response = await fetch(
      `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}/emulator/v1/projects/${EMULATOR_CONFIG.projectId}/databases/(default)/documents`,
      { method: 'DELETE' }
    );
    
    if (!response.ok) {
      console.warn('Failed to clear Firestore emulator data');
    }
  } catch (error) {
    console.warn('Error clearing emulator data:', error.message);
  }
}

/**
 * Check if emulators are running
 */
export async function areEmulatorsRunning() {
  try {
    const firestoreResponse = await fetch(
      `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`,
      { method: 'GET' }
    );
    return firestoreResponse.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for emulators to be ready
 */
export async function waitForEmulators(maxRetries = 10, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    if (await areEmulatorsRunning()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

export default {
  initializeEmulators,
  cleanEmulatorData,
  areEmulatorsRunning,
  waitForEmulators,
  EMULATOR_CONFIG
};
