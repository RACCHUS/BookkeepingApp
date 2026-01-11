/**
 * @fileoverview Monthly Reports Component
 * @description Displays month-by-month financial summary and checks reports with charts
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { SmartDateSelector } from '../../components/forms';
import { CompanySelector } from '../../components/common';
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

/**
 * Format currency value
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Simple Bar Chart Component
 */
const BarChart = ({ data, incomeKey, expenseKey, labelKey, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        No data available for chart
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d[incomeKey] || 0, d[expenseKey] || 0))
  );

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end space-x-2 min-w-max" style={{ height }}>
        {data.map((item, index) => {
          const incomeHeight = maxValue > 0 ? ((item[incomeKey] || 0) / maxValue) * (height - 60) : 0;
          const expenseHeight = maxValue > 0 ? ((item[expenseKey] || 0) / maxValue) * (height - 60) : 0;

          return (
            <div key={index} className="flex flex-col items-center flex-shrink-0" style={{ width: 60 }}>
              <div className="flex items-end space-x-1 flex-1">
                {/* Income Bar */}
                <div
                  className="w-5 bg-green-500 rounded-t transition-all hover:bg-green-600"
                  style={{ height: Math.max(incomeHeight, 4) }}
                  title={`Income: ${formatCurrency(item[incomeKey] || 0)}`}
                />
                {/* Expense Bar */}
                <div
                  className="w-5 bg-red-400 rounded-t transition-all hover:bg-red-500"
                  style={{ height: Math.max(expenseHeight, 4) }}
                  title={`Expenses: ${formatCurrency(item[expenseKey] || 0)}`}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center whitespace-nowrap">
                {item[labelKey]}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-400 rounded mr-2" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Expenses</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Monthly Category Breakdown Component
 * Shows each month vertically with its category breakdown
 */
const MonthlyCategoryTable = ({ title, months, type }) => {
  // Get all unique categories for header
  const allCategories = useMemo(() => {
    const categorySet = new Set();
    months?.forEach(month => {
      const categories = type === 'income' ? month.income?.categories : month.expenses?.categories;
      Object.keys(categories || {}).forEach(cat => categorySet.add(cat));
    });
    return Array.from(categorySet).sort();
  }, [months, type]);

  // Calculate grand totals per category
  const categoryTotals = useMemo(() => {
    const totals = {};
    allCategories.forEach(cat => {
      totals[cat] = months?.reduce((sum, month) => {
        const categories = type === 'income' ? month.income?.categories : month.expenses?.categories;
        return sum + (categories?.[cat] || 0);
      }, 0) || 0;
    });
    return totals;
  }, [allCategories, months, type]);

  // Sort categories by total (descending)
  const sortedCategories = useMemo(() => {
    return [...allCategories].sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  }, [allCategories, categoryTotals]);

  if (!months || months.length === 0 || sortedCategories.length === 0) {
    return null;
  }

  const colorClass = type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const headerBg = type === 'income' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {months.map((month, monthIndex) => {
              const categories = type === 'income' ? month.income?.categories : month.expenses?.categories;
              const monthTotal = type === 'income' ? month.income?.total : month.expenses?.total;
              const categoryEntries = Object.entries(categories || {}).sort((a, b) => b[1] - a[1]);

              if (categoryEntries.length === 0) {
                return (
                  <tr key={monthIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{month.monthLabel}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">No {type} transactions</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400 dark:text-gray-500">-</td>
                  </tr>
                );
              }

              return categoryEntries.map(([category, amount], catIndex) => (
                <tr key={`${monthIndex}-${catIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {catIndex === 0 ? (
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white" rowSpan={categoryEntries.length}>
                      {month.monthLabel}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{category}</td>
                  <td className={`px-4 py-3 text-sm text-right ${colorClass}`}>{formatCurrency(amount)}</td>
                </tr>
              ));
            })}
            {/* Monthly Totals */}
            {months.map((month, monthIndex) => {
              const monthTotal = type === 'income' ? month.income?.total : month.expenses?.total;
              return (
                <tr key={`total-${monthIndex}`} className={`${headerBg} font-semibold`}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{month.monthLabel} Total</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"></td>
                  <td className={`px-4 py-2 text-sm text-right ${colorClass}`}>{formatCurrency(monthTotal || 0)}</td>
                </tr>
              );
            })}
            {/* Grand Total */}
            <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Grand Total</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"></td>
              <td className={`px-4 py-3 text-sm text-right ${colorClass}`}>
                {formatCurrency(Object.values(categoryTotals).reduce((sum, val) => sum + val, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Monthly Payee Breakdown Component
 * Shows each month vertically with its payee breakdown for checks
 */
const MonthlyPayeeTable = ({ title, months, type }) => {
  // Get all unique payees for totals
  const allPayees = useMemo(() => {
    const payeeSet = new Set();
    months?.forEach(month => {
      const byPayee = type === 'income' ? month.income?.byPayee : month.expense?.byPayee;
      Object.keys(byPayee || {}).forEach(payee => payeeSet.add(payee));
    });
    return Array.from(payeeSet).sort();
  }, [months, type]);

  // Calculate grand totals per payee
  const payeeTotals = useMemo(() => {
    const totals = {};
    allPayees.forEach(payee => {
      totals[payee] = months?.reduce((sum, month) => {
        const byPayee = type === 'income' ? month.income?.byPayee : month.expense?.byPayee;
        return sum + (byPayee?.[payee] || 0);
      }, 0) || 0;
    });
    return totals;
  }, [allPayees, months, type]);

  if (!months || months.length === 0 || allPayees.length === 0) {
    return null;
  }

  const colorClass = type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const headerBg = type === 'income' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payee</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {months.map((month, monthIndex) => {
              const byPayee = type === 'income' ? month.income?.byPayee : month.expense?.byPayee;
              const monthTotal = type === 'income' ? month.income?.amount : month.expense?.amount;
              const payeeEntries = Object.entries(byPayee || {}).sort((a, b) => b[1] - a[1]);

              if (payeeEntries.length === 0) {
                return (
                  <tr key={monthIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{month.monthLabel}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">No {type} checks</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400 dark:text-gray-500">-</td>
                  </tr>
                );
              }

              return payeeEntries.map(([payee, amount], payeeIndex) => (
                <tr key={`${monthIndex}-${payeeIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {payeeIndex === 0 ? (
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white" rowSpan={payeeEntries.length}>
                      {month.monthLabel}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={payee}>{payee}</td>
                  <td className={`px-4 py-3 text-sm text-right ${colorClass}`}>{formatCurrency(amount)}</td>
                </tr>
              ));
            })}
            {/* Monthly Totals */}
            {months.map((month, monthIndex) => {
              const monthTotal = type === 'income' ? month.income?.amount : month.expense?.amount;
              return (
                <tr key={`total-${monthIndex}`} className={`${headerBg} font-semibold`}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{month.monthLabel} Total</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"></td>
                  <td className={`px-4 py-2 text-sm text-right ${colorClass}`}>{formatCurrency(monthTotal || 0)}</td>
                </tr>
              );
            })}
            {/* Grand Total */}
            <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Grand Total</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"></td>
              <td className={`px-4 py-3 text-sm text-right ${colorClass}`}>
                {formatCurrency(Object.values(payeeTotals).reduce((sum, val) => sum + val, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Summary Card Component
 */
const SummaryCard = ({ icon: Icon, title, value, subValue, trend, colorClass = 'text-gray-900 dark:text-white' }) => {
  const bgColorClass = (colorClass || 'text-gray-900').replace('text-', 'bg-').replace('900', '100').replace('600', '100').replace('400', '100');
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${bgColorClass} dark:bg-opacity-20`}>
            <Icon className={`h-5 w-5 ${colorClass || 'text-gray-900 dark:text-white'}`} />
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-xl font-bold ${colorClass || 'text-gray-900 dark:text-white'}`}>{value}</p>
            {subValue && <p className="text-xs text-gray-400 dark:text-gray-500">{subValue}</p>}
          </div>
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
            )}
            <span className="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Monthly Reports Component
 */
const MonthlyReports = () => {
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');
  const [generating, setGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch monthly summary data
  const { 
    data: summaryData, 
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['monthlySummary', dateRange.start, dateRange.end, selectedCompany],
    queryFn: () => {
      const params = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      if (selectedCompany && selectedCompany !== 'all') {
        params.companyId = selectedCompany;
      }
      return api.reports.getMonthlySummary(params);
    },
    enabled: !!user && !!dateRange.start && !!dateRange.end
  });

  // Fetch monthly checks data
  const { 
    data: checksData, 
    isLoading: checksLoading,
    error: checksError,
    refetch: refetchChecks
  } = useQuery({
    queryKey: ['monthlyChecks', dateRange.start, dateRange.end, selectedCompany],
    queryFn: () => {
      const params = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      if (selectedCompany && selectedCompany !== 'all') {
        params.companyId = selectedCompany;
      }
      return api.reports.getMonthlyChecks(params);
    },
    enabled: !!user && !!dateRange.start && !!dateRange.end && activeTab === 'checks'
  });

  // Process chart data for summary
  const summaryChartData = useMemo(() => {
    if (!summaryData?.data?.months) return [];
    return summaryData.data.months.map(month => ({
      label: month.monthLabel,
      income: month.income.total,
      expenses: month.expenses.total,
      netIncome: month.netIncome
    }));
  }, [summaryData]);

  // Process chart data for checks
  const checksChartData = useMemo(() => {
    if (!checksData?.data?.months) return [];
    return checksData.data.months.map(month => ({
      label: month.monthLabel,
      income: month.income.amount,
      expense: month.expense.amount,
      totalChecks: month.totalChecks
    }));
  }, [checksData]);

  const handleGeneratePDF = async (type) => {
    setGenerating(true);
    try {
      const params = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      if (selectedCompany && selectedCompany !== 'all') {
        params.companyId = selectedCompany;
      }

      let response;
      let filename;

      if (type === 'summary') {
        response = await api.reports.generateMonthlySummaryPDF(params);
        filename = `monthly-summary-${dateRange.start}-to-${dateRange.end}.pdf`;
      } else {
        response = await api.reports.generateMonthlyChecksPDF(params);
        filename = `monthly-checks-${dateRange.start}-to-${dateRange.end}.pdf`;
      }

      if (response instanceof Blob) {
        const url = window.URL.createObjectURL(response);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('PDF downloaded successfully');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'summary') {
      refetchSummary();
    } else {
      refetchChecks();
    }
    toast.success('Data refreshed');
  };

  const isLoading = activeTab === 'summary' ? summaryLoading : checksLoading;
  const error = activeTab === 'summary' ? summaryError : checksError;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">View month-by-month financial summaries and check payments</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <SmartDateSelector
              dateRange={dateRange}
              onDateChange={setDateRange}
            />
          </div>
          <div className="w-48">
            <CompanySelector
              value={selectedCompany}
              onChange={setSelectedCompany}
              allowAll={true}
              required={false}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Refresh"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleGeneratePDF(activeTab)}
              disabled={generating || isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 inline-block mr-2" />
            Financial Summary
          </button>
          <button
            onClick={() => setActiveTab('checks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'checks'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <CreditCardIcon className="h-5 w-5 inline-block mr-2" />
            Checks Report
          </button>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300">
          Failed to load report data. Please try again.
        </div>
      )}

      {/* Summary Tab Content */}
      {activeTab === 'summary' && !isLoading && !error && summaryData?.data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={BanknotesIcon}
              title="Total Income"
              value={formatCurrency(summaryData.data.totals?.totalIncome || 0)}
              colorClass="text-green-600"
            />
            <SummaryCard
              icon={ArrowTrendingDownIcon}
              title="Total Expenses"
              value={formatCurrency(summaryData.data.totals?.totalExpenses || 0)}
              colorClass="text-red-600"
            />
            <SummaryCard
              icon={ArrowTrendingUpIcon}
              title="Net Income"
              value={formatCurrency(summaryData.data.totals?.netIncome || 0)}
              colorClass={summaryData.data.totals?.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <SummaryCard
              icon={ChartBarIcon}
              title="Transactions"
              value={(summaryData.data.totals?.totalTransactions || 0).toLocaleString()}
              colorClass="text-blue-600"
            />
          </div>

          {/* Monthly Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Monthly Income vs Expenses</h3>
            <BarChart
              data={summaryChartData}
              incomeKey="income"
              expenseKey="expenses"
              labelKey="label"
              height={280}
            />
          </div>

          {/* Monthly Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Income</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expenses</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Net Income</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Transactions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {summaryData.data.months?.map((month, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{month.monthLabel}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(month.income.total)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(month.expenses.total)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${month.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(month.netIncome)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{month.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Month-by-Month Category Breakdowns */}
          <MonthlyCategoryTable
            title="Income by Category (Month-to-Month)"
            months={summaryData.data.months}
            type="income"
          />
          <MonthlyCategoryTable
            title="Expenses by Category (Month-to-Month)"
            months={summaryData.data.months}
            type="expense"
          />
        </div>
      )}

      {/* Checks Tab Content */}
      {activeTab === 'checks' && !isLoading && !error && checksData?.data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={CreditCardIcon}
              title="Total Checks"
              value={(checksData.data.totals?.totalChecks || 0).toLocaleString()}
              colorClass="text-blue-600"
            />
            <SummaryCard
              icon={BanknotesIcon}
              title="Total Amount"
              value={formatCurrency(checksData.data.totals?.totalAmount || 0)}
              colorClass="text-gray-900 dark:text-white"
            />
            <SummaryCard
              icon={ArrowTrendingUpIcon}
              title="Income Checks"
              value={`${checksData.data.totals?.incomeCount || 0} (${formatCurrency(checksData.data.totals?.totalIncome || 0)})`}
              colorClass="text-green-600"
            />
            <SummaryCard
              icon={ArrowTrendingDownIcon}
              title="Expense Checks"
              value={`${checksData.data.totals?.expenseCount || 0} (${formatCurrency(checksData.data.totals?.totalExpense || 0)})`}
              colorClass="text-red-600"
            />
          </div>

          {/* Monthly Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Monthly Check Payments</h3>
            <BarChart
              data={checksChartData}
              incomeKey="income"
              expenseKey="expense"
              labelKey="label"
              height={280}
            />
          </div>

          {/* Monthly Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Checks Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"># Checks</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Income</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expense</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {checksData.data.months?.map((month, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{month.monthLabel}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">{month.totalChecks}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">{formatCurrency(month.income.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(month.expense.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(month.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Month-by-Month Payee Breakdowns */}
          <MonthlyPayeeTable
            title="Income Checks by Payee (Month-to-Month)"
            months={checksData.data.months}
            type="income"
          />
          <MonthlyPayeeTable
            title="Expense Checks by Payee (Month-to-Month)"
            months={checksData.data.months}
            type="expense"
          />

          {/* Empty State */}
          {checksData.data.months?.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <CreditCardIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Checks Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No check records found for the selected date range.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State for Summary */}
      {activeTab === 'summary' && !isLoading && !error && summaryData?.data?.months?.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Found</h3>
          <p className="text-gray-600 dark:text-gray-400">No transactions found for the selected date range.</p>
        </div>
      )}
    </div>
  );
};

export default MonthlyReports;
