import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import transactionClassifierService from './transactionClassifierService.js';
import ChaseSectionExtractor from './parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from './parsers/ChaseTransactionParser.js';
import ChaseDateUtils from './parsers/ChaseDateUtils.js';
import ChaseClassifier from './parsers/ChaseClassifier.js';
import ChaseSummary from './parsers/ChaseSummary.js';
import { IRS_CATEGORIES } from '../../shared/constants/categories.js';

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
      'AMAZON': IRS_CATEGORIES.OFFICE_EXPENSES,
      'STAPLES': IRS_CATEGORIES.OFFICE_EXPENSES,
      'OFFICE DEPOT': IRS_CATEGORIES.OFFICE_EXPENSES,
      'BEST BUY': IRS_CATEGORIES.OFFICE_EXPENSES,
      'MICROSOFT': IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
      'ADOBE': IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
      'QUICKBOOKS': IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
      'GOOGLE': IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
      'ZOOM': IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
      'SLACK': IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS,
      
      // Vehicle & Transportation
      'SHELL': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'EXXON': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'MOBIL': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'CHEVRON': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'BP': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'COSTCO GAS': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'VALERO': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'AUTO REPAIR': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'JIFFY LUBE': IRS_CATEGORIES.CAR_TRUCK_EXPENSES,
      'UBER': IRS_CATEGORIES.TRAVEL,
      'LYFT': IRS_CATEGORIES.TRAVEL,
      'TAXI': IRS_CATEGORIES.TRAVEL,
      
      // Travel & Meals
      'HOTEL': IRS_CATEGORIES.TRAVEL,
      'MARRIOTT': IRS_CATEGORIES.TRAVEL,
      'HILTON': IRS_CATEGORIES.TRAVEL,
      'HYATT': IRS_CATEGORIES.TRAVEL,
      'AMERICAN AIRLINES': IRS_CATEGORIES.TRAVEL,
      'DELTA': IRS_CATEGORIES.TRAVEL,
      'SOUTHWEST': IRS_CATEGORIES.TRAVEL,
      'UNITED AIRLINES': IRS_CATEGORIES.TRAVEL,
      'RESTAURANT': IRS_CATEGORIES.MEALS,
      'MCDONALD': IRS_CATEGORIES.MEALS,
      'STARBUCKS': IRS_CATEGORIES.MEALS,
      'SUBWAY': IRS_CATEGORIES.MEALS,
      'PIZZA': IRS_CATEGORIES.MEALS,
      
      // Utilities & Communications
      'VERIZON': IRS_CATEGORIES.UTILITIES,
      'AT&T': IRS_CATEGORIES.UTILITIES,
      'COMCAST': IRS_CATEGORIES.UTILITIES,
      'XFINITY': IRS_CATEGORIES.UTILITIES,
      'T-MOBILE': IRS_CATEGORIES.UTILITIES,
      'SPRINT': IRS_CATEGORIES.UTILITIES,
      'ELECTRIC': IRS_CATEGORIES.UTILITIES,
      'GAS COMPANY': IRS_CATEGORIES.UTILITIES,
      'WATER DEPT': IRS_CATEGORIES.UTILITIES,
      'INTERNET': IRS_CATEGORIES.UTILITIES,
      
      // Professional Services
      'LAW FIRM': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      'ATTORNEY': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      'LAWYER': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      'ACCOUNTING': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      'CPA': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      'CONSULTANT': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      'NOTARY': IRS_CATEGORIES.LEGAL_PROFESSIONAL,
      
      // Insurance
      'INSURANCE': IRS_CATEGORIES.INSURANCE_OTHER,
      'ALLSTATE': IRS_CATEGORIES.INSURANCE_OTHER,
      'STATE FARM': IRS_CATEGORIES.INSURANCE_OTHER,
      'GEICO': IRS_CATEGORIES.INSURANCE_OTHER,
      'PROGRESSIVE': IRS_CATEGORIES.INSURANCE_OTHER,
      
      // Banking & Fees
      'OVERDRAFT': IRS_CATEGORIES.BANK_FEES,
      'MAINTENANCE FEE': IRS_CATEGORIES.BANK_FEES,
      'ATM FEE': IRS_CATEGORIES.BANK_FEES,
      'SERVICE CHARGE': IRS_CATEGORIES.BANK_FEES,
      'WIRE TRANSFER': IRS_CATEGORIES.BANK_FEES,
      
      // Rent and Lease
      'RENT': IRS_CATEGORIES.RENT_LEASE_OTHER,
      'LEASE': IRS_CATEGORIES.RENT_LEASE_OTHER,
      'STORAGE': IRS_CATEGORIES.RENT_LEASE_OTHER,
      
      // Equipment and Supplies
      'HOME DEPOT': IRS_CATEGORIES.SUPPLIES,
      'LOWES': IRS_CATEGORIES.SUPPLIES,
      'COSTCO': IRS_CATEGORIES.SUPPLIES,
      'SAM\'S CLUB': IRS_CATEGORIES.SUPPLIES,
      'WALMART': IRS_CATEGORIES.SUPPLIES,
      
      // Web & Hosting
      'GODADDY': IRS_CATEGORIES.WEB_HOSTING,
      'NAMECHEAP': IRS_CATEGORIES.WEB_HOSTING,
      'BLUEHOST': IRS_CATEGORIES.WEB_HOSTING,
      'HOSTGATOR': IRS_CATEGORIES.WEB_HOSTING,
      'AWS': IRS_CATEGORIES.WEB_HOSTING,
      
      // Education & Training
      'COURSERA': IRS_CATEGORIES.TRAINING_EDUCATION,
      'UDEMY': IRS_CATEGORIES.TRAINING_EDUCATION,
      'LINKEDIN LEARNING': IRS_CATEGORIES.TRAINING_EDUCATION,
      
      // Memberships
      'CHAMBER OF COMMERCE': IRS_CATEGORIES.DUES_MEMBERSHIPS,
      'NETWORKING': IRS_CATEGORIES.DUES_MEMBERSHIPS,
      'PROFESSIONAL ASSOCIATION': IRS_CATEGORIES.DUES_MEMBERSHIPS,
      'TRADE ASSOCIATION': IRS_CATEGORIES.DUES_MEMBERSHIPS,
      
      // Additional Other Expenses
      'MERCHANT SERVICES': IRS_CATEGORIES.OTHER_EXPENSES,
      'CREDIT CARD PROCESSING': IRS_CATEGORIES.OTHER_EXPENSES,
      'SQUARE': IRS_CATEGORIES.OTHER_EXPENSES,
      'STRIPE': IRS_CATEGORIES.OTHER_EXPENSES,
      'PAYPAL FEES': IRS_CATEGORIES.OTHER_EXPENSES,
      'CLEANING SERVICE': IRS_CATEGORIES.OTHER_EXPENSES,
      'JANITORIAL': IRS_CATEGORIES.OTHER_EXPENSES,
      'SECURITY SYSTEM': IRS_CATEGORIES.SECURITY_SERVICES,
      'ALARM': IRS_CATEGORIES.SECURITY_SERVICES,
      
      // Licenses and Permits
      'LICENSE FEE': IRS_CATEGORIES.TAXES_LICENSES,
      'PERMIT FEE': IRS_CATEGORIES.TAXES_LICENSES,
      'REGISTRATION FEE': IRS_CATEGORIES.TAXES_LICENSES,
      
      // Tools and Small Equipment
      'HARBOR FREIGHT': IRS_CATEGORIES.TOOLS_EQUIPMENT,
      'NORTHERN TOOL': IRS_CATEGORIES.TOOLS_EQUIPMENT,
      'CRAFTSMAN': IRS_CATEGORIES.TOOLS_EQUIPMENT,
      
      // Common business income indicators
      'DEPOSIT': IRS_CATEGORIES.GROSS_RECEIPTS,
      'TRANSFER FROM': IRS_CATEGORIES.GROSS_RECEIPTS,
      'PAYMENT RECEIVED': IRS_CATEGORIES.GROSS_RECEIPTS,
      'CLIENT PAYMENT': IRS_CATEGORIES.GROSS_RECEIPTS,
      'INVOICE PAYMENT': IRS_CATEGORIES.GROSS_RECEIPTS
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
          electronicFound: text.includes('ELECTRONIC WITHDRAWALS'),
          sectionBreakdown: this.getAvailableSections(transactions)
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

    // Extract company information from statement header
    const companyInfo = this.extractCompanyInfo(text);

    return {
      accountNumber: accountMatch ? accountMatch[1] : null,
      statementPeriod: statementPeriod,
      beginningBalance: beginningMatch ? parseFloat(beginningMatch[1].replace(/,/g, '')) : null,
      endingBalance: endingMatch ? parseFloat(endingMatch[1].replace(/,/g, '')) : null,
      companyInfo
    };
  }

  /**
   * Extract company information from Chase PDF statement header
   * @param {string} text - PDF text content
   * @returns {object} Company information object
   */
  extractCompanyInfo(text) {
    // Look for company name patterns in the first few lines of the statement
    const lines = text.split('\n').slice(0, 20); // Check first 20 lines
    
    let companyName = null;
    let companyAddress = null;
    
    // Common patterns for business names in Chase statements
    const businessPatterns = [
      /^([A-Z\s]+(?:INC|LLC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|CONSTRUCTION|ENTERPRISES|SERVICES|GROUP)\.?),?\s*$/i,
      /^([A-Z\s]+(?:&|AND)\s+[A-Z\s]+(?:INC|LLC|CORP|CONSTRUCTION)\.?),?\s*$/i,
      /^([A-Z][A-Za-z\s]+(?:CONSTRUCTION|CONTRACTING|BUILDER|BUILDERS|COMPANY)\.?),?\s*$/i,
      /^([A-Z][A-Za-z\s]{10,50})\s*$/  // General business name pattern (10-50 chars, starts with capital)
    ];
    
    // Address patterns
    const addressPatterns = [
      /^\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Way|Place|Pl)\.?\s*$/i,
      /^[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/  // City, State ZIP
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and common header text
      if (!line || 
          line.includes('Chase') || 
          line.includes('Statement') || 
          line.includes('Account') || 
          line.includes('Period') ||
          line.includes('Balance') ||
          line.includes('Page') ||
          line.match(/^\d+$/)) {
        continue;
      }
      
      // Check for business name patterns
      if (!companyName) {
        for (const pattern of businessPatterns) {
          const match = line.match(pattern);
          if (match) {
            companyName = match[1].trim();
            console.log(`🏢 Extracted company name: ${companyName}`);
            break;
          }
        }
      }
      
      // Check for address patterns (usually appears after company name)
      if (companyName && !companyAddress) {
        for (const pattern of addressPatterns) {
          if (pattern.test(line)) {
            companyAddress = line;
            console.log(`📍 Extracted company address: ${companyAddress}`);
            break;
          }
        }
      }
      
      // If we have both, we can stop looking
      if (companyName && companyAddress) {
        break;
      }
    }
    
    return {
      name: companyName,
      address: companyAddress,
      extracted: !!(companyName || companyAddress)
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

    // Extract different types of transactions (section-based)
    const deposits = this.extractDeposits(text, statementYear);
    const checks = this.extractChecks(text, statementYear);
    const cardTransactions = this.extractCardTransactions(text, statementYear);
    const electronicTransactions = this.extractElectronicTransactions(text, statementYear);

    transactions.push(...deposits, ...checks, ...cardTransactions, ...electronicTransactions);

    // Fallback: line-by-line extraction if total is suspiciously low (< 25)
    if (transactions.length < 25) {
      this.extractionLog.push('⚠️ Low transaction count, running line-by-line fallback extraction');
      const fallbackTxs = this.extractTransactionsLineByLine(text, statementYear);
      // Only add transactions not already present (by date, amount, description)
      for (const tx of fallbackTxs) {
        if (!transactions.some(t => t.date === tx.date && t.amount === tx.amount && t.description === tx.description)) {
          transactions.push(tx);
        }
      }
      this.extractionLog.push(`Fallback extraction added ${transactions.length} total transactions`);
    }

    this.extractionLog.push(`Total transactions extracted: ${transactions.length}`);

    // Sort transactions by date (dates are already in ISO format with T12:00:00)
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  // Fallback: line-by-line extraction logic from improvedChasePDFParser.js
  extractTransactionsLineByLine(text, year) {
    const transactions = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Deposits: 01/08Remote Online Deposit 1$3,640.00
      const depositMatch = line.match(/^(\d{2}\/\d{2})Remote Online Deposit \d+\$?([\d,]+\.?\d{2})$/);
      if (depositMatch) {
        const transaction = this.createTransaction(
          depositMatch[1],
          'Remote Online Deposit',
          depositMatch[2],
          'income',
          year
        );
        if (transaction) {
          transaction.section = 'DEPOSITS AND ADDITIONS';
          transaction.sectionCode = 'deposits';
          transactions.push(transaction);
        }
        continue;
      }
      // Card Purchases: 01/02Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819$38.80
      const cardMatch = line.match(/^(\d{2}\/\d{2})Card Purchase(?: With Pin)?(?: \d{2}\/\d{2})?\s+(.+?)\s+Card \d+\$?([\d,]+\.?\d{2})$/);
      if (cardMatch) {
        const transaction = this.createTransaction(
          cardMatch[1],
          cardMatch[2].trim(),
          cardMatch[3],
          'expense',
          year
        );
        if (transaction) {
          transaction.section = 'ATM & DEBIT CARD WITHDRAWALS';
          transaction.sectionCode = 'card';
          transactions.push(transaction);
        }
        continue;
      }
      // Electronic Withdrawals (multi-line): 01/11Orig CO Name:Home Depot...
      const electronicMatch = line.match(/^(\d{2}\/\d{2})Orig CO Name:(.+?)(?:Orig ID|$)/);
      if (electronicMatch) {
        let amount = null;
        let description = electronicMatch[2].trim();
        for (let j = i; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j];
          const amountMatch = nextLine.match(/\$?([\d,]+\.?\d{2})/);
          if (amountMatch && !nextLine.includes('CO Name')) {
            amount = amountMatch[1];
            break;
          }
        }
        if (amount) {
          const transaction = this.createTransaction(
            electronicMatch[1],
            `Electronic Payment: ${description}`,
            amount,
            'expense',
            year
          );
          if (transaction) {
            transaction.section = 'ELECTRONIC WITHDRAWALS';
            transaction.sectionCode = 'electronic';
            transactions.push(transaction);
          }
        }
        continue;
      }
      // Checks: 01/19 CHECK #538 $2,500.00 or similar
      const checkMatch = line.match(/^(\d{2}\/\d{2}).*CHECK.*#?(\d+).*$([\d,]+\.?\d{2})$/i);
      if (checkMatch) {
        const transaction = this.createTransaction(
          checkMatch[1],
          `Check #${checkMatch[2]}`,
          checkMatch[3],
          'expense',
          year
        );
        if (transaction) {
          transaction.section = 'CHECKS PAID';
          transaction.sectionCode = 'checks';
          transactions.push(transaction);
        }
        continue;
      }
    }
    return transactions;
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
    // Always output as ISO 8601 with T12:00:00 to avoid timezone issues
    const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
    
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
      confidence: category !== IRS_CATEGORIES.UNCATEGORIZED ? 0.8 : 0.3,
      source: 'chase_pdf',
      needsReview: category === IRS_CATEGORIES.UNCATEGORIZED || !payee
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
        return IRS_CATEGORIES.GROSS_RECEIPTS;
      }
    } else {
      // Expense classification by keywords
      if (upperDesc.includes('GAS') || upperDesc.includes('FUEL')) {
        return IRS_CATEGORIES.CAR_TRUCK_EXPENSES;
      }
      if (upperDesc.includes('RESTAURANT') || upperDesc.includes('CAFE') || upperDesc.includes('FOOD')) {
        return IRS_CATEGORIES.MEALS;
      }
      if (upperDesc.includes('HOTEL') || upperDesc.includes('AIRBNB') || upperDesc.includes('FLIGHT')) {
        return IRS_CATEGORIES.TRAVEL;
      }
      if (upperDesc.includes('OFFICE') || upperDesc.includes('SUPPLY')) {
        return IRS_CATEGORIES.OFFICE_EXPENSES;
      }
      if (upperDesc.includes('FEE') || upperDesc.includes('CHARGE')) {
        return IRS_CATEGORIES.BANK_FEES;
      }
      if (upperDesc.includes('INSURANCE')) {
        return IRS_CATEGORIES.INSURANCE_OTHER;
      }
      if (upperDesc.includes('RENT') || upperDesc.includes('LEASE')) {
        return IRS_CATEGORIES.RENT_LEASE_OTHER;
      }
      if (upperDesc.includes('SOFTWARE') || upperDesc.includes('SUBSCRIPTION')) {
        return IRS_CATEGORIES.SOFTWARE_SUBSCRIPTIONS;
      }
      if (upperDesc.includes('PHONE') || upperDesc.includes('INTERNET') || upperDesc.includes('ELECTRIC') || upperDesc.includes('WATER')) {
        return IRS_CATEGORIES.UTILITIES;
      }
    }
    
    return IRS_CATEGORIES.UNCATEGORIZED;
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
      sectionSummary: {},
      availableSections: this.getAvailableSections(transactions),
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

      // Section summary
      if (transaction.sectionCode) {
        if (!summary.sectionSummary[transaction.sectionCode]) {
          summary.sectionSummary[transaction.sectionCode] = {
            name: transaction.section,
            total: 0,
            count: 0,
            type: transaction.type
          };
        }
        summary.sectionSummary[transaction.sectionCode].total += transaction.amount;
        summary.sectionSummary[transaction.sectionCode].count++;
      } else {
        // Handle transactions with missing section
        if (!summary.sectionSummary['uncategorized']) {
          summary.sectionSummary['uncategorized'] = {
            name: 'Uncategorized Section',
            total: 0,
            count: 0,
            type: transaction.type
          };
        }
        summary.sectionSummary['uncategorized'].total += transaction.amount;
        summary.sectionSummary['uncategorized'].count++;
      }
    });

    summary.netIncome = summary.totalIncome - summary.totalExpenses;
    
    return summary;
  }

  extractDeposits(text, year) {
    // Use new section extractor and transaction parser
    const sectionText = ChaseSectionExtractor.extractDepositsSection(text);
    const deposits = [];
    if (sectionText) {
      const lines = sectionText.split('\n');
      for (const line of lines) {
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        const tx = ChaseTransactionParser.parseDepositLine(line, year);
        if (tx) {
          // Add section metadata for filtering
          tx.section = 'DEPOSITS AND ADDITIONS';
          tx.sectionCode = 'deposits';
          deposits.push(tx);
        }
      }
    }
    this.extractionLog.push(`Extracted ${deposits.length} deposits`);
    return deposits;
  }

  extractChecks(text, year) {
    // Use new section extractor and transaction parser
    const sectionText = ChaseSectionExtractor.extractChecksSection(text);
    const checks = [];
    if (sectionText) {
      const lines = sectionText.split('\n');
      for (const line of lines) {
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        const tx = ChaseTransactionParser.parseCheckLine ? ChaseTransactionParser.parseCheckLine(line, year) : null;
        if (tx) {
          // Add section metadata for filtering
          tx.section = 'CHECKS PAID';
          tx.sectionCode = 'checks';
          checks.push(tx);
        }
      }
    }
    this.extractionLog.push(`Extracted ${checks.length} checks`);
    return checks;
  }

  extractCardTransactions(text, year) {
    // Use new section extractor and transaction parser
    const sectionText = ChaseSectionExtractor.extractCardSection(text);
    const cardTransactions = [];
    if (sectionText) {
      const lines = sectionText.split('\n');
      for (const line of lines) {
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        const tx = ChaseTransactionParser.parseCardLine ? ChaseTransactionParser.parseCardLine(line, year) : null;
        if (tx) {
          // Add section metadata for filtering
          tx.section = 'ATM & DEBIT CARD WITHDRAWALS';
          tx.sectionCode = 'card';
          cardTransactions.push(tx);
        }
      }
    }
    this.extractionLog.push(`Extracted ${cardTransactions.length} card transactions`);
    return cardTransactions;
  }

  extractElectronicTransactions(text, year) {
    // Use new section extractor and transaction parser
    const sectionText = ChaseSectionExtractor.extractElectronicSection(text);
    const electronicTransactions = [];
    if (sectionText) {
      const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Parse multi-line electronic transactions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip headers and totals
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('AMOUNT') || line.includes('Total')) {
          continue;
        }
        
        // Look for date + company line (handle both single-line and multi-line formats)
        const dateCompanyMatch = line.match(/^(\d{2}\/\d{2}).*?Orig CO Name:([^O\n]+?)(?:Orig|$)/);
        if (dateCompanyMatch) {
          const dateStr = dateCompanyMatch[1];
          let companyName = dateCompanyMatch[2].trim();
          
          // Clean up company name (remove extra info)
          companyName = companyName.replace(/\s+ID:.*$/, '').trim();
          
          // Try to find amount on the same line first
          let amount = null;
          const sameLineAmountMatch = line.match(/\$?([\d,]+\.\d{2})/);
          if (sameLineAmountMatch) {
            amount = parseFloat(sameLineAmountMatch[1].replace(/,/g, ''));
          } else {
            // Look ahead for the amount in the next few lines (multi-line format)
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
              const nextLine = lines[j].trim();
              
              // Stop if we hit another date line or total
              if (nextLine.match(/^\d{2}\/\d{2}/) || nextLine.includes('Total')) {
                break;
              }
              
              // Look for amount pattern
              const amountMatch = nextLine.match(/^\$?([\d,]+\.\d{2})$/);
              if (amountMatch) {
                amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
          
          if (amount && amount > 0 && amount <= 50000) {
            const date = this.parseDateToISO(dateStr, year);
            const transaction = {
              date,
              amount,
              description: `Electronic Payment: ${companyName}`,
              type: 'expense',
              category: 'Business Expenses',
              subCategory: 'Electronic Payments',
              source: 'chase_pdf',
              // Add section metadata for filtering
              section: 'ELECTRONIC WITHDRAWALS',
              sectionCode: 'electronic'
            };
            electronicTransactions.push(transaction);
          }
        }
      }
    }
    this.extractionLog.push(`Extracted ${electronicTransactions.length} electronic transactions`);
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
      // Always output as ISO 8601 with T12:00:00 to avoid timezone issues
      const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
      
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

  parseDateToISO(dateStr, year) {
    // Helper method to parse MM/DD format to ISO date
    const dateParts = dateStr.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
  }

  /**
   * Filter transactions by PDF section
   * @param {Array} transactions - Array of transactions
   * @param {string} sectionCode - Section code: 'deposits', 'checks', 'card', 'electronic', 'manual', 'uncategorized'
   * @returns {Array} Filtered transactions
   */
  filterTransactionsBySection(transactions, sectionCode) {
    if (!sectionCode) return transactions;
    
    if (sectionCode === 'uncategorized') {
      // Return transactions with missing or undefined sectionCode
      return transactions.filter(tx => !tx.sectionCode || tx.sectionCode === 'uncategorized');
    }
    
    return transactions.filter(tx => tx.sectionCode === sectionCode);
  }

  /**
   * Get available sections from transactions
   * @param {Array} transactions - Array of transactions
   * @returns {Array} Array of section objects with counts
   */
  getAvailableSections(transactions) {
    const sections = {
      deposits: { code: 'deposits', name: 'DEPOSITS AND ADDITIONS', count: 0, total: 0 },
      checks: { code: 'checks', name: 'CHECKS PAID', count: 0, total: 0 },
      card: { code: 'card', name: 'ATM & DEBIT CARD WITHDRAWALS', count: 0, total: 0 },
      electronic: { code: 'electronic', name: 'ELECTRONIC WITHDRAWALS', count: 0, total: 0 },
      manual: { code: 'manual', name: 'MANUAL ENTRY', count: 0, total: 0 },
      uncategorized: { code: 'uncategorized', name: 'UNCATEGORIZED SECTION', count: 0, total: 0 }
    };

    transactions.forEach(tx => {
      if (tx.sectionCode && sections[tx.sectionCode]) {
        sections[tx.sectionCode].count++;
        sections[tx.sectionCode].total += tx.amount;
      } else if (!tx.sectionCode) {
        // Handle transactions with missing section code
        sections.uncategorized.count++;
        sections.uncategorized.total += tx.amount;
      }
    });

    return Object.values(sections).filter(section => section.count > 0);
  }
}

export default new ChasePDFParser();
