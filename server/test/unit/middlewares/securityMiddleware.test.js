import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  requestSizeLimit,
  ipWhitelist,
  validateUserAgent
} from '../../../middlewares/securityMiddleware.js';

describe('Security Middleware', () => {
  let req, res, next;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;

    // Mock request object
    req = {
      ip: '127.0.0.1',
      path: '/api/test',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn((header) => {
        const headers = {
          'Content-Length': '1000',
          'User-Agent': 'Test Browser/1.0'
        };
        return headers[header];
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
    // Restore environment
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  describe('requestSizeLimit', () => {
    it('should allow requests within size limit', () => {
      req.get = jest.fn(() => '5242880'); // 5MB in bytes
      const middleware = requestSizeLimit('10mb');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding size limit', () => {
      req.get = jest.fn(() => '15728640'); // 15MB in bytes
      const middleware = requestSizeLimit('10mb');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Request Too Large',
          message: expect.stringContaining('10mb')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle requests without Content-Length header', () => {
      req.get = jest.fn(() => null);
      const middleware = requestSizeLimit('10mb');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use default size limit of 10mb', () => {
      req.get = jest.fn(() => '15728640'); // 15MB
      const middleware = requestSizeLimit();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('should include received size in error details', () => {
      req.get = jest.fn(() => '12582912'); // 12MB
      const middleware = requestSizeLimit('10mb');

      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            receivedSize: expect.stringMatching(/\d+\.\d+MB/)
          })
        })
      );
    });

    it('should handle custom size limits', () => {
      req.get = jest.fn(() => '6291456'); // 6MB
      const middleware = requestSizeLimit('5mb');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('5mb')
        })
      );
    });
  });

  describe('ipWhitelist', () => {
    it('should allow whitelisted IPs', () => {
      process.env.NODE_ENV = 'production';
      req.ip = '192.168.1.100';
      
      const middleware = ipWhitelist(['192.168.1.100', '192.168.1.101']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block non-whitelisted IPs in production', () => {
      process.env.NODE_ENV = 'production';
      req.ip = '192.168.1.200';
      
      const middleware = ipWhitelist(['192.168.1.100', '192.168.1.101']);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access Forbidden',
          message: expect.stringContaining('not authorized')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow all IPs in development mode', () => {
      process.env.NODE_ENV = 'development';
      req.ip = '192.168.1.999';
      
      const middleware = ipWhitelist(['192.168.1.100']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow all IPs when whitelist is empty', () => {
      process.env.NODE_ENV = 'production';
      req.ip = '192.168.1.200';
      
      const middleware = ipWhitelist([]);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use fallback IP from connection.remoteAddress', () => {
      process.env.NODE_ENV = 'production';
      req.ip = null;
      req.connection.remoteAddress = '192.168.1.100';
      
      const middleware = ipWhitelist(['192.168.1.100']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateUserAgent', () => {
    it('should allow requests with valid User-Agent', () => {
      process.env.NODE_ENV = 'production';
      req.get = jest.fn(() => 'Mozilla/5.0 Chrome/91.0');

      validateUserAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests without User-Agent header', () => {
      req.get = jest.fn(() => null);

      validateUserAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: expect.stringContaining('User-Agent')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should block bot user agents in production', () => {
      process.env.NODE_ENV = 'production';
      req.get = jest.fn(() => 'GoogleBot/2.1');

      validateUserAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access Forbidden'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should block crawler user agents in production', () => {
      process.env.NODE_ENV = 'production';
      req.get = jest.fn(() => 'Web Crawler v1.0');

      validateUserAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block spider user agents in production', () => {
      process.env.NODE_ENV = 'production';
      req.get = jest.fn(() => 'SpiderBot/1.0');

      validateUserAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block scraper user agents in production', () => {
      process.env.NODE_ENV = 'production';
      req.get = jest.fn(() => 'Content Scraper');

      validateUserAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow bot user agents in development mode', () => {
      process.env.NODE_ENV = 'development';
      req.get = jest.fn(() => 'GoogleBot/2.1');

      validateUserAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be case-insensitive for bot detection', () => {
      process.env.NODE_ENV = 'production';
      req.get = jest.fn(() => 'GOOGLEBOT/2.1');

      validateUserAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
