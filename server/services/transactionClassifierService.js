import { IRS_CATEGORIES, CATEGORY_GROUPS } from '../../shared/constants/categories.js';
import { getFirestore } from 'firebase-admin/firestore';

class TransactionClassifierService {
  constructor() {
    this.db = getFirestore();
    
    // Enhanced classification patterns with confidence scores
    this.classificationRules = {
      // Business Income (100% confidence)
      [IRS_CATEGORIES.GROSS_RECEIPTS]: {
        keywords: ['deposit', 'payment received', 'wire transfer', 'ach credit', 'direct deposit', 'invoice payment', 'customer payment'],
        patterns: [/deposit/i, /payment\s+received/i, /wire\s+transfer/i, /ach\s+credit/i],
        confidence: 100
      },
      
      // Office Expenses (90% confidence)
      [IRS_CATEGORIES.OFFICE_EXPENSES]: {
        keywords: ['staples', 'office depot', 'supplies', 'printer', 'paper', 'pens', 'office supplies'],
        patterns: [/office\s+supply/i, /computer\s+equipment/i, /office\s+furniture/i],
        confidence: 90
      },
      
      // Software and Subscriptions (90% confidence)
      [IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS]: {
        keywords: ['microsoft', 'adobe', 'quickbooks', 'software', 'subscription', 'saas', 'cloud service'],
        patterns: [/software\s+subscription/i, /cloud\s+service/i, /saas/i],
        confidence: 90
      },
      
      // Car and Truck Expenses (95% confidence)
      [IRS_CATEGORIES.CAR_TRUCK_EXPENSES]: {
        keywords: ['shell', 'exxon', 'mobil', 'chevron', 'bp', 'gas station', 'fuel', 'auto repair', 'oil change', 'tire'],
        patterns: [/gas\s+station/i, /auto\s+repair/i, /oil\s+change/i, /tire\s+service/i],
        confidence: 95
      },
      
      // Travel (85% confidence)
      [IRS_CATEGORIES.TRAVEL]: {
        keywords: ['hotel', 'marriott', 'hilton', 'american airlines', 'delta', 'southwest', 'uber', 'lyft', 'rental car', 'airport'],
        patterns: [/hotel/i, /airlines/i, /airport\s+parking/i, /car\s+rental/i],
        confidence: 85
      },
      
      // Meals and Entertainment (80% confidence)
      [IRS_CATEGORIES.MEALS_ENTERTAINMENT]: {
        keywords: ['restaurant', 'mcdonalds', 'starbucks', 'coffee', 'lunch', 'dinner', 'catering', 'client dinner'],
        patterns: [/restaurant/i, /coffee\s+shop/i, /catering/i, /client\s+lunch/i],
        confidence: 80
      },
      
      // Utilities (95% confidence)
      [IRS_CATEGORIES.UTILITIES]: {
        keywords: ['verizon', 'att', 'at&t', 'comcast', 'internet', 'phone service', 'mobile', 'wireless', 'electric', 'gas company'],
        patterns: [/phone\s+service/i, /internet\s+service/i, /wireless\s+plan/i, /electric\s+company/i],
        confidence: 95
      },
      
      // Utilities (90% confidence)
      'Utilities': {
        keywords: ['electric', 'gas company', 'water', 'sewer', 'utility', 'power company'],
        patterns: [/electric\s+company/i, /gas\s+company/i, /water\s+department/i],
        confidence: 90
      },
      
      // Legal and Professional Services (85% confidence)
      'Legal and Professional Services': {
        keywords: ['law firm', 'attorney', 'lawyer', 'accounting', 'accountant', 'consultant', 'professional services'],
        patterns: [/law\s+firm/i, /attorney\s+fees/i, /accounting\s+services/i, /consultant/i],
        confidence: 85
      },
      
      // Bank Service Charges (100% confidence)
      'Bank Service Charges': {
        keywords: ['overdraft', 'maintenance fee', 'atm fee', 'service charge', 'monthly fee', 'wire fee'],
        patterns: [/overdraft\s+fee/i, /maintenance\s+fee/i, /atm\s+fee/i, /service\s+charge/i],
        confidence: 100
      },
      
      // Rent or Lease (95% confidence)
      'Rent or Lease': {
        keywords: ['rent', 'lease', 'property management', 'landlord', 'office rent', 'warehouse rent'],
        patterns: [/rent\s+payment/i, /lease\s+payment/i, /property\s+management/i],
        confidence: 95
      },
      
      // Insurance (90% confidence)
      'Insurance': {
        keywords: ['insurance', 'policy premium', 'liability insurance', 'health insurance', 'auto insurance'],
        patterns: [/insurance\s+premium/i, /policy\s+payment/i, /liability\s+insurance/i],
        confidence: 90
      },
      
      // Advertising (85% confidence)
      'Advertising': {
        keywords: ['google ads', 'facebook ads', 'marketing', 'advertising', 'promotion', 'social media'],
        patterns: [/google\s+ads/i, /facebook\s+advertising/i, /marketing\s+campaign/i],
        confidence: 85
      }
    };
  }

  /**
   * Classify a transaction based on description, payee, and historical data
   * @param {Object} transaction - Transaction object
   * @param {string} userId - User ID for historical data
   * @returns {Object} Classification result with category and confidence
   */
  async classifyTransaction(transaction, userId) {
    const { description, payee, amount } = transaction;
    const searchText = `${description || ''} ${payee || ''}`.toLowerCase();
    
    // Check user's historical classifications first
    const historicalClassification = await this.getHistoricalClassification(searchText, userId);
    if (historicalClassification) {
      return {
        category: historicalClassification.category,
        confidence: Math.min(historicalClassification.confidence + 10, 100), // Boost confidence for learned patterns
        source: 'historical'
      };
    }
    
    // Apply rule-based classification
    let bestMatch = null;
    let highestConfidence = 0;
    
    for (const [category, rules] of Object.entries(this.classificationRules)) {
      const confidence = this.calculateConfidence(searchText, rules);
      
      if (confidence > highestConfidence && confidence >= 60) { // Minimum confidence threshold
        highestConfidence = confidence;
        bestMatch = {
          category,
          confidence,
          source: 'rules'
        };
      }
    }
    
    // Additional heuristics based on amount and type
    if (!bestMatch) {
      bestMatch = this.applyAmountHeuristics(transaction);
    }
    
    return bestMatch || {
      category: 'Other Business Expenses',
      confidence: 30,
      source: 'default'
    };
  }

  /**
   * Calculate confidence score for a category based on rules
   */
  calculateConfidence(searchText, rules) {
    let confidence = 0;
    const { keywords, patterns, confidence: baseConfidence } = rules;
    
    // Check keywords
    const keywordMatches = keywords.filter(keyword => 
      searchText.includes(keyword.toLowerCase())
    ).length;
    
    if (keywordMatches > 0) {
      confidence = baseConfidence * (keywordMatches / keywords.length);
    }
    
    // Check patterns (higher weight)
    const patternMatches = patterns.filter(pattern => 
      pattern.test(searchText)
    ).length;
    
    if (patternMatches > 0) {
      confidence = Math.max(confidence, baseConfidence * 0.9);
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Apply amount-based heuristics for classification
   */
  applyAmountHeuristics(transaction) {
    const { amount, type } = transaction;
    const absAmount = Math.abs(amount);
    
    // Large positive amounts are likely income
    if (amount > 0 && absAmount > 1000) {
      return {
        category: 'Business Income',
        confidence: 60,
        source: 'amount_heuristic'
      };
    }
    
    // Small amounts might be bank fees
    if (amount < 0 && absAmount < 50 && (
      transaction.description?.toLowerCase().includes('fee') ||
      transaction.description?.toLowerCase().includes('charge')
    )) {
      return {
        category: 'Bank Service Charges',
        confidence: 70,
        source: 'amount_heuristic'
      };
    }
    
    return null;
  }

  /**
   * Get historical classification for similar transactions
   */
  async getHistoricalClassification(searchText, userId) {
    try {
      // Query for similar transactions that have been manually categorized
      const transactionsRef = this.db.collection('transactions');
      const snapshot = await transactionsRef
        .where('userId', '==', userId)
        .where('category', '!=', null)
        .limit(100) // Limit for performance
        .get();
      
      const historicalTransactions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        historicalTransactions.push({
          description: data.description || '',
          payee: data.payee || '',
          category: data.category,
          manuallySet: data.manuallySet || false
        });
      });
      
      // Find the best match based on text similarity
      let bestMatch = null;
      let highestSimilarity = 0;
      
      for (const historical of historicalTransactions) {
        const historicalText = `${historical.description} ${historical.payee}`.toLowerCase();
        const similarity = this.calculateTextSimilarity(searchText, historicalText);
        
        if (similarity > highestSimilarity && similarity > 0.7) { // 70% similarity threshold
          highestSimilarity = similarity;
          bestMatch = {
            category: historical.category,
            confidence: Math.round(similarity * 100),
            manuallySet: historical.manuallySet
          };
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error('Error fetching historical classifications:', error);
      return null;
    }
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 2));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Learn from user's manual categorization
   */
  async learnFromUserCorrection(transaction, newCategory, userId) {
    try {
      // Store the correction as a learning example
      const learningRef = this.db.collection('categoryLearning');
      await learningRef.add({
        userId,
        description: transaction.description,
        payee: transaction.payee,
        originalCategory: transaction.category,
        correctedCategory: newCategory,
        amount: transaction.amount,
        timestamp: new Date(),
        searchText: `${transaction.description || ''} ${transaction.payee || ''}`.toLowerCase()
      });
      
      console.log(`📚 Learning from user correction: ${transaction.description} -> ${newCategory}`);
    } catch (error) {
      console.error('Error saving learning data:', error);
    }
  }

  /**
   * Get classification suggestions for bulk operations
   */
  async getBulkClassificationSuggestions(transactions, userId) {
    const suggestions = [];
    
    for (const transaction of transactions) {
      const classification = await this.classifyTransaction(transaction, userId);
      suggestions.push({
        transactionId: transaction.id,
        ...classification
      });
    }
    
    return suggestions;
  }

  /**
   * Get category statistics for the user
   */
  async getCategoryStats(userId, dateRange = null, filters = {}) {
    try {
      // Build query filters
      const queryFilters = { ...filters };
      if (dateRange) {
        queryFilters.startDate = dateRange.start;
        queryFilters.endDate = dateRange.end;
      }

      // Get transactions with filters applied
      const transactions = await this.firebaseService.getTransactions(userId, queryFilters);
      
      // Calculate statistics
      const stats = {
        totalClassifications: transactions.length,
        categoryBreakdown: {},
        companyBreakdown: {},
        typeBreakdown: { income: 0, expense: 0 }
      };

      // Process transactions
      transactions.forEach(transaction => {
        // Category breakdown
        const category = transaction.category || 'Uncategorized';
        if (!stats.categoryBreakdown[category]) {
          stats.categoryBreakdown[category] = { count: 0, amount: 0 };
        }
        stats.categoryBreakdown[category].count++;
        stats.categoryBreakdown[category].amount += Math.abs(transaction.amount);

        // Company breakdown
        if (transaction.companyName) {
          if (!stats.companyBreakdown[transaction.companyName]) {
            stats.companyBreakdown[transaction.companyName] = { count: 0, amount: 0 };
          }
          stats.companyBreakdown[transaction.companyName].count++;
          stats.companyBreakdown[transaction.companyName].amount += Math.abs(transaction.amount);
        }

        // Type breakdown
        if (transaction.type === 'income' || transaction.type === 'expense') {
          stats.typeBreakdown[transaction.type] += Math.abs(transaction.amount);
        }
      });

      // Convert to top categories format
      stats.topCategories = Object.entries(stats.categoryBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([category, data]) => ({
          category,
          count: data.count,
          amount: data.amount
        }));

      return stats;
    } catch (error) {
      console.error('Error getting category stats:', error);
      return {};
    }
  }

  async trainFromTransactions(transactions, userId) {
    try {
      // Train the classifier from user-corrected transactions
      let trainingCount = 0;
      
      for (const transaction of transactions) {
        if (transaction.category && transaction.category !== 'Uncategorized') {
          // Learn from this correctly categorized transaction
          await this.learnFromUserCorrection(transaction, transaction.category, userId);
          trainingCount++;
        }
      }

      return {
        success: true,
        trainedTransactions: trainingCount,
        message: `Trained classifier with ${trainingCount} transactions`
      };
    } catch (error) {
      console.error('Error training from transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new TransactionClassifierService();
