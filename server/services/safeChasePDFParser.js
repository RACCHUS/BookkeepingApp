import fs from 'fs/promises';

class SafeChasePDFParser {
  constructor() {
    // Chase-specific patterns for different statement formats
    this.patterns = {
      // Transaction patterns for Chase checking/business accounts
      transactionLine: /(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-$]?[\d,]+\.?\d{2})\s*$/gm,
      
      // More specific patterns for different transaction types
      checkTransaction: /(\d{1,2}\/\d{1,2})\s+CHECK\s+#?(\d+)\s+(.+?)\s+([-$]?[\d,]+\.?\d{2})/gi,
      debitTransaction: /(\d{1,2}\/\d{1,2})\s+(.+?)\s+DEBIT\s+([-$]?[\d,]+\.?\d{2})/gi,
      depositTransaction: /(\d{1,2}\/\d{1,2})\s+(.+?)\s+DEPOSIT\s+([\d,]+\.?\d{2})/gi,
      
      // Account information
      accountNumber: /Account\s+Number[:\s]+(\d+)/i,
      statementPeriod: /Statement\s+Period[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      
      // Balance information
      beginningBalance: /Beginning\s+Balance[:\s]+([\d,]+\.?\d{2})/i,
      endingBalance: /Ending\s+Balance[:\s]+([\d,]+\.?\d{2})/i,
      
      // Date patterns
      datePattern: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
      shortDatePattern: /(\d{1,2})\/(\d{1,2})/
    };

    // Common payee patterns for automatic classification
    this.payeeClassification = {
      // Office & Business Expenses
      'AMAZON': 'Office Expenses',
      'STAPLES': 'Office Expenses',
      'OFFICE DEPOT': 'Office Expenses',
      'BEST BUY': 'Office Expenses',
      'MICROSOFT': 'Office Expenses',
      'ADOBE': 'Office Expenses',
      
      // Vehicle & Transportation
      'SHELL': 'Car and Truck Expenses',
      'EXXON': 'Car and Truck Expenses',
      'MOBIL': 'Car and Truck Expenses',
      'CHEVRON': 'Car and Truck Expenses',
      'BP': 'Car and Truck Expenses',
      'UBER': 'Travel',
      'LYFT': 'Travel',
      
      // Travel & Meals
      'HOTEL': 'Travel',
      'MARRIOTT': 'Travel',
      'HILTON': 'Travel',
      'AMERICAN AIRLINES': 'Travel',
      'DELTA': 'Travel',
      'SOUTHWEST': 'Travel',
      'RESTAURANT': 'Meals and Entertainment',
      'MCDONALD': 'Meals and Entertainment',
      'STARBUCKS': 'Meals and Entertainment',
      
      // Utilities & Communications
      'VERIZON': 'Phone and Internet',
      'AT&T': 'Phone and Internet',
      'COMCAST': 'Phone and Internet',
      'ELECTRIC': 'Utilities',
      'GAS COMPANY': 'Utilities',
      
      // Professional Services
      'LAW FIRM': 'Legal and Professional Services',
      'ACCOUNTING': 'Legal and Professional Services',
      'CONSULTANT': 'Legal and Professional Services',
      
      // Banking & Fees
      'OVERDRAFT': 'Bank Service Charges',
      'MAINTENANCE FEE': 'Bank Service Charges',
      'ATM FEE': 'Bank Service Charges',
      
      // Common business income indicators
      'DEPOSIT': 'Business Income',
      'TRANSFER FROM': 'Business Income',
      'PAYMENT RECEIVED': 'Business Income'
    };
  }

  async parsePDF(filePath) {
    try {
      console.log(`📄 Parsing Chase PDF: ${filePath}`);
      
      // Dynamically import pdf-parse to avoid initialization issues
      const pdfParse = (await import('pdf-parse')).default;
      
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      
      console.log(`📖 Extracted ${text.length} characters from PDF`);
      
      // Extract account information
      const accountInfo = this.extractAccountInfo(text);
      console.log('📋 Account Info:', accountInfo);
      
      // Extract transactions
      const transactions = this.extractTransactions(text, accountInfo);
      console.log(`📊 Found ${transactions.length} transactions`);
      
      return {
        success: true,
        accountInfo,
        transactions,
        summary: this.generateSummary(transactions),
        rawText: text.substring(0, 1000) + '...' // Truncated for response size
      };
      
    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      return {
        success: false,
        error: error.message,
        transactions: []
      };
    }
  }

  extractAccountInfo(text) {
    const accountMatch = text.match(this.patterns.accountNumber);
    const periodMatch = text.match(this.patterns.statementPeriod);
    const beginningMatch = text.match(this.patterns.beginningBalance);
    const endingMatch = text.match(this.patterns.endingBalance);

    return {
      accountNumber: accountMatch ? accountMatch[1] : null,
      statementPeriod: periodMatch ? {
        start: periodMatch[1],
        end: periodMatch[2]
      } : null,
      beginningBalance: beginningMatch ? parseFloat(beginningMatch[1].replace(/,/g, '')) : null,
      endingBalance: endingMatch ? parseFloat(endingMatch[1].replace(/,/g, '')) : null
    };
  }

  extractTransactions(text, accountInfo) {
    const transactions = [];
    const lines = text.split('\n');
    
    // Get the statement year from period or current year
    const currentYear = new Date().getFullYear();
    const statementYear = accountInfo.statementPeriod 
      ? new Date(accountInfo.statementPeriod.end).getFullYear() 
      : currentYear;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Try to match transaction patterns
      const transaction = this.parseTransactionLine(trimmedLine, statementYear);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    // Sort transactions by date
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  parseTransactionLine(line, year) {
    // Pattern for Chase transaction: MM/DD DESCRIPTION AMOUNT
    const match = line.match(/^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-$]?[\d,]+\.?\d{2})\s*$/);
    
    if (!match) return null;

    const [, dateStr, description, amountStr] = match;
    
    // Parse date
    const dateParts = dateStr.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Parse amount
    let amount = parseFloat(amountStr.replace(/[$,]/g, ''));
    const isNegative = amountStr.includes('-') || amount < 0;
    amount = Math.abs(amount);
    
    // Determine transaction type
    const type = isNegative ? 'expense' : 'income';
    
    // Clean up description
    const cleanDescription = description.trim();
    
    // Auto-classify based on description
    const category = this.classifyTransaction(cleanDescription, type);
    
    // Extract payee from description
    const payee = this.extractPayee(cleanDescription);
    
    return {
      date: fullDate,
      amount: amount,
      description: cleanDescription,
      category: category,
      type: type,
      payee: payee,
      confidence: category !== 'Uncategorized' ? 0.8 : 0.3,
      source: 'chase_pdf',
      needsReview: category === 'Uncategorized' || !payee
    };
  }

  classifyTransaction(description, type) {
    const upperDesc = description.toUpperCase();
    
    // Check for exact matches first
    for (const [keyword, category] of Object.entries(this.payeeClassification)) {
      if (upperDesc.includes(keyword)) {
        return category;
      }
    }
    
    // Pattern-based classification
    if (type === 'income') {
      if (upperDesc.includes('DEPOSIT') || upperDesc.includes('PAYMENT') || upperDesc.includes('TRANSFER')) {
        return 'Business Income';
      }
    } else {
      // Expense classification by keywords
      if (upperDesc.includes('GAS') || upperDesc.includes('FUEL')) {
        return 'Car and Truck Expenses';
      }
      if (upperDesc.includes('RESTAURANT') || upperDesc.includes('CAFE') || upperDesc.includes('FOOD')) {
        return 'Meals and Entertainment';
      }
      if (upperDesc.includes('HOTEL') || upperDesc.includes('AIRBNB') || upperDesc.includes('FLIGHT')) {
        return 'Travel';
      }
      if (upperDesc.includes('OFFICE') || upperDesc.includes('SUPPLY')) {
        return 'Office Expenses';
      }
      if (upperDesc.includes('FEE') || upperDesc.includes('CHARGE')) {
        return 'Bank Service Charges';
      }
    }
    
    return 'Uncategorized';
  }

  extractPayee(description) {
    // Remove common transaction prefixes/suffixes
    let payee = description
      .replace(/^(DEBIT|CREDIT|CHECK|DEPOSIT|WITHDRAWAL)\s+/i, '')
      .replace(/\s+(DEBIT|CREDIT|DEPOSIT|WITHDRAWAL)$/i, '')
      .replace(/^#?\d+\s+/, '') // Remove check numbers
      .replace(/\s+\d{2}\/\d{2}$/, '') // Remove trailing dates
      .trim();
    
    // Take first part before common separators
    const separators = [' - ', ' / ', ' * ', '  '];
    for (const sep of separators) {
      if (payee.includes(sep)) {
        payee = payee.split(sep)[0].trim();
        break;
      }
    }
    
    // Limit length and clean up
    payee = payee.substring(0, 50).trim();
    
    return payee || 'Unknown Payee';
  }

  generateSummary(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      categorySummary: {},
      needsReview: 0
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        summary.totalIncome += transaction.amount;
      } else {
        summary.totalExpenses += transaction.amount;
      }

      if (transaction.needsReview) {
        summary.needsReview++;
      }

      // Category summary
      if (!summary.categorySummary[transaction.category]) {
        summary.categorySummary[transaction.category] = {
          total: 0,
          count: 0,
          type: transaction.type
        };
      }
      summary.categorySummary[transaction.category].total += transaction.amount;
      summary.categorySummary[transaction.category].count++;
    });

    summary.netIncome = summary.totalIncome - summary.totalExpenses;
    
    return summary;
  }
}

export default new SafeChasePDFParser();
