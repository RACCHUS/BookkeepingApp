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

// Test data directory
const CHASE_PDF_DIR = path.join(__dirname, '../data/pdfs/chase');

describe('Chase PDF Parsing Validation', () => {
  let expectedCounts;
  let availablePDFs;

  beforeAll(async () => {
    // Get list of available PDF files
    const files = await fs.readdir(CHASE_PDF_DIR);
    availablePDFs = files.filter(file => file.endsWith('.pdf'));
    
    // TODO: Load expected counts from filled-in data
    // This will be implemented once EXPECTED_TRANSACTION_COUNTS.md is filled
    expectedCounts = await loadExpectedCounts();
  });

  describe('PDF File Availability', () => {
    it('should have Chase PDF test files available', () => {
      expect(availablePDFs.length).toBeGreaterThan(0);
      console.log(`Found ${availablePDFs.length} Chase PDF files for testing`);
    });

    it('should have expected count data for all PDFs', () => {
      // This test will verify that we have expected counts for each PDF
      availablePDFs.forEach(pdfFile => {
        const expectedData = expectedCounts.find(data => data.filename === pdfFile);
        expect(expectedData).toBeDefined();
      });
    });
  });

  describe('Transaction Count Validation', () => {
    // Skip these tests initially until expected counts are filled
    describe.skip('Individual PDF Validation', () => {
      availablePDFs.forEach(pdfFile => {
        it(`should extract correct transaction counts from ${pdfFile}`, async () => {
          const pdfPath = path.join(CHASE_PDF_DIR, pdfFile);
          const expectedData = expectedCounts.find(data => data.filename === pdfFile);
          
          if (!expectedData) {
            throw new Error(`No expected data found for ${pdfFile}`);
          }

          // Parse the PDF
          const result = await chasePDFParser.parsePDF(pdfPath);
          
          // Validate total transaction count
          expect(result.totalTransactions).toBe(expectedData.grandTotal);
          
          // Validate section-specific counts
          if (expectedData.checkingTotal) {
            const checkingTransactions = result.transactions.filter(
              t => t.accountType === 'checking'
            );
            expect(checkingTransactions.length).toBe(expectedData.checkingTotal);
          }
          
          if (expectedData.savingsTotal) {
            const savingsTransactions = result.transactions.filter(
              t => t.accountType === 'savings'
            );
            expect(savingsTransactions.length).toBe(expectedData.savingsTotal);
          }
          
          if (expectedData.creditCardTotal) {
            const creditCardTransactions = result.transactions.filter(
              t => t.accountType === 'credit'
            );
            expect(creditCardTransactions.length).toBe(expectedData.creditCardTotal);
          }
        }, 30000); // 30 second timeout for PDF processing
      });
    });

    describe.skip('Transaction Type Validation', () => {
      it('should correctly categorize transaction types', async () => {
        // Test a sample PDF to verify transaction type categorization
        const samplePDF = availablePDFs[0];
        const pdfPath = path.join(CHASE_PDF_DIR, samplePDF);
        const expectedData = expectedCounts.find(data => data.filename === samplePDF);
        
        const result = await chasePDFParser.parsePDF(pdfPath);
        
        // Group transactions by type
        const transactionsByType = result.transactions.reduce((acc, transaction) => {
          const type = transaction.type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        // Validate against expected counts
        if (expectedData.depositCount) {
          expect(transactionsByType.deposit || 0).toBe(expectedData.depositCount);
        }
        
        if (expectedData.withdrawalCount) {
          expect(transactionsByType.withdrawal || 0).toBe(expectedData.withdrawalCount);
        }
        
        if (expectedData.purchaseCount) {
          expect(transactionsByType.purchase || 0).toBe(expectedData.purchaseCount);
        }
      });
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
      
      await expect(chasePDFParser.parsePDF(invalidPath)).rejects.toThrow();
    });

    it('should provide meaningful error messages for parsing failures', async () => {
      const invalidPath = path.join(CHASE_PDF_DIR, 'non-existent.pdf');
      
      try {
        await chasePDFParser.parsePDF(invalidPath);
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
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
