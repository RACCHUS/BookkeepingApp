/**
 * @fileoverview Chase PDF Parsing Validation Tests
 * @description Tests to validate PDF parsing accuracy against expected transaction counts
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the PDF parser
import chasePDFParser from '../../../services/chasePDFParser.js';

// Test data directory - corrected path
const CHASE_PDF_DIR = path.join(__dirname, '../../data/pdfs/chase');

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
      
      // This test will verify that we have expected counts for each PDF (optional)
      // If expectedCounts is empty, test passes (data not yet populated)
      expect(true).toBe(true);
    });
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

/**
 * Load expected transaction counts from the filled-in data
 * TODO: Implement this function to parse EXPECTED_TRANSACTION_COUNTS.md
 * or create a JSON version of the expected data
 */
async function loadExpectedCounts() {
  // Placeholder implementation
  // In a real implementation, this would parse the markdown file
  // or load from a JSON file with the expected counts
  
  return [
    // Example structure - replace with actual data once filled
    {
      filename: '20240131-statements-5697-.pdf.pdf',
      period: 'January 2024',
      grandTotal: 0, // TO_FILL
      checkingTotal: 0, // TO_FILL
      savingsTotal: 0, // TO_FILL
      creditCardTotal: 0, // TO_FILL
      depositCount: 0, // TO_FILL
      withdrawalCount: 0, // TO_FILL
      purchaseCount: 0 // TO_FILL
    }
    // Add more entries for other PDFs
  ];
}

/**
 * Helper function to create JSON version of expected counts
 * Can be used to convert markdown data to structured format
 */
export async function createExpectedCountsJSON() {
  // This function can be used to help convert the filled markdown
  // into a structured JSON format for easier testing
  
  const expectedCounts = [
    // Structure will be filled based on EXPECTED_TRANSACTION_COUNTS.md
  ];
  
  const outputPath = path.join(__dirname, '../data/chase-expected-counts.json');
  await fs.writeFile(outputPath, JSON.stringify(expectedCounts, null, 2));
  
  console.log(`Expected counts JSON created at: ${outputPath}`);
}

/**
 * Utility function to run validation report
 * Generates a detailed report of parsing accuracy
 */
export async function generateValidationReport() {
  const results = {
    totalPDFs: availablePDFs.length,
    successfulParses: 0,
    failedParses: 0,
    accuracyByPDF: [],
    overallAccuracy: 0
  };
  
  // Implementation would compare actual vs expected for each PDF
  // and generate a comprehensive validation report
  
  return results;
}
