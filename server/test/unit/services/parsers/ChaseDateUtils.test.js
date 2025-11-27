/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import ChaseDateUtils from '../../../../services/parsers/ChaseDateUtils.js';

describe('ChaseDateUtils', () => {
  describe('toISODate', () => {
    it('should convert MM/DD to ISO 8601 format with year', () => {
      const result = ChaseDateUtils.toISODate('01/15', 2024);
      expect(result).toBe('2024-01-15T12:00:00');
    });

    it('should handle single digit month and day', () => {
      const result = ChaseDateUtils.toISODate('3/5', 2024);
      expect(result).toBe('2024-03-05T12:00:00');
    });

    it('should pad month and day with zeros', () => {
      const result = ChaseDateUtils.toISODate('1/1', 2024);
      expect(result).toBe('2024-01-01T12:00:00');
    });

    it('should handle dates with dashes (MM-DD)', () => {
      const result = ChaseDateUtils.toISODate('12-31', 2024);
      expect(result).toBe('2024-12-31T12:00:00');
    });

    it('should normalize mixed separators', () => {
      const result = ChaseDateUtils.toISODate('6-15', 2023);
      expect(result).toBe('2023-06-15T12:00:00');
    });

    it('should handle different years', () => {
      const result1 = ChaseDateUtils.toISODate('07/04', 2020);
      const result2 = ChaseDateUtils.toISODate('07/04', 2025);
      
      expect(result1).toBe('2020-07-04T12:00:00');
      expect(result2).toBe('2025-07-04T12:00:00');
    });

    it('should return null for invalid date string (no separator)', () => {
      const result = ChaseDateUtils.toISODate('0115', 2024);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = ChaseDateUtils.toISODate('', 2024);
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = ChaseDateUtils.toISODate(null, 2024);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = ChaseDateUtils.toISODate(undefined, 2024);
      expect(result).toBeNull();
    });

    it('should return null for malformed date (only month)', () => {
      const result = ChaseDateUtils.toISODate('12/', 2024);
      expect(result).toBeNull();
    });

    it('should return null for malformed date (only day)', () => {
      const result = ChaseDateUtils.toISODate('/15', 2024);
      expect(result).toBeNull();
    });

    it('should handle leap year dates', () => {
      const result = ChaseDateUtils.toISODate('02/29', 2024);
      expect(result).toBe('2024-02-29T12:00:00');
    });

    it('should handle end of year dates', () => {
      const result = ChaseDateUtils.toISODate('12/31', 2024);
      expect(result).toBe('2024-12-31T12:00:00');
    });

    it('should handle start of year dates', () => {
      const result = ChaseDateUtils.toISODate('01/01', 2024);
      expect(result).toBe('2024-01-01T12:00:00');
    });

    it('should always use T12:00:00 for time', () => {
      const result = ChaseDateUtils.toISODate('06/15', 2024);
      expect(result).toContain('T12:00:00');
    });
  });
});
