import { describe, test, expect } from 'vitest';
import { getYearDateRange, getMonthDateRange, getCurrentDate, formatDateForDisplay } from '../../utils/dateUtils';

describe('Date Utils', () => {
  describe('getYearDateRange', () => {
    test('returns correct start and end dates for a year', () => {
      const result = getYearDateRange(2023);
      expect(result.start).toBe('2023-01-01');
      expect(result.end).toBe('2023-12-31');
    });

    test('handles leap years correctly', () => {
      const result = getYearDateRange(2024);
      expect(result.start).toBe('2024-01-01');
      expect(result.end).toBe('2024-12-31');
    });
  });

  describe('getMonthDateRange', () => {
    test('returns correct dates for January', () => {
      const result = getMonthDateRange(2023, 0); // January is month 0
      expect(result.start).toBe('2023-01-01');
      expect(result.end).toBe('2023-01-31');
    });

    test('returns correct dates for February in a leap year', () => {
      const result = getMonthDateRange(2024, 1); // February
      expect(result.start).toBe('2024-02-01');
      expect(result.end).toBe('2024-02-29');
    });

    test('returns correct dates for December', () => {
      const result = getMonthDateRange(2023, 11); // December
      expect(result.start).toBe('2023-12-01');
      expect(result.end).toBe('2023-12-31');
    });
  });

  describe('getCurrentDate', () => {
    test('returns a valid date string in YYYY-MM-DD format', () => {
      const result = getCurrentDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateForDisplay', () => {
    test('formats date string for display', () => {
      const result = formatDateForDisplay('2023-06-15');
      // The exact format depends on the locale, but it should be truthy
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
