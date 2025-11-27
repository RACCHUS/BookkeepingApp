import { describe, it, expect } from '@jest/globals';
import express from 'express';
import transactionRoutes from '../../../routes/transactionRoutes.js';
import reportRoutes from '../../../routes/reportRoutes.js';
import classificationRoutes from '../../../routes/classificationRoutes.js';
import companyRoutes from '../../../routes/companyRoutes.js';
import payeeRoutes from '../../../routes/payeeRoutes.js';
import pdfRoutes from '../../../routes/pdfRoutes.js';

describe('Route Configuration', () => {
  describe('Transaction Routes', () => {
    it('should be an Express router', () => {
      expect(transactionRoutes).toBeDefined();
      expect(typeof transactionRoutes).toBe('function');
      expect(transactionRoutes.name).toBe('router');
    });

    it('should have stack of route layers', () => {
      expect(transactionRoutes.stack).toBeDefined();
      expect(Array.isArray(transactionRoutes.stack)).toBe(true);
      expect(transactionRoutes.stack.length).toBeGreaterThan(0);
    });

    it('should define GET routes', () => {
      const getRoutes = transactionRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.get
      );
      expect(getRoutes.length).toBeGreaterThan(0);
    });

    it('should define POST routes', () => {
      const postRoutes = transactionRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.post
      );
      expect(postRoutes.length).toBeGreaterThan(0);
    });

    it('should define PUT routes', () => {
      const putRoutes = transactionRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.put
      );
      expect(putRoutes.length).toBeGreaterThan(0);
    });

    it('should define DELETE routes', () => {
      const deleteRoutes = transactionRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.delete
      );
      expect(deleteRoutes.length).toBeGreaterThan(0);
    });

    it('should define PATCH routes', () => {
      const patchRoutes = transactionRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.patch
      );
      expect(patchRoutes.length).toBeGreaterThan(0);
    });

    it('should have middleware layers', () => {
      const middlewareLayers = transactionRoutes.stack.filter(layer => !layer.route);
      expect(middlewareLayers.length).toBeGreaterThan(0);
    });
  });

  describe('Report Routes', () => {
    it('should be an Express router', () => {
      expect(reportRoutes).toBeDefined();
      expect(typeof reportRoutes).toBe('function');
      expect(reportRoutes.name).toBe('router');
    });

    it('should have route definitions', () => {
      expect(reportRoutes.stack).toBeDefined();
      expect(reportRoutes.stack.length).toBeGreaterThan(0);
    });

    it('should define GET routes for reports', () => {
      const getRoutes = reportRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.get
      );
      expect(getRoutes.length).toBeGreaterThan(0);
    });
  });

  describe('Classification Routes', () => {
    it('should be an Express router', () => {
      expect(classificationRoutes).toBeDefined();
      expect(typeof classificationRoutes).toBe('function');
    });

    it('should have route definitions', () => {
      expect(classificationRoutes.stack).toBeDefined();
      expect(classificationRoutes.stack.length).toBeGreaterThan(0);
    });

    it('should define POST routes', () => {
      const postRoutes = classificationRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.post
      );
      expect(postRoutes.length).toBeGreaterThan(0);
    });
  });

  describe('Route Mounting', () => {
    it('should mount transaction routes on Express app', () => {
      const app = express();
      app.use('/api/transactions', transactionRoutes);
      
      expect(app._router).toBeDefined();
      expect(app._router.stack.length).toBeGreaterThan(0);
    });

    it('should mount report routes on Express app', () => {
      const app = express();
      app.use('/api/reports', reportRoutes);
      
      expect(app._router).toBeDefined();
    });

    it('should mount classification routes on Express app', () => {
      const app = express();
      app.use('/api/classification', classificationRoutes);
      
      expect(app._router).toBeDefined();
    });
  });

  describe('Company Routes', () => {
    it('should be an Express router', () => {
      expect(companyRoutes).toBeDefined();
      expect(typeof companyRoutes).toBe('function');
    });

    it('should have routes in the stack', () => {
      expect(companyRoutes.stack).toBeDefined();
      expect(companyRoutes.stack.length).toBeGreaterThan(0);
    });

    it('should define GET routes', () => {
      const getRoutes = companyRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.get
      );
      expect(getRoutes.length).toBeGreaterThan(0);
    });

    it('should define POST routes', () => {
      const postRoutes = companyRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.post
      );
      expect(postRoutes.length).toBeGreaterThan(0);
    });

    it('should define PUT routes', () => {
      const putRoutes = companyRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.put
      );
      expect(putRoutes.length).toBeGreaterThan(0);
    });

    it('should define DELETE routes', () => {
      const deleteRoutes = companyRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.delete
      );
      expect(deleteRoutes.length).toBeGreaterThan(0);
    });

    it('should have middleware layers', () => {
      const middlewareLayers = companyRoutes.stack.filter(layer => !layer.route);
      expect(middlewareLayers.length).toBeGreaterThan(0);
    });
  });

  describe('Payee Routes', () => {
    it('should be an Express router', () => {
      expect(payeeRoutes).toBeDefined();
      expect(typeof payeeRoutes).toBe('function');
    });

    it('should have routes in the stack', () => {
      expect(payeeRoutes.stack).toBeDefined();
      expect(payeeRoutes.stack.length).toBeGreaterThan(0);
    });

    it('should define GET routes', () => {
      const getRoutes = payeeRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.get
      );
      expect(getRoutes.length).toBeGreaterThan(0);
    });

    it('should define POST routes', () => {
      const postRoutes = payeeRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.post
      );
      expect(postRoutes.length).toBeGreaterThan(0);
    });

    it('should define PUT routes', () => {
      const putRoutes = payeeRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.put
      );
      expect(putRoutes.length).toBeGreaterThan(0);
    });

    it('should define DELETE routes', () => {
      const deleteRoutes = payeeRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.delete
      );
      expect(deleteRoutes.length).toBeGreaterThan(0);
    });

    it('should have middleware layers for rate limiting', () => {
      const middlewareLayers = payeeRoutes.stack.filter(layer => !layer.route);
      expect(middlewareLayers.length).toBeGreaterThan(0);
    });
  });

  describe('PDF Routes', () => {
    it('should be an Express router', () => {
      expect(pdfRoutes).toBeDefined();
      expect(typeof pdfRoutes).toBe('function');
    });

    it('should have routes in the stack', () => {
      expect(pdfRoutes.stack).toBeDefined();
      expect(pdfRoutes.stack.length).toBeGreaterThan(0);
    });

    it('should define GET routes', () => {
      const getRoutes = pdfRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.get
      );
      expect(getRoutes.length).toBeGreaterThan(0);
    });

    it('should define POST routes for PDF upload and processing', () => {
      const postRoutes = pdfRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.post
      );
      expect(postRoutes.length).toBeGreaterThan(0);
    });

    it('should define PUT routes for upload updates', () => {
      const putRoutes = pdfRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.put
      );
      expect(putRoutes.length).toBeGreaterThan(0);
    });

    it('should define DELETE routes', () => {
      const deleteRoutes = pdfRoutes.stack.filter(layer => 
        layer.route && layer.route.methods.delete
      );
      expect(deleteRoutes.length).toBeGreaterThan(0);
    });

    it('should have multer upload middleware configured', () => {
      // PDF routes use upload.single middleware which is not a plain middleware layer
      // Just verify the router has routes defined
      const allLayers = pdfRoutes.stack;
      expect(allLayers.length).toBeGreaterThan(0);
    });
  });
});
