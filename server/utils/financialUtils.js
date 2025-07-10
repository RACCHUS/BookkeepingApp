/**
 * Financial Calculation Utilities
 * 
 * Specialized utilities for financial calculations, accounting operations,
 * and business logic specific to bookkeeping applications.
 * 
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD', options = {}) {
  const {
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true
  } = options;
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    return showSymbol ? '$0.00' : '0.00';
  }
  
  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits
  });
  
  return formatter.format(amount);
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @param {number} precision - Decimal places (default: 2)
 * @returns {number} Percentage value
 */
export function calculatePercentage(part, total, precision = 2) {
  if (total === 0) return 0;
  const percentage = (part / total) * 100;
  return Number(percentage.toFixed(precision));
}

/**
 * Calculate percentage change
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value
 * @param {number} precision - Decimal places (default: 2)
 * @returns {number} Percentage change
 */
export function calculatePercentageChange(oldValue, newValue, precision = 2) {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100;
  }
  
  const change = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  return Number(change.toFixed(precision));
}

/**
 * Sum array of amounts with proper decimal handling
 * @param {Array} amounts - Array of numeric amounts
 * @returns {number} Sum rounded to 2 decimal places
 */
export function sumAmounts(amounts) {
  if (!Array.isArray(amounts)) {
    throw new Error('Amounts must be an array');
  }
  
  const sum = amounts.reduce((total, amount) => {
    const numAmount = Number(amount) || 0;
    return total + numAmount;
  }, 0);
  
  // Round to 2 decimal places to handle floating point precision
  return Math.round(sum * 100) / 100;
}

/**
 * Calculate running balance
 * @param {Array} transactions - Array of transaction objects with amount property
 * @param {number} startingBalance - Starting balance (default: 0)
 * @returns {Array} Array of transactions with running balance
 */
export function calculateRunningBalance(transactions, startingBalance = 0) {
  let balance = startingBalance;
  
  return transactions.map(transaction => {
    balance += Number(transaction.amount) || 0;
    return {
      ...transaction,
      runningBalance: Math.round(balance * 100) / 100
    };
  });
}

/**
 * Categorize transaction amounts by type
 * @param {Array} transactions - Array of transactions
 * @returns {object} Categorized amounts
 */
export function categorizeAmounts(transactions) {
  const categories = {
    income: 0,
    expenses: 0,
    transfers: 0,
    total: 0
  };
  
  transactions.forEach(transaction => {
    const amount = Math.abs(Number(transaction.amount) || 0);
    
    switch (transaction.type) {
      case 'income':
        categories.income += amount;
        break;
      case 'expense':
        categories.expenses += amount;
        break;
      case 'transfer':
        categories.transfers += amount;
        break;
    }
    
    categories.total += amount;
  });
  
  // Round all values
  Object.keys(categories).forEach(key => {
    categories[key] = Math.round(categories[key] * 100) / 100;
  });
  
  return categories;
}

/**
 * Calculate profit/loss
 * @param {number} income - Total income
 * @param {number} expenses - Total expenses
 * @returns {object} Profit/loss calculation
 */
export function calculateProfitLoss(income, expenses) {
  const netIncome = Number(income) || 0;
  const totalExpenses = Number(expenses) || 0;
  const profitLoss = netIncome - totalExpenses;
  
  return {
    income: Math.round(netIncome * 100) / 100,
    expenses: Math.round(totalExpenses * 100) / 100,
    profitLoss: Math.round(profitLoss * 100) / 100,
    profitMargin: netIncome > 0 ? calculatePercentage(profitLoss, netIncome) : 0,
    isProfit: profitLoss >= 0
  };
}

/**
 * Calculate tax estimates
 * @param {number} income - Taxable income
 * @param {number} taxRate - Tax rate as percentage (e.g., 25 for 25%)
 * @returns {object} Tax calculation
 */
export function calculateTaxEstimate(income, taxRate) {
  const taxableIncome = Number(income) || 0;
  const rate = Number(taxRate) || 0;
  
  const taxAmount = (taxableIncome * rate) / 100;
  const afterTaxIncome = taxableIncome - taxAmount;
  
  return {
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxRate: rate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    afterTaxIncome: Math.round(afterTaxIncome * 100) / 100
  };
}

/**
 * Calculate quarterly tax estimates
 * @param {number} annualIncome - Estimated annual income
 * @param {number} taxRate - Tax rate as percentage
 * @returns {object} Quarterly tax estimate
 */
export function calculateQuarterlyTax(annualIncome, taxRate) {
  const annual = calculateTaxEstimate(annualIncome, taxRate);
  const quarterlyPayment = annual.taxAmount / 4;
  
  return {
    ...annual,
    quarterlyPayment: Math.round(quarterlyPayment * 100) / 100
  };
}

/**
 * Calculate expense ratios
 * @param {Array} expenses - Array of expense transactions with category
 * @param {number} totalIncome - Total income for ratio calculation
 * @returns {object} Expense ratios by category
 */
export function calculateExpenseRatios(expenses, totalIncome) {
  const categoryTotals = {};
  const totalExpenses = sumAmounts(expenses.map(e => Math.abs(e.amount)));
  
  // Group expenses by category
  expenses.forEach(expense => {
    const category = expense.category || 'Uncategorized';
    const amount = Math.abs(Number(expense.amount) || 0);
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  });
  
  // Calculate ratios
  const ratios = {};
  Object.keys(categoryTotals).forEach(category => {
    const amount = categoryTotals[category];
    ratios[category] = {
      amount: Math.round(amount * 100) / 100,
      percentOfExpenses: calculatePercentage(amount, totalExpenses),
      percentOfIncome: totalIncome > 0 ? calculatePercentage(amount, totalIncome) : 0
    };
  });
  
  return {
    categoryRatios: ratios,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    expenseToIncomeRatio: totalIncome > 0 ? calculatePercentage(totalExpenses, totalIncome) : 0
  };
}

/**
 * Calculate average transaction amount
 * @param {Array} transactions - Array of transactions
 * @param {string} type - Filter by transaction type (optional)
 * @returns {number} Average amount
 */
export function calculateAverageAmount(transactions, type = null) {
  let filteredTransactions = transactions;
  
  if (type) {
    filteredTransactions = transactions.filter(t => t.type === type);
  }
  
  if (filteredTransactions.length === 0) return 0;
  
  const total = sumAmounts(filteredTransactions.map(t => Math.abs(t.amount)));
  return Math.round((total / filteredTransactions.length) * 100) / 100;
}

/**
 * Calculate depreciation (straight-line method)
 * @param {number} cost - Initial cost
 * @param {number} salvageValue - Salvage value
 * @param {number} usefulLife - Useful life in years
 * @returns {object} Depreciation calculation
 */
export function calculateDepreciation(cost, salvageValue, usefulLife) {
  const depreciableAmount = cost - salvageValue;
  const annualDepreciation = depreciableAmount / usefulLife;
  const monthlyDepreciation = annualDepreciation / 12;
  
  return {
    cost: Math.round(cost * 100) / 100,
    salvageValue: Math.round(salvageValue * 100) / 100,
    depreciableAmount: Math.round(depreciableAmount * 100) / 100,
    usefulLife,
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100
  };
}

/**
 * Validate financial amount
 * @param {any} amount - Amount to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result with formatted amount
 */
export function validateFinancialAmount(amount, options = {}) {
  const {
    allowNegative = true,
    maxValue = Number.MAX_SAFE_INTEGER,
    minValue = allowNegative ? -Number.MAX_SAFE_INTEGER : 0
  } = options;
  
  const numAmount = Number(amount);
  
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return {
      isValid: false,
      error: 'Amount must be a valid number'
    };
  }
  
  if (numAmount < minValue) {
    return {
      isValid: false,
      error: `Amount cannot be less than ${formatCurrency(minValue)}`
    };
  }
  
  if (numAmount > maxValue) {
    return {
      isValid: false,
      error: `Amount cannot exceed ${formatCurrency(maxValue)}`
    };
  }
  
  const rounded = Math.round(numAmount * 100) / 100;
  
  return {
    isValid: true,
    value: rounded,
    formatted: formatCurrency(rounded)
  };
}
