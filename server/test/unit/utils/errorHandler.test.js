/**
 * @fileoverview Error Handler Comprehensive Tests
 * @description Complete test coverage for error handling utility functions
 * @version 1.0.0
 * 
 * Target: 80%+ coverage for errorHandler.js
 */

import { jest } from '@jest/globals';
import {
  isFirestoreIndexError,
  getIndexErrorMessage,
  extractIndexCreationUrl,
  logIndexError,
  withIndexFallback
} from '../../../utils/errorHandler.js';

describe('Error Handler Utils', () => {
  // Silence console output during tests
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('isFirestoreIndexError', () => {
    it('should return true for error with code 9 (FAILED_PRECONDITION)', () => {
      const error = { code: 9, message: 'Some error' };
      expect(isFirestoreIndexError(error)).toBe(true);
    });

    it('should return true for error message containing "index"', () => {
      const error = { message: 'This query requires an index' };
      expect(isFirestoreIndexError(error)).toBe(true);
    });

    it('should return true for error message containing "composite index"', () => {
      const error = { message: 'Missing composite index for this query' };
      expect(isFirestoreIndexError(error)).toBe(true);
    });

    it('should return true for error message containing "query requires an index"', () => {
      const error = { message: 'The query requires an index. You can create it here: https://...' };
      expect(isFirestoreIndexError(error)).toBe(true);
    });

    it('should return false for non-index errors', () => {
      const error = { message: 'Permission denied' };
      expect(isFirestoreIndexError(error)).toBe(false);
    });

    it('should return falsy for null error', () => {
      // Function doesn't explicitly check for null, returns falsy
      expect(isFirestoreIndexError(null)).toBeFalsy();
    });

    it('should return falsy for undefined error', () => {
      // Function doesn't explicitly check for undefined, returns falsy
      expect(isFirestoreIndexError(undefined)).toBeFalsy();
    });

    it('should return falsy for error without message', () => {
      const error = { code: 5 };
      // Code 5 is not 9, and no message to check, returns falsy
      expect(isFirestoreIndexError(error)).toBeFalsy();
    });

    it('should handle error with both code and message', () => {
      const error = { code: 9, message: 'Index required' };
      expect(isFirestoreIndexError(error)).toBe(true);
    });
  });

  describe('getIndexErrorMessage', () => {
    it('should return user-friendly message for index errors', () => {
      const error = { code: 9, message: 'Index required' };
      const result = getIndexErrorMessage(error);
      
      expect(result).toContain('Database index configuration needed');
      expect(result).toContain('simplified query as a fallback');
    });

    it('should return original error message for non-index errors', () => {
      const error = { message: 'Permission denied' };
      const result = getIndexErrorMessage(error);
      
      expect(result).toBe('Permission denied');
    });

    it('should return generic message for errors without message', () => {
      const error = { code: 5 };
      const result = getIndexErrorMessage(error);
      
      expect(result).toBe('An unexpected error occurred');
    });

    it('should return generic message for null error', () => {
      // Function now guards against null gracefully
      const result = getIndexErrorMessage(null);
      expect(result).toBe('An unexpected error occurred');
    });

    it('should return generic message for undefined error', () => {
      // Function now guards against undefined gracefully
      const result = getIndexErrorMessage(undefined);
      expect(result).toBe('An unexpected error occurred');
    });
  });

  describe('extractIndexCreationUrl', () => {
    it('should extract Firebase console URL from error message', () => {
      const error = {
        message: 'Index needed. Create it here: https://console.firebase.google.com/project/test/firestore/indexes?create_composite=abc123'
      };
      
      const result = extractIndexCreationUrl(error);
      
      expect(result).toBe('https://console.firebase.google.com/project/test/firestore/indexes?create_composite=abc123');
    });

    it('should handle URL with query parameters', () => {
      const error = {
        message: 'Error: https://console.firebase.google.com/project/myapp/firestore/indexes?param1=value1&param2=value2'
      };
      
      const result = extractIndexCreationUrl(error);
      
      expect(result).toContain('https://console.firebase.google.com');
      expect(result).toContain('param1=value1');
    });

    it('should return null if no URL found', () => {
      const error = { message: 'No URL in this message' };
      
      const result = extractIndexCreationUrl(error);
      
      expect(result).toBeNull();
    });

    it('should return null for error without message', () => {
      const error = { code: 9 };
      
      const result = extractIndexCreationUrl(error);
      
      expect(result).toBeNull();
    });

    it('should return null for null error', () => {
      const result = extractIndexCreationUrl(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined error', () => {
      const result = extractIndexCreationUrl(undefined);
      expect(result).toBeNull();
    });

    it('should extract first URL if multiple URLs present', () => {
      const error = {
        message: 'Check https://console.firebase.google.com/project/test/firestore and also https://example.com'
      };
      
      const result = extractIndexCreationUrl(error);
      
      expect(result).toBe('https://console.firebase.google.com/project/test/firestore');
    });
  });

  describe('logIndexError', () => {
    it('should log warning for index errors', () => {
      const error = {
        code: 9,
        message: 'Index required: https://console.firebase.google.com/test'
      };
      
      logIndexError(error, 'getUserTransactions');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '🔍 Firestore Index Required:',
        expect.objectContaining({
          operation: 'getUserTransactions',
          error: error.message
        })
      );
    });

    it('should include index URL in warning if available', () => {
      const error = {
        message: 'Create index: https://console.firebase.google.com/project/test/indexes'
      };
      
      logIndexError(error, 'test operation');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          indexUrl: 'https://console.firebase.google.com/project/test/indexes'
        })
      );
    });

    it('should include recommendation in warning', () => {
      const error = { code: 9 };
      
      logIndexError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          recommendation: 'Using fallback query. Create the index for optimal performance.'
        })
      );
    });

    it('should use default operation description if not provided', () => {
      const error = { code: 9 };
      
      logIndexError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          operation: 'database operation'
        })
      );
    });

    it('should log error for non-index errors', () => {
      const error = { message: 'Permission denied' };
      
      logIndexError(error, 'getData');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in getData:', error);
    });

    it('should not log warning for non-index errors', () => {
      const error = { message: 'Regular error' };
      
      logIndexError(error);
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle null error gracefully', () => {
      expect(() => logIndexError(null)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('withIndexFallback', () => {
    it('should return result from primary function if successful', async () => {
      const primaryFn = jest.fn().mockResolvedValue({ data: 'primary result' });
      const fallbackFn = jest.fn().mockResolvedValue({ data: 'fallback result' });
      
      const result = await withIndexFallback(primaryFn, fallbackFn, 'test query');
      
      expect(result).toEqual({ data: 'primary result' });
      expect(primaryFn).toHaveBeenCalled();
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should call fallback function if primary throws index error', async () => {
      const indexError = { code: 9, message: 'Index required' };
      const primaryFn = jest.fn().mockRejectedValue(indexError);
      const fallbackFn = jest.fn().mockResolvedValue({ data: 'fallback result' });
      
      const result = await withIndexFallback(primaryFn, fallbackFn, 'complex query');
      
      expect(result).toEqual({ data: 'fallback result' });
      expect(primaryFn).toHaveBeenCalled();
      expect(fallbackFn).toHaveBeenCalled();
    });

    it('should log index error before falling back', async () => {
      const indexError = { message: 'query requires an index' };
      const primaryFn = jest.fn().mockRejectedValue(indexError);
      const fallbackFn = jest.fn().mockResolvedValue({ data: 'fallback' });
      
      await withIndexFallback(primaryFn, fallbackFn, 'user query');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to alternative user query')
      );
    });

    it('should throw error if primary fails with non-index error', async () => {
      const permissionError = new Error('Permission denied');
      const primaryFn = jest.fn().mockRejectedValue(permissionError);
      const fallbackFn = jest.fn().mockResolvedValue({ data: 'fallback' });
      
      await expect(
        withIndexFallback(primaryFn, fallbackFn, 'secure query')
      ).rejects.toThrow('Permission denied');
      
      expect(primaryFn).toHaveBeenCalled();
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should use default operation description if not provided', async () => {
      const indexError = { code: 9 };
      const primaryFn = jest.fn().mockRejectedValue(indexError);
      const fallbackFn = jest.fn().mockResolvedValue({ success: true });
      
      await withIndexFallback(primaryFn, fallbackFn);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to alternative query')
      );
    });

    it('should handle async primary function', async () => {
      const primaryFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'completed' };
      };
      const fallbackFn = jest.fn();
      
      const result = await withIndexFallback(primaryFn, fallbackFn);
      
      expect(result).toEqual({ status: 'completed' });
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should handle async fallback function', async () => {
      const indexError = { message: 'composite index needed' };
      const primaryFn = jest.fn().mockRejectedValue(indexError);
      const fallbackFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { fallback: true };
      };
      
      const result = await withIndexFallback(primaryFn, fallbackFn);
      
      expect(result).toEqual({ fallback: true });
    });

    it('should propagate errors from fallback function', async () => {
      const indexError = { code: 9 };
      const fallbackError = new Error('Fallback also failed');
      const primaryFn = jest.fn().mockRejectedValue(indexError);
      const fallbackFn = jest.fn().mockRejectedValue(fallbackError);
      
      await expect(
        withIndexFallback(primaryFn, fallbackFn)
      ).rejects.toThrow('Fallback also failed');
    });
  });
});
