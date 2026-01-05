/**
 * @fileoverview Database Adapter Factory
 * @description Creates the appropriate database adapter based on environment configuration
 * @version 1.0.0
 * 
 * Environment Variables:
 *   DB_PROVIDER - 'supabase' (default) | 'firebase'
 * 
 * Usage:
 *   import { getDatabaseAdapter, db } from './adapters/index.js';
 *   
 *   // Use the singleton
 *   const transactions = await db.getTransactions(userId);
 *   
 *   // Or get a fresh instance
 *   const adapter = getDatabaseAdapter();
 */

import FirebaseAdapter from './FirebaseAdapter.js';
import SupabaseAdapter from './SupabaseAdapter.js';

/**
 * Supported database providers
 */
export const DB_PROVIDERS = {
  SUPABASE: 'supabase',
  FIREBASE: 'firebase'
};

/**
 * Get the configured database provider from environment
 * @returns {string} 'supabase' or 'firebase'
 */
export function getDbProvider() {
  const provider = process.env.DB_PROVIDER?.toLowerCase() || 'supabase';
  
  if (!Object.values(DB_PROVIDERS).includes(provider)) {
    console.warn(`⚠️ Unknown DB_PROVIDER "${provider}", defaulting to supabase`);
    return DB_PROVIDERS.SUPABASE;
  }
  
  return provider;
}

/**
 * Create a new database adapter instance
 * @param {string} [provider] - Override the environment provider
 * @returns {import('./DatabaseAdapter.js').default}
 */
export function createDatabaseAdapter(provider) {
  const dbProvider = provider || getDbProvider();
  
  switch (dbProvider) {
    case DB_PROVIDERS.FIREBASE:
      console.log('📦 Creating FirebaseAdapter');
      return new FirebaseAdapter();
      
    case DB_PROVIDERS.SUPABASE:
    default:
      console.log('📦 Creating SupabaseAdapter');
      return new SupabaseAdapter();
  }
}

/**
 * Singleton adapter instance
 * @type {import('./DatabaseAdapter.js').default | null}
 */
let adapterInstance = null;

/**
 * Get the singleton database adapter instance
 * Creates and initializes it on first call
 * @returns {import('./DatabaseAdapter.js').default}
 */
export function getDatabaseAdapter() {
  if (!adapterInstance) {
    adapterInstance = createDatabaseAdapter();
    
    // Initialize async but don't block
    adapterInstance.initialize().catch(err => {
      console.error('❌ Failed to initialize database adapter:', err.message);
    });
  }
  
  return adapterInstance;
}

/**
 * Switch the database provider at runtime
 * Warning: This will create a new adapter instance
 * @param {string} provider - 'supabase' or 'firebase'
 * @returns {import('./DatabaseAdapter.js').default}
 */
export async function switchDatabaseProvider(provider) {
  console.log(`🔄 Switching database provider to: ${provider}`);
  
  adapterInstance = createDatabaseAdapter(provider);
  await adapterInstance.initialize();
  
  return adapterInstance;
}

/**
 * Reset the singleton (mainly for testing)
 */
export function resetAdapter() {
  adapterInstance = null;
}

/**
 * Default export: the singleton adapter
 */
export const db = getDatabaseAdapter();

export default {
  getDatabaseAdapter,
  createDatabaseAdapter,
  switchDatabaseProvider,
  resetAdapter,
  getDbProvider,
  DB_PROVIDERS,
  db
};
