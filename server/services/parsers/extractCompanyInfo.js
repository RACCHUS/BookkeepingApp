/**
 * @fileoverview Extract company information from Chase PDF statements
 * @module services/parsers/extractCompanyInfo
 * @version 2.0.0
 */

import { COMPANY_PATTERNS, NUMERIC } from './parserConstants.js';

/**
 * Extract company information from Chase PDF statement header
 * Scans the first 20 lines for business name and address patterns
 * 
 * @param {string} text - PDF text content
 * @returns {object} Company information object with never-null fields
 * @property {string} name - Extracted company name (empty if not found)
 * @property {string} address - Extracted company address (empty if not found)
 * @property {boolean} extracted - True if any company info was found
 * 
 * @example
 * // Returns {name: 'ACME CONSTRUCTION LLC', address: '123 Main Street', extracted: true}
 * extractCompanyInfo('ACME CONSTRUCTION LLC\n123 Main Street\n...');
 * 
 * @example
 * // Returns {name: '', address: '', extracted: false}
 * extractCompanyInfo('Chase Bank Statement\nNo company info\n...');
 */
export default function extractCompanyInfo(text) {
  const lines = text.split('\n').slice(0, COMPANY_PATTERNS.HEADER_SCAN_LINES);
  let companyName = '';
  let companyAddress = '';

  const businessPatterns = COMPANY_PATTERNS.BUSINESS_ENTITIES;
  const addressPatterns = COMPANY_PATTERNS.ADDRESS;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and lines with common statement keywords
    if (!line ||
      line.includes(COMPANY_PATTERNS.SKIP_KEYWORDS[0]) ||  // Chase
      line.includes(COMPANY_PATTERNS.SKIP_KEYWORDS[1]) ||  // Statement
      line.includes(COMPANY_PATTERNS.SKIP_KEYWORDS[2]) ||  // Account
      line.includes(COMPANY_PATTERNS.SKIP_KEYWORDS[3]) ||  // Period
      line.includes(COMPANY_PATTERNS.SKIP_KEYWORDS[4]) ||  // Balance
      line.includes(COMPANY_PATTERNS.SKIP_KEYWORDS[5]) ||  // Page
      line.match(NUMERIC.NUMBERS_ONLY)) {
      continue;
    }
    
    // Try to extract company name if not found yet
    if (!companyName) {
      for (const pattern of businessPatterns) {
        const match = line.match(pattern);
        if (match) {
          companyName = match[1].trim();
          break;
        }
      }
    }
    
    // Try to extract address if we have a name but no address yet
    if (companyName && !companyAddress) {
      for (const pattern of addressPatterns) {
        if (pattern.test(line)) {
          companyAddress = line;
          break;
        }
      }
    }
    
    // Stop scanning if we found both
    if (companyName && companyAddress) break;
  }
  
  return {
    name: companyName || '',
    address: companyAddress || '',
    extracted: !!(companyName || companyAddress)
  };
}
