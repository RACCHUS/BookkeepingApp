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

    // Separate income and expense categories
    const { incomeCategories, expenseCategories } = this.separateCategories(categoryData);

    // Add income section
    if (Object.keys(incomeCategories).length > 0) {
      this.addIncomeCategoriesSection(doc, incomeCategories);
    }

    // Add expense section
    if (Object.keys(expenseCategories).length > 0) {
      this.addExpenseCategoriesSection(doc, expenseCategories);
    }

    // If no categories found at all
    if (Object.keys(incomeCategories).length === 0 && Object.keys(expenseCategories).length === 0) {
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
        categoryData[category] = { total: 0, transactions: [] };
      }
      
      // Use transaction type to determine sign - expenses should be negative
      const amount = transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
      categoryData[category].total += amount;
      categoryData[category].transactions.push(transaction);
    });

    return categoryData;
  }

  separateCategories(categoryData) {
    const incomeCategories = {};
    const expenseCategories = {};

    Object.entries(categoryData).forEach(([category, data]) => {
      if (data.total > 0) {
        incomeCategories[category] = data;
      } else {
        expenseCategories[category] = data;
      }
    });

    return { incomeCategories, expenseCategories };
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
  }
}

export default CategoryBreakdownReport;
