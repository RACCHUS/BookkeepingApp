import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import transactionClassifierService from './transactionClassifierService.js';
import ChaseSectionExtractor from './parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from './parsers/ChaseTransactionParser.js';
import ChaseDateUtils from './parsers/ChaseDateUtils.js';
import ChaseClassifier from './parsers/ChaseClassifier.js';
import ChaseSummary from './parsers/ChaseSummary.js';
import { IRS_CATEGORIES } from '../../shared/constants/categories.js';
import { parseTransactionLine, extractCompanyInfo, createTransaction } from './parsers/index.js';

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

  /**
   * Parse a Chase PDF and extract transactions using user rules.
   * @param {string} filePath
   * @param {string} userId
   */
  async parsePDF(filePath, userId, companyId = '', companyName = '') {
    try {
      console.log(`[ChasePDFParser] Reading file: ${filePath}`);
      const dataBuffer = await fs.readFile(filePath);
      console.log(`[ChasePDFParser] Buffer size: ${dataBuffer.length}, First 16 bytes:`, dataBuffer.slice(0, 16));
      const pdfData = await pdfParse(dataBuffer);
      console.log(`[ChasePDFParser] PDF text length: ${pdfData.text.length}`);
      const text = pdfData.text;
      const accountInfo = this.extractAccountInfo(text);
      console.log(`[ChasePDFParser] Extracted accountInfo:`, accountInfo);
      const transactions = await this.extractTransactions(text, accountInfo, userId, companyId, companyName);
      console.log(`[ChasePDFParser] Extracted transactions:`, {
        type: typeof transactions,
        length: Array.isArray(transactions) ? transactions.length : 'N/A',
        sample: Array.isArray(transactions) ? transactions.slice(0, 2) : transactions
      });
      return {
        success: true,
        accountInfo,
        transactions,
        summary: this.generateSummary(transactions)
      };
    } catch (error) {
      console.error(`[ChasePDFParser] Error parsing PDF:`, error);
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
    const companyInfo = extractCompanyInfo(text);

    return {
      accountNumber: accountMatch ? accountMatch[1] : null,
      statementPeriod: statementPeriod,
      beginningBalance: beginningMatch ? parseFloat(beginningMatch[1].replace(/,/g, '')) : null,
      endingBalance: endingMatch ? parseFloat(endingMatch[1].replace(/,/g, '')) : null,
      companyInfo
    };
  }

  /**
   * Extracts transactions from PDF text, applying user rules via userId.
   * @param {string} text
   * @param {object} accountInfo
   * @param {string} userId
   * @returns {Promise<Array>} transactions
   */
  async extractTransactions(text, accountInfo, userId, companyId = '', companyName = '') {
    const transactions = [];

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

    // Extract different types of transactions (section-based)
    const deposits = await this.extractDeposits(text, statementYear, userId, companyId, companyName);
    const checks = await this.extractChecks(text, statementYear, userId, companyId, companyName);
    const cardTransactions = await this.extractCardTransactions(text, statementYear, userId, companyId, companyName);
    const electronicTransactions = await this.extractElectronicTransactions(text, statementYear, userId, companyId, companyName);

    transactions.push(...deposits, ...checks, ...cardTransactions, ...electronicTransactions);

    // Fallback: line-by-line extraction if total is suspiciously low (< 25)
    if (transactions.length < 25) {
      const fallbackTxs = await this.extractTransactionsLineByLine(text, statementYear, userId, companyId, companyName);
      // Only add transactions not already present (by date, amount, description)
      for (const tx of fallbackTxs) {
        if (!transactions.some(t => t.date === tx.date && t.amount === tx.amount && t.description === tx.description)) {
          transactions.push(tx);
        }
      }
    }

    // Sort transactions by date (dates are already in ISO format with T12:00:00)
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  // Fallback: line-by-line extraction logic from improvedChasePDFParser.js
  async extractTransactionsLineByLine(text, year, userId, companyId = '', companyName = '') {
    const transactions = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Deposits: 01/08Remote Online Deposit 1$3,640.00 or 01/08Remote Online Deposit 1100.00
      // Transaction ID is only matched if separated by a space
      const depositMatch = line.match(/^([0-9]{2}\/[0-9]{2})Remote Online Deposit(?:\s(\d+))?\s*\$?([\d,]+\.?\d{2})$/);
      if (depositMatch) {
        const transaction = await createTransaction(
          depositMatch[1],
          'Remote Online Deposit',
          depositMatch[3],
          'income',
          year,
          userId,
          companyId,
          companyName
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
        const transaction = await createTransaction(
          cardMatch[1],
          cardMatch[2].trim(),
          cardMatch[3],
          'expense',
          year,
          userId,
          companyId,
          companyName
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
          const transaction = await createTransaction(
            electronicMatch[1],
            `Electronic Payment: ${description}`,
            amount,
            'expense',
            year,
            userId,
            companyId,
            companyName
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
        const transaction = await createTransaction(
          checkMatch[1],
          `Check #${checkMatch[2]}`,
          checkMatch[3],
          'expense',
          year,
          userId,
          companyId,
          companyName
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
    return parseTransactionLine(line, year);
  }

  classifyTransaction(description, type) {
    if (typeof description !== 'string') return IRS_CATEGORIES.UNCATEGORIZED;
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
    // Check transactions from PDFs don't contain payee information
    // Bank statements only show check numbers, not who they were paid to
    if (/^check\s*#?\d+$/i.test(description.trim())) {
      return null; // No payee information available in PDF
    }
    
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
    
    // Return null if we don't have meaningful payee information
    if (!payee || payee === 'Unknown Payee') {
      return null;
    }
    
    return payee;
  }

  generateSummary(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      transactionCount: transactions.length,
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

  /**
   * Asynchronously extract deposit transactions and apply user rule-based classification.
   */
  async extractDeposits(text, year, userId, companyId = '', companyName = '') {
    const sectionText = ChaseSectionExtractor.extractDepositsSection(text);
    const deposits = [];
    let depositLines = [];
    if (sectionText) {
      depositLines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
      for (let idx = 0; idx < depositLines.length; idx++) {
        const line = depositLines[idx];
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        const txRaw = ChaseTransactionParser.parseDepositLine(line, year);
        if (txRaw) {
          // Use our async createTransaction to apply user rules
          const tx = await createTransaction(
            txRaw.date ? txRaw.date.split('T')[0].slice(5) : '', // MM/DD from ISO
            txRaw.description || '',
            txRaw.amount != null ? txRaw.amount.toString() : '',
            'income',
            year,
            userId,
            companyId,
            companyName
          );
          if (tx) {
            tx.section = 'DEPOSITS AND ADDITIONS';
            tx.sectionCode = 'deposits';
            deposits.push(tx);
          }
        }
      }
    }
    // ...existing code...
    return deposits;
  }

  /**
   * Asynchronously extract check transactions and apply user rule-based classification.
   */
  async extractChecks(text, year, userId, companyId = '', companyName = '') {
    const sectionText = ChaseSectionExtractor.extractChecksSection(text);
    const checks = [];
    if (sectionText) {
      const lines = sectionText.split('\n');
      for (const line of lines) {
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        const txRaw = ChaseTransactionParser.parseCheckLine ? ChaseTransactionParser.parseCheckLine(line, year) : null;
        if (txRaw) {
          const tx = await createTransaction(
            txRaw.date ? txRaw.date.split('T')[0].slice(5) : '',
            txRaw.description || '',
            txRaw.amount != null ? txRaw.amount.toString() : '',
            'expense',
            year,
            userId,
            companyId,
            companyName
          );
          if (tx) {
            tx.section = 'CHECKS PAID';
            tx.sectionCode = 'checks';
            checks.push(tx);
          }
        }
      }
    }
    // ...existing code...
    return checks;
  }

  /**
   * Asynchronously extract card transactions and apply user rule-based classification.
   */
  async extractCardTransactions(text, year, userId, companyId = '', companyName = '') {
    const sectionText = ChaseSectionExtractor.extractCardSection(text);
    const cardTransactions = [];
    if (sectionText) {
      const lines = sectionText.split('\n');
      for (const line of lines) {
        if (line.includes('DATE') || line.includes('DESCRIPTION') || line.includes('Total')) continue;
        const txRaw = ChaseTransactionParser.parseCardLine ? ChaseTransactionParser.parseCardLine(line, year) : null;
        if (txRaw) {
          const tx = await createTransaction(
            txRaw.date ? txRaw.date.split('T')[0].slice(5) : '',
            txRaw.description || '',
            txRaw.amount != null ? txRaw.amount.toString() : '',
            'expense',
            year,
            userId,
            companyId,
            companyName
          );
          if (tx) {
            tx.section = 'ATM & DEBIT CARD WITHDRAWALS';
            tx.sectionCode = 'card';
            cardTransactions.push(tx);
          }
        }
      }
    }
    // ...existing code...
    return cardTransactions;
  }

  /**
   * Asynchronously extract electronic transactions and apply user rule-based classification.
   */
  async extractElectronicTransactions(text, year, userId, companyId = '', companyName = '') {
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
          let companyNameVal = dateCompanyMatch[2].trim();

          // Clean up company name (remove extra info)
          companyNameVal = companyNameVal.replace(/\s+ID:.*$/, '').trim();

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
            const tx = await createTransaction(
              dateStr,
              `Electronic Payment: ${companyNameVal}`,
              amount.toString(),
              'expense',
              year,
              userId,
              companyId,
              companyName
            );
            if (tx) {
              tx.section = 'ELECTRONIC WITHDRAWALS';
              tx.sectionCode = 'electronic';
              electronicTransactions.push(tx);
            }
          }
        }
      }
    }
    // ...existing code...
    return electronicTransactions;
  }

  /**
   * Asynchronously creates a transaction object, applying user rule-based classification.
   * @param {string} dateStr - MM/DD format
   * @param {string} description
   * @param {string} amountStr
   * @param {string} type - 'income' or 'expense'
   * @param {number} year
   * @param {string} userId
   * @returns {Promise<Object|null>} Transaction object or null if invalid
   */
  async createTransaction(dateStr, description, amountStr, type, year, userId, companyId = '', companyName = '') {
    return await createTransaction(dateStr, description, amountStr, type, year, userId, companyId, companyName);
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