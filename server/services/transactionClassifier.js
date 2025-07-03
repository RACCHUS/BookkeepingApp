import { CLASSIFICATION_KEYWORDS, PAYEE_PATTERNS } from '../../shared/constants/keywords.js';
import { IRS_CATEGORIES } from '../../shared/constants/categories.js';
import firebaseService from './cleanFirebaseService.js';

class TransactionClassifier {
  constructor() {
    this.keywordWeights = {
      payee: 0.4,
      description: 0.3,
      amount: 0.2,
      historical: 0.1
    };
  }

  async classifyTransaction(transaction, userId) {
    try {
      // Get user's custom classification rules
      const userRules = await firebaseService.getClassificationRules(userId);
      
      // Try user-defined rules first
      const userRuleMatch = this.applyUserRules(transaction, userRules);
      if (userRuleMatch.confidence > 0.8) {
        return userRuleMatch;
      }

      // Apply built-in classification
      const builtInClassification = this.applyBuiltInClassification(transaction);
      
      // Get historical classification if available
      const historicalClassification = await this.getHistoricalClassification(transaction, userId);
      
      // Combine results
      const finalClassification = this.combineClassifications([
        userRuleMatch,
        builtInClassification,
        historicalClassification
      ]);

      return finalClassification;

    } catch (error) {
      console.error('Classification error:', error);
      return {
        category: IRS_CATEGORIES.UNCATEGORIZED,
        confidence: 0.1,
        method: 'error_fallback',
        suggestions: []
      };
    }
  }

  applyUserRules(transaction, rules) {
    const payeeLower = transaction.payee.toLowerCase();
    const descriptionLower = transaction.description.toLowerCase();
    const amount = Math.abs(transaction.amount);

    for (const rule of rules) {
      let score = 0;
      let matchCount = 0;

      // Check payee matches
      if (rule.payeeContains && rule.payeeContains.length > 0) {
        const payeeMatches = rule.payeeContains.some(keyword => 
          payeeLower.includes(keyword.toLowerCase())
        );
        if (payeeMatches) {
          score += this.keywordWeights.payee;
          matchCount++;
        }
      }

      // Check description matches
      if (rule.descriptionContains && rule.descriptionContains.length > 0) {
        const descriptionMatches = rule.descriptionContains.some(keyword => 
          descriptionLower.includes(keyword.toLowerCase())
        );
        if (descriptionMatches) {
          score += this.keywordWeights.description;
          matchCount++;
        }
      }

      // Check amount range
      if (rule.amountRange && rule.amountRange.min !== null && rule.amountRange.max !== null) {
        if (amount >= rule.amountRange.min && amount <= rule.amountRange.max) {
          score += this.keywordWeights.amount;
          matchCount++;
        }
      }

      // If we have matches, return this rule
      if (matchCount > 0) {
        const confidence = (score / matchCount) * rule.confidence * rule.successRate;
        
        if (confidence > 0.5) {
          return {
            category: rule.targetCategory,
            subcategory: rule.targetSubcategory,
            type: rule.targetType,
            confidence,
            method: 'user_rule',
            ruleId: rule.id,
            ruleName: rule.ruleName
          };
        }
      }
    }

    return {
      category: IRS_CATEGORIES.UNCATEGORIZED,
      confidence: 0,
      method: 'user_rule_no_match'
    };
  }

  applyBuiltInClassification(transaction) {
    const payeeLower = transaction.payee.toLowerCase();
    const descriptionLower = transaction.description.toLowerCase();
    
    let bestMatch = {
      category: IRS_CATEGORIES.UNCATEGORIZED,
      confidence: 0,
      method: 'keyword_matching'
    };

    // Check payee patterns first (higher confidence)
    for (const [category, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (payeeLower.includes(keyword.toLowerCase())) {
          const confidence = 0.7; // High confidence for payee matches
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              category,
              confidence,
              method: 'payee_keyword_match',
              matchedKeyword: keyword
            };
          }
        }
      }
    }

    // Check description keywords (medium confidence)
    if (bestMatch.confidence < 0.6) {
      for (const [category, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
        for (const keyword of keywords) {
          if (descriptionLower.includes(keyword.toLowerCase())) {
            const confidence = 0.5; // Medium confidence for description matches
            if (confidence > bestMatch.confidence) {
              bestMatch = {
                category,
                confidence,
                method: 'description_keyword_match',
                matchedKeyword: keyword
              };
            }
          }
        }
      }
    }

    // Amount-based heuristics
    const amount = Math.abs(transaction.amount);
    if (bestMatch.confidence < 0.4) {
      if (amount < 10 && (payeeLower.includes('coffee') || payeeLower.includes('starbucks'))) {
        bestMatch = {
          category: IRS_CATEGORIES.MEALS_ENTERTAINMENT,
          confidence: 0.4,
          method: 'amount_heuristic'
        };
      } else if (amount > 1000 && descriptionLower.includes('equipment')) {
        bestMatch = {
          category: IRS_CATEGORIES.OTHER_EXPENSES,
          confidence: 0.4,
          method: 'amount_heuristic'
        };
      }
    }

    return bestMatch;
  }

  async getHistoricalClassification(transaction, userId) {
    try {
      // Get similar transactions from history
      const historicalTransactions = await firebaseService.getTransactions(userId, {
        limit: 100
      });

      const payeeLower = transaction.payee.toLowerCase();
      
      // Find transactions with similar payees
      const similarTransactions = historicalTransactions.filter(t => 
        t.payee.toLowerCase().includes(payeeLower) || 
        payeeLower.includes(t.payee.toLowerCase())
      );

      if (similarTransactions.length === 0) {
        return {
          category: IRS_CATEGORIES.UNCATEGORIZED,
          confidence: 0,
          method: 'no_historical_data'
        };
      }

      // Find most common category for this payee
      const categoryCount = {};
      similarTransactions.forEach(t => {
        if (t.category && t.isManuallyReviewed) {
          categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
        }
      });

      if (Object.keys(categoryCount).length === 0) {
        return {
          category: IRS_CATEGORIES.UNCATEGORIZED,
          confidence: 0,
          method: 'no_reviewed_historical_data'
        };
      }

      // Find most frequent category
      const mostFrequentCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0];

      const [category, count] = mostFrequentCategory;
      const confidence = Math.min(0.8, count / similarTransactions.length);

      return {
        category,
        confidence,
        method: 'historical_pattern',
        historicalCount: count,
        totalSimilar: similarTransactions.length
      };

    } catch (error) {
      console.error('Historical classification error:', error);
      return {
        category: IRS_CATEGORIES.UNCATEGORIZED,
        confidence: 0,
        method: 'historical_error'
      };
    }
  }

  combineClassifications(classifications) {
    // Remove zero-confidence classifications
    const validClassifications = classifications.filter(c => c.confidence > 0);
    
    if (validClassifications.length === 0) {
      return {
        category: IRS_CATEGORIES.UNCATEGORIZED,
        confidence: 0.1,
        method: 'no_valid_classification',
        suggestions: this.generateSuggestions()
      };
    }

    // Sort by confidence
    validClassifications.sort((a, b) => b.confidence - a.confidence);
    
    const best = validClassifications[0];
    
    // Generate suggestions from other classifications
    const suggestions = validClassifications
      .slice(1, 4) // Top 3 alternatives
      .map(c => ({
        category: c.category,
        confidence: c.confidence,
        method: c.method
      }));

    return {
      ...best,
      suggestions
    };
  }

  generateSuggestions() {
    // Return common categories as suggestions when no classification is found
    return [
      { category: IRS_CATEGORIES.OFFICE_EXPENSES, confidence: 0.1, method: 'common_suggestion' },
      { category: IRS_CATEGORIES.MEALS_ENTERTAINMENT, confidence: 0.1, method: 'common_suggestion' },
      { category: IRS_CATEGORIES.TRAVEL, confidence: 0.1, method: 'common_suggestion' }
    ];
  }

  async trainFromTransactions(transactions, userId) {
    try {
      let rulesCreated = 0;
      let rulesUpdated = 0;

      // Group transactions by payee and category
      const payeeGroups = {};
      
      transactions.forEach(transaction => {
        if (!transaction.isManuallyReviewed || !transaction.category) {
          return;
        }

        const payeeKey = transaction.payee.toLowerCase().trim();
        if (!payeeGroups[payeeKey]) {
          payeeGroups[payeeKey] = {};
        }
        
        if (!payeeGroups[payeeKey][transaction.category]) {
          payeeGroups[payeeKey][transaction.category] = [];
        }
        
        payeeGroups[payeeKey][transaction.category].push(transaction);
      });

      // Create rules for consistent payee-category combinations
      for (const [payee, categories] of Object.entries(payeeGroups)) {
        for (const [category, categoryTransactions] of Object.entries(categories)) {
          if (categoryTransactions.length >= 2) { // Need at least 2 occurrences
            
            // Check if rule already exists
            const existingRules = await firebaseService.getClassificationRules(userId);
            const existingRule = existingRules.find(rule => 
              rule.payeeContains.some(p => p.toLowerCase() === payee) &&
              rule.targetCategory === category
            );

            if (existingRule) {
              // Update existing rule
              const successRate = categoryTransactions.length / 
                (categoryTransactions.length + 1); // Assume one failure
              
              await firebaseService.updateClassificationRule(existingRule.id, userId, {
                trainingCount: existingRule.trainingCount + categoryTransactions.length,
                successRate: Math.max(successRate, existingRule.successRate),
                confidence: Math.min(0.9, existingRule.confidence + 0.1)
              });
              
              rulesUpdated++;
            } else {
              // Create new rule
              const ruleData = {
                ruleName: `Auto-generated rule for ${payee}`,
                description: `Automatically classifies transactions from ${payee} as ${category}`,
                payeeContains: [payee],
                descriptionContains: [],
                targetCategory: category,
                targetType: categoryTransactions[0].type,
                confidence: 0.7,
                trainingCount: categoryTransactions.length,
                successRate: 1.0,
                isSystemGenerated: true,
                isActive: true
              };

              await firebaseService.createClassificationRule(userId, ruleData);
              rulesCreated++;
            }
          }
        }
      }

      return {
        rulesCreated,
        rulesUpdated,
        transactionsProcessed: transactions.length,
        payeesAnalyzed: Object.keys(payeeGroups).length
      };

    } catch (error) {
      console.error('Training error:', error);
      throw error;
    }
  }
}

export default new TransactionClassifier();
