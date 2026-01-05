/**
 * Environment Configuration
 * 
 * Centralized environment variable management with validation and defaults
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Validate required environment variables
 * @param {string} name - Environment variable name
 * @param {string} value - Environment variable value
 * @param {boolean} required - Whether the variable is required
 * @returns {boolean} - True if valid, false otherwise
 */
const validateEnvVar = (name, value, required = true) => {
  if (required && (!value || value.trim() === '')) {
    console.warn(`⚠️  Environment variable ${name} is required but not set`);
    return false;
  }
  return true;
};

/**
 * Parse boolean environment variable
 * @param {string} value - String value to parse
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean}
 */
const parseBoolean = (value, defaultValue = false) => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parse integer environment variable
 * @param {string} value - String value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number}
 */
const parseInteger = (value, defaultValue = 0) => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Firebase Configuration
export const FIREBASE_CONFIG = {
  PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID,
  PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
  
  // Legacy support for old environment variable names
  ADMIN_TYPE: process.env.FIREBASE_ADMIN_TYPE || 'service_account',
  ADMIN_PRIVATE_KEY_ID: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  ADMIN_CLIENT_ID: process.env.FIREBASE_ADMIN_CLIENT_ID,
  ADMIN_AUTH_URI: process.env.FIREBASE_ADMIN_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  ADMIN_TOKEN_URI: process.env.FIREBASE_ADMIN_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  ADMIN_AUTH_PROVIDER_X509_CERT_URL: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  ADMIN_CLIENT_X509_CERT_URL: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
};

// Supabase Configuration (Primary database provider)
export const SUPABASE_CONFIG = {
  URL: process.env.SUPABASE_URL,
  ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.SUPABASE_JWT_SECRET
};

// Database Provider Configuration
export const DB_PROVIDER_CONFIG = {
  // 'supabase' (default) or 'firebase'
  PROVIDER: process.env.DB_PROVIDER || 'supabase',
  // Override auth provider separately if needed (defaults to DB_PROVIDER)
  AUTH_PROVIDER: process.env.AUTH_PROVIDER
};

// Server Configuration
export const SERVER_CONFIG = {
  PORT: parseInteger(process.env.PORT, 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || 'localhost',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  ENABLE_CORS: parseBoolean(process.env.ENABLE_CORS, true),
  
  // Security
  ENABLE_HELMET: parseBoolean(process.env.ENABLE_HELMET, true),
  ENABLE_RATE_LIMITING: parseBoolean(process.env.ENABLE_RATE_LIMITING, true),
  
  // Timeouts
  REQUEST_TIMEOUT: parseInteger(process.env.REQUEST_TIMEOUT, 30000),
  KEEP_ALIVE_TIMEOUT: parseInteger(process.env.KEEP_ALIVE_TIMEOUT, 65000)
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInteger(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024), // 10MB default
  UPLOAD_TIMEOUT: parseInteger(process.env.UPLOAD_TIMEOUT, 30000),
  ALLOWED_MIME_TYPES: (process.env.ALLOWED_MIME_TYPES || 'application/pdf').split(','),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  TEMP_DIR: process.env.TEMP_DIR || 'uploads/temp'
};

// Logging Configuration
export const LOGGING_CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_TO_FILE: parseBoolean(process.env.LOG_TO_FILE, false),
  LOG_DIR: process.env.LOG_DIR || 'logs',
  MAX_LOG_SIZE: parseInteger(process.env.MAX_LOG_SIZE, 10 * 1024 * 1024), // 10MB
  MAX_LOG_FILES: parseInteger(process.env.MAX_LOG_FILES, 5)
};

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  MAX_REQUESTS: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  SKIP_SUCCESSFUL_REQUESTS: parseBoolean(process.env.RATE_LIMIT_SKIP_SUCCESSFUL, false),
  SKIP_FAILED_REQUESTS: parseBoolean(process.env.RATE_LIMIT_SKIP_FAILED, false)
};

// Feature Flags
export const FEATURE_FLAGS = {
  DEBUG_PDF: parseBoolean(process.env.DEBUG_PDF, false),
  ENABLE_CLASSIFICATION: parseBoolean(process.env.ENABLE_CLASSIFICATION, true),
  ENABLE_HISTORICAL_CLASSIFICATION: parseBoolean(process.env.ENABLE_HISTORICAL_CLASSIFICATION, true),
  MOCK_FIREBASE: parseBoolean(process.env.MOCK_FIREBASE, false),
  ENABLE_METRICS: parseBoolean(process.env.ENABLE_METRICS, false)
};

// Classification Configuration
export const CLASSIFICATION_CONFIG = {
  DEFAULT_CONFIDENCE: parseFloat(process.env.DEFAULT_CLASSIFICATION_CONFIDENCE) || 0.7,
  MIN_CONFIDENCE: parseFloat(process.env.MIN_CLASSIFICATION_CONFIDENCE) || 0.1,
  MAX_SUGGESTIONS: parseInteger(process.env.MAX_CLASSIFICATION_SUGGESTIONS, 3),
  HISTORICAL_LIMIT: parseInteger(process.env.CLASSIFICATION_HISTORICAL_LIMIT, 100)
};

// Database Configuration  
export const DATABASE_CONFIG = {
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT: parseInteger(process.env.FIRESTORE_EMULATOR_PORT, 8080),
  USE_EMULATOR: parseBoolean(process.env.USE_FIRESTORE_EMULATOR, false)
};

// Health Check Configuration
export const HEALTH_CONFIG = {
  ENABLE_HEALTH_CHECK: parseBoolean(process.env.ENABLE_HEALTH_CHECK, true),
  HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH || '/health',
  DETAILED_HEALTH: parseBoolean(process.env.DETAILED_HEALTH_CHECK, true)
};

/**
 * Validate critical environment variables
 * @returns {object} Validation result with success status and missing variables
 */
export const validateEnvironment = () => {
  const missing = [];
  const warnings = [];

  // Check Firebase configuration if not mocking
  if (!FEATURE_FLAGS.MOCK_FIREBASE) {
    if (!validateEnvVar('FIREBASE_PROJECT_ID', FIREBASE_CONFIG.PROJECT_ID, false)) {
      warnings.push('Firebase not configured - running in development mode');
    }
  }

  // Check critical server configuration
  if (SERVER_CONFIG.NODE_ENV === 'production') {
    if (!validateEnvVar('PORT', process.env.PORT, false)) {
      warnings.push('PORT not set, using default 5000');
    }
  }

  return {
    success: missing.length === 0,
    missing,
    warnings,
    hasFirebase: !!(FIREBASE_CONFIG.PROJECT_ID && FIREBASE_CONFIG.PRIVATE_KEY && FIREBASE_CONFIG.CLIENT_EMAIL)
  };
};

/**
 * Get environment summary for debugging
 * @returns {object} Environment configuration summary
 */
export const getEnvironmentSummary = () => {
  const validation = validateEnvironment();
  
  return {
    nodeEnv: SERVER_CONFIG.NODE_ENV,
    port: SERVER_CONFIG.PORT,
    hasFirebase: validation.hasFirebase,
    features: {
      classification: FEATURE_FLAGS.ENABLE_CLASSIFICATION,
      rateLimit: SERVER_CONFIG.ENABLE_RATE_LIMITING,
      cors: SERVER_CONFIG.ENABLE_CORS,
      debugPdf: FEATURE_FLAGS.DEBUG_PDF
    },
    validation
  };
};

// Development helper - log configuration on startup
if (SERVER_CONFIG.NODE_ENV === 'development') {
  const summary = getEnvironmentSummary();
  console.log('🔧 Environment Configuration:', {
    nodeEnv: summary.nodeEnv,
    port: summary.port,
    hasFirebase: summary.hasFirebase,
    features: summary.features
  });
  
  if (summary.validation.warnings.length > 0) {
    console.log('⚠️  Configuration warnings:', summary.validation.warnings);
  }
}
