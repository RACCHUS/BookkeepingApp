/**
 * @fileoverview Manual Transaction Counter Utility
 * @description Helper script to assist with manual counting of transactions in Chase PDFs
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import PDF parsing utilities
import chasePDFParser from '../../services/chasePDFParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CHASE_PDF_DIR = path.join(__dirname, '../test/data/pdfs/chase');
const OUTPUT_FILE = path.join(__dirname, '../test/data/transaction-count-helper.txt');

/**
 * Analyze a single PDF and provide detailed breakdown for manual verification
 */
async function analyzePDF(pdfPath, filename) {
  try {
    console.log(`\n📄 Analyzing: ${filename}`);
    console.log('='.repeat(50));
    
    const result = await chasePDFParser.parsePDF(pdfPath);
    
    if (!result || !result.transactions) {
      console.log('❌ Failed to parse PDF or no transactions found');
      return null;
    }
    
    const analysis = {
      filename,
      totalTransactions: result.transactions.length,
      byAccountType: {},
      byTransactionType: {},
      rawTransactions: result.transactions
    };
    
    // Group by account type
    result.transactions.forEach(transaction => {
      const accountType = transaction.accountType || 'unknown';
      if (!analysis.byAccountType[accountType]) {
        analysis.byAccountType[accountType] = [];
      }
      analysis.byAccountType[accountType].push(transaction);
    });
    
    // Group by transaction type
    result.transactions.forEach(transaction => {
      const transactionType = transaction.type || 'unknown';
      if (!analysis.byTransactionType[transactionType]) {
        analysis.byTransactionType[transactionType] = 0;
      }
      analysis.byTransactionType[transactionType]++;
    });
    
    // Display summary
    console.log(`📊 Total Transactions: ${analysis.totalTransactions}`);
    console.log('\n🏦 By Account Type:');
    Object.entries(analysis.byAccountType).forEach(([type, transactions]) => {
      console.log(`  ${type}: ${transactions.length} transactions`);
    });
    
    console.log('\n💳 By Transaction Type:');
    Object.entries(analysis.byTransactionType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} transactions`);
    });
    
    // Show sample transactions for verification
    console.log('\n📝 Sample Transactions (first 5):');
    result.transactions.slice(0, 5).forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.date} | ${transaction.description} | $${transaction.amount} | ${transaction.accountType || 'unknown'}`);
    });
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filename}:`, error.message);
    return null;
  }
}

/**
 * Generate detailed output file for manual counting reference
 */
async function generateCountingHelper(analyses) {
  let output = '# Chase PDF Transaction Counting Helper\n\n';
  output += 'This file provides detailed breakdowns to assist with manual transaction counting.\n\n';
  
  analyses.forEach(analysis => {
    if (!analysis) return;
    
    output += `## ${analysis.filename}\n\n`;
    output += `**Automated Count:** ${analysis.totalTransactions} total transactions\n\n`;
    
    // Account type breakdown
    output += '### By Account Type:\n';
    Object.entries(analysis.byAccountType).forEach(([type, transactions]) => {
      output += `- **${type}:** ${transactions.length} transactions\n`;
    });
    output += '\n';
    
    // Transaction type breakdown
    output += '### By Transaction Type:\n';
    Object.entries(analysis.byTransactionType).forEach(([type, count]) => {
      output += `- **${type}:** ${count} transactions\n`;
    });
    output += '\n';
    
    // All transactions for verification
    output += '### All Transactions (for manual verification):\n';
    analysis.rawTransactions.forEach((transaction, index) => {
      const date = transaction.date || 'No date';
      const description = transaction.description || 'No description';
      const amount = transaction.amount || 0;
      const accountType = transaction.accountType || 'unknown';
      const type = transaction.type || 'unknown';
      
      output += `${index + 1}. **${date}** | ${description} | $${amount} | Account: ${accountType} | Type: ${type}\n`;
    });
    
    output += '\n---\n\n';
  });
  
  await fs.writeFile(OUTPUT_FILE, output);
  console.log(`\n📄 Detailed counting helper saved to: ${OUTPUT_FILE}`);
}

/**
 * Main function to analyze all Chase PDFs
 */
async function main() {
  try {
    console.log('🔍 Chase PDF Transaction Counter Utility');
    console.log('=========================================\n');
    
    // Get list of PDF files
    const files = await fs.readdir(CHASE_PDF_DIR);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found in the Chase PDF directory');
      return;
    }
    
    console.log(`📁 Found ${pdfFiles.length} PDF files to analyze`);
    
    const analyses = [];
    
    // Analyze each PDF
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(CHASE_PDF_DIR, pdfFile);
      const analysis = await analyzePDF(pdfPath, pdfFile);
      analyses.push(analysis);
      
      // Add delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate helper file
    await generateCountingHelper(analyses);
    
    // Summary
    const validAnalyses = analyses.filter(a => a !== null);
    console.log('\n📈 Summary:');
    console.log(`✅ Successfully analyzed: ${validAnalyses.length} PDFs`);
    console.log(`❌ Failed to analyze: ${analyses.length - validAnalyses.length} PDFs`);
    
    const totalTransactions = validAnalyses.reduce((sum, analysis) => sum + analysis.totalTransactions, 0);
    console.log(`📊 Total transactions across all PDFs: ${totalTransactions}`);
    
  } catch (error) {
    console.error('❌ Error running transaction counter:', error);
  }
}

// Command line options
const args = process.argv.slice(2);
const command = args[0];

if (command === 'analyze') {
  const filename = args[1];
  if (filename) {
    // Analyze single file
    const pdfPath = path.join(CHASE_PDF_DIR, filename);
    analyzePDF(pdfPath, filename);
  } else {
    main();
  }
} else if (command === 'help') {
  console.log(`
Chase PDF Transaction Counter Utility

Usage:
  node transactionCounter.js                    # Analyze all PDFs
  node transactionCounter.js analyze           # Analyze all PDFs  
  node transactionCounter.js analyze <file>    # Analyze specific PDF
  node transactionCounter.js help              # Show this help

Examples:
  node transactionCounter.js
  node transactionCounter.js analyze 20240131-statements-5697-.pdf.pdf
  
Output:
  - Console output with transaction counts and breakdowns
  - Detailed helper file: ${OUTPUT_FILE}
  `);
} else {
  main();
}

export { analyzePDF, generateCountingHelper };
