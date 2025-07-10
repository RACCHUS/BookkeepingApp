import React from 'react';
import { CalendarIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { getYearDateRange, getMonthDateRange, getCurrentDate } from '../../utils';

// Utility functions for date calculations
export const getDatePresets = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const currentMonthRange = getMonthDateRange(currentYear, currentMonth);
  const lastMonthRange = getMonthDateRange(currentYear, currentMonth - 1);
  const currentYearRange = getYearDateRange(currentYear);
  const lastYearRange = getYearDateRange(currentYear - 1);
  
  return [
    {
      id: 'current-month',
      label: 'Current Month',
      icon: CalendarIcon,
      start: currentMonthRange.start,
      end: currentMonthRange.end,
      description: `${today.toLocaleString('default', { month: 'long' })} ${currentYear}`
    },
    {
      id: 'last-month',
      label: 'Last Month', 
      icon: ClockIcon,
      start: lastMonthRange.start,
      end: lastMonthRange.end,
      description: `${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}`
    },
    {
      id: 'current-year',
      label: 'Current Year',
      icon: CalendarIcon,
      start: currentYearRange.start,
      end: currentYearRange.end,
      description: `${currentYear} Full Year`
    },
    {
      id: 'last-year',
      label: 'Last Year',
      icon: ClockIcon,
      start: lastYearRange.start,
      end: lastYearRange.end,
      description: `${currentYear - 1} Full Year`
    },
    {
      id: 'ytd',
      label: 'Year to Date',
      icon: ArrowPathIcon,
      start: currentYearRange.start,
      end: getCurrentDate(),
      description: `Jan 1 - ${today.toLocaleDateString()}, ${currentYear}`
    },
    {
      id: 'last-12-months',
      label: 'Last 12 Months',
      icon: ArrowPathIcon,
      start: new Date(currentYear, currentMonth - 11, 1).toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      description: 'Rolling 12-month period'
    },
    {
      id: 'q1',
      label: 'Q1',
      icon: CalendarIcon,
      start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
      end: new Date(currentYear, 2, 31).toISOString().split('T')[0],
      description: `Q1 ${currentYear} (Jan-Mar)`
    },
    {
      id: 'q2',
      label: 'Q2',
      icon: CalendarIcon,
      start: new Date(currentYear, 3, 1).toISOString().split('T')[0],
      end: new Date(currentYear, 5, 30).toISOString().split('T')[0],
      description: `Q2 ${currentYear} (Apr-Jun)`
    },
    {
      id: 'q3',
      label: 'Q3',
      icon: CalendarIcon,
      start: new Date(currentYear, 6, 1).toISOString().split('T')[0],
      end: new Date(currentYear, 8, 30).toISOString().split('T')[0],
      description: `Q3 ${currentYear} (Jul-Sep)`
    },
    {
      id: 'q4',
      label: 'Q4',
      icon: CalendarIcon,
      start: new Date(currentYear, 9, 1).toISOString().split('T')[0],
      end: new Date(currentYear, 11, 31).toISOString().split('T')[0],
      description: `Q4 ${currentYear} (Oct-Dec)`
    }
  ];
};

// Quick Report Buttons Component
const QuickReportButtons = ({ onDateChange, currentDateRange, onGenerateReport, isGenerating }) => {
  const presets = getDatePresets();
  
  const handlePresetClick = (preset) => {
    onDateChange({
      start: preset.start,
      end: preset.end
    });
  };

  const isActive = (preset) => {
    return currentDateRange.start === preset.start && currentDateRange.end === preset.end;
  };

  return (
    <div className="space-y-4">
      {/* Monthly Reports */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Monthly Reports</h3>
        <div className="grid grid-cols-2 gap-3">
          {presets.filter(p => ['current-month', 'last-month'].includes(p.id)).map((preset) => {
            const Icon = preset.icon;
            const active = isActive(preset);
            
            return (
              <div key={preset.id} className="space-y-2">
                <button
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    w-full flex items-center p-3 rounded-lg border-2 transition-all duration-200
                    ${active 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 mr-3 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs opacity-75">{preset.description}</div>
                  </div>
                </button>
                
                {active && (
                  <button
                    onClick={() => onGenerateReport('tax')}
                    disabled={isGenerating}
                    className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Yearly Reports */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Yearly Reports</h3>
        <div className="grid grid-cols-2 gap-3">
          {presets.filter(p => ['current-year', 'last-year', 'ytd'].includes(p.id)).map((preset) => {
            const Icon = preset.icon;
            const active = isActive(preset);
            
            return (
              <div key={preset.id} className="space-y-2">
                <button
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    w-full flex items-center p-3 rounded-lg border-2 transition-all duration-200
                    ${active 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 mr-3 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs opacity-75">{preset.description}</div>
                  </div>
                </button>
                
                {active && (
                  <button
                    onClick={() => onGenerateReport('tax')}
                    disabled={isGenerating}
                    className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quarterly Reports */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quarterly Reports</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {presets.filter(p => ['q1', 'q2', 'q3', 'q4'].includes(p.id)).map((preset) => {
            const Icon = preset.icon;
            const active = isActive(preset);
            
            return (
              <div key={preset.id} className="space-y-2">
                <button
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    w-full flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200
                    ${active 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 mb-2 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <div className="text-center">
                    <div className="font-medium text-sm">{preset.label}</div>
                    <div className="text-xs opacity-75">{preset.description}</div>
                  </div>
                </button>
                
                {active && (
                  <button
                    onClick={() => onGenerateReport('tax')}
                    disabled={isGenerating}
                    className="w-full py-1 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickReportButtons;
