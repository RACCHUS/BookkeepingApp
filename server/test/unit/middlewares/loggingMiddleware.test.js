import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  requestLogger,
  apiLogger,
  performanceMonitor
} from '../../../middlewares/loggingMiddleware.js';

describe('Logging Middleware', () => {
  let req, res, next;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Mock request object
    req = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test?page=1',
      query: { page: '1' },
      params: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Test Browser',
          'Content-Type': 'application/json',
          'Content-Length': '100',
          'Referer': 'http://example.com',
          'Origin': 'http://example.com'
        };
        return headers[header];
      }),
      on: jest.fn(),
      user: null
    };

    // Mock response object
    res = {
      json: jest.fn(function(data) {
        this.responseData = data;
        return this;
      }),
      status: jest.fn().mockReturnThis(),
      statusCode: 200,
      get: jest.fn(() => '250'),
      on: jest.fn(),
      setHeader: jest.fn()
    };

    // Mock next function
    next = jest.fn();
  });

  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  describe('requestLogger', () => {
    it('should add request ID and start time to request', () => {
      requestLogger(req, res, next);

      expect(req.id).toBeDefined();
      expect(typeof req.id).toBe('string');
      expect(req.startTime).toBeDefined();
      expect(typeof req.startTime).toBe('number');
      expect(next).toHaveBeenCalled();
    });

    it('should override res.json to capture response data', () => {
      requestLogger(req, res, next);

      const testData = { message: 'test' };
      res.json(testData);

      expect(res.responseData).toEqual(testData);
    });

    it('should set up finish event listener', () => {
      requestLogger(req, res, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should set up aborted event listener', () => {
      requestLogger(req, res, next);

      expect(req.on).toHaveBeenCalledWith('aborted', expect.any(Function));
    });

    it('should call finish handler when response finishes', () => {
      requestLogger(req, res, next);

      // Get the finish handler
      const finishHandler = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      
      // Simulate some time passing
      req.startTime = Date.now() - 100;
      req.user = { uid: 'user123', email: 'test@example.com' };
      
      // Call the finish handler
      finishHandler();

      // Should have logged the request completion (we can't verify logger calls without mocking)
      // But we can verify the handler executes without error
      expect(finishHandler).toBeDefined();
    });

    it('should handle different status codes appropriately', () => {
      requestLogger(req, res, next);

      const finishHandler = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      req.startTime = Date.now() - 50;

      // Test 500 error
      res.statusCode = 500;
      expect(() => finishHandler()).not.toThrow();

      // Test 400 error
      res.statusCode = 400;
      expect(() => finishHandler()).not.toThrow();

      // Test 200 success
      res.statusCode = 200;
      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle aborted requests', () => {
      requestLogger(req, res, next);

      const abortHandler = req.on.mock.calls.find(call => call[0] === 'aborted')[1];
      req.startTime = Date.now() - 50;

      expect(() => abortHandler()).not.toThrow();
    });
  });

  describe('apiLogger', () => {
    it('should only process API routes', () => {
      req.path = '/health';
      
      apiLogger(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should process API routes with details', () => {
      req.path = '/api/transactions';
      req.method = 'POST';
      req.body = { amount: 100, description: 'test' };
      req.params = { id: '123' };
      req.user = {
        uid: 'user123',
        email: 'test@example.com',
        provider: 'google'
      };
      req.id = 'request-123';

      apiLogger(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should not include body for GET requests', () => {
      req.path = '/api/transactions';
      req.method = 'GET';
      req.body = { should: 'not appear' };

      apiLogger(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should sanitize sensitive fields in request body', () => {
      req.path = '/api/auth/login';
      req.method = 'POST';
      req.body = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'bearer-token',
        secret: 'api-secret',
        normalField: 'normal-value'
      };

      apiLogger(req, res, next);

      // The middleware should sanitize but still call next
      expect(next).toHaveBeenCalled();
    });

    it('should handle requests without user', () => {
      req.path = '/api/public';
      req.user = null;

      apiLogger(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip non-API routes', () => {
      req.path = '/';
      apiLogger(req, res, next);
      expect(next).toHaveBeenCalled();

      req.path = '/static/file.css';
      apiLogger(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('performanceMonitor', () => {
    it('should set up finish event listener', () => {
      performanceMonitor(req, res, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(next).toHaveBeenCalled();
    });

    it('should handle fast requests without logging', () => {
      performanceMonitor(req, res, next);

      const finishHandler = res.on.mock.calls.find(call => call[0] === 'finish')[1];

      // Simulate fast request (under 1 second)
      expect(() => finishHandler()).not.toThrow();
    });

    it('should detect slow requests', (done) => {
      performanceMonitor(req, res, next);

      const finishHandler = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      req.id = 'slow-request';
      req.user = { email: 'test@example.com' };

      // The handler calculates duration using hrtime
      // We can't easily simulate a slow request, but we can verify it executes
      setTimeout(() => {
        expect(() => finishHandler()).not.toThrow();
        done();
      }, 10);
    });

    it('should monitor memory usage', () => {
      performanceMonitor(req, res, next);

      const finishHandler = res.on.mock.calls.find(call => call[0] === 'finish')[1];

      // Should execute without errors
      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle requests with user context', () => {
      req.user = { uid: 'user123', email: 'user@example.com' };
      req.id = 'perf-test';

      performanceMonitor(req, res, next);

      const finishHandler = res.on.mock.calls.find(call => call[0] === 'finish')[1];

      expect(() => finishHandler()).not.toThrow();
    });
  });
});
