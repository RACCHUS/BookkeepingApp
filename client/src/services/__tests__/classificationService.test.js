/**
 * Unit Tests for Classification Service
 * 
 * Tests the local classification engine (user rules + default vendors)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanDescription,
  extractVendor,
  classifyLocal,
  batchClassifyLocal,
  CLASSIFICATION_SOURCE,
} from '../classificationService';

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { results: [] }, error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  },
}));

describe('cleanDescription', () => {
  it('should handle null/undefined input', () => {
    expect(cleanDescription(null)).toBe('');
    expect(cleanDescription(undefined)).toBe('');
    expect(cleanDescription('')).toBe('');
  });

  it('should convert to uppercase and trim', () => {
    expect(cleanDescription('  shell gas  ')).toBe('SHELL GAS');
    expect(cleanDescription('Home Depot')).toBe('HOME DEPOT');
  });

  it('should remove common prefixes', () => {
    expect(cleanDescription('CHECKCARD SHELL GAS')).toBe('SHELL GAS');
    expect(cleanDescription('DEBIT CARD HOME DEPOT')).toBe('HOME DEPOT');
    expect(cleanDescription('POS PURCHASE STARBUCKS')).toBe('STARBUCKS');
    expect(cleanDescription('ACH DEBIT ADOBE')).toBe('ADOBE');
  });

  it('should remove extra whitespace', () => {
    expect(cleanDescription('SHELL   GAS   STATION')).toBe('SHELL GAS STATION');
  });

  it('should handle complex descriptions', () => {
    expect(cleanDescription('CHECKCARD 12/15 SHELL OIL')).toMatch(/SHELL OIL/);
  });
});

describe('extractVendor', () => {
  it('should extract first 2-3 words as vendor', () => {
    expect(extractVendor('SHELL GAS STATION 1234')).toBe('SHELL GAS STATION');
    expect(extractVendor('HOME DEPOT')).toBe('HOME DEPOT');
    expect(extractVendor('STARBUCKS')).toBe('STARBUCKS');
  });

  it('should clean before extracting', () => {
    expect(extractVendor('CHECKCARD SHELL GAS')).toBe('SHELL GAS');
  });

  it('should handle empty input', () => {
    expect(extractVendor('')).toBe('');
    expect(extractVendor(null)).toBe('');
  });
});

describe('classifyLocal - Default Vendors', () => {
  it('should classify gas stations as CAR_TRUCK_EXPENSES', () => {
    const transaction = { description: 'SHELL OIL 12345' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('CAR_TRUCK_EXPENSES');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.DEFAULT_VENDOR);
    expect(result.classification.vendor).toBe('Shell');
  });

  it('should classify Home Depot as MATERIALS_SUPPLIES', () => {
    const transaction = { description: 'HOME DEPOT 1234 MIAMI FL' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('MATERIALS_SUPPLIES');
    expect(result.classification.vendor).toBe('Home Depot');
  });

  it('should classify software subscriptions correctly', () => {
    const transaction = { description: 'ADOBE CREATIVE CLOUD' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('SOFTWARE_SUBSCRIPTIONS');
    expect(result.classification.vendor).toBe('Adobe');
  });

  it('should classify Microsoft as SOFTWARE_SUBSCRIPTIONS', () => {
    const transaction = { description: 'MICROSOFT 365' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('SOFTWARE_SUBSCRIPTIONS');
  });

  it('should classify office supplies stores', () => {
    const transaction = { description: 'STAPLES #1234' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('OFFICE_EXPENSES');
    expect(result.classification.vendor).toBe('Staples');
  });

  it('should classify shipping services', () => {
    const transaction = { description: 'UPS STORE 1234' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('OTHER_COSTS');
    expect(result.classification.vendor).toBe('UPS');
  });

  it('should classify utilities', () => {
    const transaction = { description: 'FPL ELECTRIC BILL' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('UTILITIES');
  });

  it('should classify meals/restaurants', () => {
    const transaction = { description: 'STARBUCKS STORE 12345' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('MEALS');
    expect(result.classification.vendor).toBe('Starbucks');
  });

  it('should classify travel/rideshare', () => {
    const transaction = { description: 'UBER TRIP' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('TRAVEL');
    expect(result.classification.vendor).toBe('Uber');
  });

  it('should classify ATM withdrawals as OWNER_DRAWS', () => {
    const transaction = { description: 'ATM WITHDRAWAL' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('OWNER_DRAWS');
  });

  it('should flag personal subscriptions', () => {
    const transaction = { description: 'NETFLIX.COM' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('PERSONAL_EXPENSE');
  });

  it('should return unclassified for unknown transactions', () => {
    const transaction = { description: 'RANDOM VENDOR XYZ 98765' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
    expect(result.classification.needsReview).toBe(true);
  });
});

describe('classifyLocal - User Rules', () => {
  const userRules = [
    {
      id: 'rule-1',
      pattern: 'MY FAVORITE VENDOR',
      pattern_type: 'contains',
      vendor_name: 'My Favorite Vendor',
      category: 'SUPPLIES',
      subcategory: 'Custom Supplies',
    },
    {
      id: 'rule-2',
      pattern: 'EXACT MATCH TEST',
      pattern_type: 'exact',
      vendor_name: 'Exact Match',
      category: 'OTHER_EXPENSES',
      subcategory: null,
    },
    {
      id: 'rule-3',
      pattern: 'PREFIX',
      pattern_type: 'starts_with',
      vendor_name: 'Prefix Vendor',
      category: 'ADVERTISING',
      subcategory: null,
    },
  ];

  it('should match user rule with contains pattern', () => {
    const transaction = { description: 'PURCHASE AT MY FAVORITE VENDOR 123' };
    const result = classifyLocal(transaction, userRules);
    
    expect(result.classification.category).toBe('SUPPLIES');
    expect(result.classification.subcategory).toBe('Custom Supplies');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
    expect(result.classification.ruleId).toBe('rule-1');
  });

  it('should match user rule with exact pattern', () => {
    const transaction = { description: 'EXACT MATCH TEST' };
    const result = classifyLocal(transaction, userRules);
    
    expect(result.classification.category).toBe('OTHER_EXPENSES');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
  });

  it('should match user rule with starts_with pattern', () => {
    const transaction = { description: 'PREFIX SOMETHING ELSE' };
    const result = classifyLocal(transaction, userRules);
    
    expect(result.classification.category).toBe('ADVERTISING');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
  });

  it('should prioritize user rules over default vendors', () => {
    // Create a rule that overrides Shell gas station
    const overrideRules = [
      {
        id: 'override-1',
        pattern: 'SHELL',
        pattern_type: 'contains',
        vendor_name: 'Shell (Business Fleet)',
        category: 'OTHER_EXPENSES',
        subcategory: 'Fleet Fuel',
      },
    ];
    
    const transaction = { description: 'SHELL OIL 12345' };
    const result = classifyLocal(transaction, overrideRules);
    
    expect(result.classification.category).toBe('OTHER_EXPENSES');
    expect(result.classification.subcategory).toBe('Fleet Fuel');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
  });
});

describe('batchClassifyLocal', () => {
  const transactions = [
    { id: '1', description: 'SHELL GAS' },
    { id: '2', description: 'HOME DEPOT' },
    { id: '3', description: 'RANDOM UNKNOWN VENDOR' },
    { id: '4', description: 'STARBUCKS COFFEE' },
    { id: '5', description: 'ANOTHER UNKNOWN' },
  ];

  it('should process multiple transactions', () => {
    const { classified, unclassified, stats } = batchClassifyLocal(transactions);
    
    expect(stats.total).toBe(5);
    expect(classified.length + unclassified.length).toBe(5);
  });

  it('should separate classified from unclassified', () => {
    const { classified, unclassified } = batchClassifyLocal(transactions);
    
    // Shell, Home Depot, Starbucks should be classified
    expect(classified.length).toBe(3);
    // Random vendors should be unclassified
    expect(unclassified.length).toBe(2);
  });

  it('should track stats correctly', () => {
    const { stats } = batchClassifyLocal(transactions);
    
    expect(stats.classifiedByDefaultVendors).toBe(3);
    expect(stats.unclassified).toBe(2);
  });

  it('should apply user rules in batch', () => {
    const userRules = [
      {
        id: 'rule-1',
        pattern: 'RANDOM UNKNOWN',
        pattern_type: 'contains',
        vendor_name: 'Random',
        category: 'SUPPLIES',
        subcategory: null,
      },
    ];
    
    const { stats } = batchClassifyLocal(transactions, userRules);
    
    expect(stats.classifiedByUserRules).toBe(1);
    expect(stats.classifiedByDefaultVendors).toBe(3);
    expect(stats.unclassified).toBe(1);
  });
});

describe('Classification Confidence', () => {
  it('should have high confidence for exact matches', () => {
    const transaction = { description: 'SHELL' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should have lower confidence for fuzzy matches', () => {
    // This might fuzzy match to something
    const transaction = { description: 'SHEL GAS' }; // Typo
    const result = classifyLocal(transaction);
    
    // Either matches with lower confidence or is unclassified
    if (result.classification.source !== CLASSIFICATION_SOURCE.UNCLASSIFIED) {
      expect(result.classification.confidence).toBeLessThan(1.0);
    }
  });

  it('should mark unclassified transactions for review', () => {
    const transaction = { description: 'TOTALLY UNKNOWN XYZ 98765' };
    const result = classifyLocal(transaction);
    
    // Unclassified transactions always need review
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
    expect(result.classification.needsReview).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle empty description', () => {
    const transaction = { description: '' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
    expect(result.classification.needsReview).toBe(true);
  });

  it('should handle null description', () => {
    const transaction = { description: null, payee: 'SHELL GAS' };
    const result = classifyLocal(transaction);
    
    // Should fall back to payee field
    expect(result.classification.category).toBe('CAR_TRUCK_EXPENSES');
  });

  it('should handle transaction with only payee', () => {
    const transaction = { payee: 'HOME DEPOT' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('MATERIALS_SUPPLIES');
  });

  it('should handle very long descriptions', () => {
    const longDesc = 'CHECKCARD 12/15 SHELL OIL 12345678 MIAMI FL 33139 USA CARD 1234 #12345678901234567890';
    const transaction = { description: longDesc };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('CAR_TRUCK_EXPENSES');
  });

  it('should handle special characters', () => {
    const transaction = { description: "MCDONALD'S #12345" };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('MEALS');
  });

  it('should handle mixed case', () => {
    const transaction = { description: 'ShElL gAs StAtIoN' };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('CAR_TRUCK_EXPENSES');
  });
});

describe('Specific Vendor Coverage', () => {
  const vendorTests = [
    // Gas Stations
    { desc: 'CHEVRON', category: 'CAR_TRUCK_EXPENSES' },
    { desc: 'EXXON', category: 'CAR_TRUCK_EXPENSES' },
    { desc: 'BP GAS', category: 'CAR_TRUCK_EXPENSES' },
    { desc: 'SPEEDWAY', category: 'CAR_TRUCK_EXPENSES' },
    
    // Hardware/Building
    { desc: 'LOWES', category: 'MATERIALS_SUPPLIES' },
    { desc: 'MENARDS', category: 'MATERIALS_SUPPLIES' },
    { desc: 'ACE HARDWARE', category: 'MATERIALS_SUPPLIES' },
    
    // Software
    { desc: 'GOOGLE CLOUD', category: 'SOFTWARE_SUBSCRIPTIONS' },
    { desc: 'DROPBOX', category: 'SOFTWARE_SUBSCRIPTIONS' },
    { desc: 'ZOOM VIDEO', category: 'SOFTWARE_SUBSCRIPTIONS' },
    { desc: 'SLACK TECHNOLOGIES', category: 'SOFTWARE_SUBSCRIPTIONS' },
    
    // Web Hosting
    { desc: 'GODADDY.COM', category: 'WEB_HOSTING' },
    { desc: 'AWS SERVICES', category: 'WEB_HOSTING' },
    { desc: 'CLOUDFLARE', category: 'WEB_HOSTING' },
    
    // Shipping
    { desc: 'FEDEX SHIPPING', category: 'OTHER_COSTS' },
    { desc: 'USPS PO', category: 'OTHER_COSTS' },
    
    // Banking
    { desc: 'CHASE BANK FEE', category: 'BANK_FEES' },
    { desc: 'INTEREST CHARGE', category: 'INTEREST_OTHER' },
    
    // Advertising
    { desc: 'FACEBOOK ADS', category: 'ADVERTISING' },
    { desc: 'GOOGLE ADS', category: 'ADVERTISING' },
    
    // Travel
    { desc: 'DELTA AIRLINES', category: 'TRAVEL' },
    { desc: 'MARRIOTT HOTEL', category: 'TRAVEL' },
    { desc: 'AIRBNB', category: 'TRAVEL' },
    
    // Insurance
    { desc: 'GEICO INSURANCE', category: 'INSURANCE_OTHER' },
    { desc: 'STATE FARM', category: 'INSURANCE_OTHER' },
  ];

  vendorTests.forEach(({ desc, category }) => {
    it(`should classify "${desc}" as ${category}`, () => {
      const transaction = { description: desc };
      const result = classifyLocal(transaction);
      
      expect(result.classification.category).toBe(category);
    });
  });
});
