/**
 * Path Utilities
 * 
 * Centralized utilities for handling file paths and directories in ES modules.
 * This module provides consistent helpers for __dirname and __filename patterns
 * and common path operations throughout the application.
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve, extname, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Get current file's directory (ES module equivalent of __dirname)
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string} Directory path
 */
export function getCurrentDir(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}

/**
 * Get current file's path (ES module equivalent of __filename)
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string} File path
 */
export function getCurrentFile(importMetaUrl) {
  return fileURLToPath(importMetaUrl);
}

/**
 * Get project root directory from any file in the server
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string} Project root directory
 */
export function getProjectRoot(importMetaUrl) {
  const currentDir = getCurrentDir(importMetaUrl);
  // Assuming server files are in server/ subdirectory
  return resolve(currentDir, '..');
}

/**
 * Get server root directory from any file in the server
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string} Server root directory
 */
export function getServerRoot(importMetaUrl) {
  const currentDir = getCurrentDir(importMetaUrl);
  // Navigate up to server root
  const parts = currentDir.split(/[/\\]/);
  const serverIndex = parts.findIndex(part => part === 'server');
  if (serverIndex === -1) {
    throw new Error('Unable to find server root directory');
  }
  return parts.slice(0, serverIndex + 1).join('/');
}

/**
 * Resolve path relative to server root
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @param {string} relativePath - Path relative to server root
 * @returns {string} Absolute path
 */
export function resolveServerPath(importMetaUrl, relativePath) {
  return join(getServerRoot(importMetaUrl), relativePath);
}

/**
 * Resolve path relative to project root
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @param {string} relativePath - Path relative to project root
 * @returns {string} Absolute path
 */
export function resolveProjectPath(importMetaUrl, relativePath) {
  return join(getProjectRoot(importMetaUrl), relativePath);
}

/**
 * Common directory paths
 */
export const getCommonPaths = (importMetaUrl) => {
  const serverRoot = getServerRoot(importMetaUrl);
  const projectRoot = getProjectRoot(importMetaUrl);
  
  return {
    serverRoot,
    projectRoot,
    uploads: join(projectRoot, 'uploads'),
    reports: join(projectRoot, 'reports'),
    logs: join(serverRoot, 'logs'),
    config: join(serverRoot, 'config'),
    services: join(serverRoot, 'services'),
    controllers: join(serverRoot, 'controllers'),
    middlewares: join(serverRoot, 'middlewares'),
    routes: join(serverRoot, 'routes'),
    utils: join(serverRoot, 'utils')
  };
};

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 * @param {object} options - Options for directory creation
 * @returns {boolean} True if directory exists or was created
 */
export function ensureDirectoryExists(dirPath, options = { recursive: true }) {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, options);
    }
    return true;
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    return false;
  }
}

/**
 * Get file extension
 * @param {string} filePath - File path
 * @returns {string} File extension (including dot)
 */
export function getFileExtension(filePath) {
  return extname(filePath);
}

/**
 * Get file name without extension
 * @param {string} filePath - File path
 * @returns {string} File name without extension
 */
export function getFileNameWithoutExtension(filePath) {
  const fileName = basename(filePath);
  const ext = extname(fileName);
  return fileName.slice(0, -ext.length);
}

/**
 * Check if file has specific extension
 * @param {string} filePath - File path
 * @param {string|string[]} extensions - Extension(s) to check (with or without dot)
 * @returns {boolean} True if file has one of the specified extensions
 */
export function hasFileExtension(filePath, extensions) {
  const fileExt = extname(filePath).toLowerCase();
  const extsToCheck = Array.isArray(extensions) ? extensions : [extensions];
  
  return extsToCheck.some(ext => {
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    return fileExt === normalizedExt.toLowerCase();
  });
}

/**
 * Generate unique file path by appending number if file exists
 * @param {string} basePath - Base file path
 * @returns {string} Unique file path
 */
export function generateUniqueFilePath(basePath) {
  if (!existsSync(basePath)) {
    return basePath;
  }
  
  const dir = dirname(basePath);
  const nameWithoutExt = getFileNameWithoutExtension(basePath);
  const ext = getFileExtension(basePath);
  
  let counter = 1;
  let uniquePath;
  
  do {
    uniquePath = join(dir, `${nameWithoutExt}_${counter}${ext}`);
    counter++;
  } while (existsSync(uniquePath));
  
  return uniquePath;
}
