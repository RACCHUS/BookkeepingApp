import React from 'react';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

/**
 * ReportPreview - Modal to preview report data before generating PDF
 * Displays report content matching what will be in the PDF
 */
const ReportPreview = ({ 
  isOpen, 
  onClose, 
  reportType, 
  reportData, 
  dateRange, 
  onDownload, 
  downloading 
}) => {
  if (!isOpen || !reportData) return null;

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Math.abs(num));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Render different content based on report type
  const renderReportContent = () => {
    // Data could be wrapped in { success, report } or direct
    const data = reportData.report || reportData;
    
    switch (reportType) {
      case 'summary':
        return <SummaryReportPreview data={data} formatCurrency={formatCurrency} />;
      case 'tax':
        return <TaxReportPreview data={data} formatCurrency={formatCurrency} />;
      case 'category':
        return <CategoryReportPreview data={data} formatCurrency={formatCurrency} />;
      case 'checks':
        return <ChecksReportPreview data={data} formatCurrency={formatCurrency} formatDate={formatDate} />;
      case '1099':
        return <Report1099Preview data={data} formatCurrency={formatCurrency} />;
      case 'vendor':
        return <VendorReportPreview data={data} formatCurrency={formatCurrency} />;
      case 'payee-summary':
        return <PayeeSummaryPreview data={data} formatCurrency={formatCurrency} />;
      default:
        return <GenericPreview data={data} />;
    }
  };

  const reportTitles = {
    summary: 'Financial Summary Report',
    tax: 'IRS Schedule C Tax Report',
    category: 'Category Breakdown Report',
    checks: 'Checks Paid Report',
    '1099': '1099-NEC Summary',
    vendor: 'Vendor Payment Summary',
    'payee-summary': 'Payee Summary Report'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-5xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {reportTitles[reportType] || 'Report Preview'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(dateRange?.start)} - {formatDate(dateRange?.end)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onDownload}
                disabled={downloading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="mt-4 max-h-[70vh] overflow-y-auto">
            {renderReportContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Financial Summary / Profit & Loss Report Preview
const SummaryReportPreview = ({ data, formatCurrency }) => {
  // Structure: { summary: { grossIncome, totalExpenses, netIncome }, income: { breakdown }, expenses: { breakdown } }
  const summary = data.summary || data;
  const income = data.income || {};
  const expenses = data.expenses || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Gross Income" value={formatCurrency(summary.grossIncome || summary.totalIncome || 0)} color="green" />
        <MetricCard label="Total Expenses" value={formatCurrency(summary.totalExpenses || 0)} color="red" />
        <MetricCard label="Net Income" value={formatCurrency(summary.netIncome || 0)} color={(summary.netIncome || 0) >= 0 ? 'green' : 'red'} />
        <MetricCard label="Margin" value={`${(summary.margin || 0).toFixed(1)}%`} color="blue" />
      </div>

      {/* Income Breakdown */}
      {income.breakdown && income.breakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Income Breakdown</h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {income.breakdown.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Total Income</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                    {formatCurrency(income.total || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Breakdown */}
      {expenses.breakdown && expenses.breakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Expense Breakdown</h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {expenses.breakdown.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Total Expenses</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">
                    {formatCurrency(expenses.total || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Tax Summary Report Preview (IRS Schedule C)
const TaxReportPreview = ({ data, formatCurrency }) => {
  // Structure: { taxYear, summary, scheduleC: [{ line, categories: [...] }], laborPayments }
  const summary = data.summary || {};
  const scheduleC = data.scheduleC || [];
  const laborPayments = data.laborPayments || {};

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-blue-900 dark:text-blue-100">Tax Year: {data.taxYear || new Date().getFullYear()}</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          IRS Schedule C organized by line number for easy tax filing
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Deductions" value={formatCurrency(summary.totalDeductibleExpenses || 0)} color="green" />
        <MetricCard label="Contractor Payments" value={formatCurrency(summary.totalContractorPayments || 0)} color="blue" />
        <MetricCard label="Wage Payments" value={formatCurrency(summary.totalWagePayments || 0)} color="purple" />
        <MetricCard label="1099s Required" value={summary.contractorsRequiring1099 || 0} color="red" />
      </div>

      {/* Quarterly Breakdown */}
      {summary.quarterlyBreakdown && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quarterly Breakdown</h3>
          <div className="grid grid-cols-4 gap-4">
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <div key={q} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">{q}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(summary.quarterlyBreakdown[q] || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule C Categories by Line */}
      {scheduleC.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Schedule C Deductions by Line</h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16">Line</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Count</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {scheduleC.map((lineGroup, idx) => (
                  lineGroup.categories?.map((cat, catIdx) => (
                    <tr key={`${idx}-${catIdx}`}>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{lineGroup.line}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{cat.category}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{cat.transactionCount || 0}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(cat.amount)}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Labor Payments */}
      {(laborPayments.contractors?.payees?.length > 0 || laborPayments.wages?.payees?.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Labor Payments</h3>
          
          {/* Contractors */}
          {laborPayments.contractors?.payees?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Line 11 - Contract Labor ({formatCurrency(laborPayments.contractors.total)})
              </h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-yellow-200 dark:divide-yellow-700">
                  <thead className="bg-yellow-100 dark:bg-yellow-900/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase">Contractor</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase">Amount</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase">1099 Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-200 dark:divide-yellow-700">
                    {laborPayments.contractors.payees.map((p, idx) => (
                      <tr key={idx} className={p.requires1099 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{p.payee}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          {p.requires1099 ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 rounded-full">
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Wages */}
          {laborPayments.wages?.payees?.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Line 26 - Wages ({formatCurrency(laborPayments.wages.total)})
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {laborPayments.wages.payees.map((p, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{p.payee}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Category / Expense Summary Report Preview
const CategoryReportPreview = ({ data, formatCurrency }) => {
  // Structure: { summary, categories: [{ category, amount, percentage, transactionCount }] }
  const summary = data.summary || {};
  const categories = data.categories || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Total Expenses" value={formatCurrency(summary.totalExpenses || 0)} color="red" />
        <MetricCard label="Transactions" value={summary.totalTransactions || categories.reduce((s, c) => s + (c.transactionCount || 0), 0)} color="blue" />
        <MetricCard label="Avg Transaction" value={formatCurrency(summary.averageTransaction || 0)} color="purple" />
      </div>

      {/* Categories Table */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Count</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {categories
              .sort((a, b) => (b.amount || 0) - (a.amount || 0))
              .map((cat, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{cat.category}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{cat.transactionCount || 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(cat.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                    {(cat.percentage || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Checks Paid Report Preview
const ChecksReportPreview = ({ data, formatCurrency, formatDate }) => {
  // Structure: { checks: [...], summary: { totalChecks, totalAmount } }
  const checks = data.checks || data.transactions || [];
  const summary = data.summary || {};

  // Group by payee for summary
  const payeeGroups = {};
  checks.forEach(check => {
    const payee = check.payee || check.payeeName || check.description?.substring(0, 30) || 'Unknown';
    if (!payeeGroups[payee]) {
      payeeGroups[payee] = { payee, total: 0, count: 0 };
    }
    payeeGroups[payee].total += Math.abs(check.amount || 0);
    payeeGroups[payee].count += 1;
  });
  const payeeList = Object.values(payeeGroups).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Total Checks" value={summary.totalChecks || checks.length} color="blue" />
        <MetricCard label="Total Amount" value={formatCurrency(summary.totalAmount || checks.reduce((s, c) => s + Math.abs(c.amount || 0), 0))} color="green" />
        <MetricCard label="Unique Payees" value={payeeList.length} color="purple" />
      </div>

      {/* Payee Summary */}
      {payeeList.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Payments by Payee</h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {payeeList.slice(0, 20).map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{p.payee}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{p.count}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payeeList.length > 20 && (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700">
                Showing 20 of {payeeList.length} payees. Download PDF for complete list.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Checks */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Check Details</h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Check #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payee</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {checks.slice(0, 30).map((check, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(check.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{check.checkNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{check.payee || check.payeeName || check.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(check.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {checks.length > 30 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700">
              Showing 30 of {checks.length} checks. Download PDF for complete list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 1099-NEC Summary Report Preview
const Report1099Preview = ({ data, formatCurrency }) => {
  // Structure: { summary, requires1099: [...], approaching1099: [...], missingTaxIds: [...] }
  const summary = data.summary || {};
  const requires1099 = data.requires1099 || [];
  const approaching1099 = data.approaching1099 || [];
  const missingTaxIds = data.missingTaxIds || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Contractor Payments" value={formatCurrency(summary.totalContractorPayments || 0)} color="green" />
        <MetricCard label="Total Contractors" value={summary.contractorCount || 0} color="blue" />
        <MetricCard label="Requiring 1099" value={summary.requiring1099Count || requires1099.length} color="red" />
        <MetricCard label="Approaching $600" value={summary.approaching1099Count || approaching1099.length} color="yellow" />
      </div>

      {/* 1099 Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              1099-NEC Requirement
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You must issue Form 1099-NEC to any contractor who received $600 or more during the tax year.
            </p>
          </div>
        </div>
      </div>

      {/* Missing Tax IDs Warning */}
      {missingTaxIds.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Missing Tax IDs: {missingTaxIds.length} contractor(s)
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {missingTaxIds.map(p => p.payeeName).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contractors Requiring 1099 */}
      {requires1099.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-bold">
              {requires1099.length}
            </span>
            Contractors Requiring 1099-NEC
          </h3>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-lg overflow-hidden border border-red-200 dark:border-red-700">
            <table className="min-w-full divide-y divide-red-200 dark:divide-red-700">
              <thead className="bg-red-100 dark:bg-red-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-800 dark:text-red-200 uppercase">Contractor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-800 dark:text-red-200 uppercase">Payments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-800 dark:text-red-200 uppercase">Total Paid</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-red-800 dark:text-red-200 uppercase">Tax ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 dark:divide-red-700">
                {requires1099.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{p.payeeName}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{p.paymentCount}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(p.totalPayments)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {p.taxId ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approaching Threshold */}
      {approaching1099.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Approaching $600 Threshold
          </h3>
          <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg overflow-hidden border border-yellow-200 dark:border-yellow-700">
            <table className="min-w-full divide-y divide-yellow-200 dark:divide-yellow-700">
              <thead className="bg-yellow-100 dark:bg-yellow-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase">Contractor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase">Total Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-yellow-800 dark:text-yellow-200 uppercase">Until $600</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-200 dark:divide-yellow-700">
                {approaching1099.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{p.payeeName}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(p.totalPayments)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-yellow-600 dark:text-yellow-400">
                      {formatCurrency(600 - p.totalPayments)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Vendor Payment Summary Report Preview
const VendorReportPreview = ({ data, formatCurrency }) => {
  // Structure: { summary, vendors: [{ vendorName, totalPayments, paymentCount, categories: [...] }] }
  const summary = data.summary || {};
  const vendors = data.vendors || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Total Vendor Payments" value={formatCurrency(summary.totalVendorPayments || 0)} color="green" />
        <MetricCard label="Vendor Count" value={summary.vendorCount || vendors.length} color="blue" />
        <MetricCard label="Total Transactions" value={summary.totalTransactions || 0} color="purple" />
      </div>

      {/* Vendors List */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Top Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payments</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {vendors.slice(0, 30).map((vendor, idx) => {
              const topCategory = vendor.categories?.sort((a, b) => b.amount - a.amount)[0];
              return (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{vendor.vendorName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {topCategory?.category || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{vendor.paymentCount}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(vendor.totalPayments)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {vendors.length > 30 && (
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700">
            Showing 30 of {vendors.length} vendors. Download PDF for complete list.
          </div>
        )}
      </div>
    </div>
  );
};

// Payee Summary Report Preview
const PayeeSummaryPreview = ({ data, formatCurrency }) => {
  // Structure: { summary, payees: [{ payeeName, isContractor, totalPayments, quarterly: { Q1, Q2, Q3, Q4 }, requires1099 }] }
  const summary = data.summary || {};
  const payees = data.payees || [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Payments" value={formatCurrency(summary.totalPayments || 0)} color="green" />
        <MetricCard label="Payee Count" value={summary.payeeCount || payees.length} color="blue" />
        <MetricCard label="Contractors" value={summary.contractorCount || 0} color="purple" />
        <MetricCard label="Requiring 1099" value={summary.requiring1099 || 0} color="red" />
      </div>

      {/* Payees with Quarterly Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payee</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Q1</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Q2</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Q3</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Q4</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">YTD Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">1099</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {payees.slice(0, 30).map((payee, idx) => (
              <tr key={idx} className={payee.requires1099 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{payee.payeeName}</td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    payee.isContractor 
                      ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200' 
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                  }`}>
                    {payee.isContractor ? '1099' : 'W-2'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                  {payee.quarterly?.Q1 ? formatCurrency(payee.quarterly.Q1) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                  {payee.quarterly?.Q2 ? formatCurrency(payee.quarterly.Q2) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                  {payee.quarterly?.Q3 ? formatCurrency(payee.quarterly.Q3) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                  {payee.quarterly?.Q4 ? formatCurrency(payee.quarterly.Q4) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(payee.totalPayments)}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {payee.requires1099 ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 rounded-full">
                      Required
                    </span>
                  ) : payee.approaching1099 ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-full">
                      Watch
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payees.length > 30 && (
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700">
            Showing 30 of {payees.length} payees. Download PDF for complete list.
          </div>
        )}
      </div>
    </div>
  );
};

// Generic Preview for unknown types
const GenericPreview = ({ data }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-96">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

// Reusable Metric Card Component
const MetricCard = ({ label, value, color }) => {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    yellow: 'text-yellow-600 dark:text-yellow-400'
  };

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[color] || colorClasses.blue}`}>{value}</div>
    </div>
  );
};

export default ReportPreview;
