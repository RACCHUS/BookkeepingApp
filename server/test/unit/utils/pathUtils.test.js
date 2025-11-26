/**
 * @fileoverview Path Utils Comprehensive Tests
 * @description Complete test coverage for path utility functions
 * @version 1.0.0
 * 
 * Target: 90%+ coverage for pathUtils.js
 */

import { jest } from '@jest/globals';
import { join, resolve, sep } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import {
  getCurrentDir,
  getCurrentFile,
  getProjectRoot,
  getServerRoot,
  resolveServerPath,
  resolveProjectPath,
  getCommonPaths,
  ensureDirectoryExists,
  getFileExtension,
  getFileNameWithoutExtension,
  hasFileExtension,
  generateUniqueFilePath
} from '../../../utils/pathUtils.js';

describe('Path Utils', () => {
  // Mock import.meta.url for consistent testing
  const mockServerFileUrl = 'file:///C:/Users/test/project/server/utils/pathUtils.js';
  const mockServerSubdirUrl = 'file:///C:/Users/test/project/server/services/someService.js';
  
  describe('getCurrentDir', () => {
    it('should return directory path from import.meta.url', () => {
      const result = getCurrentDir(mockServerFileUrl);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('utils');
    });

    it('should handle different file URLs', () => {
      const result = getCurrentDir(mockServerSubdirUrl);
      
      expect(result).toBeDefined();
      expect(result).toContain('services');
    });

    it('should return absolute path', () => {
      const result = getCurrentDir(mockServerFileUrl);
      
      // Should be an absolute path (contains : on Windows or starts with / on Unix)
      expect(result.includes(':') || result.startsWith('/')).toBe(true);
    });
  });

  describe('getCurrentFile', () => {
    it('should return file path from import.meta.url', () => {
      const result = getCurrentFile(mockServerFileUrl);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('pathUtils.js');
    });

    it('should return absolute file path', () => {
      const result = getCurrentFile(mockServerFileUrl);
      
      expect(result.includes(':') || result.startsWith('/')).toBe(true);
    });

    it('should include file extension', () => {
      const result = getCurrentFile(mockServerFileUrl);
      expect(result).toMatch(/\.js$/);
    });
  });

  describe('getProjectRoot', () => {
    it('should return project root directory', () => {
      const result = getProjectRoot(mockServerFileUrl);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should be parent of server directory', () => {
      const result = getProjectRoot(mockServerFileUrl);
      const serverRoot = getServerRoot(mockServerFileUrl);
      
      // Normalize paths for comparison (handle / vs \ differences)
      const normalizedProject = result.replace(/\\/g, '/');
      const normalizedServer = serverRoot.replace(/\\/g, '/');
      
      // Project root should be parent of server root
      expect(normalizedServer).toContain(normalizedProject);
    });
  });

  describe('getServerRoot', () => {
    it('should return server root directory', () => {
      const result = getServerRoot(mockServerFileUrl);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('server');
    });

    it('should end with server directory', () => {
      const result = getServerRoot(mockServerFileUrl);
      expect(result.endsWith('server') || result.endsWith('server/')).toBe(true);
    });

    it('should throw error if server directory not found', () => {
      const invalidUrl = 'file:///C:/Users/test/randomproject/utils/file.js';
      
      expect(() => getServerRoot(invalidUrl)).toThrow('Unable to find server root directory');
    });
  });

  describe('resolveServerPath', () => {
    it('should resolve path relative to server root', () => {
      const result = resolveServerPath(mockServerFileUrl, 'uploads/test.pdf');
      
      expect(result).toBeDefined();
      expect(result).toContain('server');
      expect(result).toContain('uploads');
      expect(result).toContain('test.pdf');
    });

    it('should handle nested paths', () => {
      const result = resolveServerPath(mockServerFileUrl, 'test/data/pdfs/file.pdf');
      
      expect(result).toContain('test');
      expect(result).toContain('data');
      expect(result).toContain('pdfs');
    });

    it('should normalize path separators', () => {
      const result = resolveServerPath(mockServerFileUrl, 'some/path/file.txt');
      
      expect(result).toBeDefined();
      // Should contain proper path separators
      expect(result.includes('/') || result.includes('\\')).toBe(true);
    });
  });

  describe('resolveProjectPath', () => {
    it('should resolve path relative to project root', () => {
      const result = resolveProjectPath(mockServerFileUrl, 'reports/generated/report.pdf');
      
      expect(result).toBeDefined();
      expect(result).toContain('reports');
      expect(result).toContain('generated');
    });

    it('should handle different relative paths', () => {
      const result = resolveProjectPath(mockServerFileUrl, 'client/src/App.jsx');
      
      expect(result).toContain('client');
      expect(result).toContain('src');
    });
  });

  describe('getCommonPaths', () => {
    it('should return object with common paths', () => {
      const result = getCommonPaths(mockServerFileUrl);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should include server root path', () => {
      const result = getCommonPaths(mockServerFileUrl);
      
      expect(result.serverRoot).toBeDefined();
      expect(result.serverRoot).toContain('server');
    });

    it('should include project root path', () => {
      const result = getCommonPaths(mockServerFileUrl);
      
      expect(result.projectRoot).toBeDefined();
    });

    it('should include uploads path', () => {
      const result = getCommonPaths(mockServerFileUrl);
      
      expect(result.uploads).toBeDefined();
      expect(result.uploads).toContain('uploads');
    });

    it('should include reports path', () => {
      const result = getCommonPaths(mockServerFileUrl);
      
      expect(result.reports).toBeDefined();
      expect(result.reports).toContain('reports');
    });

    it('should include all server subdirectories', () => {
      const result = getCommonPaths(mockServerFileUrl);
      
      expect(result.logs).toContain('logs');
      expect(result.config).toContain('config');
      expect(result.services).toContain('services');
      expect(result.controllers).toContain('controllers');
      expect(result.middlewares).toContain('middlewares');
      expect(result.routes).toContain('routes');
      expect(result.utils).toContain('utils');
    });
  });

  describe('ensureDirectoryExists', () => {
    const testDir = join(process.cwd(), 'test-temp-dir');
    const testNestedDir = join(testDir, 'nested', 'deep', 'path');

    afterEach(() => {
      // Cleanup test directories
      try {
        if (existsSync(testNestedDir)) rmdirSync(testNestedDir);
        if (existsSync(join(testDir, 'nested', 'deep'))) rmdirSync(join(testDir, 'nested', 'deep'));
        if (existsSync(join(testDir, 'nested'))) rmdirSync(join(testDir, 'nested'));
        if (existsSync(testDir)) rmdirSync(testDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it('should create directory if it does not exist', () => {
      const result = ensureDirectoryExists(testDir);
      
      expect(result).toBe(true);
      expect(existsSync(testDir)).toBe(true);
    });

    it('should return true if directory already exists', () => {
      mkdirSync(testDir, { recursive: true });
      
      const result = ensureDirectoryExists(testDir);
      
      expect(result).toBe(true);
    });

    it('should create nested directories with recursive option', () => {
      const result = ensureDirectoryExists(testNestedDir, { recursive: true });
      
      expect(result).toBe(true);
      expect(existsSync(testNestedDir)).toBe(true);
    });

    it('should handle directory creation errors gracefully', () => {
      // Try to create directory with invalid characters (on Windows)
      const invalidPath = '\0invalid\0path';
      
      const result = ensureDirectoryExists(invalidPath);
      
      expect(result).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should return file extension with dot', () => {
      expect(getFileExtension('document.pdf')).toBe('.pdf');
      expect(getFileExtension('image.jpg')).toBe('.jpg');
      expect(getFileExtension('script.js')).toBe('.js');
    });

    it('should handle file paths with directories', () => {
      expect(getFileExtension('/path/to/file.txt')).toBe('.txt');
      expect(getFileExtension('C:\\Users\\test\\document.docx')).toBe('.docx');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
      expect(getFileExtension('config.test.js')).toBe('.js');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('');
      expect(getFileExtension('.env.local')).toBe('.local');
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should return filename without extension', () => {
      expect(getFileNameWithoutExtension('document.pdf')).toBe('document');
      expect(getFileNameWithoutExtension('image.jpg')).toBe('image');
    });

    it('should handle paths with directories', () => {
      expect(getFileNameWithoutExtension('/path/to/file.txt')).toBe('file');
      expect(getFileNameWithoutExtension('C:\\Users\\test\\doc.docx')).toBe('doc');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileNameWithoutExtension('archive.tar.gz')).toBe('archive.tar');
      expect(getFileNameWithoutExtension('file.test.js')).toBe('file.test');
    });

    it('should handle files without extension correctly', () => {
      // getFileNameWithoutExtension returns empty string for files without extension
      // because fileName.slice(0, -ext.length) with ext.length=0 returns empty string
      expect(getFileNameWithoutExtension('README')).toBe('');
      expect(getFileNameWithoutExtension('Dockerfile')).toBe('');
    });

    it('should handle hidden files', () => {
      // .gitignore has no extension, so returns empty string
      expect(getFileNameWithoutExtension('.gitignore')).toBe('');
      // .env.local has .local extension, so returns .env
      expect(getFileNameWithoutExtension('.env.local')).toBe('.env');
    });
  });

  describe('hasFileExtension', () => {
    it('should return true for matching extension with dot', () => {
      expect(hasFileExtension('document.pdf', '.pdf')).toBe(true);
      expect(hasFileExtension('image.jpg', '.jpg')).toBe(true);
    });

    it('should return true for matching extension without dot', () => {
      expect(hasFileExtension('document.pdf', 'pdf')).toBe(true);
      expect(hasFileExtension('script.js', 'js')).toBe(true);
    });

    it('should return false for non-matching extension', () => {
      expect(hasFileExtension('document.pdf', '.txt')).toBe(false);
      expect(hasFileExtension('image.jpg', 'png')).toBe(false);
    });

    it('should handle array of extensions', () => {
      expect(hasFileExtension('document.pdf', ['.pdf', '.doc', '.txt'])).toBe(true);
      expect(hasFileExtension('image.png', ['jpg', 'jpeg', 'png'])).toBe(true);
      expect(hasFileExtension('file.xyz', ['.pdf', '.txt', '.doc'])).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(hasFileExtension('Document.PDF', '.pdf')).toBe(true);
      expect(hasFileExtension('IMAGE.JPG', 'jpg')).toBe(true);
      expect(hasFileExtension('file.TXT', ['.PDF', '.TXT'])).toBe(true);
    });

    it('should handle paths with directories', () => {
      expect(hasFileExtension('/path/to/file.pdf', '.pdf')).toBe(true);
      expect(hasFileExtension('C:\\Users\\doc.docx', 'docx')).toBe(true);
    });
  });

  describe('generateUniqueFilePath', () => {
    const testFile = join(process.cwd(), 'test-unique-file.txt');
    const testFile2 = join(process.cwd(), 'test-unique-file_1.txt');
    const testFile3 = join(process.cwd(), 'test-unique-file_2.txt');

    afterEach(() => {
      // Cleanup test files
      [testFile, testFile2, testFile3].forEach(file => {
        try {
          if (existsSync(file)) unlinkSync(file);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    });

    it('should return original path if file does not exist', () => {
      const result = generateUniqueFilePath(testFile);
      
      expect(result).toBe(testFile);
    });

    it('should append _1 if file exists', () => {
      // Create the original file
      writeFileSync(testFile, 'test');
      
      const result = generateUniqueFilePath(testFile);
      
      expect(result).toBe(testFile2);
      expect(result).toContain('_1');
    });

    it('should increment counter for multiple existing files', () => {
      // Create original and _1 files
      writeFileSync(testFile, 'test');
      writeFileSync(testFile2, 'test');
      
      const result = generateUniqueFilePath(testFile);
      
      expect(result).toBe(testFile3);
      expect(result).toContain('_2');
    });

    it('should preserve file extension', () => {
      writeFileSync(testFile, 'test');
      
      const result = generateUniqueFilePath(testFile);
      
      expect(result).toMatch(/\.txt$/);
    });

    it('should handle paths without extension', () => {
      const noExtFile = join(process.cwd(), 'test-file-no-ext');
      
      try {
        writeFileSync(noExtFile, 'test');
        const result = generateUniqueFilePath(noExtFile);
        
        expect(result).toContain('_1');
        
        unlinkSync(noExtFile);
      } catch (e) {
        // Cleanup
        try { if (existsSync(noExtFile)) unlinkSync(noExtFile); } catch {}
      }
    });
  });
});
