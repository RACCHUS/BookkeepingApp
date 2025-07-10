import { validationResult } from 'express-validator';
import firebaseService from '../services/cleanFirebaseService.js';
import reportGenerator from '../services/reportGenerator.js';
import reportService from '../services/reportService.js';
import { CATEGORY_GROUPS, IRS_CATEGORIES } from '../../shared/constants/categories.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateProfitLossReport = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, format = 'json' } = req.query;

    const summary = await firebaseService.getTransactionSummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    const report = {
      type: 'profit_loss',
      period: {
        startDate,
        endDate
      },
      summary: {
        grossIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netIncome: summary.netIncome,
        margin: summary.totalIncome > 0 ? (summary.netIncome / summary.totalIncome) * 100 : 0
      },
      income: {
        total: summary.totalIncome,
        breakdown: Object.entries(summary.categorySummary)
          .filter(([category]) => CATEGORY_GROUPS.INCOME.includes(category))
          .map(([category, amount]) => ({ category, amount }))
      },
      expenses: {
        total: summary.totalExpenses,
        breakdown: Object.entries(summary.categorySummary)
          .filter(([category]) => !CATEGORY_GROUPS.INCOME.includes(category))
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
      },
      generatedAt: new Date().toISOString()
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generateProfitLossPDF(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="profit-loss-${startDate}-${endDate}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Profit/Loss report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
};

export const generateExpenseSummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, format = 'json' } = req.query;

    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: 'expense'
    });

    // Group expenses by category
    const categoryTotals = {};
    const monthlyTrends = {};
    
    transactions.forEach(transaction => {
      const category = transaction.category;
      const month = transaction.date.toISOString().substring(0, 7); // YYYY-MM
      const amount = Math.abs(transaction.amount);

      // Category totals
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;

      // Monthly trends
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {};
      }
      monthlyTrends[month][category] = (monthlyTrends[month][category] || 0) + amount;
    });

    const report = {
      type: 'expense_summary',
      period: {
        startDate,
        endDate
      },
      summary: {
        totalExpenses: Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0),
        totalTransactions: transactions.length,
        averageTransaction: transactions.length > 0 ? 
          Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0) / transactions.length : 0
      },
      categories: Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / Object.values(categoryTotals).reduce((sum, a) => sum + a, 0)) * 100,
          transactionCount: transactions.filter(t => t.category === category).length
        }))
        .sort((a, b) => b.amount - a.amount),
      monthlyTrends,
      generatedAt: new Date().toISOString()
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generateExpenseSummaryPDF(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="expense-summary-${startDate}-${endDate}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Expense summary report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
};

export const generateEmployeeSummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, format = 'json' } = req.query;

    // Get employee-related transactions
    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    const employeeTransactions = transactions.filter(t => 
      t.employeeId || CATEGORY_GROUPS.EMPLOYEE_COSTS.includes(t.category)
    );

    // Get employee list
    const employees = await firebaseService.getEmployees(userId);

    const employeeSummary = {};
    
    // Initialize employee summaries
    employees.forEach(employee => {
      employeeSummary[employee.id] = {
        employee,
        wages: 0,
        benefits: 0,
        expenses: 0,
        totalCost: 0,
        transactionCount: 0
      };
    });

    // Process transactions
    employeeTransactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      
      if (transaction.employeeId && employeeSummary[transaction.employeeId]) {
        const summary = employeeSummary[transaction.employeeId];
        
        if (transaction.category === IRS_CATEGORIES.EMPLOYEE_WAGES || 
            transaction.category === IRS_CATEGORIES.WAGES) {
          summary.wages += amount;
        } else if (CATEGORY_GROUPS.EMPLOYEE_COSTS.includes(transaction.category)) {
          summary.benefits += amount;
        } else {
          summary.expenses += amount;
        }
        
        summary.totalCost += amount;
        summary.transactionCount++;
      }
    });

    const report = {
      type: 'employee_summary',
      period: {
        startDate,
        endDate
      },
      summary: {
        totalEmployees: employees.length,
        totalWages: Object.values(employeeSummary).reduce((sum, emp) => sum + emp.wages, 0),
        totalBenefits: Object.values(employeeSummary).reduce((sum, emp) => sum + emp.benefits, 0),
        totalEmployeeCosts: Object.values(employeeSummary).reduce((sum, emp) => sum + emp.totalCost, 0)
      },
      employees: Object.values(employeeSummary).filter(emp => emp.totalCost > 0),
      generatedAt: new Date().toISOString()
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generateEmployeeSummaryPDF(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="employee-summary-${startDate}-${endDate}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Employee summary report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
};

export const generateTaxSummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, format = 'json', taxYear } = req.query;

    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    // Filter for tax-deductible business expenses
    const deductibleTransactions = transactions.filter(t => 
      t.isTaxDeductible && 
      t.type === 'expense' && 
      !CATEGORY_GROUPS.PERSONAL.includes(t.category)
    );

    // Group by IRS categories
    const scheduleC = {};
    Object.values(IRS_CATEGORIES).forEach(category => {
      scheduleC[category] = {
        amount: 0,
        transactionCount: 0,
        transactions: []
      };
    });

    deductibleTransactions.forEach(transaction => {
      const category = transaction.category;
      const amount = Math.abs(transaction.amount);
      
      scheduleC[category].amount += amount;
      scheduleC[category].transactionCount++;
      scheduleC[category].transactions.push({
        date: transaction.date,
        description: transaction.description,
        amount,
        payee: transaction.payee
      });
    });

    // Calculate quarterly breakdown
    const quarterlyBreakdown = {
      Q1: 0,
      Q2: 0,
      Q3: 0,
      Q4: 0
    };

    deductibleTransactions.forEach(transaction => {
      const quarter = transaction.quarterlyPeriod;
      quarterlyBreakdown[quarter] += Math.abs(transaction.amount);
    });

    const report = {
      type: 'tax_summary',
      taxYear: taxYear || new Date().getFullYear(),
      period: {
        startDate,
        endDate
      },
      summary: {
        totalDeductibleExpenses: deductibleTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalTransactions: deductibleTransactions.length,
        quarterlyBreakdown
      },
      scheduleC: Object.entries(scheduleC)
        .filter(([, data]) => data.amount > 0)
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          transactionCount: data.transactionCount
        }))
        .sort((a, b) => b.amount - a.amount),
      generatedAt: new Date().toISOString()
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generateTaxSummaryPDF(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="tax-summary-${taxYear || 'current'}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Tax summary report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
};

export const exportReportToPDF = async (req, res) => {
  try {
    const { reportType } = req.params;
    const reportData = req.body;

    let pdfBuffer;
    
    switch (reportType) {
      case 'profit-loss':
        pdfBuffer = await reportGenerator.generateProfitLossPDF(reportData);
        break;
      case 'expense-summary':
        pdfBuffer = await reportGenerator.generateExpenseSummaryPDF(reportData);
        break;
      case 'employee-summary':
        pdfBuffer = await reportGenerator.generateEmployeeSummaryPDF(reportData);
        break;
      case 'tax-summary':
        pdfBuffer = await reportGenerator.generateTaxSummaryPDF(reportData);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid report type',
          message: 'Report type must be one of: profit-loss, expense-summary, employee-summary, tax-summary'
        });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      error: 'Failed to export report',
      message: error.message
    });
  }
};

export const getReportHistory = async (req, res) => {
  try {
    // This would typically get report history from database
    // For now, return empty array
    res.json({
      success: true,
      reports: [],
      message: 'Report history feature to be implemented'
    });

  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({
      error: 'Failed to get report history',
      message: error.message
    });
  }
};

// Generate summary report as PDF
export const generateSummaryReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, includeDetails = true } = req.body;

    // Get transactions and summary
    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      limit: 10000 // Large limit to get all transactions
    });

    const summary = await firebaseService.getTransactionSummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    // Generate PDF
    const reportResult = await reportService.generateTransactionSummaryPDF(
      transactions.transactions || [],
      summary,
      {
        title: 'Transaction Summary Report',
        dateRange: {
          start: new Date(startDate).toLocaleDateString(),
          end: new Date(endDate).toLocaleDateString()
        },
        userId,
        includeDetails
      }
    );

    res.json({
      success: true,
      message: 'Report generated successfully',
      fileName: reportResult.fileName,
      filePath: reportResult.filePath
    });

  } catch (error) {
    console.error('Generate summary report PDF error:', error);
    res.status(500).json({
      error: 'Failed to generate summary report',
      message: error.message
    });
  }
};

// Generate tax summary report as PDF
export const generateTaxSummaryReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, taxYear, includeTransactionDetails = false } = req.body;

    // Get transactions for the tax year
    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      limit: 10000
    });

    const summary = await firebaseService.getTransactionSummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    // Generate PDF
    const reportResult = await reportService.generateTaxSummaryPDF(
      transactions.transactions || [],
      summary,
      taxYear || new Date(startDate).getFullYear(),
      {
        userId,
        includeTransactionDetails
      }
    );

    res.json({
      success: true,
      message: 'Tax report generated successfully',
      fileName: reportResult.fileName,
      filePath: reportResult.filePath
    });

  } catch (error) {
    console.error('Generate tax summary report PDF error:', error);
    res.status(500).json({
      error: 'Failed to generate tax report',
      message: error.message
    });
  }
};

// Generate category breakdown report as PDF
export const generateCategoryBreakdownReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate } = req.body;

    // Get transactions and summary
    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      limit: 10000
    });

    const summary = await firebaseService.getTransactionSummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    // Generate PDF with detailed category breakdown
    const reportResult = await reportService.generateCategoryBreakdownPDF(
      transactions.transactions || [],
      summary,
      {
        title: 'Category Breakdown Report',
        dateRange: {
          start: new Date(startDate).toLocaleDateString(),
          end: new Date(endDate).toLocaleDateString()
        },
        userId
      }
    );

    res.json({
      success: true,
      message: 'Category breakdown report generated successfully',
      fileName: reportResult.fileName,
      filePath: reportResult.filePath
    });

  } catch (error) {
    console.error('Generate category breakdown report PDF error:', error);
    res.status(500).json({
      error: 'Failed to generate category breakdown report',
      message: error.message
    });
  }
};

// Download generated report
export const downloadReport = async (req, res) => {
  try {
    const { fileName } = req.params;
    const { uid: userId } = req.user;

    // Security: Ensure the file name doesn't contain path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        error: 'Invalid file name'
      });
    }

    // Check if file belongs to the user
    if (!fileName.includes(userId)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const filePath = path.join(__dirname, '../../reports', fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to download file'
        });
      }
    });

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      error: 'Failed to download report',
      message: error.message
    });
  }
};

export const generateChecksPaidReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, includeDetails = true } = req.body;

    // Get transactions and summary
    const transactions = await firebaseService.getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      limit: 10000
    });

    const summary = await firebaseService.getTransactionSummary(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    // Generate checks paid PDF
    const reportResult = await reportService.generateChecksPaidPDF(
      transactions.transactions || [],
      summary,
      {
        title: 'Checks Paid Report',
        dateRange: {
          start: new Date(startDate).toLocaleDateString(),
          end: new Date(endDate).toLocaleDateString()
        },
        userId,
        includeDetails
      }
    );

    res.json({
      success: true,
      message: 'Checks paid report generated successfully',
      fileName: reportResult.fileName,
      filePath: reportResult.filePath
    });

  } catch (error) {
    console.error('Generate checks paid report PDF error:', error);
    res.status(500).json({
      error: 'Failed to generate checks paid report',
      message: error.message
    });
  }
};
