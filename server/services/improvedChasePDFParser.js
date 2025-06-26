import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

class ImprovedChasePDFParser {
  constructor() {
    this.payeeClassification = {
      // Office & Business Expenses
      'HOME DEPOT': 'Office Expenses',
      'LOWE': 'Office Expenses',
      'STAPLES': 'Office Expenses',
      'OFFICE DEPOT': 'Office Expenses',
      
      // Vehicle & Transportation
      'CHEVRON': 'Car and Truck Expenses',
      'EXXON': 'Car and Truck Expenses',
      'SUNSHINE': 'Car and Truck Expenses',
      'PETROLEUM': 'Car and Truck Expenses',
      'GOLDENROD': 'Car and Truck Expenses',
      
      // Professional Services
      'SUNBIZ': 'Legal and Professional Services',
      'LIPTON TOYOTA': 'Car and Truck Expenses',
      'WESTAR': 'Utilities',
      
      // Insurance
      'GEICO': 'Insurance',
      
      // Business Income
      'REMOTE ONLINE DEPOSIT': 'Business Income',
      'DEPOSIT': 'Business Income'
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
      
      // Extract transactions using the actual format
      const transactions = this.extractTransactionsImproved(text, accountInfo);
      console.log(`📊 Found ${transactions.length} transactions`);
      
      return {
        success: true,
        accountInfo,
        transactions,
        summary: this.generateSummary(transactions),
        debug: {
          textLength: text.length,
          transactionCount: transactions.length
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
    // Extract account number
    const accountMatch = text.match(/Account Number: (\d+)/);
    
    // Extract statement period
    const periodMatch = text.match(/(\w+ \d{1,2}, \d{4}) through (\w+ \d{1,2}, \d{4})/);
    
    // Extract balances
    const beginningMatch = text.match(/Beginning Balance\$?([\d,]+\.?\d{2})/);
    const endingMatch = text.match(/Ending Balance\d*\$?([\d,]+\.?\d{2})/);

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

  extractTransactionsImproved(text, accountInfo) {
    const transactions = [];
    const currentYear = 2024; // Extract from statement period if needed
    
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // 1. Parse Deposits: 01/08Remote Online Deposit 1$3,640.00
      const depositMatch = line.match(/^(\d{2}\/\d{2})Remote Online Deposit \d+\$?([\d,]+\.?\d{2})$/);
      if (depositMatch) {
        const transaction = this.createTransactionImproved(
          depositMatch[1], 
          'Remote Online Deposit', 
          depositMatch[2], 
          'income', 
          currentYear
        );
        if (transaction) transactions.push(transaction);
        continue;
      }
      
      // 2. Parse Card Purchases: 01/02Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819$38.80
      const cardMatch = line.match(/^(\d{2}\/\d{2})Card Purchase(?: With Pin)?(?: \d{2}\/\d{2})?\s+(.+?)\s+Card \d+\$?([\d,]+\.?\d{2})$/);
      if (cardMatch) {
        const transaction = this.createTransactionImproved(
          cardMatch[1], 
          cardMatch[3].trim(), 
          cardMatch[4], 
          'expense', 
          currentYear
        );
        if (transaction) transactions.push(transaction);
        continue;
      }
      
      // 3. Parse Electronic Withdrawals (multi-line): 01/11Orig CO Name:Home Depot...
      const electronicMatch = line.match(/^(\d{2}\/\d{2})Orig CO Name:(.+?)(?:Orig ID|$)/);
      if (electronicMatch) {
        // Look for amount in next few lines
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
          const transaction = this.createTransactionImproved(
            electronicMatch[1], 
            `Electronic Payment: ${description}`, 
            amount, 
            'expense', 
            currentYear
          );
          if (transaction) transactions.push(transaction);
        }
        continue;
      }
      
      // 4. Parse Checks - if format is different, add here
      const checkMatch = line.match(/^(\d{2}\/\d{2}).*CHECK.*\#?(\d+).*\$?([\d,]+\.?\d{2})$/i);
      if (checkMatch) {
        const transaction = this.createTransactionImproved(
          checkMatch[1], 
          `Check #${checkMatch[2]}`, 
          checkMatch[3], 
          'expense', 
          currentYear
        );
        if (transaction) transactions.push(transaction);
        continue;
      }
    }
    
    // Sort transactions by date
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  createTransactionImproved(dateStr, description, amountStr, type, year) {
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
        source: 'chase_pdf_improved',
        needsReview: category === 'Uncategorized'
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
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
      return 'Business Income';
    } else {
      // Expense classification by keywords
      if (upperDesc.includes('GAS') || upperDesc.includes('FUEL')) {
        return 'Car and Truck Expenses';
      }
      if (upperDesc.includes('RESTAURANT') || upperDesc.includes('CAFE') || upperDesc.includes('FOOD')) {
        return 'Meals and Entertainment';
      }
      if (upperDesc.includes('HOTEL') || upperDesc.includes('FLIGHT')) {
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
      .replace(/^(Electronic Payment:\s*)/i, '')
      .replace(/^(Card Purchase\s*)/i, '')
      .replace(/\s+Card \d+.*$/i, '') // Remove card numbers
      .replace(/\s+\d{2}\/\d{2}.*$/i, '') // Remove trailing dates
      .trim();
    
    // Take first meaningful part
    const parts = payee.split(/\s+/);
    if (parts.length > 3) {
      payee = parts.slice(0, 3).join(' ');
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

export default new ImprovedChasePDFParser();
