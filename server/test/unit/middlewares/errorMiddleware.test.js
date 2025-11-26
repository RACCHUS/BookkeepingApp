import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler
} from '../../../middlewares/errorMiddleware.js';

describe('Error Middleware', () => {
  let req, res, next;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;

    // Mock request object
    req = {
      method: 'GET',
      path: '/api/test',
      query: {},
      body: {},
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn(() => 'Test User Agent'),
      user: null,
      id: 'test-request-id'
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function
    next = jest.fn();

    // Set development environment by default
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('errorHandler', () => {
    it('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.details = [
        { path: 'email', message: 'Invalid email', value: 'bad-email' }
      ];

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'The request contains invalid data',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Invalid email'
            })
          ])
        })
      );
    });

    it('should handle authentication errors', () => {
      const error = new Error('Invalid token');
      error.code = 'auth/invalid-user-token';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication Error',
          message: 'Your session has expired. Please log in again.'
        })
      );
    });

    it('should handle Multer file upload errors', () => {
      const error = new Error('File too large');
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';
      error.field = 'file';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File Upload Error',
          message: 'File size exceeds the maximum allowed limit'
        })
      );
    });

    it('should handle file not found errors', () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      error.path = '/path/to/file.pdf';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File Not Found',
          message: 'The requested file could not be found',
          details: { path: '/path/to/file.pdf' }
        })
      );
    });

    it('should handle file size limit errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File Too Large',
          message: 'The uploaded file exceeds the size limit'
        })
      );
    });

    it('should handle rate limit errors', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      error.retryAfter = 120;
      error.limit = 100;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          details: expect.objectContaining({
            retryAfter: 120,
            limit: 100
          })
        })
      );
    });

    it('should handle generic errors in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Something went wrong');
      error.name = 'GenericError';
      error.stack = 'Error stack trace...';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Something went wrong',
          details: expect.objectContaining({
            name: 'GenericError',
            stack: 'Error stack trace...',
            path: '/api/test',
            method: 'GET'
          })
        })
      );
    });

    it('should handle generic errors in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Something went wrong');
      error.name = 'GenericError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred. Please try again later.',
          details: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: 'test-request-id'
          })
        })
      );
      
      // Should NOT include stack trace in production
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.details.stack).toBeUndefined();
    });

    it('should use custom status code from error', () => {
      const error = new Error('Custom error');
      error.status = 503;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 errors for unknown routes', () => {
      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not Found',
          message: 'Route GET /api/test not found',
          details: expect.objectContaining({
            availableRoutes: expect.any(Array)
          })
        })
      );
    });

    it('should handle different HTTP methods', () => {
      req.method = 'POST';
      req.path = '/api/unknown';

      notFoundHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route POST /api/unknown not found'
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async functions', async () => {
      const asyncFn = jest.fn(async (req, res) => {
        res.json({ success: true });
      });

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn(async () => {
        throw error;
      });

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle rejected promises', async () => {
      const error = new Error('Promise rejection');
      const asyncFn = jest.fn(() => Promise.reject(error));

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous functions that return promises', async () => {
      const asyncFn = jest.fn((req, res) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            res.json({ success: true });
            resolve();
          }, 10);
        });
      });

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
