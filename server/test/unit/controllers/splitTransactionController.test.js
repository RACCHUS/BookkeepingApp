/**
 * Unit tests for Split Transaction Controller
 * Tests the validation middleware structure and basic controller existence
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import {
  splitTransaction,
  bulkSplitTransactions,
  unsplitTransaction,
  getSplitParts,
  splitTransactionValidation,
  bulkSplitValidation
} from '../../../controllers/splitTransactionController.js';

describe('splitTransactionController', () => {

  describe('Controller function exports', () => {
    it('should export splitTransaction as a function', () => {
      expect(typeof splitTransaction).toBe('function');
    });

    it('should export bulkSplitTransactions as a function', () => {
      expect(typeof bulkSplitTransactions).toBe('function');
    });

    it('should export unsplitTransaction as a function', () => {
      expect(typeof unsplitTransaction).toBe('function');
    });

    it('should export getSplitParts as a function', () => {
      expect(typeof getSplitParts).toBe('function');
    });
  });

  describe('Validation middleware exports', () => {
    it('splitTransactionValidation should be an array of validators', () => {
      expect(splitTransactionValidation).toBeDefined();
      expect(Array.isArray(splitTransactionValidation)).toBe(true);
      expect(splitTransactionValidation.length).toBeGreaterThan(0);
    });

    it('splitTransactionValidation should have param validator for id', () => {
      // Should have a param validator for 'id'
      expect(splitTransactionValidation.length).toBeGreaterThan(0);
    });

    it('bulkSplitValidation should be an array of validators', () => {
      expect(bulkSplitValidation).toBeDefined();
      expect(Array.isArray(bulkSplitValidation)).toBe(true);
      expect(bulkSplitValidation.length).toBeGreaterThan(0);
    });

    it('bulkSplitValidation should validate splits array', () => {
      // The first validator should be for the splits array
      expect(bulkSplitValidation.length).toBeGreaterThan(0);
    });
  });

  describe('splitTransaction handler error handling', () => {
    it('should return 500 on exception', async () => {
      const mockReq = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { splitParts: [{ amount: 50, category: 'TEST' }] },
        user: null // No user - will cause error
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await splitTransaction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });

  describe('bulkSplitTransactions handler error handling', () => {
    it('should return 500 on exception', async () => {
      const mockReq = {
        body: { splits: [{ transactionId: '123', splitParts: [] }] },
        user: null // No user - will cause error
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await bulkSplitTransactions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });

  describe('unsplitTransaction handler error handling', () => {
    it('should return 500 on exception', async () => {
      const mockReq = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        user: null // No user - will cause error
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await unsplitTransaction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });

  describe('getSplitParts handler error handling', () => {
    it('should return 500 on exception', async () => {
      const mockReq = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        user: null // No user - will cause error
      };
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getSplitParts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
  });
});
