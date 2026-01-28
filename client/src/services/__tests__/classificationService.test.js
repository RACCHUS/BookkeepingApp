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
  // Note: All expense vendor tests need negative amounts due to direction-aware matching
  it('should classify gas stations as Car and Truck Expenses', () => {
    const transaction = { description: 'SHELL OIL 12345', amount: -45.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Car and Truck Expenses');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.DEFAULT_VENDOR);
    expect(result.classification.vendor).toBe('Shell');
  });

  it('should classify Home Depot as Materials and Supplies', () => {
    const transaction = { description: 'HOME DEPOT 1234 MIAMI FL', amount: -150.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Materials and Supplies');
    expect(result.classification.vendor).toBe('Home Depot');
  });

  it('should classify software subscriptions correctly', () => {
    const transaction = { description: 'ADOBE CREATIVE CLOUD', amount: -54.99 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Software Subscriptions');
    expect(result.classification.vendor).toBe('Adobe');
  });

  it('should classify Microsoft as Software Subscriptions', () => {
    const transaction = { description: 'MICROSOFT 365', amount: -9.99 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Software Subscriptions');
  });

  it('should classify office supplies stores', () => {
    const transaction = { description: 'STAPLES #1234', amount: -35.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Office Expenses');
    expect(result.classification.vendor).toBe('Staples');
  });

  it('should classify shipping services', () => {
    const transaction = { description: 'UPS STORE 1234', amount: -25.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Other Costs (shipping, packaging)');
    expect(result.classification.vendor).toBe('UPS');
  });

  it('should classify utilities', () => {
    const transaction = { description: 'FPL ELECTRIC BILL', amount: -180.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Utilities');
  });

  it('should classify meals/restaurants', () => {
    const transaction = { description: 'STARBUCKS STORE 12345', amount: -6.50 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Meals');
    expect(result.classification.vendor).toBe('Starbucks');
  });

  it('should classify travel/rideshare', () => {
    const transaction = { description: 'UBER TRIP', amount: -22.50 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Travel');
    expect(result.classification.vendor).toBe('Uber');
  });

  it('should classify ATM withdrawals as Owner Draws', () => {
    const transaction = { description: 'ATM WITHDRAWAL', amount: -100.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Owner Draws/Distributions');
  });

  it('should return unclassified for unknown/personal transactions', () => {
    // Netflix was removed from vendors (marked as potentially personal)
    const transaction = { description: 'NETFLIX.COM', amount: -15.99 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
  });

  it('should return unclassified for unknown transactions', () => {
    const transaction = { description: 'RANDOM VENDOR XYZ 98765', amount: -50.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
    expect(result.classification.needsReview).toBe(true);
  });
});

describe('classifyLocal - Default Vendors Direction Filtering', () => {
  // Default vendors should only match when direction is appropriate
  // Expense vendors (MEALS, CAR_TRUCK_EXPENSES, etc.) should only match negative amounts
  // Income vendors (OWNER_CONTRIBUTION, etc.) should only match positive amounts

  it('should match expense vendor with negative amount', () => {
    const transaction = { 
      description: 'STARBUCKS COFFEE', 
      amount: -5.50 
    };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Meals');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.DEFAULT_VENDOR);
  });

  it('should NOT match expense vendor with positive amount (refund)', () => {
    const transaction = { 
      description: 'STARBUCKS COFFEE REFUND', 
      amount: 5.50 
    };
    const result = classifyLocal(transaction);
    
    // Should NOT match MEALS because MEALS is an expense category but amount is positive
    // Should be unclassified since no default vendor matches this positive Starbucks transaction
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
  });

  it('should match gas station with negative amount', () => {
    const transaction = { 
      description: 'CHEVRON GAS', 
      amount: -45.00 
    };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Car and Truck Expenses');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.DEFAULT_VENDOR);
  });

  it('should NOT match gas station with positive amount', () => {
    const transaction = { 
      description: 'CHEVRON REFUND', 
      amount: 45.00 
    };
    const result = classifyLocal(transaction);
    
    // Gas station refund should not classify as CAR_TRUCK_EXPENSES
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
  });

  it('should match software subscription with negative amount', () => {
    const transaction = { 
      description: 'ADOBE CREATIVE CLOUD', 
      amount: -54.99 
    };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Software Subscriptions');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.DEFAULT_VENDOR);
  });

  it('should handle transaction with zero amount (treat as positive)', () => {
    const transaction = { 
      description: 'STARBUCKS ADJUSTMENT', 
      amount: 0 
    };
    const result = classifyLocal(transaction);
    
    // Zero treated as positive, so expense vendor shouldn't match
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
  });

  it('should handle transaction with missing amount (treat as 0/positive)', () => {
    const transaction = { 
      description: 'STARBUCKS NO AMOUNT' 
      // No amount field
    };
    const result = classifyLocal(transaction);
    
    // Missing amount treated as 0 (positive), so expense vendor shouldn't match
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
  });

  it('should handle string amount values', () => {
    const transaction = { 
      description: 'HOME DEPOT SUPPLIES', 
      amount: '-125.50' // String instead of number
    };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Materials and Supplies');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.DEFAULT_VENDOR);
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
    
    expect(result.classification.category).toBe('Supplies (Not Inventory)');
    expect(result.classification.subcategory).toBe('Custom Supplies');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
    expect(result.classification.ruleId).toBe('rule-1');
  });

  it('should match user rule with exact pattern', () => {
    const transaction = { description: 'EXACT MATCH TEST' };
    const result = classifyLocal(transaction, userRules);
    
    expect(result.classification.category).toBe('Other Expenses');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
  });

  it('should match user rule with starts_with pattern', () => {
    const transaction = { description: 'PREFIX SOMETHING ELSE' };
    const result = classifyLocal(transaction, userRules);
    
    expect(result.classification.category).toBe('Advertising');
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
    
    const transaction = { description: 'SHELL OIL 12345', amount: -45.00 };
    const result = classifyLocal(transaction, overrideRules);
    
    expect(result.classification.category).toBe('Other Expenses');
    expect(result.classification.subcategory).toBe('Fleet Fuel');
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.USER_RULE);
  });
});

describe('batchClassifyLocal', () => {
  // Expense vendors need negative amounts
  const transactions = [
    { id: '1', description: 'SHELL GAS', amount: -45.00 },
    { id: '2', description: 'HOME DEPOT', amount: -150.00 },
    { id: '3', description: 'RANDOM UNKNOWN VENDOR', amount: -50.00 },
    { id: '4', description: 'STARBUCKS COFFEE', amount: -6.50 },
    { id: '5', description: 'ANOTHER UNKNOWN', amount: -25.00 },
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
  it('should have reasonable confidence for matches', () => {
    // Use "SHELL OIL" which is a more specific match in the vendor list
    const transaction = { description: 'SHELL OIL', amount: -45.00 };
    const result = classifyLocal(transaction);
    
    // Default vendor matches have 0.75 base confidence
    expect(result.classification.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should have lower confidence for fuzzy matches', () => {
    // This might fuzzy match to something
    const transaction = { description: 'SHEL GAS', amount: -45.00 }; // Typo
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
    const transaction = { description: '', amount: -50.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.source).toBe(CLASSIFICATION_SOURCE.UNCLASSIFIED);
    expect(result.classification.needsReview).toBe(true);
  });

  it('should handle null description', () => {
    const transaction = { description: null, payee: 'SHELL GAS', amount: -45.00 };
    const result = classifyLocal(transaction);
    
    // Should fall back to payee field
    expect(result.classification.category).toBe('Car and Truck Expenses');
  });

  it('should handle transaction with only payee', () => {
    const transaction = { payee: 'HOME DEPOT', amount: -150.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Materials and Supplies');
  });

  it('should handle very long descriptions', () => {
    const longDesc = 'CHECKCARD 12/15 SHELL OIL 12345678 MIAMI FL 33139 USA CARD 1234 #12345678901234567890';
    const transaction = { description: longDesc, amount: -45.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Car and Truck Expenses');
  });

  it('should handle special characters', () => {
    const transaction = { description: "MCDONALD'S #12345", amount: -8.50 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Meals');
  });

  it('should handle mixed case', () => {
    const transaction = { description: 'ShElL gAs StAtIoN', amount: -45.00 };
    const result = classifyLocal(transaction);
    
    expect(result.classification.category).toBe('Car and Truck Expenses');
  });
});

describe('classifyLocal - Amount Direction Filtering', () => {
  const directionRules = [
    {
      id: 'rule-income',
      pattern: 'DEERFIELD RENTAL',
      pattern_type: 'contains',
      vendor_name: 'Deerfield Rental',
      category: 'GROSS_RENTS',
      subcategory: 'Rental Income',
      amount_direction: 'positive',
    },
    {
      id: 'rule-expense',
      pattern: 'DEERFIELD RENTAL',
      pattern_type: 'contains',
      vendor_name: 'Deerfield Rental',
      category: 'RENT_LEASE_OTHER',
      subcategory: 'Equipment Rental',
      amount_direction: 'negative',
    },
    {
      id: 'rule-any',
      pattern: 'OFFICE DEPOT',
      pattern_type: 'contains',
      vendor_name: 'Office Depot',
      category: 'OFFICE_EXPENSES',
      subcategory: null,
      amount_direction: 'any',
    },
    {
      id: 'rule-no-direction',
      pattern: 'STAPLES',
      pattern_type: 'contains',
      vendor_name: 'Staples',
      category: 'OFFICE_EXPENSES',
      subcategory: null,
      // No amount_direction - should default to 'any'
    },
  ];

  it('should match positive-only rule for positive amounts (income)', () => {
    const transaction = { 
      description: 'DEERFIELD RENTAL PAYMENT', 
      amount: 500.00 // Positive = income
    };
    const result = classifyLocal(transaction, directionRules);
    
    expect(result.classification.category).toBe('GROSS_RENTS');
    expect(result.classification.subcategory).toBe('Rental Income');
    expect(result.classification.ruleId).toBe('rule-income');
  });

  it('should match negative-only rule for negative amounts (expense)', () => {
    const transaction = { 
      description: 'DEERFIELD RENTAL EQUIPMENT', 
      amount: -200.00 // Negative = expense
    };
    const result = classifyLocal(transaction, directionRules);
    
    expect(result.classification.category).toBe('Rent or Lease (Other Business Property)');
    expect(result.classification.subcategory).toBe('Equipment Rental');
    expect(result.classification.ruleId).toBe('rule-expense');
  });

  it('should NOT match positive-only rule for negative amounts', () => {
    // Only have positive rule, test negative amount
    const positiveOnlyRules = [directionRules[0]]; // rule-income only
    const transaction = { 
      description: 'DEERFIELD RENTAL SOMETHING', 
      amount: -100.00 
    };
    const result = classifyLocal(transaction, positiveOnlyRules);
    
    // Should NOT match because direction doesn't match
    expect(result.classification.ruleId).not.toBe('rule-income');
  });

  it('should NOT match negative-only rule for positive amounts', () => {
    // Only have negative rule, test positive amount
    const negativeOnlyRules = [directionRules[1]]; // rule-expense only
    const transaction = { 
      description: 'DEERFIELD RENTAL SOMETHING', 
      amount: 100.00 
    };
    const result = classifyLocal(transaction, negativeOnlyRules);
    
    // Should NOT match because direction doesn't match
    expect(result.classification.ruleId).not.toBe('rule-expense');
  });

  it('should match "any" direction rule for positive amounts', () => {
    const transaction = { 
      description: 'OFFICE DEPOT REFUND', 
      amount: 50.00 // Positive
    };
    const result = classifyLocal(transaction, directionRules);
    
    expect(result.classification.category).toBe('Office Expenses');
    expect(result.classification.ruleId).toBe('rule-any');
  });

  it('should match "any" direction rule for negative amounts', () => {
    const transaction = { 
      description: 'OFFICE DEPOT PURCHASE', 
      amount: -75.00 // Negative
    };
    const result = classifyLocal(transaction, directionRules);
    
    expect(result.classification.category).toBe('Office Expenses');
    expect(result.classification.ruleId).toBe('rule-any');
  });

  it('should treat missing amount_direction as "any"', () => {
    const transaction = { 
      description: 'STAPLES STORE', 
      amount: -45.00 
    };
    const result = classifyLocal(transaction, directionRules);
    
    expect(result.classification.category).toBe('Office Expenses');
    expect(result.classification.ruleId).toBe('rule-no-direction');
  });

  it('should treat zero amount as positive direction', () => {
    const transaction = { 
      description: 'DEERFIELD RENTAL ZERO', 
      amount: 0 
    };
    const result = classifyLocal(transaction, directionRules);
    
    // Zero is treated as positive (>= 0)
    expect(result.classification.category).toBe('GROSS_RENTS');
  });

  it('should handle missing amount gracefully (treat as 0/positive)', () => {
    const transaction = { 
      description: 'DEERFIELD RENTAL NO AMOUNT'
      // No amount field
    };
    const result = classifyLocal(transaction, directionRules);
    
    // Should treat missing amount as 0 (positive)
    expect(result.classification.category).toBe('GROSS_RENTS');
  });
});

describe('Specific Vendor Coverage', () => {
  // Only test vendors that actually exist in DEFAULT_VENDORS
  // Now using proper IRS_CATEGORIES values (not keys)
  const vendorTests = [
    // Gas Stations
    { desc: 'CHEVRON', category: 'Car and Truck Expenses' },
    { desc: 'EXXON', category: 'Car and Truck Expenses' },
    { desc: 'BP GAS', category: 'Car and Truck Expenses' },
    // Note: SPEEDWAY not in DEFAULT_VENDORS
    
    // Hardware/Building
    { desc: 'LOWES', category: 'Materials and Supplies' },
    { desc: 'MENARDS', category: 'Materials and Supplies' },
    { desc: 'ACE HARDWARE', category: 'Materials and Supplies' },
    
    // Software (Note: Use 'GOOGLE' not 'GOOGLE CLOUD' - matches via alias)
    { desc: 'DROPBOX', category: 'Software Subscriptions' },
    { desc: 'ZOOM VIDEO', category: 'Software Subscriptions' },
    { desc: 'SLACK TECHNOLOGIES', category: 'Software Subscriptions' },
    
    // Web Hosting
    { desc: 'GODADDY.COM', category: 'Web Hosting & Domains' },
    { desc: 'AWS SERVICES', category: 'Web Hosting & Domains' },
    { desc: 'CLOUDFLARE', category: 'Web Hosting & Domains' },
    
    // Shipping
    { desc: 'FEDEX SHIPPING', category: 'Other Costs (shipping, packaging)' },
    { desc: 'USPS PO', category: 'Other Costs (shipping, packaging)' },
    
    // Banking
    { desc: 'CHASE BANK FEE', category: 'Bank Fees' },
    { desc: 'INTEREST CHARGE', category: 'Interest (Other)' },
    
    // Advertising
    { desc: 'FACEBOOK ADS', category: 'Advertising' },
    { desc: 'GOOGLE ADS', category: 'Advertising' },
    
    // Travel
    { desc: 'DELTA AIRLINES', category: 'Travel' },
    { desc: 'MARRIOTT HOTEL', category: 'Travel' },
    { desc: 'AIRBNB', category: 'Travel' },
    
    // Insurance
    { desc: 'GEICO INSURANCE', category: 'Insurance (Other than Health)' },
    { desc: 'STATE FARM', category: 'Insurance (Other than Health)' },
  ];

  vendorTests.forEach(({ desc, category }) => {
    it(`should classify "${desc}" as ${category}`, () => {
      // All vendor tests are expense categories, so use negative amount
      const transaction = { description: desc, amount: -50.00 };
      const result = classifyLocal(transaction);
      
      expect(result.classification.category).toBe(category);
    });
  });
});
