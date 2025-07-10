/**
 * Utility functions for Chase date parsing and formatting.
 */
class ChaseDateUtils {
  /**
   * Converts MM/DD to ISO 8601 with T12:00:00, using the provided year.
   */
  static toISODate(dateStr, year) {
    // Normalize dateStr to MM/DD (replace any dash with slash)
    const normalizedDateStr = (dateStr || '').replace(/-/g, '/');
    const [month, day] = normalizedDateStr.split('/').map(Number);
    if (!month || !day) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
  }
}

export default ChaseDateUtils;
