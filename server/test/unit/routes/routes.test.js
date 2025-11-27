import { describe, it, expect } from '@jest/globals';
import express from 'express';
import transactionRoutes from '../../../routes/transactionRoutes.js';
import reportRoutes from '../../../routes/reportRoutes.js';
import classificationRoutes from '../../../routes/classificationRoutes.js';

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
});
