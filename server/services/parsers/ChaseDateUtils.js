/**
 * @fileoverview Utility functions for Chase date parsing and formatting
 * @module services/parsers/ChaseDateUtils
 * @version 2.0.0
 */

import { DATE_FORMATS } from './parserConstants.js';

/**
 * Utility functions for Chase date parsing and formatting.
 * Handles conversion of Chase statement date formats (MM/DD or MM-DD) to ISO 8601.
 */
class ChaseDateUtils {
  /**
   * Converts Chase date format (MM/DD or MM-DD) to ISO 8601 with noon time
   * 
   * @param {string} dateStr - Date string in MM/DD or MM-DD format
   * @param {number} year - Four-digit year to use for the date
   * @returns {string|null} ISO 8601 date string (YYYY-MM-DDTHH:mm:ss) or null if invalid
   * 
   * @example
   * // Returns '2024-03-15T12:00:00'
   * ChaseDateUtils.toISODate('3/15', 2024);
   * 
   * @example
   * // Returns '2024-12-01T12:00:00'
   * ChaseDateUtils.toISODate('12-01', 2024);
   * 
   * @example
   * // Returns null for invalid input
   * ChaseDateUtils.toISODate('invalid', 2024);
   */
  static toISODate(dateStr, year) {
    // Normalize dateStr to MM/DD (replace any dash with slash)
    const normalizedDateStr = (dateStr || '').replace(
      new RegExp(DATE_FORMATS.SEPARATORS.DASH, 'g'),
      DATE_FORMATS.SEPARATORS.SLASH
    );
    const [month, day] = normalizedDateStr.split(DATE_FORMATS.SEPARATORS.SLASH).map(Number);
    if (!month || !day) return null;
    return `${year}-${month.toString().padStart(DATE_FORMATS.PADDING.LENGTH, DATE_FORMATS.PADDING.CHAR)}-${day.toString().padStart(DATE_FORMATS.PADDING.LENGTH, DATE_FORMATS.PADDING.CHAR)}${DATE_FORMATS.DEFAULT_TIME}`;
  }
}

export default ChaseDateUtils;
