import { BaseReportGenerator } from './BaseReportGenerator.js';

/**
 * Category Breakdown Report Generator
 * Generates detailed category-focused reports
 */
export class CategoryBreakdownReport extends BaseReportGenerator {
  
  async generate(transactions, summary, options = {}) {
    const {
      title = 'Category Breakdown Report',
      dateRange = null,
      userId = 'user'
    } = options;

    const fileName = `category-breakdown-${userId}-${Date.now()}.pdf`;

    return this.generatePDF({
      fileName,
      title,
      dateRange,
      transactions,
      summary
    });
  }

  addReportContent(doc, transactions, summary, options = {}) {
    // Always add category breakdown - build from transactions directly
    this.addDetailedCategoryBreakdown(doc, summary.categoryBreakdown, transactions);
  }

  addDetailedCategoryBreakdown(doc, categoryBreakdown, transactions) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Detailed Category Breakdown', { underline: true });

    doc.moveDown(0.5);

    // Always build category data from transactions directly (more reliable)
    const categoryData = this.buildCategoryData(transactions);

    console.log('📊 Building category breakdown from transactions:', transactions.length);
    console.log('📊 Category data built:', Object.keys(categoryData));

    // Check if we have any category data after building from transactions
    if (!categoryData || Object.keys(categoryData).length === 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('No transactions found for the selected period.', 70);
      doc.moveDown(1);
      return;
    }

    // Separate income, expense, and transfer categories
    const { incomeCategories, expenseCategories, transferCategories } = this.separateCategories(categoryData);

    // Add income section
    if (Object.keys(incomeCategories).length > 0) {
      this.addIncomeCategoriesSection(doc, incomeCategories);
    }

    // Add expense section
    if (Object.keys(expenseCategories).length > 0) {
      this.addExpenseCategoriesSection(doc, expenseCategories);
    }
    
    // Add transfers section (neutral transactions)
    if (transferCategories && Object.keys(transferCategories).length > 0) {
      this.addTransferCategoriesSection(doc, transferCategories);
    }

    // If no categories found at all
    if (Object.keys(incomeCategories).length === 0 && Object.keys(expenseCategories).length === 0 && (!transferCategories || Object.keys(transferCategories).length === 0)) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('No categorized transactions found.', 70);
    }

    doc.moveDown(1);
  }

  buildCategoryData(transactions) {
    const categoryData = {};
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = { total: 0, income: 0, expenses: 0, transfers: 0, transactions: [] };
      }
      
      const amount = Math.abs(parseFloat(transaction.amount) || 0);
      
      // Use transaction type for proper classification
      // Transfers are neutral - tracked separately
      if (transaction.type === 'transfer') {
        categoryData[category].transfers += amount;
        categoryData[category].total += amount; // For display purposes
      } else if (transaction.type === 'income') {
        categoryData[category].income += amount;
        categoryData[category].total += amount;
      } else {
        // Expense type - use negative for total to maintain sorting
        categoryData[category].expenses += amount;
        categoryData[category].total -= amount;
      }
      categoryData[category].transactions.push(transaction);
    });

    return categoryData;
  }

  separateCategories(categoryData) {
    const incomeCategories = {};
    const expenseCategories = {};
    const transferCategories = {};

    Object.entries(categoryData).forEach(([category, data]) => {
      // Categorize based on which type has the most activity
      if (data.transfers > 0 && data.income === 0 && data.expenses === 0) {
        transferCategories[category] = data;
      } else if (data.total > 0 || (data.income > 0 && data.income >= data.expenses)) {
        incomeCategories[category] = data;
      } else {
        expenseCategories[category] = data;
      }
    });

    return { incomeCategories, expenseCategories, transferCategories };
  }

  addIncomeCategoriesSection(doc, incomeCategories) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#059669')
       .text('Income Categories', { underline: true });
    
    doc.fillColor('black').moveDown(0.3);

    const sortedIncome = Object.entries(incomeCategories)
      .sort(([,a], [,b]) => b.total - a.total);

    sortedIncome.forEach(([category, data]) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });

      doc.fillColor('#059669')
         .font('Helvetica-Bold')
         .text(`+$${data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: 'right' });

      doc.fillColor('black')
         .font('Helvetica')
         .text(`(${data.transactions.length} transactions)`, 70, doc.y, { width: 400 });
      
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
  }

  addExpenseCategoriesSection(doc, expenseCategories) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#DC2626')
       .text('Expense Categories', { underline: true });
    
    doc.fillColor('black').moveDown(0.3);

    const sortedExpenses = Object.entries(expenseCategories)
      .sort(([,a], [,b]) => a.total - b.total); // Sort by most negative first

    sortedExpenses.forEach(([category, data]) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });

      doc.fillColor('#DC2626')
         .font('Helvetica-Bold')
         .text(`-$${Math.abs(data.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: 'right' });

      doc.fillColor('black')
         .font('Helvetica')
         .text(`(${data.transactions.length} transactions)`, 70, doc.y, { width: 400 });
      
      doc.moveDown(0.3);
    });
    
    doc.moveDown(0.5);
  }

  addTransferCategoriesSection(doc, transferCategories) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2563EB')
       .text('Transfer Categories (Neutral)', { underline: true });
    
    doc.fillColor('black').moveDown(0.3);
    
    doc.fontSize(9)
       .font('Helvetica-Oblique')
       .fillColor('#6B7280')
       .text('Note: Transfer transactions do not affect income/expense totals or tax calculations.');
    doc.fillColor('black').moveDown(0.3);

    const sortedTransfers = Object.entries(transferCategories)
      .sort(([,a], [,b]) => Math.abs(b.transfers) - Math.abs(a.transfers));

    sortedTransfers.forEach(([category, data]) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(category, 70, doc.y, { continued: true, width: 300 });

      doc.fillColor('#2563EB')
         .font('Helvetica-Bold')
         .text(`↔$${Math.abs(data.transfers).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: 'right' });

      doc.fillColor('black')
         .font('Helvetica')
         .text(`(${data.transactions.length} transactions)`, 70, doc.y, { width: 400 });
      
      doc.moveDown(0.3);
    });
  }
}

export default CategoryBreakdownReport;
