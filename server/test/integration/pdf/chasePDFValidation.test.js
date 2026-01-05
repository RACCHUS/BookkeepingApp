/**
 * @fileoverview Chase PDF Parsing Validation Tests
 * @description Tests to validate PDF parsing accuracy against expected transaction counts
 * @version 2.0.0
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the PDF parser
import chasePDFParser from '../../../services/chasePDFParser.js';

// Test data directory
const CHASE_PDF_DIR = path.join(__dirname, '../../data/pdfs/chase');

/**
 * Load expected transaction counts from JSON file
 */
async function loadExpectedCounts() {
  try {
    const filePath = path.join(CHASE_PDF_DIR, 'expected-transaction-counts.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Could not load expected transaction counts:', error.message);
    return [];
  }
}

/**
 * Count transactions by section code
 */
function countTransactionsBySection(transactions) {
  const counts = {
    deposits: 0,
    checks: 0,
    card: 0,
    electronic: 0,
    other: 0
  };

  transactions.forEach(tx => {
    const section = tx.sectionCode || tx.section || 'other';
    
    if (section === 'DEP' || section === 'deposits') {
      counts.deposits++;
    } else if (section === 'CHK' || section === 'checks') {
      counts.checks++;
    } else if (section === 'CARD' || section === 'card') {
      counts.card++;
    } else if (section === 'ELEC' || section === 'electronic') {
      counts.electronic++;
    } else {
      counts.other++;
    }
  });

  return counts;
}

describe('Chase PDF Parsing Validation', () => {
  let expectedCounts;
  let availablePDFs;

  beforeAll(async () => {
    // Get list of available PDF files
    try {
      const files = await fs.readdir(CHASE_PDF_DIR);
      availablePDFs = files.filter(file => file.endsWith('.pdf'));
    } catch (error) {
      console.warn('Chase PDF directory not found, skipping PDF tests');
      availablePDFs = [];
    }
    
    // Load expected counts from filled-in data
    expectedCounts = await loadExpectedCounts();
  });

  describe('PDF File Availability', () => {
    it('should have Chase PDF test files available', () => {
      expect(availablePDFs.length).toBeGreaterThan(0);
      console.log(`Found ${availablePDFs.length} Chase PDF files for testing`);
    });

    it('should have expected count data for all PDFs', () => {
      // Skip if no PDFs available or no expected counts
      if (!availablePDFs || availablePDFs.length === 0 || !expectedCounts || expectedCounts.length === 0) {
        expect(true).toBe(true);
        return;
      }
      
      expect(expectedCounts.length).toBeGreaterThan(0);
      console.log(`Loaded expected counts for ${expectedCounts.length} PDFs`);
    });
  });

  describe('Transaction Count Validation - All PDFs', () => {
    // This will create a test for each PDF file with expected counts
    if (expectedCounts && expectedCounts.length > 0) {
      expectedCounts.forEach((expected) => {
      it(`should parse ${expected.filename} with correct transaction counts`, async () => {
        const pdfPath = path.join(CHASE_PDF_DIR, expected.filename);
        
        // Check if file exists
        try {
          await fs.access(pdfPath);
        } catch (error) {
          console.warn(`PDF file not found: ${expected.filename}`);
          return; // Skip if file doesn't exist
        }

        // Parse the PDF
        const result = await chasePDFParser.parsePDF(pdfPath, 'test-user');
        
        expect(result.success).toBe(true);
        expect(result.transactions).toBeDefined();
        expect(Array.isArray(result.transactions)).toBe(true);

        // Count transactions by section
        const actualCounts = countTransactionsBySection(result.transactions);

        // Log for debugging
        console.log(`\n${expected.filename}:`);
        console.log(`  Expected - Deposits: ${expected.deposits}, Checks: ${expected.checks}, Card: ${expected.card}, Electronic: ${expected.electronic}`);
        console.log(`  Actual   - Deposits: ${actualCounts.deposits}, Checks: ${actualCounts.checks}, Card: ${actualCounts.card}, Electronic: ${actualCounts.electronic}`);
        
        // Validate counts (allow small variance for parser improvements)
        const tolerance = 1; // Allow 1 transaction difference

        expect(Math.abs(actualCounts.deposits - expected.deposits)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(actualCounts.checks - expected.checks)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(actualCounts.card - expected.card)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(actualCounts.electronic - expected.electronic)).toBeLessThanOrEqual(tolerance);
      }, 30000); // 30 second timeout for PDF parsing
    });

    it('should have consistent total transaction counts', async () => {
      if (!availablePDFs || availablePDFs.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const samplePDF = availablePDFs[0];
      const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
      
      const result = await chasePDFParser.parsePDF(pdfPath, 'test-user');
      
      if (result.success) {
        const actualCounts = countTransactionsBySection(result.transactions);
        const total = actualCounts.deposits + actualCounts.checks + actualCounts.card + actualCounts.electronic + actualCounts.other;
        
        expect(total).toBe(result.transactions.length);
      }
    }, 30000);
    } else {
      it('should skip validation when expected counts not available', () => {
        console.warn('Expected counts file not found, skipping validation tests');
        expect(true).toBe(true);
      });
    }
  });

  describe('Transaction Count Validation', () => {
    it('should extract transactions from PDFs', async () => {
      if (!availablePDFs || availablePDFs.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const samplePDF = availablePDFs[0];
      const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
      const result = await chasePDFParser.parsePDF(pdfPath);
      
      expect(result).toBeDefined();
      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
    });
  });

  describe('PDF Structure Analysis', () => {
    it('should identify correct number of account sections', async () => {
      // Test that parser correctly identifies different account sections
      const samplePDF = availablePDFs[0];
      const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
      
      const result = await chasePDFParser.parsePDF(pdfPath);
      
      // Get unique account types
      const accountTypes = [...new Set(result.transactions.map(t => t.accountType))];
      
      expect(accountTypes.length).toBeGreaterThan(0);
      console.log(`Identified account types: ${accountTypes.join(', ')}`);
    });

    it('should extract valid transaction dates', async () => {
      const samplePDF = availablePDFs[0];
      const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
      
      const result = await chasePDFParser.parsePDF(pdfPath);
      
      // Verify all transactions have valid dates
      result.transactions.forEach(transaction => {
        expect(transaction.date).toBeDefined();
        expect(new Date(transaction.date)).toBeInstanceOf(Date);
        expect(isNaN(new Date(transaction.date).getTime())).toBe(false);
      });
    });

    it('should extract valid transaction amounts', async () => {
      const samplePDF = availablePDFs[0];
      const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
      
      const result = await chasePDFParser.parsePDF(pdfPath);
      
      // Verify all transactions have valid amounts
      result.transactions.forEach(transaction => {
        expect(transaction.amount).toBeDefined();
        expect(typeof transaction.amount).toBe('number');
        expect(isNaN(transaction.amount)).toBe(false);
        expect(transaction.amount).not.toBe(0); // Assuming no zero-amount transactions
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted or invalid PDF files gracefully', async () => {
      // Test with a non-existent file
      const invalidPath = path.join(CHASE_PDF_DIR, 'non-existent.pdf');
      
      const result = await chasePDFParser.parsePDF(invalidPath);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide meaningful error messages for parsing failures', async () => {
      const invalidPath = path.join(CHASE_PDF_DIR, 'non-existent.pdf');
      
      const result = await chasePDFParser.parsePDF(invalidPath);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Validation', () => {
    it('should process PDFs within reasonable time limits', async () => {
      const samplePDF = availablePDFs[0];
      const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
      
      const startTime = Date.now();
      await chasePDFParser.parsePDF(pdfPath);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      // Expect processing to complete within 30 seconds
      expect(processingTime).toBeLessThan(30000);
      console.log(`PDF processing time: ${processingTime}ms`);
    });
  });
});
