import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../services/api';
import { 
  DocumentArrowDownIcon, 
  CalendarIcon, 
  ClockIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

const QuickReports = ({ className = '' }) => {
  const [generating, setGenerating] = useState(null);

  const generateQuickReport = async (period) => {
    setGenerating(period.id);
    
    try {
      const response = await apiClient.reports.generateTaxSummaryPDF({
        startDate: period.start,
        endDate: period.end,
        taxYear: new Date(period.start).getFullYear(),
        includeTransactionDetails: true
      });

      // Download the file
      if (response?.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      } else if (response?.data?.filePath) {
        const downloadUrl = `/api/reports/download/${response.data.fileName}`;
        window.open(downloadUrl, '_blank');
      }
      
      toast.success(`${period.label} report generated successfully`);
      
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const getQuickPeriods = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    return [
      {
        id: 'current-month',
        label: 'This Month',
        icon: CalendarIcon,
        start: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
        end: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
        description: today.toLocaleString('default', { month: 'long' }),
        color: 'blue'
      },
      {
        id: 'last-month',
        label: 'Last Month',
        icon: ClockIcon,
        start: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
        end: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
        description: new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' }),
        color: 'indigo'
      },
      {
        id: 'current-year',
        label: 'This Year',
        icon: CalendarIcon,
        start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
        end: new Date(currentYear, 11, 31).toISOString().split('T')[0],
        description: `${currentYear}`,
        color: 'green'
      },
      {
        id: 'last-year',
        label: 'Last Year',
        icon: ClockIcon,
        start: new Date(currentYear - 1, 0, 1).toISOString().split('T')[0],
        end: new Date(currentYear - 1, 11, 31).toISOString().split('T')[0],
        description: `${currentYear - 1}`,
        color: 'emerald'
      },
      {
        id: 'ytd',
        label: 'Year to Date',
        icon: ArrowPathIcon,
        start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
        description: `Jan - ${today.toLocaleDateString('en-US', { month: 'short' })}`,
        color: 'purple'
      }
    ];
  };

  const periods = getQuickPeriods();

  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Quick Reports</h3>
        <DocumentArrowDownIcon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Generate IRS Schedule C reports for common periods
      </p>
      
      <div className="space-y-3">
        {periods.map((period) => {
          const Icon = period.icon;
          const isGenerating = generating === period.id;
          
          return (
            <button
              key={period.id}
              onClick={() => generateQuickReport(period)}
              disabled={isGenerating}
              className={`
                w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 
                hover:border-${period.color}-300 dark:hover:border-${period.color}-500 
                hover:bg-${period.color}-50 dark:hover:bg-${period.color}-900/20 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
              `}
            >
              <div className="flex items-center">
                <div className={`p-2 rounded-md bg-${period.color}-100 dark:bg-${period.color}-900/20 mr-3`}>
                  <Icon className={`h-4 w-4 text-${period.color}-600 dark:text-${period.color}-400`} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {period.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {period.description}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {isGenerating ? '...' : 'PDF'}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          For custom date ranges and more report types, visit the <span className="font-medium">Reports</span> page.
        </p>
      </div>
    </div>
  );
};

export default QuickReports;
