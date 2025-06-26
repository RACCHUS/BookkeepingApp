import fs from 'fs/promises';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.js';

class PDFJSChasePDFParser {
  constructor() {
    // Initialize PDF.js worker
    this.initWorker();
    
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

    // Enhanced payee classification for IRS categories
    this.payeeClassification = {
      // Office & Business Expenses
      'AMAZON': 'Office Expenses',
      'STAPLES': 'Office Expenses',
      'OFFICE DEPOT': 'Office Expenses',
      'BEST BUY': 'Office Expenses',
      'MICROSOFT': 'Office Expenses',
      'ADOBE': 'Office Expenses',
      'GOOGLE': 'Office Expenses',
      'DROPBOX': 'Office Expenses',
      
      // Vehicle & Transportation
      'SHELL': 'Car and Truck Expenses',
      'EXXON': 'Car and Truck Expenses',
      'MOBIL': 'Car and Truck Expenses',
      'CHEVRON': 'Car and Truck Expenses',
      'BP': 'Car and Truck Expenses',
      'TEXACO': 'Car and Truck Expenses',
      'UBER': 'Travel',
      'LYFT': 'Travel',
      'ENTERPRISE': 'Travel',
      'HERTZ': 'Travel',
      
      // Travel & Meals
      'HOTEL': 'Travel',
      'MARRIOTT': 'Travel',
      'HILTON': 'Travel',
      'AMERICAN AIRLINES': 'Travel',
      'DELTA': 'Travel',
      'SOUTHWEST': 'Travel',
      'UNITED': 'Travel',
      'RESTAURANT': 'Meals and Entertainment',
      'MCDONALD': 'Meals and Entertainment',
      'STARBUCKS': 'Meals and Entertainment',
      'SUBWAY': 'Meals and Entertainment',
      'PIZZA': 'Meals and Entertainment',
      
      // Utilities & Communications
      'VERIZON': 'Phone and Internet',
      'AT&T': 'Phone and Internet',
      'COMCAST': 'Phone and Internet',
      'SPECTRUM': 'Phone and Internet',
      'T-MOBILE': 'Phone and Internet',
      'ELECTRIC': 'Utilities',
      'GAS COMPANY': 'Utilities',
      'WATER': 'Utilities',
      
      // Professional Services
      'LAW FIRM': 'Legal and Professional Services',
      'ACCOUNTING': 'Legal and Professional Services',
      'CONSULTANT': 'Legal and Professional Services',
      'ATTORNEY': 'Legal and Professional Services',
      'CPA': 'Legal and Professional Services',
      
      // Banking & Fees
      'OVERDRAFT': 'Bank Service Charges',
      'MAINTENANCE FEE': 'Bank Service Charges',
      'ATM FEE': 'Bank Service Charges',
      'SERVICE CHARGE': 'Bank Service Charges',
      'WIRE FEE': 'Bank Service Charges',
      
      // Insurance
      'INSURANCE': 'Insurance (other than health)',
      'GEICO': 'Insurance (other than health)',
      'STATE FARM': 'Insurance (other than health)',
      'PROGRESSIVE': 'Insurance (other than health)',
      
      // Common business income indicators
      'DEPOSIT': 'Business Income',
      'TRANSFER FROM': 'Business Income',
      'PAYMENT RECEIVED': 'Business Income',
      'ACH CREDIT': 'Business Income',
      'WIRE TRANSFER': 'Business Income'
    };
  }

  initWorker() {
    // For Node.js with legacy build, disable the worker
    GlobalWorkerOptions.workerSrc = null;
  }

  async parsePDF(filePath) {
    try {
      console.log(`📄 Parsing Chase PDF with PDF.js: ${filePath}`);
      
      const dataBuffer = await fs.readFile(filePath);
      
      // Load PDF with PDF.js
      const loadingTask = getDocument({
        data: dataBuffer,
        verbosity: 0 // Reduce console output
      });
      
      const pdf = await loadingTask.promise;
      console.log(`📖 PDF loaded: ${pdf.numPages} pages`);
      
      // Extract text from all pages
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items into readable text
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      console.log(`📖 Extracted ${fullText.length} characters from PDF`);
      
      // Extract account information
      const accountInfo = this.extractAccountInfo(fullText);
      console.log('📋 Account Info:', accountInfo);
      
      // Extract transactions
      const transactions = this.extractTransactions(fullText, accountInfo);
      console.log(`📊 Found ${transactions.length} transactions`);
      
      return {
        success: true,
        accountInfo,
        transactions,
        summary: this.generateSummary(transactions),
        rawText: fullText.substring(0, 2000) + '...' // Truncated for response size
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

    // Remove duplicates and sort by date
    const uniqueTransactions = this.removeDuplicates(transactions);
    return uniqueTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  parseTransactionLine(line, year) {
    // Enhanced pattern for Chase transaction: MM/DD DESCRIPTION AMOUNT
    const patterns = [
      /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-$]?[\d,]+\.?\d{2})\s*$/,
      /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-]?[\d,]+\.?\d{2})$/
    ];
    
    let match = null;
    for (const pattern of patterns) {
      match = line.match(pattern);
      if (match) break;
    }
    
    if (!match) return null;

    const [, dateStr, description, amountStr] = match;
    
    // Parse date
    const dateParts = dateStr.split('/');
    const month = parseInt(dateParts[0]);
    const day = parseInt(dateParts[1]);
    
    // Handle year transition
    let transactionYear = year;
    if (month > 6 && new Date().getMonth() < 6) {
      transactionYear = year - 1;
    }
    
    const fullDate = `${transactionYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Parse amount
    let amount = parseFloat(amountStr.replace(/[$,]/g, ''));
    const isNegative = amountStr.includes('-') || amount < 0;
    amount = Math.abs(amount);
    
    // Skip very small amounts (likely fees or adjustments)
    if (amount < 0.01) return null;
    
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
      source: 'chase_pdf_pdfjs',
      needsReview: category === 'Uncategorized' || payee === 'Unknown Payee'
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
      if (upperDesc.includes('PAYPAL') || upperDesc.includes('VENMO') || upperDesc.includes('ZELLE')) {
        return 'Business Income';
      }
    } else {
      // Enhanced expense classification
      if (upperDesc.includes('GAS') || upperDesc.includes('FUEL') || upperDesc.includes('GASOLINE')) {
        return 'Car and Truck Expenses';
      }
      if (upperDesc.includes('RESTAURANT') || upperDesc.includes('CAFE') || upperDesc.includes('FOOD') || upperDesc.includes('DINING')) {
        return 'Meals and Entertainment';
      }
      if (upperDesc.includes('HOTEL') || upperDesc.includes('AIRBNB') || upperDesc.includes('FLIGHT') || upperDesc.includes('AIRLINE')) {
        return 'Travel';
      }
      if (upperDesc.includes('OFFICE') || upperDesc.includes('SUPPLY') || upperDesc.includes('DEPOT')) {
        return 'Office Expenses';
      }
      if (upperDesc.includes('FEE') || upperDesc.includes('CHARGE') || upperDesc.includes('MAINTENANCE')) {
        return 'Bank Service Charges';
      }
      if (upperDesc.includes('RENT') || upperDesc.includes('LEASE')) {
        return 'Rent or Lease (Other Business Property)';
      }
      if (upperDesc.includes('TAX') || upperDesc.includes('LICENSE')) {
        return 'Taxes and Licenses';
      }
    }
    
    return 'Uncategorized';
  }

  extractPayee(description) {
    // Remove common transaction prefixes/suffixes
    let payee = description
      .replace(/^(DEBIT|CREDIT|CHECK|DEPOSIT|WITHDRAWAL|ACH|ONLINE)\s+/i, '')
      .replace(/\s+(DEBIT|CREDIT|DEPOSIT|WITHDRAWAL|ACH|ONLINE)$/i, '')
      .replace(/^#?\d+\s+/, '') // Remove check numbers
      .replace(/\s+\d{2}\/\d{2}$/, '') // Remove trailing dates
      .replace(/\s+\d{4}$/, '') // Remove trailing years
      .trim();
    
    // Take first part before common separators
    const separators = [' - ', ' / ', ' * ', '  ', ' # '];
    for (const sep of separators) {
      if (payee.includes(sep)) {
        payee = payee.split(sep)[0].trim();
        break;
      }
    }
    
    // Clean up common suffixes
    payee = payee
      .replace(/\s+(INC|LLC|CORP|LTD|CO)$/i, '')
      .replace(/\s+\d+$/, '') // Remove trailing numbers
      .trim();
    
    // Limit length and clean up
    payee = payee.substring(0, 50).trim();
    
    return payee || 'Unknown Payee';
  }

  removeDuplicates(transactions) {
    const seen = new Set();
    return transactions.filter(transaction => {
      const key = `${transaction.date}-${transaction.amount}-${transaction.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  generateSummary(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      categorySummary: {},
      needsReview: 0,
      monthlyBreakdown: {}
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

      // Monthly breakdown
      const month = transaction.date.substring(0, 7); // YYYY-MM
      if (!summary.monthlyBreakdown[month]) {
        summary.monthlyBreakdown[month] = {
          income: 0,
          expenses: 0,
          net: 0
        };
      }
      if (transaction.type === 'income') {
        summary.monthlyBreakdown[month].income += transaction.amount;
      } else {
        summary.monthlyBreakdown[month].expenses += transaction.amount;
      }
      summary.monthlyBreakdown[month].net = summary.monthlyBreakdown[month].income - summary.monthlyBreakdown[month].expenses;
    });

    summary.netIncome = summary.totalIncome - summary.totalExpenses;
    
    return summary;
  }
}

export default new PDFJSChasePDFParser();
