import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const Reports = () => {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    end: new Date().toISOString().split('T')[0] // Today
  });

  // Get transaction summary for the date range
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['transactionSummary', dateRange.start, dateRange.end],
    queryFn: () => apiClient.transactions.getSummary(dateRange.start, dateRange.end),
    enabled: !!user && !!dateRange.start && !!dateRange.end
  });

  // Get category statistics
  const { data: categoryStats } = useQuery({
    queryKey: ['categoryStats', dateRange.start, dateRange.end],
    queryFn: () => apiClient.transactions.getCategoryStats(dateRange.start, dateRange.end),
    enabled: !!user && !!dateRange.start && !!dateRange.end
  });

  const handleGenerateReport = async (reportType) => {
    if (!summaryData?.summary) {
      toast.error('No data available for the selected date range');
      return;
    }

    setGenerating(reportType);
    
    try {
      let response;
      
      switch (reportType) {
        case 'summary':
          response = await apiClient.reports.generateSummaryPDF({
            startDate: dateRange.start,
            endDate: dateRange.end,
            includeDetails: true
          });
          break;
          
        case 'tax':
          response = await apiClient.reports.generateTaxSummaryPDF({
            startDate: dateRange.start,
            endDate: dateRange.end,
            taxYear: new Date(dateRange.start).getFullYear(),
            includeTransactionDetails: true
          });
          break;
          
        case 'category':
          response = await apiClient.reports.generateCategoryBreakdownPDF({
            startDate: dateRange.start,
            endDate: dateRange.end
          });
          break;
          
        default:
          throw new Error('Unknown report type');
      }

      // Download the file
      if (response?.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      } else if (response?.data?.filePath) {
        // For local development, construct download URL
        const downloadUrl = `/api/reports/download/${response.data.fileName}`;
        window.open(downloadUrl, '_blank');
      }
      
      toast.success('Report generated successfully');
      
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const reportTypes = [
    {
      id: 'summary',
      title: 'Transaction Summary Report',
      description: 'Comprehensive overview of all transactions, income, and expenses',
      icon: DocumentTextIcon,
      color: 'blue'
    },
    {
      id: 'tax',
      title: 'Tax Summary Report',
      description: 'IRS-ready report organized by tax categories for filing',
      icon: DocumentArrowDownIcon,
      color: 'green'
    },
    {
      id: 'category',
      title: 'Category Breakdown Report',
      description: 'Detailed breakdown of expenses and income by category',
      icon: ChartBarIcon,
      color: 'purple'
    }
  ];

  if (summaryLoading) {
    return <LoadingSpinner text="Loading report data..." />;
  }

  const summary = summaryData?.summary || {};
  const stats = categoryStats?.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Reports</h1>
        <p className="text-gray-600 dark:text-gray-300 transition-colors">Generate financial and tax reports</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Report Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Income</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${Math.abs(summary.totalIncome || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            ${Math.abs(summary.totalExpenses || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Income</div>
          <div className={`text-2xl font-bold ${(summary.netIncome || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            ${Math.abs(summary.netIncome || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.transactionCount || 0}
          </div>
        </div>
      </div>

      {/* Report Generation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Generate Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isGenerating = generating === report.id;
            
            return (
              <div key={report.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-all">
                <div className="flex items-center mb-4">
                  <div className={`p-2 rounded-lg bg-${report.color}-100 dark:bg-${report.color}-900/20`}>
                    <Icon className={`h-6 w-6 text-${report.color}-600 dark:text-${report.color}-400`} />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {report.description}
                </p>
                <button
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={isGenerating || !summary.transactionCount}
                  className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${report.color}-600 hover:bg-${report.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${report.color}-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Generate PDF
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown */}
      {summary.categoryBreakdown && Object.keys(summary.categoryBreakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Category Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(summary.categoryBreakdown)
              .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
              .map(([category, amount]) => {
                const isIncome = amount > 0;
                const percentage = summary.totalExpenses ? Math.abs(amount / (isIncome ? summary.totalIncome : summary.totalExpenses)) * 100 : 0;
                
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {category}
                        </span>
                        <span className={`text-sm font-bold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isIncome ? '+' : '-'}${Math.abs(amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${isIncome ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {percentage.toFixed(1)}% of {isIncome ? 'income' : 'expenses'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
