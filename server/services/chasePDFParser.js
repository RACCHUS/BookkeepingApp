import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import transactionClassifierService from './transactionClassifierService.js';

class ChasePDFParser {
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
      beginningBalance: /Beginning\s+Balance\s*\$?([\d,]+\.?\d{2})/i,
      endingBalance: /Ending\s+Balance\s*\$?([\d,]+\.?\d{2})/i,
      
      // Statement period - handle "through" format
      statementPeriodThrough: /(\w+\s+\d{1,2},\s+\d{4})\s*through\s*(\w+\s+\d{1,2},\s+\d{4})/i,
      
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
        debug: {
          textLength: text.length,
          extractionLog: this.extractionLog || [],
          depositsFound: text.includes('DEPOSITS AND ADDITIONS'),
          checksFound: text.includes('CHECKS PAID'),
          cardTransactionsFound: /ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT/i.test(text),
          electronicFound: text.includes('ELECTRONIC WITHDRAWALS')
        }
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
    const periodThroughMatch = text.match(this.patterns.statementPeriodThrough);
    const beginningMatch = text.match(this.patterns.beginningBalance);
    const endingMatch = text.match(this.patterns.endingBalance);

    // Use either format for statement period
    let statementPeriod = null;
    if (periodMatch) {
      statementPeriod = {
        start: periodMatch[1],
        end: periodMatch[2]
      };
    } else if (periodThroughMatch) {
      statementPeriod = {
        start: periodThroughMatch[1],
        end: periodThroughMatch[2]
      };
    }

    return {
      accountNumber: accountMatch ? accountMatch[1] : null,
      statementPeriod: statementPeriod,
      beginningBalance: beginningMatch ? parseFloat(beginningMatch[1].replace(/,/g, '')) : null,
      endingBalance: endingMatch ? parseFloat(endingMatch[1].replace(/,/g, '')) : null
    };
  }

  extractTransactions(text, accountInfo) {
    const transactions = [];
    this.extractionLog = []; // Reset log
    
    // Get the statement year from period or current year
    const currentYear = new Date().getFullYear();
    let statementYear = currentYear;
    
    // Try to extract year from statement period
    if (accountInfo.statementPeriod) {
      const yearMatch = accountInfo.statementPeriod.end.match(/\d{4}/);
      if (yearMatch) {
        statementYear = parseInt(yearMatch[0]);
      }
    }

    this.extractionLog.push(`Using statement year: ${statementYear}`);

    // Extract different types of transactions
    const deposits = this.extractDeposits(text, statementYear);
    const checks = this.extractChecks(text, statementYear);
    const cardTransactions = this.extractCardTransactions(text, statementYear);
    const electronicTransactions = this.extractElectronicTransactions(text, statementYear);

    transactions.push(...deposits, ...checks, ...cardTransactions, ...electronicTransactions);

    this.extractionLog.push(`Total transactions extracted: ${transactions.length}`);

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

  extractDeposits(text, year) {
    const deposits = [];
    
    // Look for the deposits section (case insensitive)
    const depositMatch = text.match(/DEPOSITS AND ADDITIONS[\s\S]*?Total Deposits and Additions[\s\S]*?\$[\d,]+\.?\d{2}/i);
    
    this.extractionLog.push(`Deposit section found: ${depositMatch ? 'YES' : 'NO'}`);
    
    if (depositMatch) {
      const sectionText = depositMatch[0];
      this.extractionLog.push(`Deposit section length: ${sectionText.length}`);
      
      const lines = sectionText.split('\n');
      for (const line of lines) {
        // Skip header and total lines
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) {
          continue;
        }
        
        // Pattern: 01/08Remote Online Deposit 1$3,640.00 or 01/19Remote Online Deposit 12,500.00
        // Look for date followed by description and amount (with or without $)
        const match = line.match(/(\d{2}\/\d{2})(.+?)\$?([\d,]+\.\d{2})/);
        if (match) {
          const [, dateStr, description, amountStr] = match;
          
          // Clean up description and validate it looks like a deposit
          const cleanDescription = description.trim();
          if (cleanDescription.length > 0) {
            this.extractionLog.push(`Found deposit: ${dateStr} ${cleanDescription} $${amountStr}`);
            
            const transaction = this.createTransaction(
              dateStr, 
              cleanDescription, 
              amountStr, 
              'income', 
              year
            );
            
            if (transaction) {
              deposits.push(transaction);
            }
          }
        }
      }
    }
    
    this.extractionLog.push(`Extracted ${deposits.length} deposits`);
    return deposits;
  }

  extractChecks(text, year) {
    const checks = [];
    const checkSection = text.match(/CHECKS PAID[\s\S]*?Total Checks Paid/i);
    
    if (checkSection) {
      // More precise pattern: 529^01/03$1,000.00 or 530^01/031,500.00
      const lines = checkSection[0].split('\n');
      for (const line of lines) {
        // Match check number, date, and amount more precisely
        const match = line.match(/(\d+)\^(\d{2}\/\d{2})(?:\d{2}\/\d{2})?\$?([\d,]+\.\d{2})/);
        if (match) {
          const [, checkNum, dateStr, amountStr] = match;
          
          // Validate amount is reasonable (under $100,000)
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (amount > 0 && amount < 100000) {
            const transaction = this.createTransaction(
              dateStr, 
              `CHECK #${checkNum}`, 
              amountStr, 
              'expense', 
              year
            );
            
            if (transaction) {
              checks.push(transaction);
            }
          }
        }
      }
    }
    
    return checks;
  }

  extractCardTransactions(text, year) {
    const cardTransactions = [];
    // Look for the detailed transaction section with DATE DESCRIPTION AMOUNT header
    const cardSection = text.match(/ATM\s*&\s*DEBIT CARD WITHDRAWALS\s*\n\s*DATE\s*DESCRIPTION\s*AMOUNT[\s\S]*?Total ATM\s*&\s*DEBIT CARD WITHDRAWALS/i);
    
    this.extractionLog.push(`Card section found: ${cardSection ? 'YES' : 'NO'}`);
    
    if (cardSection) {
      const lines = cardSection[0].split('\n');
      this.extractionLog.push(`Card section has ${lines.length} lines`);
      
      for (const line of lines) {
        // Skip header lines and total lines
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) {
          continue;
        }
        
        // Pattern for the actual format: 01/02Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819$38.80
        // Note: Card number is always 4 digits (1819), amount follows immediately with optional $
        const match = line.match(/^(\d{2}\/\d{2})Card Purchase.*?Card\s*1819\$?([\d,]+\.\d{2})$/);
        if (match) {
          const [, dateStr, amountStr] = match;
          this.extractionLog.push(`Matched card transaction: ${dateStr} $${amountStr}`);
          
          // Validate amount is reasonable
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (amount > 0 && amount < 50000) {
            // Extract merchant info - everything between "Card Purchase" and "Card 1819"
            const merchantMatch = line.match(/Card Purchase\s*(?:\d{2}\/\d{2}\s+)?(.+?)\s+Card\s*1819/);
            let merchantName = 'Card Purchase';
            
            if (merchantMatch && merchantMatch[1]) {
              // Clean up merchant name
              merchantName = merchantMatch[1]
                .replace(/\s+/g, ' ')
                .replace(/\d{7,}/, '') // Remove long number sequences like store IDs
                .replace(/\s+[A-Z]{2}\s*$/, '') // Remove state codes like "FL"
                .trim();
              
              // Take first few words if it's too long
              const words = merchantName.split(' ');
              if (words.length > 4) {
                merchantName = words.slice(0, 4).join(' ');
              }
            }
            
            this.extractionLog.push(`Creating card transaction: ${dateStr} ${merchantName} $${amountStr}`);
            
            const transaction = this.createTransaction(
              dateStr, 
              merchantName, 
              amountStr, 
              'expense', 
              year
            );
            
            if (transaction) {
              cardTransactions.push(transaction);
              this.extractionLog.push(`Successfully created card transaction`);
            } else {
              this.extractionLog.push(`Failed to create card transaction`);
            }
          } else {
            this.extractionLog.push(`Invalid amount: ${amount}`);
          }
        }
      }
    }
    
    this.extractionLog.push(`Extracted ${cardTransactions.length} card transactions`);
    return cardTransactions;
  }

  extractElectronicTransactions(text, year) {
    const electronicTransactions = [];
    const electronicSection = text.match(/ELECTRONIC WITHDRAWALS[\s\S]*?Total Electronic Withdrawals/i);
    
    if (electronicSection) {
      const sectionText = electronicSection[0];
      
      // Look for patterns like: 01/11 Orig CO Name:Home Depot ... $389.20
      // Sometimes the amount is on the same line, sometimes on next line
      const lines = sectionText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match date and company name pattern
        const dateCompanyMatch = line.match(/(\d{2}\/\d{2})\s+Orig CO Name:([^O]+?)(?:Orig|$)/);
        if (dateCompanyMatch) {
          const [, dateStr, companyName] = dateCompanyMatch;
          
          // Look for amount on current line or next few lines
          let amount = null;
          let amountStr = '';
          
          // Check current line first
          const amountMatch = line.match(/\$?([\d,]+\.\d{2})/);
          if (amountMatch) {
            amountStr = amountMatch[1];
            amount = parseFloat(amountStr.replace(/,/g, ''));
          } else {
            // Check next 2 lines for amount
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              const nextLineMatch = lines[j].match(/\$?([\d,]+\.\d{2})/);
              if (nextLineMatch) {
                amountStr = nextLineMatch[1];
                amount = parseFloat(amountStr.replace(/,/g, ''));
                break;
              }
            }
          }
          
          // Only create transaction if we found a reasonable amount
          if (amount && amount > 0 && amount < 50000) {
            const transaction = this.createTransaction(
              dateStr, 
              `Electronic Payment: ${companyName.trim()}`, 
              amountStr, 
              'expense', 
              year
            );
            
            if (transaction) {
              electronicTransactions.push(transaction);
            }
          }
        }
      }
    }
    
    return electronicTransactions;
  }

  createTransaction(dateStr, description, amountStr, type, year) {
    try {
      // Parse date: MM/DD format
      const dateParts = dateStr.split('/');
      const month = parseInt(dateParts[0]);
      const day = parseInt(dateParts[1]);
      
      // Validate date components
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }
      
      const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Parse amount
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      
      // Validate amount is reasonable
      if (isNaN(amount) || amount <= 0 || amount > 1000000) {
        console.warn(`Invalid amount: ${amountStr} -> ${amount}`);
        return null;
      }
      
      // Clean up description
      const cleanDescription = description.replace(/\s+/g, ' ').trim();
      
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
    } catch (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
  }

  async classifyTransactionAdvanced(transaction, userId) {
    try {
      // Use the advanced classification service
      const classification = await transactionClassifierService.classifyTransaction(transaction, userId);
      return {
        category: classification.category,
        confidence: classification.confidence,
        source: classification.source,
        needsReview: classification.confidence < 80
      };
    } catch (error) {
      console.warn('Advanced classification failed, falling back to basic classification:', error);
      // Fall back to basic classification
      const category = this.classifyTransaction(transaction.description, transaction.type);
      return {
        category,
        confidence: 60,
        source: 'fallback',
        needsReview: category === 'Uncategorized'
      };
    }
  }
}

export default new ChasePDFParser();
