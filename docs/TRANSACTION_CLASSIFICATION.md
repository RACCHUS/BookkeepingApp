# Transaction Classification

This document describes the rule-based transaction classification system for automatically categorizing financial transactions into IRS tax categories.

## Overview

The classification system uses user-defined rules to automatically assign IRS tax categories to imported transactions. This is a **rule-based only** system - no machine learning, historical data analysis, or confidence scoring is used.

## Classification Process

### 1. Rule Matching
When a transaction is processed:
1. All active classification rules are retrieved for the user
2. Rules are sorted by priority (highest first)
3. Transaction description is tested against each rule pattern
4. First matching rule assigns its category to the transaction
5. If no rules match, the category remains empty (requires manual review)

### 2. Rule Structure
```javascript
const classificationRule = {
  id: "rule-123",
  userId: "user-456",
  pattern: "PAYROLL",              // Text pattern to match
  category: "business-income",     // Target IRS category
  priority: 100,                   // Higher = checked first
  isActive: true,                  // Rule enabled/disabled
  caseSensitive: false,            // Case sensitivity
  useRegex: false,                 // Use regex matching
  matchCount: 45,                  // Times rule has matched
  lastUsed: "2024-01-15T10:00:00Z" // Last match timestamp
};
```

## IRS Tax Categories

The system uses predefined IRS tax categories from `shared/constants/categories.js`:

### Business Income Categories
```javascript
const BUSINESS_INCOME = {
  'business-income': 'Business Income',
  'interest-income': 'Interest Income', 
  'dividend-income': 'Dividend Income',
  'rental-income': 'Rental Income',
  'other-income': 'Other Income'
};
```

### Business Expense Categories
```javascript
const BUSINESS_EXPENSES = {
  'advertising': 'Advertising',
  'car-truck': 'Car and Truck Expenses',
  'commissions-fees': 'Commissions and Fees',
  'contract-labor': 'Contract Labor',
  'depletion': 'Depletion',
  'depreciation': 'Depreciation',
  'employee-benefits': 'Employee Benefit Programs',
  'insurance': 'Insurance (other than health)',
  'interest': 'Interest',
  'legal-professional': 'Legal and Professional Services',
  'office-expense': 'Office Expense',
  'pension-plans': 'Pension and Profit-sharing Plans',
  'rent-lease': 'Rent or Lease',
  'repairs-maintenance': 'Repairs and Maintenance',
  'supplies': 'Supplies',
  'taxes-licenses': 'Taxes and Licenses',
  'travel': 'Travel',
  'meals': 'Meals',
  'utilities': 'Utilities',
  'wages': 'Wages',
  'other-expenses': 'Other Expenses'
};
```

### Personal Categories
```javascript
const PERSONAL = {
  'personal-income': 'Personal Income',
  'personal-expense': 'Personal Expense',
  'transfer': 'Transfer',
  'uncategorized': 'Uncategorized'
};
```

## Rule Management API

### Create Classification Rule
```http
POST /api/classification/rules
Content-Type: application/json

{
  "pattern": "AMAZON",
  "category": "supplies",
  "priority": 50,
  "caseSensitive": false,
  "useRegex": false
}
```

### Get User's Rules
```http
GET /api/classification/rules
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rule-123",
      "pattern": "PAYROLL",
      "category": "business-income",
      "priority": 100,
      "isActive": true,
      "matchCount": 45,
      "lastUsed": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Update Rule
```http
PUT /api/classification/rules/{ruleId}

{
  "pattern": "AMAZON.*MARKETPLACE",
  "useRegex": true,
  "priority": 75
}
```

### Delete Rule
```http
DELETE /api/classification/rules/{ruleId}
```

## Pattern Matching

### Simple Text Matching
```javascript
// Case insensitive substring match
const rule = {
  pattern: "payroll",
  caseSensitive: false,
  useRegex: false
};

// Matches: "PAYROLL DEPOSIT", "Bi-weekly Payroll", "payroll"
// Doesn't match: "PAYMENT" or "ROLL"
```

### Case Sensitive Matching
```javascript
const rule = {
  pattern: "ACH",
  caseSensitive: true,
  useRegex: false
};

// Matches: "ACH DEPOSIT", "ACH PAYMENT"
// Doesn't match: "ach deposit" or "Ach Payment"
```

### Regular Expression Matching
```javascript
const rule = {
  pattern: "^AMAZON.*MARKETPLACE$",
  useRegex: true,
  caseSensitive: false
};

// Matches: "AMAZON WEB SERVICES MARKETPLACE"
// Doesn't match: "AMAZON PRIME" or "OTHER AMAZON MARKETPLACE CHARGE"
```

## Classification Implementation

### Core Classification Function
```javascript
const classifyTransaction = async (transaction, userId) => {
  // Get all active rules for user
  const rules = await classificationService.getUserRules(userId);
  
  // Sort by priority (highest first)
  rules.sort((a, b) => b.priority - a.priority);
  
  // Test each rule until match found
  for (const rule of rules) {
    if (!rule.isActive) continue;
    
    if (matchesPattern(transaction.description, rule)) {
      // Update rule statistics
      await updateRuleUsage(rule.id);
      
      return {
        category: rule.category,
        ruleId: rule.id,
        needsReview: false
      };
    }
  }
  
  // No match found
  return {
    category: null,
    ruleId: null,
    needsReview: true
  };
};
```

### Pattern Matching Logic
```javascript
const matchesPattern = (text, rule) => {
  const { pattern, caseSensitive, useRegex } = rule;
  
  if (useRegex) {
    const flags = caseSensitive ? 'g' : 'gi';
    try {
      const regex = new RegExp(pattern, flags);
      return regex.test(text);
    } catch (error) {
      console.error('Invalid regex pattern:', pattern);
      return false;
    }
  } else {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
    return searchText.includes(searchPattern);
  }
};
```

### Batch Classification
```javascript
const classifyTransactions = async (transactions, userId) => {
  const rules = await classificationService.getUserRules(userId);
  const results = [];
  
  for (const transaction of transactions) {
    const classification = await classifyTransaction(transaction, userId, rules);
    
    // Update transaction with classification
    await transactionService.update(transaction.id, {
      category: classification.category,
      ruleId: classification.ruleId,
      needsReview: classification.needsReview
    });
    
    results.push({
      transactionId: transaction.id,
      ...classification
    });
  }
  
  return results;
};
```

## Rule Priority System

### Priority Levels
- **100-90**: High priority (exact company names, specific patterns)
- **89-70**: Medium priority (general categories, common patterns)
- **69-50**: Low priority (broad matches, fallback rules)
- **49-1**: Very low priority (catch-all rules)

### Priority Examples
```javascript
const rules = [
  {
    pattern: "GOOGLE WORKSPACE",
    category: "office-expense",
    priority: 95 // High - specific service
  },
  {
    pattern: "GOOGLE",
    category: "advertising",
    priority: 70 // Medium - could be Google Ads
  },
  {
    pattern: "SUBSCRIPTION",
    category: "office-expense", 
    priority: 30 // Low - very broad
  }
];
```

## User Interface

### Rule Management Component
```javascript
const ClassificationRules = () => {
  const { data: rules, isLoading } = useQuery({
    queryKey: ['classification-rules'],
    queryFn: () => apiClient.classification.getRules()
  });

  const createRuleMutation = useMutation({
    mutationFn: apiClient.classification.createRule,
    onSuccess: () => queryClient.invalidateQueries(['classification-rules'])
  });

  const handleCreateRule = (ruleData) => {
    createRuleMutation.mutate(ruleData);
  };

  return (
    <div className="space-y-4">
      <RuleForm onSubmit={handleCreateRule} />
      <RulesList rules={rules} />
    </div>
  );
};
```

### Transaction Review Interface
```javascript
const TransactionReview = ({ transaction }) => {
  const updateMutation = useMutation({
    mutationFn: apiClient.transactions.update
  });

  const handleCategoryChange = (category) => {
    updateMutation.mutate({
      id: transaction.id,
      category,
      needsReview: false
    });
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm">{transaction.description}</span>
      
      {transaction.needsReview && (
        <span className="text-yellow-600 text-sm">Needs Review</span>
      )}
      
      <CategorySelector
        value={transaction.category}
        onChange={handleCategoryChange}
      />
    </div>
  );
};
```

## Best Practices

### Rule Creation Guidelines
1. **Start Specific**: Create specific rules first, then add broader ones
2. **Use Priority**: Set appropriate priority levels to avoid conflicts
3. **Test Patterns**: Test regex patterns before saving
4. **Regular Review**: Periodically review and update rules

### Pattern Tips
```javascript
// Good: Specific and targeted
{ pattern: "GOOGLE WORKSPACE", category: "office-expense" }

// Good: Uses word boundaries
{ pattern: "\\bAMAZON\\b", useRegex: true, category: "supplies" }

// Avoid: Too broad
{ pattern: "PAYMENT", category: "office-expense" }

// Avoid: Complex regex that's hard to maintain
{ pattern: "^(?:AMAZON|AMZN).*(?:MARKETPLACE|WS|AWS).*$", useRegex: true }
```

### Performance Considerations
- Limit number of rules per user (suggested max: 100)
- Use simple patterns when possible (regex is slower)
- Regularly clean up unused rules
- Monitor rule match statistics

## Testing

### Unit Tests
```javascript
describe('Transaction Classification', () => {
  test('matches simple text pattern', () => {
    const rule = {
      pattern: 'PAYROLL',
      caseSensitive: false,
      useRegex: false
    };
    
    expect(matchesPattern('WEEKLY PAYROLL DEPOSIT', rule)).toBe(true);
    expect(matchesPattern('PAYMENT', rule)).toBe(false);
  });

  test('applies rules in priority order', async () => {
    const rules = [
      { pattern: 'GOOGLE', category: 'advertising', priority: 70 },
      { pattern: 'GOOGLE WORKSPACE', category: 'office-expense', priority: 95 }
    ];
    
    const result = await classifyTransaction(
      { description: 'GOOGLE WORKSPACE MONTHLY' },
      'user-123',
      rules
    );
    
    expect(result.category).toBe('office-expense');
  });
});
```

### Integration Tests
```javascript
describe('Classification API', () => {
  test('creates and applies new rule', async () => {
    // Create rule
    await request(app)
      .post('/api/classification/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        pattern: 'TEST PAYROLL',
        category: 'business-income',
        priority: 80
      })
      .expect(201);

    // Import transaction
    const transaction = await createTestTransaction({
      description: 'TEST PAYROLL DEPOSIT',
      amount: 1000
    });

    // Verify classification
    expect(transaction.category).toBe('business-income');
    expect(transaction.needsReview).toBe(false);
  });
});
```

## Troubleshooting

### Common Issues

**Rules Not Matching**
- Check pattern spelling and case sensitivity
- Verify rule is active
- Review priority order (higher priority rules are checked first)

**Incorrect Categories**
- Review rule patterns for conflicts
- Check if multiple rules might match
- Verify category values are valid IRS categories

**Performance Issues**
- Reduce number of complex regex patterns
- Use simple text matching when possible
- Consider rule consolidation

### Debug Tools
```javascript
// Enable classification debugging
const DEBUG_CLASSIFICATION = process.env.DEBUG_CLASSIFICATION === 'true';

const classifyWithDebug = async (transaction, userId) => {
  if (DEBUG_CLASSIFICATION) {
    console.log('Classifying transaction:', transaction.description);
  }
  
  const rules = await getUserRules(userId);
  
  for (const rule of rules) {
    const matches = matchesPattern(transaction.description, rule);
    
    if (DEBUG_CLASSIFICATION) {
      console.log(`Rule "${rule.pattern}": ${matches ? 'MATCH' : 'NO MATCH'}`);
    }
    
    if (matches) {
      return { category: rule.category, ruleId: rule.id };
    }
  }
  
  if (DEBUG_CLASSIFICATION) {
    console.log('No rules matched - needs manual review');
  }
  
  return { category: null, needsReview: true };
};
```
