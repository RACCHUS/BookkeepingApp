import PDFDocument from 'pdfkit';

class ReportGenerator {
  constructor() {
    this.pageMargin = 50;
    this.fontSize = {
      title: 18,
      heading: 14,
      subheading: 12,
      body: 10,
      small: 8
    };
    this.colors = {
      primary: '#2563eb',
      secondary: '#64748b',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      light: '#f8fafc',
      dark: '#1e293b'
    };
  }

  async generateProfitLossPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.pageMargin
        });

        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Header
        this.addHeader(doc, 'Profit & Loss Statement');
        this.addSubheader(doc, `Period: ${reportData.period.startDate} to ${reportData.period.endDate}`);

        // Summary section
        doc.moveDown(2);
        this.addSection(doc, 'Financial Summary');
        
        const summaryData = [
          ['Gross Income', this.formatCurrency(reportData.summary.grossIncome)],
          ['Total Expenses', this.formatCurrency(reportData.summary.totalExpenses)],
          ['Net Income', this.formatCurrency(reportData.summary.netIncome)],
          ['Profit Margin', `${reportData.summary.margin.toFixed(2)}%`]
        ];

        this.addTable(doc, summaryData, { 
          headerBackground: this.colors.primary,
          alternatingRows: true 
        });

        // Income breakdown
        if (reportData.income.breakdown.length > 0) {
          doc.moveDown(2);
          this.addSection(doc, 'Income Breakdown');
          
          const incomeData = reportData.income.breakdown.map(item => [
            item.category,
            this.formatCurrency(item.amount)
          ]);

          this.addTable(doc, incomeData);
        }

        // Expense breakdown
        if (reportData.expenses.breakdown.length > 0) {
          doc.moveDown(2);
          this.addSection(doc, 'Expense Breakdown');
          
          const expenseData = reportData.expenses.breakdown.map(item => [
            item.category,
            this.formatCurrency(item.amount)
          ]);

          this.addTable(doc, expenseData);
        }

        // Footer
        this.addFooter(doc, reportData.generatedAt);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  async generateExpenseSummaryPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.pageMargin
        });

        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Header
        this.addHeader(doc, 'Expense Summary Report');
        this.addSubheader(doc, `Period: ${reportData.period.startDate} to ${reportData.period.endDate}`);

        // Summary section
        doc.moveDown(2);
        this.addSection(doc, 'Summary');
        
        const summaryData = [
          ['Total Expenses', this.formatCurrency(reportData.summary.totalExpenses)],
          ['Total Transactions', reportData.summary.totalTransactions.toString()],
          ['Average Transaction', this.formatCurrency(reportData.summary.averageTransaction)]
        ];

        this.addTable(doc, summaryData);

        // Category breakdown
        doc.moveDown(2);
        this.addSection(doc, 'Expenses by Category');
        
        const categoryData = reportData.categories.map(item => [
          item.category,
          this.formatCurrency(item.amount),
          `${item.percentage.toFixed(1)}%`,
          item.transactionCount.toString()
        ]);

        this.addTable(doc, categoryData, {
          headers: ['Category', 'Amount', 'Percentage', 'Transactions']
        });

        // Footer
        this.addFooter(doc, reportData.generatedAt);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  async generateEmployeeSummaryPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.pageMargin
        });

        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Header
        this.addHeader(doc, 'Employee Summary Report');
        this.addSubheader(doc, `Period: ${reportData.period.startDate} to ${reportData.period.endDate}`);

        // Summary section
        doc.moveDown(2);
        this.addSection(doc, 'Summary');
        
        const summaryData = [
          ['Total Employees', reportData.summary.totalEmployees.toString()],
          ['Total Wages', this.formatCurrency(reportData.summary.totalWages)],
          ['Total Benefits', this.formatCurrency(reportData.summary.totalBenefits)],
          ['Total Employee Costs', this.formatCurrency(reportData.summary.totalEmployeeCosts)]
        ];

        this.addTable(doc, summaryData);

        // Employee details
        if (reportData.employees.length > 0) {
          doc.moveDown(2);
          this.addSection(doc, 'Employee Details');
          
          const employeeData = reportData.employees.map(emp => [
            `${emp.employee.firstName} ${emp.employee.lastName}`,
            this.formatCurrency(emp.wages),
            this.formatCurrency(emp.benefits),
            this.formatCurrency(emp.totalCost)
          ]);

          this.addTable(doc, employeeData, {
            headers: ['Employee', 'Wages', 'Benefits', 'Total Cost']
          });
        }

        // Footer
        this.addFooter(doc, reportData.generatedAt);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  async generateTaxSummaryPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.pageMargin
        });

        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Header
        this.addHeader(doc, `Tax Summary Report - ${reportData.taxYear}`);
        this.addSubheader(doc, `Period: ${reportData.period.startDate} to ${reportData.period.endDate}`);

        // Summary section
        doc.moveDown(2);
        this.addSection(doc, 'Tax Summary');
        
        const summaryData = [
          ['Total Deductible Expenses', this.formatCurrency(reportData.summary.totalDeductibleExpenses)],
          ['Total Transactions', reportData.summary.totalTransactions.toString()]
        ];

        this.addTable(doc, summaryData);

        // Quarterly breakdown
        doc.moveDown(2);
        this.addSection(doc, 'Quarterly Breakdown');
        
        const quarterlyData = Object.entries(reportData.summary.quarterlyBreakdown).map(([quarter, amount]) => [
          quarter,
          this.formatCurrency(amount)
        ]);

        this.addTable(doc, quarterlyData);

        // Schedule C categories
        doc.moveDown(2);
        this.addSection(doc, 'Schedule C Categories');
        
        const scheduleCData = reportData.scheduleC.map(item => [
          item.category,
          this.formatCurrency(item.amount),
          item.transactionCount.toString()
        ]);

        this.addTable(doc, scheduleCData, {
          headers: ['Category', 'Amount', 'Transactions']
        });

        // Footer
        this.addFooter(doc, reportData.generatedAt);

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper methods for PDF generation
  addHeader(doc, title) {
    doc.fontSize(this.fontSize.title)
       .fillColor(this.colors.primary)
       .text(title, this.pageMargin, this.pageMargin, { align: 'center' });
  }

  addSubheader(doc, subtitle) {
    doc.fontSize(this.fontSize.subheading)
       .fillColor(this.colors.secondary)
       .text(subtitle, { align: 'center' });
  }

  addSection(doc, sectionTitle) {
    doc.fontSize(this.fontSize.heading)
       .fillColor(this.colors.dark)
       .text(sectionTitle);
  }

  addTable(doc, data, options = {}) {
    const { headers, headerBackground, alternatingRows } = options;
    const startX = this.pageMargin;
    let currentY = doc.y + 10;
    const columnWidth = (doc.page.width - 2 * this.pageMargin) / (data[0]?.length || 2);
    const rowHeight = 25;

    // Add headers if provided
    if (headers) {
      doc.fontSize(this.fontSize.body)
         .fillColor('white');
      
      if (headerBackground) {
        doc.rect(startX, currentY, doc.page.width - 2 * this.pageMargin, rowHeight)
           .fill(headerBackground);
      }

      headers.forEach((header, index) => {
        doc.text(header, startX + index * columnWidth + 5, currentY + 5, {
          width: columnWidth - 10,
          height: rowHeight - 10
        });
      });
      
      currentY += rowHeight;
    }

    // Add data rows
    data.forEach((row, rowIndex) => {
      const isEvenRow = rowIndex % 2 === 0;
      
      if (alternatingRows && isEvenRow) {
        doc.rect(startX, currentY, doc.page.width - 2 * this.pageMargin, rowHeight)
           .fill(this.colors.light);
      }

      doc.fontSize(this.fontSize.body)
         .fillColor(this.colors.dark);

      row.forEach((cell, cellIndex) => {
        doc.text(cell.toString(), startX + cellIndex * columnWidth + 5, currentY + 5, {
          width: columnWidth - 10,
          height: rowHeight - 10
        });
      });

      currentY += rowHeight;
    });

    doc.y = currentY + 10;
  }

  addFooter(doc, generatedAt) {
    const footerY = doc.page.height - this.pageMargin - 20;
    
    doc.fontSize(this.fontSize.small)
       .fillColor(this.colors.secondary)
       .text(`Generated on ${new Date(generatedAt).toLocaleString()}`, this.pageMargin, footerY, {
         align: 'center'
       });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

export default new ReportGenerator();
