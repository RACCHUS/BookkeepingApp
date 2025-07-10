#!/usr/bin/env node

/**
 * Cleanup Temporary Files Script
 * 
 * Removes temporary files, old reports, logs, and other cleanup tasks.
 * Safe to run regularly as part of maintenance.
 * 
 * Usage: node scripts/maintenance/cleanup-temp-files.js [--dry-run]
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose');

// Files older than this will be cleaned up (in days)
const CLEANUP_THRESHOLDS = {
  tempFiles: 1,      // 1 day
  reportFiles: 7,    // 7 days
  logFiles: 30,      // 30 days
  uploadFiles: 30    // 30 days for processed uploads
};

let totalSize = 0;
let fileCount = 0;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = isDryRun ? '[DRY RUN] ' : '';
  
  if (level === 'verbose' && !isVerbose) return;
  
  console.log(`${prefix}${message}`);
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

async function isOlderThan(filePath, days) {
  try {
    const stats = await fs.stat(filePath);
    const ageInMs = Date.now() - stats.mtime.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays > days;
  } catch (error) {
    return false;
  }
}

async function deleteFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    totalSize += stats.size;
    fileCount++;
    
    log(`Deleting: ${filePath} (${formatBytes(stats.size)})`, 'verbose');
    
    if (!isDryRun) {
      await fs.unlink(filePath);
    }
    
    return true;
  } catch (error) {
    log(`Error deleting ${filePath}: ${error.message}`);
    return false;
  }
}

async function cleanupDirectory(dirPath, pattern, maxAge, description) {
  log(`\n🗂️  Cleaning ${description} in ${dirPath}`);
  
  try {
    const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
    if (!dirExists) {
      log(`Directory ${dirPath} does not exist, skipping`);
      return;
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isFile()) {
        // Check if file matches pattern and age
        const matchesPattern = pattern ? pattern.test(file.name) : true;
        const isOld = await isOlderThan(filePath, maxAge);
        
        if (matchesPattern && isOld) {
          const success = await deleteFile(filePath);
          if (success) deletedCount++;
        }
      } else if (file.isDirectory()) {
        // Recursively clean subdirectories
        await cleanupDirectory(filePath, pattern, maxAge, description);
      }
    }
    
    log(`Cleaned ${deletedCount} files from ${description}`);
    
  } catch (error) {
    log(`Error cleaning ${dirPath}: ${error.message}`);
  }
}

async function cleanupTempFiles() {
  const tempPaths = [
    { path: path.join(projectRoot, 'reports', 'generated', 'temp'), pattern: null },
    { path: path.join(projectRoot, 'server', 'uploads', 'temp'), pattern: null },
    { path: path.join(projectRoot, 'client', 'dist', '.temp'), pattern: null }
  ];

  for (const { path: tempPath, pattern } of tempPaths) {
    await cleanupDirectory(tempPath, pattern, CLEANUP_THRESHOLDS.tempFiles, 'temporary files');
  }
}

async function cleanupReports() {
  const reportPaths = [
    { 
      path: path.join(projectRoot, 'reports', 'generated', 'pdf'), 
      pattern: /\.(pdf)$/i 
    },
    { 
      path: path.join(projectRoot, 'reports', 'generated', 'csv'), 
      pattern: /\.(csv)$/i 
    }
  ];

  for (const { path: reportPath, pattern } of reportPaths) {
    await cleanupDirectory(reportPath, pattern, CLEANUP_THRESHOLDS.reportFiles, 'generated reports');
  }
}

async function cleanupLogs() {
  const logPaths = [
    { 
      path: path.join(projectRoot, 'server', 'logs'), 
      pattern: /\.(log|txt)$/i 
    },
    { 
      path: path.join(projectRoot, 'logs'), 
      pattern: /\.(log|txt)$/i 
    }
  ];

  for (const { path: logPath, pattern } of logPaths) {
    await cleanupDirectory(logPath, pattern, CLEANUP_THRESHOLDS.logFiles, 'log files');
  }
}

async function cleanupOldUploads() {
  const uploadPath = path.join(projectRoot, 'server', 'uploads');
  
  log(`\n📄 Cleaning old processed uploads`);
  
  try {
    const files = await fs.readdir(uploadPath, { withFileTypes: true });
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.processed')) {
        const filePath = path.join(uploadPath, file.name);
        const isOld = await isOlderThan(filePath, CLEANUP_THRESHOLDS.uploadFiles);
        
        if (isOld) {
          const success = await deleteFile(filePath);
          if (success) deletedCount++;
        }
      }
    }
    
    log(`Cleaned ${deletedCount} old processed upload files`);
    
  } catch (error) {
    log(`Error cleaning uploads: ${error.message}`);
  }
}

async function cleanupNodeModules() {
  log(`\n📦 Checking for stale node_modules`);
  
  const nodeModulesPaths = [
    path.join(projectRoot, 'node_modules', '.cache'),
    path.join(projectRoot, 'client', 'node_modules', '.cache'),
    path.join(projectRoot, 'server', 'node_modules', '.cache')
  ];

  for (const cachePath of nodeModulesPaths) {
    await cleanupDirectory(cachePath, null, 7, 'package manager cache');
  }
}

async function cleanupGitIgnoredFiles() {
  log(`\n🗑️  Cleaning git-ignored temporary files`);
  
  const ignoredPatterns = [
    { path: projectRoot, pattern: /\.(tmp|temp|bak|backup)$/i },
    { path: projectRoot, pattern: /~$/i },
    { path: projectRoot, pattern: /\.DS_Store$/i }
  ];

  for (const { path: searchPath, pattern } of ignoredPatterns) {
    await cleanupDirectory(searchPath, pattern, 0, 'git-ignored files');
  }
}

async function generateReport() {
  log(`\n📊 Cleanup Summary`);
  log('=' .repeat(50));
  log(`Files ${isDryRun ? 'would be' : ''} deleted: ${fileCount}`);
  log(`Total space ${isDryRun ? 'would be' : ''} freed: ${formatBytes(totalSize)}`);
  
  if (isDryRun) {
    log(`\nTo actually delete these files, run:`);
    log(`node scripts/maintenance/cleanup-temp-files.js`);
  } else {
    log(`\n✅ Cleanup completed successfully!`);
  }
}

async function main() {
  log(`🧹 Starting cleanup of temporary files...`);
  if (isDryRun) {
    log(`Running in DRY RUN mode - no files will be deleted`);
  }
  
  await cleanupTempFiles();
  await cleanupReports();
  await cleanupLogs();
  await cleanupOldUploads();
  await cleanupNodeModules();
  await cleanupGitIgnoredFiles();
  
  await generateReport();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;
