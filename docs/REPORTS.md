# Reports and Analytics

This document describes the reporting system for generating financial reports and analytics dashboards.

## Overview

The reporting system provides comprehensive financial analysis tools including Profit & Loss statements, tax summaries, expense reports, and interactive dashboards. Reports can be generated on-demand or exported to PDF format.

## Available Reports

### 1. Profit & Loss Statement
Standard business P&L report showing income and expenses over a specified period.

### 2. Tax Summary Report
IRS-category breakdown for tax preparation and filing.

### 3. Expense Summary Report
Detailed expense analysis by category and payee.

### 4. Employee Payment Report
Track payments to employees and contractors for 1099 reporting.

### 5. Cash Flow Report
Analysis of money movement over time.

## Report Generation API

### Generate Profit & Loss Report
```http
GET /api/reports/profit-loss?startDate=2024-01-01&endDate=2024-12-31&companyId=company-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report-456",
    "title": "Profit & Loss Statement",
    "period": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "company": {
      "id": "company-123",
      "name": "My Business LLC"
    },
    "summary": {
      "totalIncome": 125000.00,
      "totalExpenses": 75000.00,
      "netIncome": 50000.00
    },
    "income": [
      {
        "category": "business-income",
        "categoryName": "Business Income",
        "amount": 120000.00,
        "percentage": 96.0
      },
      {
        "category": "interest-income", 
        "categoryName": "Interest Income",
        "amount": 5000.00,
        "percentage": 4.0
      }
    ],
    "expenses": [
      {
        "category": "office-expense",
        "categoryName": "Office Expense", 
        "amount": 25000.00,
        "percentage": 33.3
      },
      {
        "category": "advertising",
        "categoryName": "Advertising",
        "amount": 20000.00,
        "percentage": 26.7
      }
    ]
  }
}
```

### Generate Tax Summary Report
```http
GET /api/reports/tax-summary?year=2024&companyId=company-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report-789",
    "title": "Tax Summary Report",
    "taxYear": 2024,
    "company": {
      "id": "company-123",
      "name": "My Business LLC"
    },
    "businessIncome": {
      "total": 125000.00,
      "categories": [
        {
          "category": "business-income",
          "amount": 120000.00,
          "formLine": "Line 1"
        }
      ]
    },
    "businessExpenses": {
      "total": 75000.00,
      "categories": [
        {
          "category": "advertising",
          "amount": 20000.00,
          "formLine": "Line 8"
        },
        {
          "category": "office-expense", 
          "amount": 25000.00,
          "formLine": "Line 18"
        }
      ]
    },
    "employeePayments": {
      "total": 45000.00,
      "contractors": [
        {
          "payeeId": "payee-123",
          "name": "John Contractor",
          "totalPaid": 15000.00,
          "requires1099": true
        }
      ]
    }
  }
}
```

### Generate Expense Summary Report
```http
GET /api/reports/expense-summary?startDate=2024-01-01&endDate=2024-12-31&companyId=company-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report-101",
    "title": "Expense Summary Report",
    "period": {
      "start": "2024-01-01", 
      "end": "2024-12-31"
    },
    "summary": {
      "totalExpenses": 75000.00,
      "transactionCount": 245,
      "averageExpense": 306.12
    },
    "byCategory": [
      {
        "category": "office-expense",
        "categoryName": "Office Expense",
        "amount": 25000.00,
        "transactionCount": 45,
        "percentage": 33.3
      }
    ],
    "byPayee": [
      {
        "payeeId": "payee-456",
        "payeeName": "Office Depot",
        "amount": 5000.00,
        "transactionCount": 12
      }
    ],
    "byMonth": [
      {
        "month": "2024-01",
        "amount": 6250.00,
        "transactionCount": 20
      }
    ]
  }
}
```

## Report Implementation

### Report Service Architecture
```javascript
// services/reportService.js
class ReportService {
  async generateProfitLoss(userId, filters) {
    const { startDate, endDate, companyId } = filters;
    
    // Get transactions for period
    const transactions = await this.getTransactionsForPeriod(
      userId, 
      startDate, 
      endDate, 
      companyId
    );
    
    // Categorize income and expenses
    const { income, expenses } = this.categorizeTransactions(transactions);
    
    // Calculate totals and percentages
    const summary = this.calculateSummary(income, expenses);
    
    return {
      reportId: generateId(),
      title: 'Profit & Loss Statement',
      period: { start: startDate, end: endDate },
      summary,
      income: this.formatCategoryData(income),
      expenses: this.formatCategoryData(expenses)
    };
  }

  categorizeTransactions(transactions) {
    const income = {};
    const expenses = {};
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'uncategorized';
      const amount = Math.abs(transaction.amount);
      
      if (transaction.type === 'income') {
        income[category] = (income[category] || 0) + amount;
      } else {
        expenses[category] = (expenses[category] || 0) + amount;
      }
    });
    
    return { income, expenses };
  }

  calculateSummary(income, expenses) {
    const totalIncome = Object.values(income).reduce((sum, amount) => sum + amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses
    };
  }
}
```

### PDF Report Generation
```javascript
// services/reportGenerator.js
const PDFDocument = require('pdfkit');

class ReportGenerator {
  async generateProfitLossPDF(reportData) {
    const doc = new PDFDocument({ margin: 50 });
    
    // Header
    this.addHeader(doc, reportData.title);
    this.addCompanyInfo(doc, reportData.company);
    this.addPeriodInfo(doc, reportData.period);
    
    // Summary section
    this.addSummarySection(doc, reportData.summary);
    
    // Income section
    this.addIncomeSection(doc, reportData.income);
    
    // Expenses section  
    this.addExpensesSection(doc, reportData.expenses);
    
    // Footer
    this.addFooter(doc);
    
    return doc;
  }

  addSummarySection(doc, summary) {
    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total Income: $${this.formatCurrency(summary.totalIncome)}`);
    doc.text(`Total Expenses: $${this.formatCurrency(summary.totalExpenses)}`);
    doc.text(`Net Income: $${this.formatCurrency(summary.netIncome)}`, { 
      continued: false 
    });
    
    doc.moveDown();
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
```

## Dashboard Analytics

### Real-time Dashboard Data
```http
GET /api/reports/dashboard?companyId=company-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalIncome": 125000.00,
      "totalExpenses": 75000.00,
      "netIncome": 50000.00,
      "transactionCount": 456
    },
    "monthlyTrend": [
      {
        "month": "2024-01",
        "income": 10000.00,
        "expenses": 6000.00,
        "net": 4000.00
      }
    ],
    "topExpenseCategories": [
      {
        "category": "office-expense",
        "categoryName": "Office Expense",
        "amount": 25000.00,
        "percentage": 33.3
      }
    ],
    "recentTransactions": [
      {
        "id": "trans-123",
        "date": "2024-01-15",
        "description": "Office Supplies",
        "amount": 250.00,
        "category": "office-expense"
      }
    ],
    "pendingReviews": 12,
    "unprocessedUploads": 2
  }
}
```

### Chart Data Endpoints
```javascript
// Monthly income/expense trend
GET /api/reports/chart/monthly-trend?months=12&companyId=company-123

// Category distribution pie chart
GET /api/reports/chart/category-distribution?type=expenses&companyId=company-123

// Cash flow over time
GET /api/reports/chart/cash-flow?period=year&companyId=company-123
```

## Frontend Report Components

### Report Dashboard
```javascript
const ReportsDashboard = () => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', selectedCompany?.id, dateRange],
    queryFn: () => apiClient.reports.getDashboard({
      companyId: selectedCompany?.id,
      startDate: format(dateRange.start, 'yyyy-MM-dd'),
      endDate: format(dateRange.end, 'yyyy-MM-dd')
    })
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports Dashboard</h1>
        <div className="flex gap-4">
          <CompanySelector 
            value={selectedCompany}
            onChange={setSelectedCompany}
          />
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <OverviewCards data={dashboardData.overview} />
          <MonthlyTrendChart data={dashboardData.monthlyTrend} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseCategoryChart data={dashboardData.topExpenseCategories} />
            <RecentTransactions data={dashboardData.recentTransactions} />
          </div>
        </>
      )}
    </div>
  );
};
```

### Report Generation Interface
```javascript
const ReportGenerator = () => {
  const [reportType, setReportType] = useState('profit-loss');
  const [generating, setGenerating] = useState(false);

  const generateReport = useMutation({
    mutationFn: async (params) => {
      setGenerating(true);
      try {
        const response = await apiClient.reports.generate(reportType, params);
        // Trigger PDF download
        window.open(response.data.downloadUrl, '_blank');
        return response.data;
      } finally {
        setGenerating(false);
      }
    }
  });

  const handleGenerate = (formData) => {
    generateReport.mutate({
      ...formData,
      type: reportType
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Generate Report</h2>
      
      <ReportTypeSelector 
        value={reportType}
        onChange={setReportType}
      />
      
      <ReportParametersForm
        reportType={reportType}
        onSubmit={handleGenerate}
        isGenerating={generating}
      />
    </div>
  );
};
```

## Scheduled Reports

### Automated Report Generation
```javascript
// Schedule monthly P&L reports
const scheduleMonthlyReports = async () => {
  const companies = await companyService.getAllActive();
  
  for (const company of companies) {
    const lastMonth = {
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1))
    };
    
    try {
      const report = await reportService.generateProfitLoss(
        company.userId,
        {
          companyId: company.id,
          startDate: format(lastMonth.start, 'yyyy-MM-dd'),
          endDate: format(lastMonth.end, 'yyyy-MM-dd')
        }
      );
      
      // Email report to user
      await emailService.sendReport(company.userId, report);
      
    } catch (error) {
      console.error(`Failed to generate report for company ${company.id}:`, error);
    }
  }
};
```

## Performance Optimization

### Caching Strategy
```javascript
// Cache dashboard data for 5 minutes
const getCachedDashboard = async (userId, companyId) => {
  const cacheKey = `dashboard:${userId}:${companyId}`;
  
  let data = await cache.get(cacheKey);
  if (!data) {
    data = await generateDashboard(userId, companyId);
    await cache.set(cacheKey, data, 300); // 5 minutes
  }
  
  return data;
};
```

### Query Optimization
```javascript
// Aggregate queries for better performance
const getExpenseSummary = async (userId, filters) => {
  // Use Firestore aggregation queries
  const query = db.collection('transactions')
    .where('userId', '==', userId)
    .where('type', '==', 'expense')
    .where('date', '>=', filters.startDate)
    .where('date', '<=', filters.endDate);

  if (filters.companyId) {
    query = query.where('companyId', '==', filters.companyId);
  }

  const snapshot = await query.get();
  
  // Group by category in application layer
  const summary = {};
  snapshot.docs.forEach(doc => {
    const transaction = doc.data();
    const category = transaction.category || 'uncategorized';
    
    if (!summary[category]) {
      summary[category] = { amount: 0, count: 0 };
    }
    
    summary[category].amount += transaction.amount;
    summary[category].count += 1;
  });

  return summary;
};
```

## Export Formats

### PDF Export
- Formatted business reports
- Print-ready layouts
- Company branding options

### Excel Export
```javascript
const exportToExcel = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Profit & Loss');
  
  // Add headers
  worksheet.addRow(['Category', 'Amount', 'Percentage']);
  
  // Add income data
  reportData.income.forEach(item => {
    worksheet.addRow([item.categoryName, item.amount, `${item.percentage}%`]);
  });
  
  // Style the worksheet
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach(column => {
    column.width = 20;
  });
  
  return workbook.xlsx.writeBuffer();
};
```

### CSV Export
```javascript
const exportToCSV = (transactions) => {
  const headers = ['Date', 'Description', 'Amount', 'Category', 'Type'];
  const rows = transactions.map(t => [
    t.date,
    t.description,
    t.amount,
    t.category,
    t.type
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
};
```

## Testing

### Report Generation Tests (Backend - Jest)
```javascript
describe('Report Service', () => {
  test('generates accurate P&L report', async () => {
    const mockTransactions = [
      { type: 'income', amount: 1000, category: 'business-income' },
      { type: 'expense', amount: 500, category: 'office-expense' }
    ];
    
    jest.spyOn(transactionService, 'getForPeriod')
        .mockResolvedValue(mockTransactions);
    
    const report = await reportService.generateProfitLoss('user-123', {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });
    
    expect(report.summary.totalIncome).toBe(1000);
    expect(report.summary.totalExpenses).toBe(500);
    expect(report.summary.netIncome).toBe(500);
  });
});
```

### Frontend Report Tests (Vitest)
```javascript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Reports Dashboard', () => {
  test('displays overview metrics correctly', () => {
    const mockData = {
      overview: {
        totalIncome: 10000,
        totalExpenses: 6000,
        netIncome: 4000
      }
    };
    
    render(<ReportsDashboard />);
    
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('$6,000.00')).toBeInTheDocument();
    expect(screen.getByText('$4,000.00')).toBeInTheDocument();
  });
});
```

## Security Considerations

### Access Control
- Users can only access reports for their own companies
- Report data is filtered by user ID
- Sensitive financial data requires additional authentication

### Data Privacy
- Reports automatically expire after 30 days
- No personally identifiable information in logs
- Secure storage of generated report files
