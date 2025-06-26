const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

// Simplified test version of the improved parser
class ImprovedChasePDFParser {
  constructor() {
    this.payeeClassification = {
      'HOME DEPOT': 'Office Expenses',
      'LOWE': 'Office Expenses',
      'CHEVRON': 'Car and Truck Expenses',
      'EXXON': 'Car and Truck Expenses',
      'SUNSHINE': 'Car and Truck Expenses',
      'PETROLEUM': 'Car and Truck Expenses',
      'GOLDENROD': 'Car and Truck Expenses',
      'SUNBIZ': 'Legal and Professional Services',
      'LIPTON TOYOTA': 'Car and Truck Expenses',
      'WESTAR': 'Utilities',
      'GEICO': 'Insurance',
      'REMOTE ONLINE DEPOSIT': 'Business Income',
      'DEPOSIT': 'Business Income'
    };
  }

  async parsePDF(filePath) {
    try {
      console.log(`📄 Testing improved parser on: ${filePath}`);
      
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      
      const transactions = this.extractTransactionsImproved(text);
      console.log(`📊 Found ${transactions.length} transactions with improved parser`);
      
      return { success: true, transactions };
      
    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      return { success: false, error: error.message, transactions: [] };
    }
  }

  extractTransactionsImproved(text) {
    const transactions = [];
    const currentYear = 2024;
    const lines = text.split('\n');
    
    console.log('\n🎯 Parsing transactions...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 1. Deposits: 01/08Remote Online Deposit 1$3,640.00
      const depositMatch = line.match(/^(\d{2}\/\d{2})Remote Online Deposit \d+\$?([\d,]+\.?\d{2})$/);
      if (depositMatch) {
        const transaction = this.createTransaction(
          depositMatch[1], 'Remote Online Deposit', depositMatch[2], 'income', currentYear
        );
        if (transaction) {
          console.log(`💰 Deposit: ${transaction.date} - $${transaction.amount} - ${transaction.description}`);
          transactions.push(transaction);
        }
        continue;
      }
      
      // 2. Card Purchases: 01/02Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819$38.80
      const cardMatch = line.match(/^(\d{2}\/\d{2})Card Purchase(?: With Pin)?(?: \d{2}\/\d{2})?\s+(.+?)\s+Card \d+([\d,]+\.?\d{2})$/);
      if (cardMatch) {
        const transaction = this.createTransaction(
          cardMatch[1], cardMatch[3].trim(), cardMatch[4], 'expense', currentYear
        );
        if (transaction) {
          console.log(`💳 Card: ${transaction.date} - $${transaction.amount} - ${transaction.description}`);
          transactions.push(transaction);
        }
        continue;
      }
      
      // 3. Electronic Withdrawals: 01/11Orig CO Name:Home Depot...
      const electronicMatch = line.match(/^(\d{2}\/\d{2})Orig CO Name:(.+?)(?:Orig ID|$)/);
      if (electronicMatch) {
        let amount = null;
        let description = electronicMatch[2].trim();
        
        // Look for amount in next few lines
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
            electronicMatch[1], `Electronic Payment: ${description}`, amount, 'expense', currentYear
          );
          if (transaction) {
            console.log(`⚡ Electronic: ${transaction.date} - $${transaction.amount} - ${transaction.description}`);
            transactions.push(transaction);
          }
        }
        continue;
      }
    }
    
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  createTransaction(dateStr, description, amountStr, type, year) {
    try {
      const dateParts = dateStr.split('/');
      const month = parseInt(dateParts[0]);
      const day = parseInt(dateParts[1]);
      
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      
      if (isNaN(amount) || amount <= 0 || amount > 1000000) return null;
      
      const cleanDescription = description.replace(/\s+/g, ' ').trim();
      const category = this.classifyTransaction(cleanDescription, type);
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
    
    for (const [keyword, category] of Object.entries(this.payeeClassification)) {
      if (upperDesc.includes(keyword)) {
        return category;
      }
    }
    
    if (type === 'income') return 'Business Income';
    
    if (upperDesc.includes('GAS') || upperDesc.includes('FUEL')) return 'Car and Truck Expenses';
    if (upperDesc.includes('RESTAURANT') || upperDesc.includes('CAFE')) return 'Meals and Entertainment';
    if (upperDesc.includes('HOTEL') || upperDesc.includes('FLIGHT')) return 'Travel';
    if (upperDesc.includes('OFFICE') || upperDesc.includes('SUPPLY')) return 'Office Expenses';
    
    return 'Uncategorized';
  }

  extractPayee(description) {
    let payee = description
      .replace(/^(Electronic Payment:\s*)/i, '')
      .replace(/^(Card Purchase\s*)/i, '')
      .replace(/\s+Card \d+.*$/i, '')
      .replace(/\s+\d{2}\/\d{2}.*$/i, '')
      .trim();
    
    const parts = payee.split(/\s+/);
    if (parts.length > 3) {
      payee = parts.slice(0, 3).join(' ');
    }
    
    return payee.substring(0, 50).trim() || 'Unknown Payee';
  }
}

// Test the parser
async function testImprovedParser() {
  const parser = new ImprovedChasePDFParser();
  const result = await parser.parsePDF('../chasepdf.pdf');
  
  if (result.success) {
    console.log('\n✅ Improved parser results:');
    console.log(`Found ${result.transactions.length} transactions`);
    
    const summary = {
      income: result.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expenses: result.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    };
    
    console.log(`💰 Total Income: $${summary.income.toFixed(2)}`);
    console.log(`💸 Total Expenses: $${summary.expenses.toFixed(2)}`);
    console.log(`📊 Net: $${(summary.income - summary.expenses).toFixed(2)}`);
    
    console.log('\n📋 Transaction Categories:');
    const categories = {};
    result.transactions.forEach(t => {
      if (!categories[t.category]) categories[t.category] = { count: 0, total: 0 };
      categories[t.category].count++;
      categories[t.category].total += t.amount;
    });
    
    Object.entries(categories).forEach(([cat, data]) => {
      console.log(`${cat}: ${data.count} transactions, $${data.total.toFixed(2)}`);
    });
    
  } else {
    console.log('❌ Parser failed:', result.error);
  }
}

testImprovedParser();
