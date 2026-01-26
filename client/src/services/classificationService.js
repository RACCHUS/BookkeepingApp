/**
 * Transaction Classification Service
 * 
 * Three-layer classification system:
 * 1. Local Rules - User-defined patterns (highest priority)
 * 2. Default Vendors - Built-in vendor mappings
 * 3. Gemini API - AI classification (batched, free tier)
 * 
 * Unclassified transactions go to Manual Review Queue
 */

import Fuse from 'fuse.js';
import { supabase } from './supabase';
import { DEFAULT_VENDORS, TRANSACTION_PREFIXES, TRANSACTION_SUFFIXES } from '../../../shared/constants/defaultVendors';
import { IRS_CATEGORIES } from '../../../shared/constants/categories';

// Classification sources for tracking
export const CLASSIFICATION_SOURCE = {
  USER_RULE: 'user_rule',
  DEFAULT_VENDOR: 'default_vendor',
  GEMINI_API: 'gemini_api',
  MANUAL: 'manual',
  UNCLASSIFIED: 'unclassified',
};

// Confidence thresholds
const CONFIDENCE = {
  USER_RULE_EXACT: 1.0,
  USER_RULE_FUZZY: 0.85,
  DEFAULT_VENDOR_EXACT: 0.9,
  DEFAULT_VENDOR_FUZZY: 0.75,
  GEMINI_HIGH: 0.8,
  GEMINI_LOW: 0.5,
  MANUAL_REVIEW_THRESHOLD: 0.5,
};

/**
 * Convert category key to its proper IRS_CATEGORIES value
 * @param {string} categoryKey - Category key like 'MEALS' or already proper value like 'Meals'
 * @returns {string} - Proper category value like 'Meals'
 */
function getCategoryValue(categoryKey) {
  if (!categoryKey) return null;
  
  // If categoryKey is already a proper value (exists in IRS_CATEGORIES values), return as-is
  const allValues = Object.values(IRS_CATEGORIES);
  if (allValues.includes(categoryKey)) {
    return categoryKey;
  }
  
  // Otherwise, look up the key and return its value
  return IRS_CATEGORIES[categoryKey] || categoryKey;
}

/**
 * Clean transaction description for better matching
 * @param {string} description - Raw transaction description
 * @returns {string} - Cleaned description
 */
export function cleanDescription(description) {
  if (!description || typeof description !== 'string') {
    return '';
  }

  let cleaned = description.toUpperCase().trim();

  // Remove common prefixes - sort by length (longest first) for greedy matching
  const sortedPrefixes = [...TRANSACTION_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
      break; // Only remove one prefix
    }
  }

  // Remove common suffixes using regex patterns
  for (const suffix of TRANSACTION_SUFFIXES) {
    cleaned = cleaned.replace(suffix, '').trim();
  }

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Extract likely vendor name from transaction description
 * @param {string} description - Transaction description
 * @returns {string} - Extracted vendor name
 */
export function extractVendor(description) {
  const cleaned = cleanDescription(description);
  
  if (!cleaned) {
    return '';
  }

  // Take first 2-3 words as vendor name (most bank descriptions start with vendor)
  const words = cleaned.split(' ');
  const vendorWords = words.slice(0, Math.min(3, words.length));
  
  return vendorWords.join(' ').trim();
}

/**
 * Create Fuse.js search index for user rules
 * @param {Array} rules - Array of classification rules
 * @returns {Fuse} - Configured Fuse instance
 */
function createRulesIndex(rules) {
  return new Fuse(rules, {
    keys: ['pattern', 'vendor_name'],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
  });
}

/**
 * Create Fuse.js search index for default vendors
 * @returns {Fuse} - Configured Fuse instance
 */
function createDefaultVendorsIndex() {
  const vendorEntries = Object.entries(DEFAULT_VENDORS).map(([pattern, data]) => ({
    pattern,
    ...data,
  }));

  return new Fuse(vendorEntries, {
    keys: ['pattern', 'vendor'],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
  });
}

/**
 * Fetch user's global rule settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Settings object
 */
export async function fetchGlobalRuleSettings(userId) {
  try {
    const { data, error } = await supabase
      .from('user_global_rule_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching global rule settings:', error);
    }

    // Default to using global rules if no settings exist
    return data || { use_global_rules: true };
  } catch (err) {
    console.error('Failed to fetch global rule settings:', err);
    return { use_global_rules: true };
  }
}

/**
 * Fetch user's disabled global rules
 * @param {string} userId - User ID
 * @returns {Promise<Set>} - Set of disabled rule IDs
 */
export async function fetchDisabledGlobalRules(userId) {
  try {
    const { data, error } = await supabase
      .from('user_disabled_global_rules')
      .select('rule_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching disabled global rules:', error);
      return new Set();
    }

    return new Set(data?.map(r => r.rule_id) || []);
  } catch (err) {
    console.error('Failed to fetch disabled global rules:', err);
    return new Set();
  }
}

/**
 * Fetch all active global rules
 * @returns {Promise<Array>} - Array of global rules
 */
export async function fetchGlobalRules() {
  try {
    const { data, error } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('is_global', true)
      .eq('is_active', true)
      .order('global_vote_count', { ascending: false });

    if (error) {
      console.error('Error fetching global rules:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch global rules:', err);
    return [];
  }
}

/**
 * Fetch user's classification rules from database
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of rules
 */
export async function fetchUserRules(userId) {
  try {
    const { data, error } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('match_count', { ascending: false }); // Prioritize frequently used rules

    if (error) {
      console.error('Error fetching user rules:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch user rules:', err);
    return [];
  }
}

/**
 * Fetch all rules for a user (user rules + enabled global rules)
 * User rules take priority over global rules
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { userRules, globalRules, useGlobal }
 */
export async function fetchAllRulesForUser(userId) {
  try {
    // Fetch all in parallel
    const [userRules, globalSettings, disabledGlobal, globalRules] = await Promise.all([
      fetchUserRules(userId),
      fetchGlobalRuleSettings(userId),
      fetchDisabledGlobalRules(userId),
      fetchGlobalRules(),
    ]);

    // Filter out disabled global rules
    const enabledGlobalRules = globalSettings.use_global_rules
      ? globalRules.filter(rule => !disabledGlobal.has(rule.id))
      : [];

    return {
      userRules,
      globalRules: enabledGlobalRules,
      useGlobal: globalSettings.use_global_rules,
      disabledGlobalIds: disabledGlobal,
    };
  } catch (err) {
    console.error('Failed to fetch all rules:', err);
    return { userRules: [], globalRules: [], useGlobal: true, disabledGlobalIds: new Set() };
  }
}

/**
 * Check if a rule's amount range matches the transaction amount
 * @param {Object} rule - Classification rule with optional amount_min/amount_max
 * @param {number} amount - Transaction amount
 * @returns {boolean} - True if amount is within rule's range (or no range specified)
 */
function amountMatchesRule(rule, amount) {
  const absAmount = Math.abs(amount);
  
  // Check minimum amount (if specified)
  if (rule.amount_min !== null && rule.amount_min !== undefined) {
    if (absAmount < parseFloat(rule.amount_min)) {
      return false;
    }
  }
  
  // Check maximum amount (if specified)
  if (rule.amount_max !== null && rule.amount_max !== undefined) {
    if (absAmount > parseFloat(rule.amount_max)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Match transaction against user rules
 * @param {string} description - Transaction description
 * @param {Array} rules - User's classification rules
 * @param {number} amount - Transaction amount (for direction and range-based matching)
 * @returns {Object|null} - Match result or null
 */
function matchUserRules(description, rules, amount = 0) {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return null;
  }

  const cleaned = cleanDescription(description);
  const extracted = extractVendor(description);
  
  // Safely parse amount - handle strings, null, undefined
  const numericAmount = parseFloat(amount) || 0;
  
  // Determine the transaction direction based on amount
  const txDirection = numericAmount >= 0 ? 'positive' : 'negative';

  // First try exact match on pattern
  for (const rule of rules) {
    // Skip invalid rules
    if (!rule || !rule.pattern || !rule.category) {
      continue;
    }
    
    // Check if rule applies to this amount direction
    // Rule matches if: direction is 'any'/null/undefined OR direction matches transaction's direction
    const ruleDirection = rule.amount_direction || 'any';
    if (ruleDirection !== 'any' && ruleDirection !== txDirection) {
      continue; // Skip this rule - direction doesn't match
    }
    
    // Check if rule applies to this amount range
    if (!amountMatchesRule(rule, numericAmount)) {
      continue; // Skip this rule - amount outside range
    }
    
    const pattern = (rule.pattern || '').toUpperCase();
    
    if (rule.pattern_type === 'exact' && cleaned === pattern) {
      return {
        category: getCategoryValue(rule.category),
        subcategory: rule.subcategory,
        vendor: rule.vendor_name,
        confidence: CONFIDENCE.USER_RULE_EXACT,
        source: CLASSIFICATION_SOURCE.USER_RULE,
        ruleId: rule.id,
      };
    }

    if (rule.pattern_type === 'contains' && cleaned.includes(pattern)) {
      return {
        category: getCategoryValue(rule.category),
        subcategory: rule.subcategory,
        vendor: rule.vendor_name,
        confidence: CONFIDENCE.USER_RULE_EXACT,
        source: CLASSIFICATION_SOURCE.USER_RULE,
        ruleId: rule.id,
      };
    }

    if (rule.pattern_type === 'starts_with' && cleaned.startsWith(pattern)) {
      return {
        category: getCategoryValue(rule.category),
        subcategory: rule.subcategory,
        vendor: rule.vendor_name,
        confidence: CONFIDENCE.USER_RULE_EXACT,
        source: CLASSIFICATION_SOURCE.USER_RULE,
        ruleId: rule.id,
      };
    }
  }

  // Then try fuzzy match - filter rules by direction and amount range first
  const filteredRules = rules.filter(rule => {
    const ruleDirection = rule.amount_direction || 'any';
    const directionMatches = ruleDirection === 'any' || ruleDirection === txDirection;
    const amountMatches = amountMatchesRule(rule, numericAmount);
    return directionMatches && amountMatches;
  });
  
  const fuseIndex = createRulesIndex(filteredRules);
  const results = fuseIndex.search(extracted);

  if (results.length > 0 && results[0].score < 0.3) {
    const match = results[0].item;
    return {
      category: match.category,
      subcategory: match.subcategory,
      vendor: match.vendor_name,
      confidence: CONFIDENCE.USER_RULE_FUZZY * (1 - results[0].score),
      source: CLASSIFICATION_SOURCE.USER_RULE,
      ruleId: match.id,
    };
  }

  return null;
}

// Income categories that should match positive amounts (use KEYS for comparison with DEFAULT_VENDORS)
const INCOME_CATEGORY_KEYS = [
  'INCOME', 'GROSS_RECEIPTS', 'RENTAL_INCOME', 'INTEREST_INCOME', 
  'DIVIDEND_INCOME', 'CAPITAL_GAINS', 'OTHER_INCOME', 'OWNER_CONTRIBUTION'
];

// Income category VALUES for comparing with already-converted categories
const INCOME_CATEGORY_VALUES = [
  'Gross Receipts or Sales', 'Other Income', 'Owner Contribution/Capital'
];

/**
 * Get the expected direction for a vendor based on its category
 * @param {string} category - The category key or value
 * @returns {string} - 'positive' for income, 'negative' for expenses
 */
function getVendorDirection(category) {
  // Check both keys (for DEFAULT_VENDORS) and values (for already-converted categories)
  return INCOME_CATEGORY_KEYS.includes(category) || INCOME_CATEGORY_VALUES.includes(category) 
    ? 'positive' 
    : 'negative';
}

/**
 * Check if a vendor's direction matches the transaction amount
 * @param {string} category - Vendor category
 * @param {number} amount - Transaction amount
 * @returns {boolean} - True if direction matches
 */
function directionMatchesAmount(category, amount) {
  const vendorDirection = getVendorDirection(category);
  const amountDirection = parseFloat(amount) >= 0 ? 'positive' : 'negative';
  return vendorDirection === amountDirection;
}

/**
 * Match transaction against default vendor mappings
 * @param {string} description - Transaction description
 * @param {number} amount - Transaction amount (for direction matching)
 * @returns {Object|null} - Match result or null
 */
function matchDefaultVendors(description, amount = 0) {
  const cleaned = cleanDescription(description);
  const extracted = extractVendor(description);

  // Sort patterns by length (longest first) for more specific matching
  const sortedPatterns = Object.entries(DEFAULT_VENDORS)
    .sort(([a], [b]) => b.length - a.length);

  // First try exact match (longer patterns checked first)
  for (const [pattern, data] of sortedPatterns) {
    if (cleaned.includes(pattern) || extracted.includes(pattern)) {
      // Check if the amount direction matches what we'd expect for this category
      if (!directionMatchesAmount(data.category, amount)) {
        continue; // Skip this match - direction doesn't match
      }
      // Convert category key to proper IRS_CATEGORIES value
      const categoryValue = getCategoryValue(data.category);
      return {
        category: categoryValue,
        subcategory: data.subcategory,
        vendor: data.vendor,
        confidence: CONFIDENCE.DEFAULT_VENDOR_EXACT,
        source: CLASSIFICATION_SOURCE.DEFAULT_VENDOR,
        amount_direction: getVendorDirection(data.category),
      };
    }
  }

  // Then try fuzzy match
  const fuseIndex = createDefaultVendorsIndex();
  const results = fuseIndex.search(extracted);

  if (results.length > 0 && results[0].score < 0.3) {
    const match = results[0].item;
    // Check direction for fuzzy match too
    if (!directionMatchesAmount(match.category, amount)) {
      return null; // Direction doesn't match
    }
    // Convert category key to proper IRS_CATEGORIES value
    const categoryValue = getCategoryValue(match.category);
    return {
      category: categoryValue,
      subcategory: match.subcategory,
      vendor: match.vendor,
      confidence: CONFIDENCE.DEFAULT_VENDOR_FUZZY * (1 - results[0].score),
      source: CLASSIFICATION_SOURCE.DEFAULT_VENDOR,
      amount_direction: getVendorDirection(match.category),
    };
  }

  return null;
}

/**
 * Classify a single transaction using local rules
 * @param {Object} transaction - Transaction object with description
 * @param {Array} userRules - User's classification rules
 * @returns {Object} - Classification result
 */
export function classifyLocal(transaction, userRules = []) {
  const description = transaction.description || transaction.payee || '';
  const amount = transaction.amount || 0; // Get amount for direction-based matching

  if (!description) {
    return {
      ...transaction,
      classification: {
        category: null,
        subcategory: null,
        vendor: null,
        confidence: 0,
        source: CLASSIFICATION_SOURCE.UNCLASSIFIED,
        needsReview: true,
      },
    };
  }

  // Layer 1: User Rules (pass amount for direction-based matching)
  const userMatch = matchUserRules(description, userRules, amount);
  if (userMatch) {
    return {
      ...transaction,
      classification: {
        ...userMatch,
        needsReview: userMatch.confidence < CONFIDENCE.MANUAL_REVIEW_THRESHOLD,
      },
    };
  }

  // Layer 2: Default Vendors (pass amount for direction-based matching)
  const defaultMatch = matchDefaultVendors(description, amount);
  if (defaultMatch) {
    return {
      ...transaction,
      classification: {
        ...defaultMatch,
        needsReview: defaultMatch.confidence < CONFIDENCE.MANUAL_REVIEW_THRESHOLD,
      },
    };
  }

  // No local match - needs Gemini or manual review
  return {
    ...transaction,
    classification: {
      category: null,
      subcategory: null,
      vendor: extractVendor(description),
      confidence: 0,
      source: CLASSIFICATION_SOURCE.UNCLASSIFIED,
      needsReview: true,
    },
  };
}

/**
 * Classify multiple transactions locally (batch)
 * @param {Array} transactions - Array of transactions
 * @param {Array} userRules - User's classification rules
 * @returns {Object} - { classified: [], unclassified: [], stats: {} }
 */
export function batchClassifyLocal(transactions, userRules = []) {
  const classified = [];
  const unclassified = [];
  const stats = {
    total: transactions.length,
    classifiedByUserRules: 0,
    classifiedByDefaultVendors: 0,
    unclassified: 0,
  };

  for (const transaction of transactions) {
    const result = classifyLocal(transaction, userRules);
    
    if (result.classification.source === CLASSIFICATION_SOURCE.USER_RULE) {
      stats.classifiedByUserRules++;
      classified.push(result);
    } else if (result.classification.source === CLASSIFICATION_SOURCE.DEFAULT_VENDOR) {
      stats.classifiedByDefaultVendors++;
      classified.push(result);
    } else {
      stats.unclassified++;
      unclassified.push(result);
    }
  }

  return { classified, unclassified, stats };
}

/**
 * Send unclassified transactions to Gemini API for classification
 * @param {Array} transactions - Unclassified transactions
 * @param {string} userId - User ID for rate limiting
 * @returns {Promise<Array>} - Classified transactions
 */
export async function classifyWithGemini(transactions, userId) {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('classify-transactions', {
      body: {
        transactions: transactions.map(t => ({
          id: t.id,
          description: t.description || t.payee,
          amount: t.amount,
          date: t.date,
        })),
        userId,
      },
    });

    if (error) {
      console.error('Gemini classification error:', error);
      // Return transactions with unclassified status
      return transactions.map(t => ({
        ...t,
        classification: {
          ...t.classification,
          geminiError: error.message,
        },
      }));
    }

    // Merge Gemini results back into transactions
    const resultMap = new Map(data.results.map(r => [r.id, r]));
    
    return transactions.map(t => {
      const geminiResult = resultMap.get(t.id);
      if (geminiResult && geminiResult.category) {
        // Normalize category key to value (e.g., 'GROSS_RECEIPTS' -> 'Gross Receipts or Sales')
        const normalizedCategory = getCategoryValue(geminiResult.category);
        return {
          ...t,
          classification: {
            category: normalizedCategory,
            subcategory: geminiResult.subcategory,
            vendor: geminiResult.vendor || t.classification?.vendor,
            confidence: geminiResult.confidence || CONFIDENCE.GEMINI_LOW,
            source: CLASSIFICATION_SOURCE.GEMINI_API,
            needsReview: (geminiResult.confidence || 0) < CONFIDENCE.MANUAL_REVIEW_THRESHOLD,
          },
        };
      }
      return t;
    });
  } catch (err) {
    console.error('Failed to call Gemini classification:', err);
    return transactions.map(t => ({
      ...t,
      classification: {
        ...t.classification,
        geminiError: err.message,
      },
    }));
  }
}

/**
 * Full classification pipeline: Local → Gemini → Manual Queue
 * @param {Array} transactions - Transactions to classify
 * @param {string} userId - User ID
 * @param {Object} options - { skipGemini: boolean }
 * @returns {Promise<Object>} - Classification results
 */
export async function classifyTransactions(transactions, userId, options = {}) {
  const { skipGemini = false } = options;

  try {
    // Fetch user rules
    const userRules = await fetchUserRules(userId);

    // Layer 1 & 2: Local classification
    const localResults = batchClassifyLocal(transactions, userRules);

    // If skipGemini or no unclassified, return local results
    if (skipGemini || localResults.unclassified.length === 0) {
      return {
        results: [...localResults.classified, ...localResults.unclassified],
        stats: localResults.stats,
        needsManualReview: localResults.unclassified,
      };
    }

    // Layer 3: Gemini API for unclassified
    const geminiResults = await classifyWithGemini(localResults.unclassified, userId);

    // Split Gemini results
    const geminiClassified = geminiResults.filter(
      t => t.classification?.source === CLASSIFICATION_SOURCE.GEMINI_API
    );
    const stillUnclassified = geminiResults.filter(
      t => t.classification?.source !== CLASSIFICATION_SOURCE.GEMINI_API
    );

    // Update stats
    const finalStats = {
      ...localResults.stats,
      classifiedByGemini: geminiClassified.length,
      unclassified: stillUnclassified.length,
    };

    return {
      results: [...localResults.classified, ...geminiClassified, ...stillUnclassified],
      stats: finalStats,
      needsManualReview: stillUnclassified,
    };
  } catch (err) {
    console.error('Classification pipeline error:', err);
    throw new Error(`Classification failed: ${err.message}`);
  }
}

/**
 * Save a new classification rule (from manual classification)
 * @param {Object} rule - Rule to save
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Saved rule
 */
export async function saveClassificationRule(rule, userId) {
  try {
    const { data, error } = await supabase
      .from('classification_rules')
      .insert({
        user_id: userId,
        pattern: rule.pattern.toUpperCase(),
        pattern_type: rule.patternType || 'contains',
        vendor_name: rule.vendor,
        category: getCategoryValue(rule.category),
        subcategory: rule.subcategory,
        confidence: 1.0,
        source: 'manual',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving rule:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Failed to save classification rule:', err);
    throw new Error(`Failed to save rule: ${err.message}`);
  }
}

/**
 * Increment match count for a rule (track usage)
 * @param {string} ruleId - Rule ID
 */
export async function incrementRuleMatchCount(ruleId) {
  try {
    const { error } = await supabase.rpc('increment_rule_match_count', {
      rule_id: ruleId,
    });

    if (error) {
      console.error('Error incrementing rule count:', error);
    }
  } catch (err) {
    console.error('Failed to increment rule match count:', err);
  }
}

/**
 * Get classification statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Statistics
 */
export async function getClassificationStats(userId) {
  try {
    const { data: rules, error } = await supabase
      .from('classification_rules')
      .select('source, match_count')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const stats = {
      totalRules: rules?.length || 0,
      totalMatches: rules?.reduce((sum, r) => sum + (r.match_count || 0), 0) || 0,
      rulesBySource: {},
    };

    for (const rule of (rules || [])) {
      stats.rulesBySource[rule.source] = (stats.rulesBySource[rule.source] || 0) + 1;
    }

    return stats;
  } catch (err) {
    console.error('Failed to get classification stats:', err);
    return { totalRules: 0, totalMatches: 0, rulesBySource: {} };
  }
}

// ============================================
// GLOBAL RULES MANAGEMENT
// ============================================

/**
 * Toggle user's global rules setting (master on/off)
 * @param {string} userId - User ID
 * @param {boolean} useGlobal - Whether to use global rules
 * @returns {Promise<Object>} - Updated settings
 */
export async function toggleGlobalRules(userId, useGlobal) {
  try {
    const { data, error } = await supabase
      .from('user_global_rule_settings')
      .upsert({
        user_id: userId,
        use_global_rules: useGlobal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error toggling global rules:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Failed to toggle global rules:', err);
    throw new Error(`Failed to update setting: ${err.message}`);
  }
}

/**
 * Disable a specific global rule for a user
 * @param {string} userId - User ID
 * @param {string} ruleId - Global rule ID to disable
 * @returns {Promise<void>}
 */
export async function disableGlobalRule(userId, ruleId) {
  try {
    const { error } = await supabase
      .from('user_disabled_global_rules')
      .insert({
        user_id: userId,
        rule_id: ruleId,
      });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error disabling global rule:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to disable global rule:', err);
    throw new Error(`Failed to disable rule: ${err.message}`);
  }
}

/**
 * Re-enable a specific global rule for a user
 * @param {string} userId - User ID
 * @param {string} ruleId - Global rule ID to re-enable
 * @returns {Promise<void>}
 */
export async function enableGlobalRule(userId, ruleId) {
  try {
    const { error } = await supabase
      .from('user_disabled_global_rules')
      .delete()
      .eq('user_id', userId)
      .eq('rule_id', ruleId);

    if (error) {
      console.error('Error enabling global rule:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to enable global rule:', err);
    throw new Error(`Failed to enable rule: ${err.message}`);
  }
}

/**
 * Get global rules with user's enabled/disabled status
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Global rules with isEnabled flag
 */
export async function getGlobalRulesWithStatus(userId) {
  try {
    const [globalRules, disabledIds, settings] = await Promise.all([
      fetchGlobalRules(),
      fetchDisabledGlobalRules(userId),
      fetchGlobalRuleSettings(userId),
    ]);

    return {
      useGlobal: settings.use_global_rules,
      rules: globalRules.map(rule => ({
        ...rule,
        isEnabled: !disabledIds.has(rule.id),
      })),
    };
  } catch (err) {
    console.error('Failed to get global rules with status:', err);
    return { useGlobal: true, rules: [] };
  }
}

export default {
  classifyLocal,
  batchClassifyLocal,
  classifyWithGemini,
  classifyTransactions,
  saveClassificationRule,
  fetchUserRules,
  fetchGlobalRules,
  fetchAllRulesForUser,
  fetchGlobalRuleSettings,
  toggleGlobalRules,
  disableGlobalRule,
  enableGlobalRule,
  getGlobalRulesWithStatus,
  cleanDescription,
  extractVendor,
  getClassificationStats,
  getCategoryValue,
  CLASSIFICATION_SOURCE,
};
