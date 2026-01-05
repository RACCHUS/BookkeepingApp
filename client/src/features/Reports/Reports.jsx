import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { SmartDateSelector } from "../../components/forms";
import { CompanySelector } from '../../components/common';
import ReportPreview from './ReportPreview';
import {
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PrinterIcon,
  ClockIcon,
  ArrowPathIcon,
  FolderIcon,
  XMarkIcon,
  CreditCardIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ReceiptPercentIcon,
  ArrowRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Reports = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generating, setGenerating] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [uploadFilter, setUploadFilter] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    end: new Date().toISOString().split('T')[0] // Today
  });

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Handle URL parameters for upload-specific reports
  useEffect(() => {
    const uploadId = searchParams.get('uploadId');
    const uploadName = searchParams.get('uploadName');
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (uploadId) {
      setUploadFilter({ id: uploadId, name: uploadName || 'Unknown Upload' });
    }

    if (companyId) {
      setSelectedCompany(companyId);
    }

    if (startDate && endDate) {
      setDateRange({ start: startDate, end: endDate });
    }
  }, [searchParams]);

  const clearUploadFilter = () => {
    setUploadFilter(null);
    // Remove upload-related search params
    const newSearchParams = new URLSearchParams();
    setSearchParams(newSearchParams);
  };

  // Get transaction summary for the date range and company
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['transactionSummary', dateRange.start, dateRange.end, selectedCompany, uploadFilter?.id],
    queryFn: () => {
      const filters = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      if (selectedCompany && selectedCompany !== 'all') {
        filters.companyId = selectedCompany;
      }
      if (uploadFilter?.id) {
        filters.uploadId = uploadFilter.id;
      }
      return apiClient.transactions.getSummary(filters.startDate, filters.endDate, filters);
    },
    enabled: !!user && !!dateRange.start && !!dateRange.end
  });

  // Get category statistics
  const { data: categoryStats } = useQuery({
    queryKey: ['categoryStats', dateRange.start, dateRange.end, selectedCompany, uploadFilter?.id],
    queryFn: () => {
      const filters = {};
      if (selectedCompany && selectedCompany !== 'all') {
        filters.companyId = selectedCompany;
      }
      if (uploadFilter?.id) {
        filters.uploadId = uploadFilter.id;
      }
      return apiClient.transactions.getCategoryStats(dateRange.start, dateRange.end, filters);
    },
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
      
      const reportFilters = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      if (selectedCompany && selectedCompany !== 'all') {
        reportFilters.companyId = selectedCompany;
      }
      
      if (uploadFilter?.id) {
        reportFilters.uploadId = uploadFilter.id;
      }
      
      switch (reportType) {
        case 'summary':
          response = await apiClient.reports.generateSummaryPDF({
            ...reportFilters,
            includeDetails: true
          });
          break;
          
        case 'tax':
          response = await apiClient.reports.generateTaxSummaryPDF({
            ...reportFilters,
            taxYear: new Date(dateRange.start).getFullYear(),
            includeTransactionDetails: true
          });
          break;
          
        case 'category':
          response = await apiClient.reports.generateCategoryBreakdownPDF({
            ...reportFilters
          });
          break;
          
        case 'checks':
          response = await apiClient.reports.generateChecksPaidPDF({
            ...reportFilters
          });
          break;
          
        case '1099':
          response = await apiClient.reports.generate1099SummaryPDF({
            ...reportFilters,
            includeDetails: true
          });
          break;
          
        case 'vendor':
          response = await apiClient.reports.generateVendorSummaryPDF({
            ...reportFilters,
            includeDetails: true
          });
          break;
          
        case 'payee-summary':
          response = await apiClient.reports.generatePayeeSummaryPDF({
            ...reportFilters,
            includeDetails: true
          });
          break;
          
        default:
          throw new Error('Unknown report type');
      }

      // Handle blob response - create download link
      if (response instanceof Blob) {
        const url = window.URL.createObjectURL(response);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}-report-${dateRange.start}-to-${dateRange.end}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Report downloaded successfully');
      
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  // Handle preview report - fetches data and opens modal
  const handlePreviewReport = async (reportType) => {
    if (!summaryData?.summary) {
      toast.error('No data available for the selected date range');
      return;
    }

    setLoadingPreview(true);
    setPreviewType(reportType);
    
    try {
      const reportFilters = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      if (selectedCompany && selectedCompany !== 'all') {
        reportFilters.companyId = selectedCompany;
      }
      
      if (uploadFilter?.id) {
        reportFilters.uploadId = uploadFilter.id;
      }

      let data;
      
      switch (reportType) {
        case 'summary':
          // Fetch profit/loss report which has the full structure
          data = await apiClient.reports.profitLoss(reportFilters);
          break;
          
        case 'tax':
          data = await apiClient.reports.taxSummary({
            ...reportFilters,
            taxYear: new Date(dateRange.start).getFullYear()
          });
          break;
          
        case 'category':
          // Fetch expense summary for proper category breakdown
          data = await apiClient.reports.expenseSummary(reportFilters);
          break;
          
        case 'checks':
          // Fetch check transactions (sectionCode = 'checks')
          const checksRes = await apiClient.transactions.getAll({
            ...reportFilters,
            sectionCode: 'checks',
            limit: 500
          });
          const checksList = checksRes.data?.transactions || checksRes.transactions || checksRes || [];
          data = { 
            checks: Array.isArray(checksList) ? checksList : [],
            summary: {
              totalChecks: Array.isArray(checksList) ? checksList.length : 0,
              totalAmount: Array.isArray(checksList) ? checksList.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) : 0
            }
          };
          break;
          
        case '1099':
          data = await apiClient.reports.get1099Summary(reportFilters);
          break;
          
        case 'vendor':
          data = await apiClient.reports.getVendorSummary(reportFilters);
          break;
          
        case 'payee-summary':
          data = await apiClient.reports.getPayeeSummary(reportFilters);
          break;
          
        default:
          throw new Error('Unknown report type');
      }

      setPreviewData(data);
      setPreviewOpen(true);
      
    } catch (error) {
      console.error('Preview generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to load report preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Download PDF from preview modal
  const handleDownloadFromPreview = async () => {
    if (previewType) {
      await handleGenerateReport(previewType);
    }
  };

  const reportTypes = [
    {
      id: 'summary',
      title: 'Financial Summary Report',
      description: 'Comprehensive overview of all transactions, income, and expenses',
      icon: DocumentTextIcon,
      color: 'blue',
      recommended: false
    },
    {
      id: 'tax',
      title: 'IRS Schedule C Tax Report',
      description: 'IRS-ready report organized by Schedule C categories for tax filing',
      icon: DocumentArrowDownIcon,
      color: 'green',
      recommended: true
    },
    {
      id: 'category',
      title: 'Category Breakdown Report',
      description: 'Detailed breakdown of expenses and income by IRS category',
      icon: ChartBarIcon,
      color: 'purple',
      recommended: false
    },
    {
      id: 'checks',
      title: 'Checks Paid Report',
      description: 'Summary of all check and ACH payments grouped by payee',
      icon: CreditCardIcon,
      color: 'indigo',
      recommended: false
    },
    {
      id: '1099',
      title: '1099-NEC Summary',
      description: 'Contractors who received $600+ for tax filing - identifies who needs a 1099',
      icon: ReceiptPercentIcon,
      color: 'red',
      recommended: true,
      badge: 'Tax'
    },
    {
      id: 'vendor',
      title: 'Vendor Payment Summary',
      description: 'All vendor payments with YTD totals and category breakdown',
      icon: BuildingStorefrontIcon,
      color: 'amber',
      recommended: false
    },
    {
      id: 'payee-summary',
      title: 'Payee Summary Report',
      description: 'All payee payments with quarterly breakdown and 1099 threshold warnings',
      icon: UserGroupIcon,
      color: 'teal',
      recommended: false
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
        <p className="text-gray-600 dark:text-gray-300 transition-colors">Generate financial and tax reports for any time period</p>
      </div>

      {/* Upload Filter */}
      {uploadFilter && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Showing data for upload: {uploadFilter.name}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Reports are filtered to show only transactions from this uploaded file
                </p>
              </div>
            </div>
            <button
              onClick={clearUploadFilter}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              title="Clear upload filter"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Smart Date Selector */}
      <SmartDateSelector 
        dateRange={dateRange}
        onDateChange={setDateRange}
      />

      {/* Company Filter */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Filter by Company</h2>
        </div>
        <div className="max-w-md">
          <CompanySelector
            value={selectedCompany}
            onChange={setSelectedCompany}
            allowAll={true}
            placeholder="All Companies"
            required={false}
          />
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Generate Reports</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {summary.transactionCount || 0} transactions in selected period
          </div>
        </div>

        {/* Monthly Reports Link */}
        <div className="mb-6">
          <Link 
            to="/reports/monthly" 
            className="group block p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg mr-4">
                  <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Reports</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    View month-by-month financial summaries and check payments with interactive charts
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isGenerating = generating === report.id;
            
            // Define color classes to ensure they're included in Tailwind build
            const colorClasses = {
              blue: {
                icon: 'bg-blue-100 dark:bg-blue-900/20',
                iconColor: 'text-blue-600 dark:text-blue-400',
                button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              },
              green: {
                icon: 'bg-green-100 dark:bg-green-900/20',
                iconColor: 'text-green-600 dark:text-green-400',
                button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              },
              purple: {
                icon: 'bg-purple-100 dark:bg-purple-900/20',
                iconColor: 'text-purple-600 dark:text-purple-400',
                button: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
              },
              indigo: {
                icon: 'bg-indigo-100 dark:bg-indigo-900/20',
                iconColor: 'text-indigo-600 dark:text-indigo-400',
                button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }
            };
            
            const colors = colorClasses[report.color] || colorClasses.blue;
            
            return (
              <div key={report.id} className={`
                relative border-2 rounded-lg p-6 hover:shadow-md transition-all
                ${report.recommended 
                  ? 'border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10' 
                  : 'border-gray-200 dark:border-gray-700'
                }
              `}>
                {report.recommended && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                <div className="flex items-center mb-4">
                  <div className={`p-2 rounded-lg ${colors.icon}`}>
                    <Icon className={`h-6 w-6 ${colors.iconColor}`} />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {report.description}
                </p>
                <div className="flex gap-2">
                  {/* Preview Button */}
                  <button
                    onClick={() => handlePreviewReport(report.id)}
                    disabled={loadingPreview || !summary.transactionCount}
                    className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingPreview && previewType === report.id ? (
                      <LoadingSpinner size="sm" className="mr-1" />
                    ) : (
                      <EyeIcon className="h-4 w-4 mr-1" />
                    )}
                    Preview
                  </button>
                  
                  {/* Download PDF Button */}
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={isGenerating || !summary.transactionCount}
                    className={`
                      flex-1 flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                      ${report.recommended 
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                        : colors.button
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                    `}
                  >
                    {isGenerating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-1" />
                        ...
                      </>
                    ) : (
                      <>
                        <PrinterIcon className="h-4 w-4 mr-1" />
                        PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {!summary.transactionCount && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  No transactions found for the selected date range. Please choose a different period or add some transactions.
                </p>
              </div>
            </div>
          </div>
        )}
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

      {/* Report Preview Modal */}
      <ReportPreview
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewData(null);
          setPreviewType(null);
        }}
        reportType={previewType}
        reportData={previewData}
        dateRange={dateRange}
        onDownload={handleDownloadFromPreview}
        downloading={generating === previewType}
      />
    </div>
  );
};

export default Reports;
