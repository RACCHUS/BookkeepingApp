/**
 * @fileoverview Utils Unit Tests
 * @description Comprehensive unit tests for utility functions
 * @version 1.0.0
 */

import { jest } from '@jest/globals';

// Import utility functions
import { 
  logger,
  validateRequired,
  validateEmail,
  validateUUID,
  sendSuccess,
  sendError,
  formatCurrency,
  parseFinancialAmount,
  isValidDateRange,
  formatDateForAPI
} from '../../../utils/index.js';

import { createMockResponse } from '../../fixtures/helpers/testHelpers.js';

describe('Validation Utils', () => {
  describe('validateRequired', () => {
    it('should return true for valid object with all required fields', () => {
      const obj = { name: 'John', email: 'john@test.com', age: 30 };
      const result = validateRequired(obj, ['name', 'email']);
      
      expect(result).toBe(true);
    });

    it('should return false for object missing required fields', () => {
      const obj = { name: 'John' };
      const result = validateRequired(obj, ['name', 'email']);
      
      expect(result).toBe(false);
    });

    it('should return true when no required fields specified', () => {
      const obj = { name: 'John' };
      const result = validateRequired(obj);
      
      expect(result).toBe(true);
    });

    it('should handle null and undefined values', () => {
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
      expect(validateRequired({})).toBe(true);
    });

    it('should handle empty string values as invalid', () => {
      const obj = { name: '', email: 'test@test.com' };
      const result = validateRequired(obj, ['name', 'email']);
      
      expect(result).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'firstname+lastname@company.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user name@domain.com',
        'user@domain',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle null and undefined', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should return true for valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'g47ac10b-58cc-4372-a567-0e02b2c3d479', // invalid character
        '123e4567-e89b-12d3-a456-42661417400', // wrong length
        ''
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });
});

describe('Response Helpers', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = createMockResponse();
  });

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';

      sendSuccess(mockRes, data, message);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });

    it('should send success response without data', () => {
      sendSuccess(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation completed successfully',
        data: null
      });
    });

    it('should allow custom status code', () => {
      sendSuccess(mockRes, null, 'Created', 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('sendError', () => {
    it('should send error response with message', () => {
      const message = 'Something went wrong';

      sendError(mockRes, message);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details: null
      });
    });

    it('should allow custom status code', () => {
      sendError(mockRes, 'Not found', 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should include error details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      
      sendError(mockRes, 'Validation error', 400, details);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details
      });
    });
  });
});

describe('Financial Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-0.99)).toBe('-$0.99');
    });

    it('should handle zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle different currencies', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
    });
  });

  describe('parseFinancialAmount', () => {
    it('should parse valid financial amounts', () => {
      expect(parseFinancialAmount('$1,234.56')).toBe(1234.56);
      expect(parseFinancialAmount('1234.56')).toBe(1234.56);
      expect(parseFinancialAmount('($500.00)')).toBe(-500.00);
      expect(parseFinancialAmount('-$250.75')).toBe(-250.75);
    });

    it('should handle invalid amounts', () => {
      expect(parseFinancialAmount('not-a-number')).toBeNaN();
      expect(parseFinancialAmount('')).toBe(0);
      expect(parseFinancialAmount(null)).toBe(0);
    });
  });
});

describe('Date Utils', () => {
  describe('isValidDateRange', () => {
    it('should validate correct date ranges', () => {
      const start = '2025-01-01';
      const end = '2025-12-31';
      
      expect(isValidDateRange(start, end)).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      const start = '2025-12-31';
      const end = '2025-01-01';
      
      expect(isValidDateRange(start, end)).toBe(false);
    });

    it('should handle same dates', () => {
      const date = '2025-07-01';
      
      expect(isValidDateRange(date, date)).toBe(true);
    });
  });

  describe('formatDateForAPI', () => {
    it('should format dates for API', () => {
      const date = new Date('2025-07-10T15:30:00Z');
      const result = formatDateForAPI(date);
      
      expect(result).toBe('2025-07-10');
    });

    it('should handle string dates', () => {
      const result = formatDateForAPI('2025-07-10T15:30:00Z');
      
      expect(result).toBe('2025-07-10');
    });
  });
});

describe('Logger', () => {
  beforeEach(() => {
    // Clear any existing mock calls
    jest.clearAllMocks();
  });

  it('should have all log levels available', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log messages without throwing errors', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warning message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });
});
