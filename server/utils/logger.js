/**
 * Simple Logger Utility
 * Provides info, warn, error, and debug logging with timestamps and levels
 */

const format = (level, ...args) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}]`;
};

export const logger = {
  info: (...args) => console.log(format('INFO'), ...args),
  warn: (...args) => console.warn(format('WARN'), ...args),
  error: (...args) => console.error(format('ERROR'), ...args),
  debug: (...args) => console.debug(format('DEBUG'), ...args)
};
