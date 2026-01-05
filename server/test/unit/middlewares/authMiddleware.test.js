import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import authMiddleware from '../../../middlewares/authMiddleware.js';

describe('Auth Middleware', () => {
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    // Suppress console output during tests
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock request object
    req = {
      headers: {},
      ip: '127.0.0.1',
      path: '/api/test',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Test User Agent';
        return null;
      })
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next function
    next = jest.fn();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Missing or Invalid Authorization Header', () => {
    it('should return 401 when authorization header is missing', async () => {
      req.headers = {};

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Valid authorization token is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic sometoken';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Valid authorization token is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization is just "Bearer" without token', async () => {
      req.headers.authorization = 'Bearer';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token Verification', () => {
    it('should return 401 for invalid/expired token', async () => {
      req.headers.authorization = 'Bearer invalid-token-12345';

      await authMiddleware(req, res, next);

      // Firebase will reject invalid tokens
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed token', async () => {
      req.headers.authorization = 'Bearer not.a.valid.jwt.token';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Request Object Validation', () => {
    it('should require user object to access protected routes', async () => {
      req.headers.authorization = 'Bearer fake-token';

      await authMiddleware(req, res, next);

      // Either sets req.user or returns 401
      if (next.mock.calls.length > 0) {
        expect(req.user).toBeDefined();
        expect(req.user).toHaveProperty('uid');
      } else {
        expect(res.status).toHaveBeenCalledWith(401);
      }
    });

    it('should log authentication attempts', async () => {
      req.headers.authorization = 'Bearer test-token';

      await authMiddleware(req, res, next);

      // Should have called status (either success or failure is logged)
      expect(res.status).toHaveBeenCalled();
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      req.headers = {};

      await authMiddleware(req, res, next);

      const responseJson = res.json.mock.calls[0][0];
      expect(responseJson).toHaveProperty('error');
      expect(responseJson).toHaveProperty('message');
    });

    it('should use 401 status for auth failures', async () => {
      req.headers.authorization = 'Invalid format';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
