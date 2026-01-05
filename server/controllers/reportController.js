import { validationResult } from 'express-validator';
import { getDatabaseAdapter } from '../services/adapters/index.js';
import reportGenerator from '../services/reportGenerator.js';
import reportService from '../services/reportService.js';
import { CATEGORY_GROUPS, IRS_CATEGORIES, CATEGORY_METADATA } from '../../shared/constants/categories.js';
import { logger } from '../config/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get database adapter (Supabase or Firebase based on DB_PROVIDER)
const getDb = () => getDatabaseAdapter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to stream PDF directly to client
 * No server-side storage - PDF is generated and sent immediately
 */
const streamPDFToClient = (res, reportResult) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${reportResult.fileName}"`);
  res.setHeader('Content-Length', reportResult.size);
  res.send(reportResult.buffer);
};

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
    const { startDate, endDate, companyId, format = 'json' } = req.query;

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

    // Ensure categorySummary exists
    const categorySummary = summary.categorySummary || {};

    const report = {
      type: 'profit_loss',
      period: {
        startDate,
        endDate
      },
      summary: {
        grossIncome: summary.totalIncome || 0,
        totalExpenses: summary.totalExpenses || 0,
        netIncome: summary.netIncome || 0,
        margin: summary.totalIncome > 0 ? (summary.netIncome / summary.totalIncome) * 100 : 0
      },
      income: {
        total: summary.totalIncome || 0,
        breakdown: Object.entries(categorySummary)
          .filter(([category]) => CATEGORY_GROUPS.INCOME.includes(category))
          .map(([category, amount]) => ({ category, amount }))
      },
      expenses: {
        total: summary.totalExpenses || 0,
        breakdown: Object.entries(categorySummary)
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
    logger.error('Profit/Loss report error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId, format = 'json' } = req.query;

    const transactionsResult = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: 'expense',
      companyId: companyId || null
    });

    // Extract transactions array from result
    const transactionsArray = Array.isArray(transactionsResult.transactions) 
      ? transactionsResult.transactions 
      : (Array.isArray(transactionsResult) ? transactionsResult : []);

    // Group expenses by category
    const categoryTotals = {};
    const monthlyTrends = {};

    // Helper to parse date consistently
    const getMonthString = (dateValue) => {
      if (!dateValue) return 'unknown';
      // Handle Firestore Timestamp
      if (dateValue.toDate) return dateValue.toDate().toISOString().substring(0, 7);
      // Handle Date object
      if (dateValue instanceof Date) return dateValue.toISOString().substring(0, 7);
      // Handle string
      if (typeof dateValue === 'string') return dateValue.substring(0, 7);
      return 'unknown';
    };
    
    transactionsArray.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const month = getMonthString(transaction.date);
      const amount = Math.abs(transaction.amount || 0);

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
        totalTransactions: transactionsArray.length,
        averageTransaction: transactionsArray.length > 0 ? 
          Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0) / transactionsArray.length : 0
      },
      categories: Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / Object.values(categoryTotals).reduce((sum, a) => sum + a, 0)) * 100,
          transactionCount: transactionsArray.filter(t => t.category === category).length
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
    logger.error('Expense summary report error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId, format = 'json' } = req.query;

    // Get employee-related transactions
    const transactionsResult = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

    // Extract transactions array from result
    const transactions = transactionsResult.transactions || transactionsResult || [];
    const transactionsArray = Array.isArray(transactions) ? transactions : [];

    const employeeTransactions = transactionsArray.filter(t => 
      t.employeeId || CATEGORY_GROUPS.EMPLOYEE_COSTS.includes(t.category)
    );

    // Get employee list
    const employees = await getDb().getEmployees(userId);

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
    logger.error('Employee summary report error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId, format = 'json', taxYear } = req.query;

    // Validate required date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate are required'
      });
    }

    // Validate date format
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'startDate and endDate must be valid dates'
      });
    }

    const transactionsResult = await getDb().getTransactions(userId, {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      companyId: companyId || null
    });

    // Handle both array and object response formats
    const transactions = Array.isArray(transactionsResult) 
      ? transactionsResult 
      : (transactionsResult?.transactions || []);

    // Helper to check if a category is tax deductible
    const isCategoryDeductible = (category) => {
      const metadata = CATEGORY_METADATA[category];
      return metadata && metadata.taxDeductible === true;
    };

    // Filter for tax-deductible business expenses based on category metadata
    const deductibleTransactions = transactions.filter(t => {
      // Check if explicitly set on transaction, otherwise use category metadata
      const isDeductible = t.isTaxDeductible !== undefined 
        ? t.isTaxDeductible 
        : isCategoryDeductible(t.category);
      
      return isDeductible && 
        t.type === 'expense' && 
        !CATEGORY_GROUPS.PERSONAL.includes(t.category);
    });

    // Group by IRS categories with line numbers
    const scheduleC = {};
    Object.values(IRS_CATEGORIES).forEach(category => {
      const metadata = CATEGORY_METADATA[category] || {};
      scheduleC[category] = {
        amount: 0,
        transactionCount: 0,
        transactions: [],
        line: metadata.line || 'N/A',
        description: metadata.description || '',
        specialReporting: metadata.specialReporting || false,
        specialForm: metadata.specialForm || null
      };
    });

    deductibleTransactions.forEach(transaction => {
      const category = transaction.category;
      const amount = Math.abs(transaction.amount);
      
      if (scheduleC[category]) {
        scheduleC[category].amount += amount;
        scheduleC[category].transactionCount++;
        scheduleC[category].transactions.push({
          date: transaction.date,
          description: transaction.description,
          amount,
          payee: transaction.payee
        });
      }
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
      if (quarterlyBreakdown[quarter] !== undefined) {
        quarterlyBreakdown[quarter] += Math.abs(transaction.amount);
      }
    });

    // Extract contractor payments (Line 11) with payee details
    const contractorPayments = [];
    const contractorCategory = scheduleC[IRS_CATEGORIES.CONTRACT_LABOR];
    if (contractorCategory && contractorCategory.transactions.length > 0) {
      const payeeMap = {};
      contractorCategory.transactions.forEach(t => {
        const payee = t.payee || 'Unknown';
        if (!payeeMap[payee]) {
          payeeMap[payee] = { payee, amount: 0, transactionCount: 0 };
        }
        payeeMap[payee].amount += t.amount;
        payeeMap[payee].transactionCount++;
      });
      Object.values(payeeMap).forEach(p => {
        contractorPayments.push({
          ...p,
          requires1099: p.amount >= 600,
          line: '11'
        });
      });
      contractorPayments.sort((a, b) => b.amount - a.amount);
    }

    // Extract wage payments (Line 26) with payee details
    const wagePayments = [];
    const wageCategory = scheduleC[IRS_CATEGORIES.WAGES];
    if (wageCategory && wageCategory.transactions.length > 0) {
      const payeeMap = {};
      wageCategory.transactions.forEach(t => {
        const payee = t.payee || 'Unknown';
        if (!payeeMap[payee]) {
          payeeMap[payee] = { payee, amount: 0, transactionCount: 0 };
        }
        payeeMap[payee].amount += t.amount;
        payeeMap[payee].transactionCount++;
      });
      Object.values(payeeMap).forEach(p => {
        wagePayments.push({
          ...p,
          requiresW2: true,
          line: '26'
        });
      });
      wagePayments.sort((a, b) => b.amount - a.amount);
    }

    // Group categories by Schedule C line number for organized display
    const lineGroups = {};
    Object.entries(scheduleC)
      .filter(([, data]) => data.amount > 0)
      .forEach(([category, data]) => {
        const line = data.line;
        if (!lineGroups[line]) {
          lineGroups[line] = [];
        }
        lineGroups[line].push({
          category,
          amount: data.amount,
          transactionCount: data.transactionCount,
          line: data.line,
          description: data.description,
          specialReporting: data.specialReporting,
          specialForm: data.specialForm
        });
      });

    // Sort line groups (numeric first, then alphabetic)
    const sortedLines = Object.keys(lineGroups).sort((a, b) => {
      const aNum = parseFloat(a) || 999;
      const bNum = parseFloat(b) || 999;
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
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
        quarterlyBreakdown,
        totalContractorPayments: contractorPayments.reduce((sum, p) => sum + p.amount, 0),
        totalWagePayments: wagePayments.reduce((sum, p) => sum + p.amount, 0),
        contractorsRequiring1099: contractorPayments.filter(p => p.requires1099).length
      },
      // Schedule C categories organized by line number
      scheduleC: sortedLines.map(line => ({
        line,
        categories: lineGroups[line].sort((a, b) => b.amount - a.amount)
      })),
      // Detailed payee breakdowns
      laborPayments: {
        contractors: {
          line: '11',
          lineDescription: 'Contract Labor',
          total: contractorPayments.reduce((sum, p) => sum + p.amount, 0),
          payees: contractorPayments,
          note: 'Must issue Form 1099-NEC for payments ≥ $600'
        },
        wages: {
          line: '26',
          lineDescription: 'Wages (Less Employment Credits)',
          total: wagePayments.reduce((sum, p) => sum + p.amount, 0),
          payees: wagePayments,
          note: 'Must issue Form W-2 for all employees'
        }
      },
      // Categories with special reporting requirements
      specialReporting: Object.entries(scheduleC)
        .filter(([, data]) => data.amount > 0 && data.specialReporting)
        .map(([category, data]) => ({
          category,
          line: data.line,
          amount: data.amount,
          requirement: data.specialForm
        })),
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
    logger.error('Tax summary report error:', error);
    res.status(500).json({
      success: false,
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
    logger.error('Export report error:', error);
    res.status(500).json({
      success: false,
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
    logger.error('Get report history error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId, includeDetails = true } = req.body;

    // Get transactions and summary
    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000 // Large limit to get all transactions
    });

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

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

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate summary report PDF error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId, taxYear, includeTransactionDetails = false } = req.body;

    // Validate required date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate are required'
      });
    }

    // Validate date format
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'startDate and endDate must be valid dates'
      });
    }

    // Get transactions for the tax year
    const transactionsResult = await getDb().getTransactions(userId, {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      companyId: companyId || null,
      limit: 10000
    });

    // Handle both array and object response formats
    const allTransactions = Array.isArray(transactionsResult) 
      ? transactionsResult 
      : (transactionsResult?.transactions || []);

    // Helper to check if a category is tax deductible
    const isCategoryDeductible = (category) => {
      const metadata = CATEGORY_METADATA[category];
      return metadata && metadata.taxDeductible === true;
    };

    // Filter for tax-deductible business expenses based on category metadata
    const deductibleTransactions = allTransactions.filter(t => {
      // Check if explicitly set on transaction, otherwise use category metadata
      const isDeductible = t.isTaxDeductible !== undefined 
        ? t.isTaxDeductible 
        : isCategoryDeductible(t.category);
      
      return isDeductible && 
        t.type === 'expense' && 
        !CATEGORY_GROUPS.PERSONAL.includes(t.category);
    });

    // Group by IRS categories with line numbers
    const scheduleC = {};
    Object.values(IRS_CATEGORIES).forEach(category => {
      const metadata = CATEGORY_METADATA[category] || {};
      scheduleC[category] = {
        amount: 0,
        transactionCount: 0,
        transactions: [],
        line: metadata.line || 'N/A',
        description: metadata.description || '',
        specialReporting: metadata.specialReporting || false,
        specialForm: metadata.specialForm || null
      };
    });

    deductibleTransactions.forEach(transaction => {
      const category = transaction.category;
      const amount = Math.abs(transaction.amount);
      
      if (scheduleC[category]) {
        scheduleC[category].amount += amount;
        scheduleC[category].transactionCount++;
        scheduleC[category].transactions.push({
          date: transaction.date,
          description: transaction.description,
          amount,
          payee: transaction.payee
        });
      }
    });

    // Calculate quarterly breakdown
    const quarterlyBreakdown = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    deductibleTransactions.forEach(transaction => {
      const quarter = transaction.quarterlyPeriod;
      if (quarterlyBreakdown[quarter] !== undefined) {
        quarterlyBreakdown[quarter] += Math.abs(transaction.amount);
      }
    });

    // Extract contractor payments (Line 11) with payee details
    const contractorPayments = [];
    const contractorCategory = scheduleC[IRS_CATEGORIES.CONTRACT_LABOR];
    if (contractorCategory && contractorCategory.transactions.length > 0) {
      const payeeMap = {};
      contractorCategory.transactions.forEach(t => {
        const payee = t.payee || 'Unknown';
        if (!payeeMap[payee]) {
          payeeMap[payee] = { payee, amount: 0, transactionCount: 0 };
        }
        payeeMap[payee].amount += t.amount;
        payeeMap[payee].transactionCount++;
      });
      Object.values(payeeMap).forEach(p => {
        contractorPayments.push({
          ...p,
          requires1099: p.amount >= 600,
          line: '11'
        });
      });
      contractorPayments.sort((a, b) => b.amount - a.amount);
    }

    // Extract wage payments (Line 26) with payee details
    const wagePayments = [];
    const wageCategory = scheduleC[IRS_CATEGORIES.WAGES];
    if (wageCategory && wageCategory.transactions.length > 0) {
      const payeeMap = {};
      wageCategory.transactions.forEach(t => {
        const payee = t.payee || 'Unknown';
        if (!payeeMap[payee]) {
          payeeMap[payee] = { payee, amount: 0, transactionCount: 0 };
        }
        payeeMap[payee].amount += t.amount;
        payeeMap[payee].transactionCount++;
      });
      Object.values(payeeMap).forEach(p => {
        wagePayments.push({
          ...p,
          requiresW2: true,
          line: '26'
        });
      });
      wagePayments.sort((a, b) => b.amount - a.amount);
    }

    // Group categories by Schedule C line number
    const lineGroups = {};
    Object.entries(scheduleC)
      .filter(([, data]) => data.amount > 0)
      .forEach(([category, data]) => {
        const line = data.line;
        if (!lineGroups[line]) {
          lineGroups[line] = [];
        }
        lineGroups[line].push({
          category,
          amount: data.amount,
          transactionCount: data.transactionCount,
          line: data.line,
          description: data.description,
          specialReporting: data.specialReporting,
          specialForm: data.specialForm
        });
      });

    // Sort line groups
    const sortedLines = Object.keys(lineGroups).sort((a, b) => {
      const aNum = parseFloat(a) || 999;
      const bNum = parseFloat(b) || 999;
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });

    // Build complete report data
    const reportData = {
      type: 'tax_summary',
      taxYear: taxYear || new Date(startDate).getFullYear(),
      period: { startDate, endDate },
      summary: {
        totalDeductibleExpenses: deductibleTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalTransactions: deductibleTransactions.length,
        quarterlyBreakdown,
        totalContractorPayments: contractorPayments.reduce((sum, p) => sum + p.amount, 0),
        totalWagePayments: wagePayments.reduce((sum, p) => sum + p.amount, 0),
        contractorsRequiring1099: contractorPayments.filter(p => p.requires1099).length
      },
      scheduleC: sortedLines.map(line => ({
        line,
        categories: lineGroups[line].sort((a, b) => b.amount - a.amount)
      })),
      laborPayments: {
        contractors: {
          line: '11',
          lineDescription: 'Contract Labor',
          total: contractorPayments.reduce((sum, p) => sum + p.amount, 0),
          payees: contractorPayments,
          note: 'Must issue Form 1099-NEC for payments ≥ $600'
        },
        wages: {
          line: '26',
          lineDescription: 'Wages (Less Employment Credits)',
          total: wagePayments.reduce((sum, p) => sum + p.amount, 0),
          payees: wagePayments,
          note: 'Must issue Form W-2 for all employees'
        }
      },
      specialReporting: Object.entries(scheduleC)
        .filter(([, data]) => data.amount > 0 && data.specialReporting)
        .map(([category, data]) => ({
          category,
          line: data.line,
          amount: data.amount,
          requirement: data.specialForm
        })),
      generatedAt: new Date().toISOString()
    };

    // Generate PDF
    const reportResult = await reportService.generateTaxSummaryPDF(reportData, {
      userId,
      includeTransactionDetails
    });

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate tax summary report PDF error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId } = req.body;

    // Get transactions and summary
    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

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

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate category breakdown report PDF error:', error);
    res.status(500).json({
      success: false,
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
      logger.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });

  } catch (error) {
    logger.error('Download report error:', error);
    res.status(500).json({
      success: false,
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
    const { startDate, endDate, companyId, includeDetails = true } = req.body;

    // Get transactions and summary
    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

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

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate checks paid report PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate checks paid report',
      message: error.message
    });
  }
};

/**
 * Generate 1099-NEC Summary Report
 * Identifies contractors who received $600+ for tax filing purposes
 */
export const generate1099SummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, format = 'json' } = req.query;

    // Get all contractor payments for the period
    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    // Filter for contractor payments (isContractorPayment = true)
    const contractorPayments = (transactions.transactions || []).filter(
      t => t.isContractorPayment === true && t.amount < 0
    );

    // Group by payee
    const payeeTotals = {};
    for (const payment of contractorPayments) {
      const payeeId = payment.payeeId || payment.payee || 'Unknown';
      const payeeName = payment.payeeName || payment.payee || 'Unknown Contractor';
      
      if (!payeeTotals[payeeId]) {
        payeeTotals[payeeId] = {
          payeeId,
          payeeName,
          taxId: payment.payeeTaxId || '',
          totalPayments: 0,
          paymentCount: 0,
          transactions: []
        };
      }
      
      payeeTotals[payeeId].totalPayments += Math.abs(payment.amount);
      payeeTotals[payeeId].paymentCount += 1;
      payeeTotals[payeeId].transactions.push({
        date: payment.date,
        amount: Math.abs(payment.amount),
        description: payment.description
      });
    }

    // Identify those requiring 1099 ($600+ threshold)
    const requires1099 = Object.values(payeeTotals)
      .filter(p => p.totalPayments >= 600)
      .sort((a, b) => b.totalPayments - a.totalPayments);

    const approaching1099 = Object.values(payeeTotals)
      .filter(p => p.totalPayments >= 500 && p.totalPayments < 600)
      .sort((a, b) => b.totalPayments - a.totalPayments);

    const missingTaxIds = requires1099.filter(p => !p.taxId);

    const report = {
      type: '1099_summary',
      period: { startDate, endDate },
      summary: {
        totalContractorPayments: Object.values(payeeTotals).reduce((sum, p) => sum + p.totalPayments, 0),
        contractorCount: Object.keys(payeeTotals).length,
        requiring1099Count: requires1099.length,
        approaching1099Count: approaching1099.length,
        missingTaxIdCount: missingTaxIds.length
      },
      requires1099,
      approaching1099,
      missingTaxIds: missingTaxIds.map(p => ({ payeeId: p.payeeId, payeeName: p.payeeName, totalPayments: p.totalPayments })),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      report
    });

  } catch (error) {
    logger.error('1099 Summary report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate 1099 summary report',
      message: error.message
    });
  }
};

/**
 * Generate 1099 Summary PDF
 */
export const generate1099SummaryReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, includeDetails = true } = req.body;

    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

    const reportResult = await reportService.generate1099PDF(
      transactions.transactions || [],
      summary,
      {
        title: '1099-NEC Summary Report',
        dateRange: {
          start: new Date(startDate).toLocaleDateString(),
          end: new Date(endDate).toLocaleDateString()
        },
        userId,
        includeDetails
      }
    );

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate 1099 summary report PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate 1099 summary report',
      message: error.message
    });
  }
};

/**
 * Generate Vendor Payment Summary Report
 * Shows all payments to vendors with YTD totals
 */
export const generateVendorSummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, format = 'json' } = req.query;

    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    // Group expenses by vendor
    const vendorTotals = {};
    const expenseTransactions = (transactions.transactions || []).filter(t => t.amount < 0);

    for (const tx of expenseTransactions) {
      const vendorId = tx.vendorId || tx.payee || tx.description?.substring(0, 30) || 'Unknown';
      const vendorName = tx.vendorName || tx.payee || tx.description?.substring(0, 30) || 'Unknown Vendor';

      if (!vendorTotals[vendorId]) {
        vendorTotals[vendorId] = {
          vendorId,
          vendorName,
          totalPayments: 0,
          paymentCount: 0,
          categories: {},
          transactions: []
        };
      }

      vendorTotals[vendorId].totalPayments += Math.abs(tx.amount);
      vendorTotals[vendorId].paymentCount += 1;
      
      const category = tx.category || 'Uncategorized';
      vendorTotals[vendorId].categories[category] = 
        (vendorTotals[vendorId].categories[category] || 0) + Math.abs(tx.amount);

      vendorTotals[vendorId].transactions.push({
        date: tx.date,
        amount: Math.abs(tx.amount),
        category,
        description: tx.description
      });
    }

    const vendorList = Object.values(vendorTotals)
      .sort((a, b) => b.totalPayments - a.totalPayments);

    const report = {
      type: 'vendor_summary',
      period: { startDate, endDate },
      summary: {
        totalVendorPayments: vendorList.reduce((sum, v) => sum + v.totalPayments, 0),
        vendorCount: vendorList.length,
        totalTransactions: expenseTransactions.length
      },
      vendors: vendorList.map(v => ({
        ...v,
        categories: Object.entries(v.categories).map(([cat, amt]) => ({ category: cat, amount: amt }))
      })),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      report
    });

  } catch (error) {
    logger.error('Vendor summary report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate vendor summary report',
      message: error.message
    });
  }
};

/**
 * Generate Vendor Summary PDF
 */
export const generateVendorSummaryReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, includeDetails = true } = req.body;

    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

    const reportResult = await reportService.generateVendorPDF(
      transactions.transactions || [],
      summary,
      {
        title: 'Vendor Payment Summary Report',
        dateRange: {
          start: new Date(startDate).toLocaleDateString(),
          end: new Date(endDate).toLocaleDateString()
        },
        userId,
        includeDetails
      }
    );

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate vendor summary report PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate vendor summary report',
      message: error.message
    });
  }
};

/**
 * Generate Payee Summary Report
 * Shows all payee payments with 1099 threshold warnings
 */
export const generatePayeeSummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, format = 'json' } = req.query;

    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    // Group by payee with quarterly breakdown
    const payeeTotals = {};
    const payeeTransactions = (transactions.transactions || []).filter(
      t => t.amount < 0 && (t.payeeId || t.payee)
    );

    for (const tx of payeeTransactions) {
      const payeeId = tx.payeeId || tx.payee;
      const payeeName = tx.payeeName || tx.payee || 'Unknown';

      if (!payeeTotals[payeeId]) {
        payeeTotals[payeeId] = {
          payeeId,
          payeeName,
          isContractor: tx.isContractorPayment || false,
          taxId: tx.payeeTaxId || '',
          totalPayments: 0,
          paymentCount: 0,
          quarterly: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          transactions: []
        };
      }

      const amount = Math.abs(tx.amount);
      payeeTotals[payeeId].totalPayments += amount;
      payeeTotals[payeeId].paymentCount += 1;

      // Determine quarter
      const txDate = new Date(tx.date);
      const month = txDate.getMonth();
      if (month <= 2) payeeTotals[payeeId].quarterly.Q1 += amount;
      else if (month <= 5) payeeTotals[payeeId].quarterly.Q2 += amount;
      else if (month <= 8) payeeTotals[payeeId].quarterly.Q3 += amount;
      else payeeTotals[payeeId].quarterly.Q4 += amount;

      payeeTotals[payeeId].transactions.push({
        date: tx.date,
        amount,
        description: tx.description,
        category: tx.category
      });
    }

    const payeeList = Object.values(payeeTotals)
      .map(p => ({
        ...p,
        requires1099: p.isContractor && p.totalPayments >= 600,
        approaching1099: p.isContractor && p.totalPayments >= 500 && p.totalPayments < 600,
        missingTaxId: p.isContractor && p.totalPayments >= 600 && !p.taxId
      }))
      .sort((a, b) => b.totalPayments - a.totalPayments);

    const report = {
      type: 'payee_ytd',
      period: { startDate, endDate },
      summary: {
        totalPayments: payeeList.reduce((sum, p) => sum + p.totalPayments, 0),
        payeeCount: payeeList.length,
        contractorCount: payeeList.filter(p => p.isContractor).length,
        requiring1099: payeeList.filter(p => p.requires1099).length,
        approaching1099: payeeList.filter(p => p.approaching1099).length,
        missingTaxIds: payeeList.filter(p => p.missingTaxId).length
      },
      payees: payeeList,
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      report
    });

  } catch (error) {
    logger.error('Payee YTD report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payee YTD report',
      message: error.message
    });
  }
};

/**
 * Generate Payee YTD PDF
 */
export const generatePayeeSummaryReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId, includeDetails = true } = req.body;

    const transactions = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    const summary = await getDb().getTransactionSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null
    });

    const reportResult = await reportService.generatePayeeSummaryPDF(
      transactions.transactions || [],
      summary,
      {
        title: 'Payee Summary Report',
        dateRange: {
          start: new Date(startDate).toLocaleDateString(),
          end: new Date(endDate).toLocaleDateString()
        },
        userId,
        includeDetails
      }
    );

    // Stream PDF directly to client
    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Generate payee summary report PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payee summary report',
      message: error.message
    });
  }
};

// ============================================
// MONTHLY REPORTS
// ============================================

/**
 * Generate Monthly Summary Report (JSON)
 * Groups transactions by month with income/expense subcategories
 */
export const generateMonthlySummaryReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const { transactions } = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    // Use the monthly summary report generator
    const { monthlySummaryReport } = await import('../services/reports/MonthlySummaryReport.js');
    const reportData = monthlySummaryReport.generateData(transactions, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    logger.error('Monthly summary report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly summary report',
      message: error.message
    });
  }
};

/**
 * Generate Monthly Summary Report PDF
 */
export const generateMonthlySummaryReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const { transactions } = await getDb().getTransactions(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId: companyId || null,
      limit: 10000
    });

    const { monthlySummaryReport } = await import('../services/reports/MonthlySummaryReport.js');
    const reportResult = await monthlySummaryReport.generate(transactions, null, {
      title: 'Monthly Financial Summary',
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      },
      userId,
      startDate,
      endDate
    });

    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Monthly summary PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly summary PDF',
      message: error.message
    });
  }
};

/**
 * Generate Monthly Checks Report (JSON)
 * Groups check payments by month
 */
export const generateMonthlyChecksReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    // Import check service
    const checkService = (await import('../services/checkService.js')).default;
    
    const { checks } = await checkService.getChecks(userId, {
      startDate,
      endDate,
      companyId: companyId || null
    });

    // Use the monthly checks report generator
    const { monthlyChecksReport } = await import('../services/reports/MonthlyChecksReport.js');
    const reportData = monthlyChecksReport.generateData(checks, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    logger.error('Monthly checks report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly checks report',
      message: error.message
    });
  }
};

/**
 * Generate Monthly Checks Report PDF
 */
export const generateMonthlyChecksReportPDF = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { startDate, endDate, companyId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    // Import check service
    const checkService = (await import('../services/checkService.js')).default;
    
    const { checks } = await checkService.getChecks(userId, {
      startDate,
      endDate,
      companyId: companyId || null
    });

    const { monthlyChecksReport } = await import('../services/reports/MonthlyChecksReport.js');
    const reportResult = await monthlyChecksReport.generate(checks, null, {
      title: 'Monthly Checks Report',
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      },
      userId,
      startDate,
      endDate
    });

    streamPDFToClient(res, reportResult);

  } catch (error) {
    logger.error('Monthly checks PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly checks PDF',
      message: error.message
    });
  }
};
