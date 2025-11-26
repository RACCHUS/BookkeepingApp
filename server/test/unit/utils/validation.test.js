/**
 * @fileoverview Validation Utils Comprehensive Tests
 * @description Complete test coverage for validation utility functions
 * @version 1.0.0
 * 
 * Target: 80%+ coverage for validation.js
 */

import { jest } from '@jest/globals';
import {
  validateUUID,
  validateRequired,
  validateAmount,
  validateDate,
  validateEIN,
  validateEmail,
  validatePhone,
  validateCategory,
  validateDescription,
  validatePagination,
  validateDateRange,
  sanitizeString,
  validateObjectId
} from '../../../utils/validation.js';

describe('Validation Utils', () => {
  describe('validateUUID', () => {
    it('should validate correct UUID v4', () => {
      const validUUIDs = [
        'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
        '550e8400-e29b-41d4-a716-446655440000',
        '12345678-1234-4123-8123-123456789abc'
      ];
      
      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345678-1234-5123-8123-123456789abc', // Wrong version (5 instead of 4)
        '12345678-1234-4123-c123-123456789abc', // Wrong variant
        '12345678123441238123123456789abc', // Missing hyphens
        ''
      ];
      
      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });

    it('should handle non-string inputs', () => {
      expect(validateUUID(123)).toBe(false);
      expect(validateUUID(null)).toBe(false);
      expect(validateUUID(undefined)).toBe(false);
      expect(validateUUID({})).toBe(false);
    });

    it('should handle UUIDs with whitespace', () => {
      const uuidWithSpaces = '  a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789  ';
      expect(validateUUID(uuidWithSpaces)).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(validateUUID('A1B2C3D4-E5F6-4789-A012-B3C4D5E6F789')).toBe(true);
      expect(validateUUID('a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789')).toBe(true);
    });
  });

  describe('validateRequired', () => {
    it('should validate object with all non-empty values', () => {
      const obj = { name: 'Test', value: 123, active: true };
      expect(validateRequired(obj)).toBe(true);
    });

    it('should reject object with empty values', () => {
      expect(validateRequired({ name: '', value: 123 })).toBe(false);
      expect(validateRequired({ name: null })).toBe(false);
      expect(validateRequired({ name: undefined })).toBe(false);
    });

    it('should validate specific required fields', () => {
      const obj = { name: 'Test', value: '', other: 123 };
      expect(validateRequired(obj, ['name', 'other'])).toBe(true);
      expect(validateRequired(obj, ['name', 'value'])).toBe(false);
    });

    it('should handle empty required fields array', () => {
      const obj = { name: 'Test', value: 123 };
      expect(validateRequired(obj, [])).toBe(true);
    });

    it('should reject non-object inputs', () => {
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
      expect(validateRequired('string')).toBe(false);
      expect(validateRequired(123)).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive numbers', () => {
      const result = validateAmount(100.50);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(100.50);
      expect(result.formatted).toBe('100.50');
    });

    it('should validate negative numbers', () => {
      const result = validateAmount(-50.25);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(-50.25);
    });

    it('should round to 2 decimal places', () => {
      const result = validateAmount(100.999);
      expect(result.value).toBe(101.00);
      expect(result.formatted).toBe('101.00');
    });

    it('should reject null and undefined', () => {
      expect(validateAmount(null).isValid).toBe(false);
      expect(validateAmount(null).error).toContain('required');
      expect(validateAmount(undefined).isValid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid number');
    });

    it('should reject infinite values', () => {
      const result = validateAmount(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('finite');
    });

    it('should parse string numbers', () => {
      const result = validateAmount('123.45');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(123.45);
    });

    it('should handle zero', () => {
      const result = validateAmount(0);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(0);
      expect(result.formatted).toBe('0.00');
    });
  });

  describe('validateDate', () => {
    it('should validate valid ISO date strings', () => {
      const result = validateDate('2024-06-15');
      expect(result.isValid).toBe(true);
      expect(result.value).toBeInstanceOf(Date);
      expect(result.isoString).toBeDefined();
    });

    it('should reject empty dates', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject invalid date formats', () => {
      const result = validateDate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid date');
    });

    it('should reject dates too far in the past', () => {
      const result = validateDate('1850-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between');
    });

    it('should reject dates too far in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 20);
      const result = validateDate(futureDate.toISOString());
      expect(result.isValid).toBe(false);
    });

    it('should accept current date', () => {
      const result = validateDate(new Date().toISOString());
      expect(result.isValid).toBe(true);
    });

    it('should accept dates from year 1901', () => {
      const result = validateDate('1901-01-01');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEIN', () => {
    it('should validate correctly formatted EIN', () => {
      const result = validateEIN('12-3456789');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('12-3456789');
      expect(result.digits).toBe('123456789');
    });

    it('should format unformatted EIN', () => {
      const result = validateEIN('123456789');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('12-3456789');
    });

    it('should reject empty EIN', () => {
      const result = validateEIN('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject EIN with wrong number of digits', () => {
      expect(validateEIN('12-34567').isValid).toBe(false);
      expect(validateEIN('12-34567').error).toContain('9 digits');
    });

    it('should handle EIN with spaces', () => {
      const result = validateEIN('12 3456789');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('12-3456789');
    });

    it('should strip non-numeric characters', () => {
      const result = validateEIN('12-345-6789');
      expect(result.isValid).toBe(true);
      expect(result.digits).toBe('123456789');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+tag@company.org'
      ];
      
      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example'
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email).isValid).toBe(false);
      });
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should normalize email to lowercase', () => {
      const result = validateEmail('Test@Example.COM');
      expect(result.value).toBe('test@example.com');
    });

    it('should normalize email to lowercase', () => {
      const result = validateEmail('Test@Example.COM');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('test@example.com');
    });
  });

  describe('validatePhone', () => {
    it('should validate and format US phone numbers', () => {
      const result = validatePhone('1234567890');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('(123) 456-7890');
      expect(result.digits).toBe('1234567890');
    });

    it('should handle phone with formatting', () => {
      const result = validatePhone('(123) 456-7890');
      expect(result.isValid).toBe(true);
      expect(result.digits).toBe('1234567890');
    });

    it('should reject empty phone', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject phone with too few digits', () => {
      const result = validatePhone('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 10 digits');
    });

    it('should reject phone with too many digits', () => {
      const result = validatePhone('1234567890123456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 15 digits');
    });

    it('should handle international numbers', () => {
      const result = validatePhone('12345678901');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('+12345678901');
    });

    it('should strip non-digit characters and include all digits', () => {
      const result = validatePhone('+1 (234) 567-8900');
      expect(result.digits).toBe('12345678900');
    });
  });

  describe('validateCategory', () => {
    it('should validate normal category names', () => {
      const result = validateCategory('Office Supplies');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('Office Supplies');
    });

    it('should reject empty category', () => {
      expect(validateCategory('').isValid).toBe(false);
      expect(validateCategory('   ').isValid).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateCategory(null).isValid).toBe(false);
      expect(validateCategory(undefined).isValid).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateCategory(123).isValid).toBe(false);
      expect(validateCategory({}).isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateCategory('  Travel  ');
      expect(result.value).toBe('Travel');
    });

    it('should reject categories over 100 characters', () => {
      const longCategory = 'a'.repeat(101);
      const result = validateCategory(longCategory);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100 characters');
    });

    it('should accept categories up to 100 characters', () => {
      const maxCategory = 'a'.repeat(100);
      const result = validateCategory(maxCategory);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should validate normal descriptions', () => {
      const result = validateDescription('Monthly office rent payment');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('Monthly office rent payment');
    });

    it('should reject empty description', () => {
      expect(validateDescription('').isValid).toBe(false);
      expect(validateDescription('   ').isValid).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateDescription(null).isValid).toBe(false);
      expect(validateDescription(undefined).isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateDescription('  Purchase order #123  ');
      expect(result.value).toBe('Purchase order #123');
    });

    it('should reject descriptions over 500 characters', () => {
      const longDesc = 'a'.repeat(501);
      const result = validateDescription(longDesc);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('500 characters');
    });

    it('should accept descriptions up to 500 characters', () => {
      const maxDesc = 'a'.repeat(500);
      const result = validateDescription(maxDesc);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePagination', () => {
    it('should validate default pagination', () => {
      const result = validatePagination();
      expect(result.isValid).toBe(true);
      expect(result.value.limit).toBe(50);
      expect(result.value.offset).toBe(0);
    });

    it('should validate custom limit and offset', () => {
      const result = validatePagination({ limit: 100, offset: 20 });
      expect(result.isValid).toBe(true);
      expect(result.value.limit).toBe(100);
      expect(result.value.offset).toBe(20);
    });

    it('should reject limit below 1', () => {
      const result = validatePagination({ limit: 0 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('between 1 and 1000');
    });

    it('should reject limit above 1000', () => {
      const result = validatePagination({ limit: 1001 });
      expect(result.isValid).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = validatePagination({ offset: -1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('0 or greater');
    });

    it('should parse string values', () => {
      const result = validatePagination({ limit: '25', offset: '10' });
      expect(result.isValid).toBe(true);
      expect(result.value.limit).toBe(25);
      expect(result.value.offset).toBe(10);
    });

    it('should accept limit of 1', () => {
      const result = validatePagination({ limit: 1 });
      expect(result.isValid).toBe(true);
    });

    it('should accept limit of 1000', () => {
      const result = validatePagination({ limit: 1000 });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDateRange', () => {
    it('should validate valid date range', () => {
      const result = validateDateRange('2024-01-01', '2024-12-31');
      expect(result.isValid).toBe(true);
      expect(result.value.startDate).toBeInstanceOf(Date);
      expect(result.value.endDate).toBeInstanceOf(Date);
      expect(result.value.daysDifference).toBeGreaterThan(0);
    });

    it('should reject invalid start date', () => {
      const result = validateDateRange('invalid', '2024-12-31');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Start date');
    });

    it('should reject invalid end date', () => {
      const result = validateDateRange('2024-01-01', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End date');
    });

    it('should reject end date before start date', () => {
      const result = validateDateRange('2024-12-31', '2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('before end date');
    });

    it('should reject date range over 10 years', () => {
      const result = validateDateRange('2010-01-01', '2025-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 10 years');
    });

    it('should accept same day range', () => {
      const result = validateDateRange('2024-06-15', '2024-06-15');
      expect(result.isValid).toBe(true);
      expect(result.value.daysDifference).toBe(0);
    });

    it('should calculate days difference', () => {
      const result = validateDateRange('2024-01-01', '2024-01-10');
      expect(result.value.daysDifference).toBe(9);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace by default', () => {
      const result = sanitizeString('  test  ');
      expect(result).toBe('test');
    });

    it('should remove HTML tags by default', () => {
      const result = sanitizeString('<b>Hello</b> <i>World</i>');
      expect(result).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should return empty for non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });

    it('should not trim when option is false', () => {
      const result = sanitizeString('  test  ', { trim: false });
      expect(result).toBe('  test  ');
    });

    it('should not remove HTML when option is false', () => {
      const result = sanitizeString('<b>test</b>', { removeHTML: false });
      expect(result).toBe('<b>test</b>');
    });

    it('should remove special characters when option is true', () => {
      const result = sanitizeString('test<>&"\'', { removeSpecialChars: true });
      expect(result).toBe('test');
    });

    it('should limit length when maxLength is set', () => {
      const result = sanitizeString('hello world', { maxLength: 5 });
      expect(result).toBe('hello');
    });

    it('should combine multiple options', () => {
      const result = sanitizeString('  <b>Hello World!</b>  ', {
        trim: true,
        removeHTML: true,
        maxLength: 8
      });
      expect(result).toBe('Hello Wo');
    });
  });

  describe('validateObjectId', () => {
    it('should validate normal object IDs', () => {
      const result = validateObjectId('user123');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('user123');
    });

    it('should reject empty ID', () => {
      expect(validateObjectId('').isValid).toBe(false);
      expect(validateObjectId('   ').isValid).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateObjectId(null).isValid).toBe(false);
      expect(validateObjectId(undefined).isValid).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateObjectId(123).isValid).toBe(false);
      expect(validateObjectId({}).isValid).toBe(false);
    });

    it('should reject IDs over 1500 characters', () => {
      const longId = 'a'.repeat(1501);
      const result = validateObjectId(longId);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should accept IDs up to 1500 characters', () => {
      const maxId = 'a'.repeat(1500);
      const result = validateObjectId(maxId);
      expect(result.isValid).toBe(true);
    });

    it('should reject IDs with forward slashes', () => {
      const result = validateObjectId('user/123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject IDs with control characters', () => {
      const result = validateObjectId('user\x00123');
      expect(result.isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateObjectId('  user123  ');
      expect(result.value).toBe('user123');
    });

    it('should accept alphanumeric IDs', () => {
      const result = validateObjectId('abc123-DEF456_xyz');
      expect(result.isValid).toBe(true);
    });
  });
});
