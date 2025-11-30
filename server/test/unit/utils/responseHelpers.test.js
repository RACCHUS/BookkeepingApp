/**
 * @fileoverview Response Helpers Comprehensive Tests
 * @description Complete test coverage for response utility functions
 * @version 1.0.0
 * 
 * Target: 90%+ coverage for responseHelpers.js
 */

import { jest } from '@jest/globals';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthError,
  sendForbiddenError,
  sendNotFoundError,
  sendServerError,
  sendCreatedResponse,
  sendNoContentResponse,
  sendPaginatedSuccess,
  sendRateLimitError,
  sendHealthResponse,
  sendFileResponse,
  sendStreamResponse,
  setCacheHeaders,
  setNoCacheHeaders
} from '../../../utils/responseHelpers.js';

describe('Response Helpers', () => {
  let res;
  let mockDate;

  beforeEach(() => {
    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: { requestId: 'test-request-123' }
    };

    // Mock Date to have consistent timestamps
    mockDate = new Date('2024-01-15T10:30:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendSuccess', () => {
    it('should send success response with default values', () => {
      sendSuccess(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: null,
        timestamp: '2024-01-15T10:30:00.000Z',
        requestId: 'test-request-123'
      });
    });

    it('should send success response with custom data and message', () => {
      const data = { id: 1, name: 'Test' };
      sendSuccess(res, data, 'Operation completed');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation completed',
        data,
        timestamp: '2024-01-15T10:30:00.000Z',
        requestId: 'test-request-123'
      });
    });

    it('should send success response with custom status code', () => {
      sendSuccess(res, null, 'Success', 201);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle missing requestId in locals', () => {
      res.locals = {};
      sendSuccess(res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: null })
      );
    });

    it('should include complex data structures', () => {
      const complexData = {
        users: [{ id: 1 }, { id: 2 }],
        meta: { total: 2 }
      };

      sendSuccess(res, complexData);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: complexData })
      );
    });
  });

  describe('sendError', () => {
    it('should send error response with default values', () => {
      sendError(res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad request',
        error: {
          code: 400,
          details: null
        },
        timestamp: '2024-01-15T10:30:00.000Z',
        requestId: 'test-request-123'
      });
    });

    it('should send error response with custom message and status', () => {
      sendError(res, 'Custom error', 500);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Custom error',
          error: expect.objectContaining({ code: 500 })
        })
      );
    });

    it('should include error details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      sendError(res, 'Validation error', 400, details);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ details })
        })
      );
    });

    it('should handle missing requestId', () => {
      res.locals = {};
      sendError(res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: null })
      );
    });
  });

  describe('sendValidationError', () => {
    it('should send validation error with errors array', () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password too short' }
      ];

      sendValidationError(res, errors);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        error: {
          code: 422,
          type: 'VALIDATION_ERROR',
          details: errors
        },
        timestamp: '2024-01-15T10:30:00.000Z',
        requestId: 'test-request-123'
      });
    });

    it('should handle empty errors array', () => {
      sendValidationError(res, []);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ details: [] })
        })
      );
    });
  });

  describe('sendAuthError', () => {
    it('should send authentication error with default message', () => {
      sendAuthError(res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
          error: expect.objectContaining({
            code: 401,
            details: expect.objectContaining({ type: 'AUTHENTICATION_ERROR' })
          })
        })
      );
    });

    it('should send authentication error with custom message', () => {
      sendAuthError(res, 'Invalid credentials');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid credentials' })
      );
    });
  });

  describe('sendForbiddenError', () => {
    it('should send forbidden error with default message', () => {
      sendForbiddenError(res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access forbidden',
          error: expect.objectContaining({
            code: 403,
            details: expect.objectContaining({ type: 'AUTHORIZATION_ERROR' })
          })
        })
      );
    });

    it('should send forbidden error with custom message', () => {
      sendForbiddenError(res, 'Insufficient permissions');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Insufficient permissions' })
      );
    });
  });

  describe('sendNotFoundError', () => {
    it('should send not found error with default message', () => {
      sendNotFoundError(res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Resource not found',
          error: expect.objectContaining({
            code: 404,
            details: expect.objectContaining({ type: 'NOT_FOUND_ERROR' })
          })
        })
      );
    });

    it('should send not found error with custom resource', () => {
      sendNotFoundError(res, 'User');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User not found' })
      );
    });
  });

  describe('sendServerError', () => {
    it('should send server error with default message', () => {
      sendServerError(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
          error: expect.objectContaining({
            code: 500,
            type: 'SERVER_ERROR'
          })
        })
      );
    });

    it('should send server error with custom message', () => {
      sendServerError(res, 'Database connection failed');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection failed'
        })
      );
    });

    it('should include error stack in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      sendServerError(res, 'Server error', error);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              stack: expect.any(String),
              name: 'Error'
            })
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include error stack in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      sendServerError(res, 'Server error', error);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: null
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('sendCreatedResponse', () => {
    it('should send created response with data', () => {
      const data = { id: 'new-id-123', name: 'New Resource' };
      sendCreatedResponse(res, data);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Resource created successfully',
          data
        })
      );
    });

    it('should send created response with custom message', () => {
      sendCreatedResponse(res, { id: 1 }, 'User created');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User created' })
      );
    });
  });

  describe('sendNoContentResponse', () => {
    it('should send no content response', () => {
      res.send = jest.fn().mockReturnThis();
      sendNoContentResponse(res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('sendPaginatedSuccess', () => {
    it('should send paginated response with items and pagination', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = {
        offset: 0,
        limit: 10,
        total: 25
      };

      sendPaginatedSuccess(res, items, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: items,
          pagination: expect.objectContaining({
            currentPage: 1,
            pageSize: 10,
            totalItems: 25,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: false
          }),
          message: 'Success'
        })
      );
    });

    it('should handle empty items array', () => {
      const pagination = {
        offset: 0,
        limit: 10,
        total: 0
      };

      sendPaginatedSuccess(res, [], pagination);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: expect.objectContaining({
            currentPage: 1,
            totalItems: 0,
            totalPages: 1  // Always at least 1 page even if empty
          })
        })
      );
    });

    it('should send paginated response with custom message', () => {
      const pagination = { offset: 0, limit: 10 };
      sendPaginatedSuccess(res, [{ id: 1 }], pagination, 'Transactions loaded');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Transactions loaded' })
      );
    });
  });

  describe('sendRateLimitError', () => {
    it('should send rate limit error with default message', () => {
      sendRateLimitError(res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Too many requests',
          error: expect.objectContaining({
            code: 429,
            details: expect.objectContaining({ type: 'RATE_LIMIT_ERROR' })
          })
        })
      );
    });

    it('should send rate limit error with custom message', () => {
      sendRateLimitError(res, 'Please try again later');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Please try again later' })
      );
    });
  });

  describe('sendHealthResponse', () => {
    beforeEach(() => {
      // Mock process.uptime and process.memoryUsage
      jest.spyOn(process, 'uptime').mockReturnValue(12345);
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100000,
        heapTotal: 50000,
        heapUsed: 30000,
        external: 5000,
        arrayBuffers: 1000
      });
    });

    it('should send healthy response', () => {
      const healthData = {
        status: 'healthy',
        version: '2.0.0',
        checks: { database: 'ok' }
      };

      sendHealthResponse(res, healthData);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          version: '2.0.0',
          checks: { database: 'ok' },
          uptime: 12345
        })
      );
    });

    it('should send unhealthy response with 503 status', () => {
      const healthData = {
        status: 'unhealthy',
        checks: { database: 'error' }
      };

      sendHealthResponse(res, healthData);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          checks: { database: 'error' }
        })
      );
    });
  });

  describe('sendFileResponse', () => {
    it('should send file download response', () => {
      res.setHeader = jest.fn();
      res.sendFile = jest.fn().mockReturnThis();

      sendFileResponse(res, '/path/to/file.pdf', 'report.pdf', 'application/pdf');

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="report.pdf"');
      expect(res.sendFile).toHaveBeenCalledWith('/path/to/file.pdf');
    });

    it('should use default content type', () => {
      res.setHeader = jest.fn();
      res.sendFile = jest.fn().mockReturnThis();

      sendFileResponse(res, '/path/to/file.bin', 'data.bin');

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });
  });

  describe('sendStreamResponse', () => {
    it('should send streaming response', () => {
      const mockStream = {
        pipe: jest.fn()
      };
      res.setHeader = jest.fn();

      sendStreamResponse(res, mockStream, 'text/csv');

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should use default content type', () => {
      const mockStream = { pipe: jest.fn() };
      res.setHeader = jest.fn();

      sendStreamResponse(res, mockStream);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
  });

  describe('setCacheHeaders', () => {
    it('should set cache headers with default max age', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1234567890);
      res.setHeader = jest.fn();

      setCacheHeaders(res);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
      expect(res.setHeader).toHaveBeenCalledWith('ETag', '"1234567890"');
      
      Date.now = originalNow;
    });

    it('should set cache headers with custom max age', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1234567890);
      res.setHeader = jest.fn();

      setCacheHeaders(res, 7200);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=7200');
      
      Date.now = originalNow;
    });
  });

  describe('setNoCacheHeaders', () => {
    it('should set no-cache headers', () => {
      res.setHeader = jest.fn();

      setNoCacheHeaders(res);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(res.setHeader).toHaveBeenCalledWith('Surrogate-Control', 'no-store');
    });
  });
});
