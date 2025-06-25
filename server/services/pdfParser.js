import { IRS_CATEGORIES, TRANSACTION_TYPES, PAYMENT_METHODS } from '../../shared/constants/categories.js';

class PDFParserService {
  constructor() {
    this.chasePatterns = {
      // Chase bank statement patterns
      transactionLine: /(\d{2}\/\d{2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d*)\s*([-]?\$?[\d,]+\.?\d*)?\s*$/gm,
      datePattern: /(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2})/,
      amountPattern: /([-]?\$?[\d,]+\.?\d*)/,
      balancePattern: /(?:ENDING BALANCE|Balance Forward|Previous Balance).*?\$?([\d,]+\.?\d*)/i,
      accountPattern: /Account Number.*?(\d{4})/i,
      statementPeriod: /Statement Period.*?(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i
    };

    this.commonPayees = {
      // Common business expense payees and their likely categories
      'amazon': IRS_CATEGORIES.OFFICE_EXPENSES,
      'staples': IRS_CATEGORIES.OFFICE_EXPENSES,
      'office depot': IRS_CATEGORIES.OFFICE_EXPENSES,
      'best buy': IRS_CATEGORIES.OFFICE_EXPENSES,
      'home depot': IRS_CATEGORIES.REPAIRS_MAINTENANCE,
      'lowes': IRS_CATEGORIES.REPAIRS_MAINTENANCE,
      'shell': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'exxon': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'mobil': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'chevron': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'uber': IRS_CATEGORIES.TRAVEL,
      'lyft': IRS_CATEGORIES.TRAVEL,
      'hotel': IRS_CATEGORIES.TRAVEL,
      'marriott': IRS_CATEGORIES.TRAVEL,
      'hilton': IRS_CATEGORIES.TRAVEL,
      'united airlines': IRS_CATEGORIES.TRAVEL,
      'delta': IRS_CATEGORIES.TRAVEL,
      'american airlines': IRS_CATEGORIES.TRAVEL,
      'verizon': IRS_CATEGORIES.UTILITIES,
      'at&t': IRS_CATEGORIES.UTILITIES,
      'comcast': IRS_CATEGORIES.UTILITIES,
      'pg&e': IRS_CATEGORIES.UTILITIES,
      'starbucks': IRS_CATEGORIES.MEALS_ENTERTAINMENT,
      'mcdonalds': IRS_CATEGORIES.MEALS_ENTERTAINMENT,
      'subway': IRS_CATEGORIES.MEALS_ENTERTAINMENT
    };
  }
  async parsePDF(pdfBuffer, fileMetadata = {}) {
    try {
      console.log('Starting PDF parsing...');
      
      // Dynamic import to avoid loading pdf-parse at module initialization
      const pdfParse = (await import('pdf-parse')).default;
      
      // Parse PDF content
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;
      
      console.log('PDF text extracted, length:', text.length);

      // Detect bank type and statement period
      const bankInfo = this.detectBankType(text);
      const statementPeriod = this.extractStatementPeriod(text);
      
      console.log('Bank detected:', bankInfo.bank);
      console.log('Statement period:', statementPeriod);

      // Extract transactions based on bank type
      let transactions = [];
      
      if (bankInfo.bank === 'chase') {
        transactions = this.parseChaseStatement(text);
      } else {
        // Try generic parsing
        transactions = this.parseGenericStatement(text);
      }

      console.log(`Extracted ${transactions.length} transactions`);

      // Classify transactions
      const classifiedTransactions = transactions.map(transaction => 
        this.classifyTransaction(transaction)
      );

      return {
        success: true,
        bankInfo,
        statementPeriod,
        transactions: classifiedTransactions,
        metadata: {
          ...fileMetadata,
          totalTransactions: classifiedTransactions.length,
          processingDate: new Date().toISOString(),
          textLength: text.length
        },
        rawText: text // For debugging
      };

    } catch (error) {
      console.error('PDF parsing error:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        metadata: fileMetadata
      };
    }
  }

  detectBankType(text) {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('chase') || textLower.includes('jpmorgan')) {
      return { bank: 'chase', confidence: 0.9 };
    } else if (textLower.includes('bank of america') || textLower.includes('boa')) {
      return { bank: 'boa', confidence: 0.9 };
    } else if (textLower.includes('wells fargo')) {
      return { bank: 'wells_fargo', confidence: 0.9 };
    } else if (textLower.includes('citibank') || textLower.includes('citi')) {
      return { bank: 'citi', confidence: 0.9 };
    }
    
    return { bank: 'unknown', confidence: 0.1 };
  }

  extractStatementPeriod(text) {
    const match = text.match(this.chasePatterns.statementPeriod);
    if (match) {
      return {
        startDate: this.parseDate(match[1]),
        endDate: this.parseDate(match[2])
      };
    }
    return null;
  }

  parseChaseStatement(text) {
    const transactions = [];
    const lines = text.split('\n');
    
    let currentYear = new Date().getFullYear();
    
    // Look for year in statement
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      currentYear = parseInt(yearMatch[1]);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and headers
      if (!line || this.isHeaderLine(line)) {
        continue;
      }

      // Try to parse transaction line
      const transaction = this.parseChaseTransactionLine(line, currentYear);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  parseChaseTransactionLine(line, year) {
    // Chase format: MM/DD Description Amount [Balance]
    const patterns = [
      // Pattern 1: MM/DD Description -$123.45 $1,234.56
      /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})\s+\$?[\d,]+\.?\d{2}$/,
      // Pattern 2: MM/DD Description -$123.45
      /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})$/,
      // Pattern 3: Without leading zeros
      /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-]?[\d,]+\.?\d{2})$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, dateStr, description, amountStr] = match;
        
        // Parse amount
        const amount = this.parseAmount(amountStr);
        if (amount === null) continue;

        // Parse date
        const date = this.parseDate(`${dateStr}/${year}`);
        if (!date) continue;

        // Clean description
        const cleanDescription = this.cleanDescription(description);

        return {
          date,
          description: cleanDescription,
          amount,
          payee: this.extractPayee(cleanDescription),
          originalLine: line,
          type: amount > 0 ? TRANSACTION_TYPES.INCOME : TRANSACTION_TYPES.EXPENSE
        };
      }
    }

    return null;
  }

  parseGenericStatement(text) {
    const transactions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Look for lines that might contain transaction data
      if (this.looksLikeTransaction(line)) {
        const transaction = this.parseGenericTransactionLine(line);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }

    return transactions;
  }

  parseGenericTransactionLine(line) {
    // Try to extract date, description, and amount from generic formats
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/\d{1,2})/);
    const amountMatch = line.match(/([-]?\$?[\d,]+\.?\d{2})/g);
    
    if (dateMatch && amountMatch) {
      const dateStr = dateMatch[1];
      const amountStr = amountMatch[amountMatch.length - 1]; // Usually last amount is transaction amount
      
      const date = this.parseDate(dateStr);
      const amount = this.parseAmount(amountStr);
      
      if (date && amount !== null) {
        // Extract description (everything between date and amount)
        let description = line.replace(dateMatch[0], '').replace(amountStr, '').trim();
        description = this.cleanDescription(description);

        return {
          date,
          description,
          amount,
          payee: this.extractPayee(description),
          originalLine: line,
          type: amount > 0 ? TRANSACTION_TYPES.INCOME : TRANSACTION_TYPES.EXPENSE
        };
      }
    }

    return null;
  }

  classifyTransaction(transaction) {
    const payeeLower = transaction.payee.toLowerCase();
    const descriptionLower = transaction.description.toLowerCase();
    
    // First check common payees
    for (const [payeePattern, category] of Object.entries(this.commonPayees)) {
      if (payeeLower.includes(payeePattern)) {
        return {
          ...transaction,
          category,
          classificationConfidence: 0.8,
          classificationMethod: 'payee_pattern'
        };
      }
    }

    // Check description keywords
    const category = this.classifyByKeywords(descriptionLower);
    if (category !== IRS_CATEGORIES.UNCATEGORIZED) {
      return {
        ...transaction,
        category,
        classificationConfidence: 0.6,
        classificationMethod: 'keyword_matching'
      };
    }

    // Default classification
    return {
      ...transaction,
      category: IRS_CATEGORIES.UNCATEGORIZED,
      classificationConfidence: 0.1,
      classificationMethod: 'default'
    };
  }

  classifyByKeywords(text) {
    // Simple keyword-based classification
    if (text.includes('gas') || text.includes('fuel') || text.includes('exxon') || text.includes('shell')) {
      return IRS_CATEGORIES.CAR_TRUCK_EXPENSES;
    }
    if (text.includes('office') || text.includes('supplies') || text.includes('staples')) {
      return IRS_CATEGORIES.OFFICE_EXPENSES;
    }
    if (text.includes('restaurant') || text.includes('coffee') || text.includes('food')) {
      return IRS_CATEGORIES.MEALS_ENTERTAINMENT;
    }
    if (text.includes('hotel') || text.includes('airline') || text.includes('flight')) {
      return IRS_CATEGORIES.TRAVEL;
    }
    if (text.includes('internet') || text.includes('phone') || text.includes('electric')) {
      return IRS_CATEGORIES.UTILITIES;
    }
    
    return IRS_CATEGORIES.UNCATEGORIZED;
  }

  // Helper methods
  parseDate(dateStr) {
    try {
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY
        /^(\d{1,2})\/(\d{1,2})$/ // MM/DD
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          let [, month, day, year] = match;
          
          if (!year) {
            year = new Date().getFullYear();
          } else if (year.length === 2) {
            year = parseInt(year) + (parseInt(year) > 50 ? 1900 : 2000);
          }

          const date = new Date(year, parseInt(month) - 1, parseInt(day));
          return isNaN(date.getTime()) ? null : date;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  parseAmount(amountStr) {
    try {
      // Remove $ and commas, handle negative signs
      let cleanAmount = amountStr.replace(/[$,]/g, '');
      
      // Handle different negative formats
      if (cleanAmount.includes('-') || cleanAmount.includes('(')) {
        cleanAmount = '-' + cleanAmount.replace(/[-()]/g, '');
      }

      const amount = parseFloat(cleanAmount);
      return isNaN(amount) ? null : amount;
    } catch (error) {
      return null;
    }
  }

  cleanDescription(description) {
    return description
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s&.-]/g, '') // Remove special characters except common ones
      .trim();
  }

  extractPayee(description) {
    // Try to extract the main payee from the description
    const words = description.split(' ');
    
    // Often the first few words are the payee
    if (words.length > 0) {
      // Return first 1-3 words as payee
      return words.slice(0, Math.min(3, words.length)).join(' ');
    }
    
    return description;
  }

  isHeaderLine(line) {
    const headers = [
      'date', 'description', 'amount', 'balance', 'transaction',
      'beginning balance', 'ending balance', 'account summary'
    ];
    
    const lineLower = line.toLowerCase();
    return headers.some(header => lineLower.includes(header));
  }

  looksLikeTransaction(line) {
    // Simple heuristic to identify transaction lines
    const hasDate = /\d{1,2}\/\d{1,2}/.test(line);
    const hasAmount = /\$?[\d,]+\.?\d{2}/.test(line);
    const isNotHeader = !this.isHeaderLine(line);
    const hasMinLength = line.trim().length > 10;
    
    return hasDate && hasAmount && isNotHeader && hasMinLength;
  }
}

export default new PDFParserService();
