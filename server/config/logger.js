/**
 * Logging Configuration
 * 
 * Centralized logging setup using Winston with proper formatting and transports
 */

import winston from 'winston';
import { LOGGING_CONFIG, SERVER_CONFIG } from './environment.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure log directory exists
const logDir = join(__dirname, '..', LOGGING_CONFIG.LOG_DIR);
if (LOGGING_CONFIG.LOG_TO_FILE && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let output = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      output += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return output;
  })
);

/**
 * Create transports array based on configuration
 */
const createTransports = () => {
  const transports = [];

  // Console transport (always enabled in development)
  if (SERVER_CONFIG.NODE_ENV === 'development' || !LOGGING_CONFIG.LOG_TO_FILE) {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: LOGGING_CONFIG.LOG_LEVEL
      })
    );
  }

  // File transports (if enabled)
  if (LOGGING_CONFIG.LOG_TO_FILE) {
    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: join(logDir, 'combined.log'),
        format: logFormat,
        level: LOGGING_CONFIG.LOG_LEVEL,
        maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
        maxFiles: LOGGING_CONFIG.MAX_LOG_FILES
      })
    );

    // Error log file
    transports.push(
      new winston.transports.File({
        filename: join(logDir, 'error.log'),
        format: logFormat,
        level: 'error',
        maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
        maxFiles: LOGGING_CONFIG.MAX_LOG_FILES
      })
    );

    // Access log file for HTTP requests
    transports.push(
      new winston.transports.File({
        filename: join(logDir, 'access.log'),
        format: logFormat,
        level: 'http',
        maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
        maxFiles: LOGGING_CONFIG.MAX_LOG_FILES
      })
    );
  }

  return transports;
};

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: LOGGING_CONFIG.LOG_LEVEL,
  format: logFormat,
  transports: createTransports(),
  exitOnError: false
});

/**
 * Create request logger for Morgan
 */
const createRequestLogger = () => {
  return {
    write: (message) => {
      // Remove trailing newline
      const cleanMessage = message.trim();
      logger.http(cleanMessage);
    }
  };
};

/**
 * Log application startup information
 */
export const logStartup = (config) => {
  logger.info('🚀 Application starting up', {
    nodeEnv: config.server.NODE_ENV,
    port: config.server.PORT,
    hasFirebase: config.firebase.available,
    logLevel: LOGGING_CONFIG.LOG_LEVEL,
    logToFile: LOGGING_CONFIG.LOG_TO_FILE
  });
};

/**
 * Log error with context
 */
export const logError = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    context
  });
};

/**
 * Log warning with context
 */
export const logWarning = (message, context = {}) => {
  logger.warn(message, context);
};

/**
 * Log info with context
 */
export const logInfo = (message, context = {}) => {
  logger.info(message, context);
};

/**
 * Log debug information (only in development)
 */
export const logDebug = (message, context = {}) => {
  if (SERVER_CONFIG.NODE_ENV === 'development') {
    logger.debug(message, context);
  }
};

/**
 * Create child logger with additional context
 */
export const createChildLogger = (defaultMeta) => {
  return logger.child(defaultMeta);
};

/**
 * Get logging configuration summary
 */
export const getLoggingConfig = () => {
  return {
    level: LOGGING_CONFIG.LOG_LEVEL,
    toFile: LOGGING_CONFIG.LOG_TO_FILE,
    directory: LOGGING_CONFIG.LOG_TO_FILE ? logDir : null,
    maxSize: LOGGING_CONFIG.MAX_LOG_SIZE,
    maxFiles: LOGGING_CONFIG.MAX_LOG_FILES
  };
};

// Export logger and utilities
export default logger;
export const requestLogger = createRequestLogger();
