/**
 * @fileoverview Unit tests for BaseReportGenerator
 * Tests the abstract base class behavior and shared utility methods
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { BaseReportGenerator } from '../../../../services/reports/BaseReportGenerator.js';

describe('BaseReportGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new BaseReportGenerator();
  });

  describe('constructor', () => {
    it('should create an instance of BaseReportGenerator', () => {
      expect(generator).toBeInstanceOf(BaseReportGenerator);
    });
  });

  describe('checkPageBreak', () => {
    it('should be callable without errors', () => {
      const mockDoc = {
        y: 700,
        page: { height: 800 },
        addPage: jest.fn(),
        moveDown: jest.fn().mockReturnThis()
      };

      expect(() => {
        generator.checkPageBreak(mockDoc, 50);
      }).not.toThrow();
    });

    it('should add page when near bottom', () => {
      const mockDoc = {
        y: 780,
        page: { height: 800 },
        addPage: jest.fn(),
        moveDown: jest.fn().mockReturnThis()
      };

      generator.checkPageBreak(mockDoc, 50);

      expect(mockDoc.addPage).toHaveBeenCalled();
      expect(mockDoc.moveDown).toHaveBeenCalled();
    });

    it('should not add page when plenty of space', () => {
      const mockDoc = {
        y: 100,
        page: { height: 800 },
        addPage: jest.fn(),
        moveDown: jest.fn().mockReturnThis()
      };

      generator.checkPageBreak(mockDoc, 50);

      expect(mockDoc.addPage).not.toHaveBeenCalled();
    });
  });

  describe('addReportContent', () => {
    it('should throw error when called on base class', () => {
      const mockDoc = {
        text: jest.fn().mockReturnThis(),
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis()
      };

      // Base class should throw because subclasses must implement this
      expect(() => {
        generator.addReportContent(mockDoc, [], {}, {});
      }).toThrow('addReportContent must be implemented by subclasses');
    });
  });

  describe('generatePDF', () => {
    it('should throw error because base class has no content implementation', async () => {
      // The base class generatePDF will call addReportContent which throws
      await expect(generator.generatePDF({
        fileName: 'test.pdf',
        title: 'Test'
      })).rejects.toThrow('addReportContent must be implemented by subclasses');
    });
  });

  describe('addReportHeader', () => {
    it('should add title and date range to document', () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis(),
        y: 100
      };

      generator.addReportHeader(mockDoc, 'Test Report', { start: '2025-01-01', end: '2025-12-31' });

      // Should have called text with the title
      expect(mockDoc.text).toHaveBeenCalled();
      expect(mockDoc.fontSize).toHaveBeenCalled();
    });

    it('should handle string date range', () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis(),
        y: 100
      };

      expect(() => {
        generator.addReportHeader(mockDoc, 'Test Report', '1/1/2025 to 12/31/2025');
      }).not.toThrow();
    });

    it('should handle null date range', () => {
      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis(),
        y: 100
      };

      expect(() => {
        generator.addReportHeader(mockDoc, 'Test Report', null);
      }).not.toThrow();
    });
  });
});
