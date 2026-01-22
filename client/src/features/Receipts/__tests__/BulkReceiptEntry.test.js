import { describe, it, expect } from 'vitest';
import { parsePastedData } from '../BulkReceiptEntry';

describe('parsePastedData', () => {
  describe('basic parsing', () => {
    it('parses "amount date" format', () => {
      const input = '3122.53 1/31/25';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.stats.failed).toBe(0);
      expect(result.entries[0].amount).toBe('3122.53');
      expect(result.entries[0].date).toBe('2025-01-31');
    });

    it('parses "date amount" format', () => {
      const input = '1/31/25 3122.53';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('3122.53');
      expect(result.entries[0].date).toBe('2025-01-31');
    });

    it('parses multiple lines', () => {
      const input = `3122.53 1/31/25
112.41 1/5/25
96.17 11/10/25`;
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(3);
      expect(result.stats.failed).toBe(0);
      expect(result.entries).toHaveLength(3);
    });
  });

  describe('amount formats', () => {
    it('parses negative amounts (refunds)', () => {
      const input = '-95.35 9/6/25';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('-95.35');
    });

    it('parses amounts with dollar sign', () => {
      const input = '$500.39 9/6/25';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('500.39');
    });

    it('parses amounts with commas', () => {
      const input = '3,122.53 1/31/25';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('3122.53');
    });

    it('parses negative amounts with dollar sign', () => {
      const input = '-$145.24 11/8/25';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('-145.24');
    });

    it('parses integer amounts without decimals', () => {
      const input = '500 1/15/25';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('500');
    });
  });

  describe('date formats', () => {
    it('parses M/D/YY format', () => {
      const input = '100.00 1/5/25';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('2025-01-05');
    });

    it('parses MM/DD/YY format', () => {
      const input = '100.00 01/05/25';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('2025-01-05');
    });

    it('parses M/D/YYYY format', () => {
      const input = '100.00 1/5/2025';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('2025-01-05');
    });

    it('parses MM/DD/YYYY format', () => {
      const input = '100.00 11/10/2025';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('2025-11-10');
    });

    it('parses ISO format YYYY-MM-DD', () => {
      const input = '100.00 2025-01-31';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('2025-01-31');
    });

    it('handles 2-digit years correctly (00-49 = 2000s)', () => {
      const input = '100.00 1/5/49';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('2049-01-05');
    });

    it('handles 2-digit years correctly (50-99 = 1900s)', () => {
      const input = '100.00 1/5/99';
      const result = parsePastedData(input);
      
      expect(result.entries[0].date).toBe('1999-01-05');
    });
  });

  describe('default values', () => {
    it('applies default category to all entries', () => {
      const input = `100.00 1/5/25
200.00 1/6/25`;
      const result = parsePastedData(input, 'Cost of Goods Sold');
      
      expect(result.entries[0].category).toBe('Cost of Goods Sold');
      expect(result.entries[1].category).toBe('Cost of Goods Sold');
    });

    it('applies default vendor to all entries', () => {
      const input = `100.00 1/5/25
200.00 1/6/25`;
      const result = parsePastedData(input, '', 'Amazon');
      
      expect(result.entries[0].vendor).toBe('Amazon');
      expect(result.entries[1].vendor).toBe('Amazon');
    });
  });

  describe('vendor extraction', () => {
    it('extracts vendor from end of line (amount date vendor)', () => {
      const input = '100.00 1/5/25 Home Depot';
      const result = parsePastedData(input);
      
      expect(result.entries[0].vendor).toBe('Home Depot');
    });

    it('extracts vendor from end of line (date amount vendor)', () => {
      const input = '1/5/25 100.00 Amazon Prime';
      const result = parsePastedData(input);
      
      expect(result.entries[0].vendor).toBe('Amazon Prime');
    });

    it('uses default vendor when no vendor in line', () => {
      const input = '100.00 1/5/25';
      const result = parsePastedData(input, '', 'Default Store');
      
      expect(result.entries[0].vendor).toBe('Default Store');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parsePastedData('');
      
      expect(result.stats.total).toBe(0);
      expect(result.stats.parsed).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it('handles whitespace-only input', () => {
      const result = parsePastedData('   \n   \n   ');
      
      expect(result.stats.total).toBe(0);
      expect(result.stats.parsed).toBe(0);
    });

    it('skips empty lines', () => {
      const input = `100.00 1/5/25

200.00 1/6/25`;
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(2);
    });

    it('handles tab-separated values', () => {
      const input = '100.00\t1/5/25\tHome Depot';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
      expect(result.entries[0].amount).toBe('100');
      expect(result.entries[0].vendor).toBe('Home Depot');
    });

    it('handles extra whitespace', () => {
      const input = '   100.00    1/5/25   ';
      const result = parsePastedData(input);
      
      expect(result.stats.parsed).toBe(1);
    });

    it('reports error for lines missing amount', () => {
      const input = '1/5/25 Not an amount';
      const result = parsePastedData(input);
      
      expect(result.stats.failed).toBe(1);
      expect(result.errors[0].error).toContain('amount');
    });

    it('reports error for lines missing date', () => {
      const input = '100.00 notadate';
      const result = parsePastedData(input);
      
      expect(result.stats.failed).toBe(1);
      expect(result.errors[0].error).toContain('date');
    });

    it('reports error for single value lines', () => {
      const input = '100.00';
      const result = parsePastedData(input);
      
      expect(result.stats.failed).toBe(1);
      expect(result.errors[0].error).toContain('at least');
    });
  });

  describe('real-world data (user example)', () => {
    it('parses the full user input correctly', () => {
      const input = `3122.53 1/31/25
112.41 1/5/25
96.17 11/10/25
490.48 11/10/25
251.95 7/19/25
500.39 9/6/25
-95.35 9/6/25
40.17 10/21/25
1791.44 6/4/25
456.04 6/6/25
156.74 5/23/25
199.99 5/23/25
27.10 7/11/25
20.98 6/21/25
206.17 8/21/25
10.31 7/19/25
76.45 7/19/25
3621.95 9/29/25
141.86 5/17/25
85.95 5/14/25
49.90 6/11/25
1544.83 11/8/25
-145.24 11/8/25
501.18 11/11/25
128.90 6/14/25
167.12 11/28/25`;

      const result = parsePastedData(input, 'Cost of Goods Sold');
      
      expect(result.stats.total).toBe(26);
      expect(result.stats.parsed).toBe(26);
      expect(result.stats.failed).toBe(0);
      
      // Check all entries have the category
      result.entries.forEach(entry => {
        expect(entry.category).toBe('Cost of Goods Sold');
      });

      // Verify some specific entries
      expect(result.entries[0].amount).toBe('3122.53');
      expect(result.entries[0].date).toBe('2025-01-31');
      
      // Check negative amounts are preserved
      const negativeEntries = result.entries.filter(e => parseFloat(e.amount) < 0);
      expect(negativeEntries).toHaveLength(2);
      expect(negativeEntries[0].amount).toBe('-95.35');
      expect(negativeEntries[1].amount).toBe('-145.24');
    });
  });
});
