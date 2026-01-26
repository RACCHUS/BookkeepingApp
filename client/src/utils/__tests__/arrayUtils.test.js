/**
 * Unit tests for arrayUtils
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  chunkArray, 
  processInChunks, 
  updateInChunks, 
  BATCH_SIZE 
} from '../arrayUtils';

describe('arrayUtils', () => {
  describe('BATCH_SIZE constant', () => {
    it('should be a reasonable default for database queries', () => {
      expect(BATCH_SIZE).toBeGreaterThanOrEqual(100);
      expect(BATCH_SIZE).toBeLessThanOrEqual(500);
    });
  });

  describe('chunkArray', () => {
    it('should chunk an array into specified sizes', () => {
      const result = chunkArray([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should return single chunk when array is smaller than size', () => {
      const result = chunkArray([1, 2, 3], 10);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should return empty array for empty input', () => {
      const result = chunkArray([], 5);
      expect(result).toEqual([]);
    });

    it('should use BATCH_SIZE as default chunk size', () => {
      const largeArray = Array.from({ length: BATCH_SIZE + 50 }, (_, i) => i);
      const result = chunkArray(largeArray);
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(BATCH_SIZE);
      expect(result[1].length).toBe(50);
    });

    it('should handle non-array input gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = chunkArray(null, 5);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle invalid size gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = chunkArray([1, 2, 3], 0);
      expect(result).toEqual([[1, 2, 3]]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle negative size gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = chunkArray([1, 2, 3], -5);
      expect(result).toEqual([[1, 2, 3]]);
      consoleSpy.mockRestore();
    });

    it('should handle 1000 items (typical large import)', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `tx_${i}`);
      const result = chunkArray(largeArray, BATCH_SIZE);
      
      // Should split into 4 chunks with default BATCH_SIZE of 250
      expect(result.length).toBe(Math.ceil(1000 / BATCH_SIZE));
      
      // All items should be preserved
      const flattened = result.flat();
      expect(flattened.length).toBe(1000);
      expect(flattened[0]).toBe('tx_0');
      expect(flattened[999]).toBe('tx_999');
    });

    it('should preserve object references in chunks', () => {
      const obj1 = { id: 1, name: 'test1' };
      const obj2 = { id: 2, name: 'test2' };
      const obj3 = { id: 3, name: 'test3' };
      
      const result = chunkArray([obj1, obj2, obj3], 2);
      
      expect(result[0][0]).toBe(obj1);
      expect(result[0][1]).toBe(obj2);
      expect(result[1][0]).toBe(obj3);
    });
  });

  describe('processInChunks', () => {
    it('should process all chunks and combine results', async () => {
      const items = [1, 2, 3, 4, 5];
      const asyncFn = vi.fn(async (chunk) => chunk.map(x => x * 2));
      
      const result = await processInChunks(items, asyncFn, 2);
      
      expect(result).toEqual([2, 4, 6, 8, 10]);
      expect(asyncFn).toHaveBeenCalledTimes(3); // 3 chunks: [1,2], [3,4], [5]
    });

    it('should return empty array for empty input', async () => {
      const asyncFn = vi.fn();
      const result = await processInChunks([], asyncFn);
      
      expect(result).toEqual([]);
      expect(asyncFn).not.toHaveBeenCalled();
    });

    it('should return empty array for null input', async () => {
      const asyncFn = vi.fn();
      const result = await processInChunks(null, asyncFn);
      
      expect(result).toEqual([]);
      expect(asyncFn).not.toHaveBeenCalled();
    });

    it('should propagate errors from async function', async () => {
      const items = [1, 2, 3];
      const asyncFn = vi.fn(async () => {
        throw new Error('Database error');
      });
      
      await expect(processInChunks(items, asyncFn, 2)).rejects.toThrow('Database error');
    });

    it('should handle async function returning non-array', async () => {
      const items = [1, 2, 3];
      const asyncFn = vi.fn(async (chunk) => chunk.length); // Returns a number
      
      const result = await processInChunks(items, asyncFn, 2);
      
      expect(result).toEqual([2, 1]); // Length of each chunk
    });

    it('should handle 1000 items with simulated database fetch', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => `id_${i}`);
      
      // Simulate a database fetch that returns transactions
      const asyncFn = vi.fn(async (ids) => {
        return ids.map(id => ({ id, description: `Transaction ${id}` }));
      });
      
      const result = await processInChunks(items, asyncFn, BATCH_SIZE);
      
      expect(result.length).toBe(1000);
      expect(asyncFn).toHaveBeenCalledTimes(Math.ceil(1000 / BATCH_SIZE));
    });
  });

  describe('updateInChunks', () => {
    it('should track successful updates', async () => {
      const items = [1, 2, 3, 4, 5];
      const updateFn = vi.fn(async () => {}); // Success
      
      const result = await updateInChunks(items, updateFn, 2);
      
      expect(result.success).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should track failed updates', async () => {
      const items = [1, 2, 3, 4, 5];
      let callCount = 0;
      const updateFn = vi.fn(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Update failed');
        }
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await updateInChunks(items, updateFn, 2);
      consoleSpy.mockRestore();
      
      expect(result.success).toBe(3); // Chunks 1 and 3 succeeded (2 + 1 items)
      expect(result.failed).toBe(2);  // Chunk 2 failed (2 items)
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].chunkIndex).toBe(1);
      expect(result.errors[0].error).toBe('Update failed');
    });

    it('should return zeros for empty input', async () => {
      const updateFn = vi.fn();
      const result = await updateInChunks([], updateFn);
      
      expect(result).toEqual({ success: 0, failed: 0, errors: [] });
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      let callCount = 0;
      
      // Fail every other chunk
      const updateFn = vi.fn(async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error(`Chunk ${callCount} failed`);
        }
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await updateInChunks(items, updateFn, 20);
      consoleSpy.mockRestore();
      
      // 5 chunks total, alternating success/fail: 20 + 20 + 20 = 60 success, 40 fail
      expect(result.success).toBe(60);
      expect(result.failed).toBe(40);
      expect(result.errors.length).toBe(2);
    });
  });
});
