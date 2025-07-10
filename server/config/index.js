/**
 * Configuration Index
 * 
 * Centralized exports for all configuration modules
 */

// Environment configuration
export {
  FIREBASE_CONFIG,
  SERVER_CONFIG,
  UPLOAD_CONFIG,
  LOGGING_CONFIG,
  RATE_LIMIT_CONFIG,
  FEATURE_FLAGS,
  CLASSIFICATION_CONFIG,
  DATABASE_CONFIG,
  HEALTH_CONFIG,
  validateEnvironment,
  getEnvironmentSummary
} from './environment.js';

// Export environment variables directly for convenience
import * as envVars from './environment.js';
export const environment = {
  NODE_ENV: envVars.SERVER_CONFIG.NODE_ENV,
  PORT: envVars.SERVER_CONFIG.PORT,
  CORS_ORIGIN: envVars.SERVER_CONFIG.CORS_ORIGIN,
  CLIENT_URL: envVars.SERVER_CONFIG.CLIENT_URL
};

// Logger configuration
export { default as logger } from './logger.js';

// Firebase Admin configuration
export {
  default as firebaseAdmin,
  getFirebaseApp,
  isFirebaseAvailable,
  getProjectInfo
} from './firebaseAdmin.js';

// Database configuration
export {
  getFirestore,
  getStorage,
  getAuth,
  COLLECTIONS,
  QUERY_LIMITS,
  BATCH_LIMITS,
  checkDatabaseHealth,
  initializeDatabase,
  runTransaction,
  createBatch,
  isValidDocumentRef,
  getDatabaseConfig
} from './database.js';

/**
 * Get complete application configuration
 * @returns {Object} Complete configuration object
 */
export const getAppConfig = () => {
  return {
    server: SERVER_CONFIG,
    firebase: FIREBASE_CONFIG,
    database: getDatabaseConfig(),
    upload: UPLOAD_CONFIG,
    logging: LOGGING_CONFIG,
    rateLimit: RATE_LIMIT_CONFIG,
    features: FEATURE_FLAGS,
    classification: CLASSIFICATION_CONFIG,
    health: HEALTH_CONFIG
  };
};

/**
 * Health check for all configuration components
 * @returns {Promise<Object>} Health check results
 */
export const checkConfigHealth = async () => {
  const [envValidation, dbHealth] = await Promise.all([
    Promise.resolve(validateEnvironment()),
    checkDatabaseHealth()
  ]);

  return {
    environment: envValidation,
    database: dbHealth,
    firebase: {
      available: isFirebaseAvailable(),
      project: getProjectInfo()
    },
    timestamp: new Date().toISOString()
  };
};
