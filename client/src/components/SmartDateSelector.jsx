import React, { useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getYearDateRange, getMonthDateRange, getCurrentDate, formatDateForDisplay } from '../utils/dateUtils';

const SmartDateSelector = ({ dateRange, onDateChange, className = '' }) => {
  const [selectedMode, setSelectedMode] = useState('preset'); // 'preset', 'monthly', 'yearly', 'custom'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Generate year options (last 10 years + next 2 years)
  const getYearOptions = () => {
    const years = [];
    for (let year = currentYear - 10; year <= currentYear + 2; year++) {
      years.push(year);
    }
    return years;
  };

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Quick presets
  const getPresets = () => [
    {
      id: 'current-month',
      label: 'This Month',
      ...getMonthDateRange(currentYear, currentMonth)
    },
    {
      id: 'last-month',
      label: 'Last Month',
      ...getMonthDateRange(currentYear, currentMonth - 1)
    },
    {
      id: 'current-year',
      label: 'This Year',
      ...getYearDateRange(currentYear)
    },
    {
      id: 'last-year',
      label: 'Last Year',
      ...getYearDateRange(currentYear - 1)
    },
    {
      id: 'ytd',
      label: 'Year to Date',
      start: getYearDateRange(currentYear).start,
      end: getCurrentDate()
    },
    {
      id: 'last-12-months',
      label: 'Last 12 Months',
      ...getMonthDateRange(currentYear, currentMonth - 11),
      end: getCurrentDate()
    }
  ];

  const handlePresetClick = (preset) => {
    onDateChange({
      start: preset.start,
      end: preset.end
    });
    setSelectedMode('preset');
  };

  const handleMonthSelection = (year, month) => {
    const { start, end } = getMonthDateRange(year, month);
    
    onDateChange({ start, end });
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedMode('monthly');
  };

  const handleYearSelection = (year) => {
    const { start, end } = getYearDateRange(year);
    
    onDateChange({ start, end });
    setSelectedYear(year);
    setSelectedMode('yearly');
  };

  const isCurrentSelection = (mode, year = null, month = null) => {
    if (mode === 'monthly' && year !== null && month !== null) {
      const { start: expectedStart, end: expectedEnd } = getMonthDateRange(year, month);
      return dateRange.start === expectedStart && dateRange.end === expectedEnd;
    }
    if (mode === 'yearly' && year !== null) {
      const { start: expectedStart, end: expectedEnd } = getYearDateRange(year);
      return dateRange.start === expectedStart && dateRange.end === expectedEnd;
    }
    return false;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Smart Date Selection</h3>
      
      {/* Mode selector tabs */}
      <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {[
          { id: 'preset', label: 'Quick' },
          { id: 'monthly', label: 'Monthly' },
          { id: 'yearly', label: 'Yearly' },
          { id: 'custom', label: 'Custom' }
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            className={`
              px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
              ${selectedMode === mode.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Quick Presets */}
      {selectedMode === 'preset' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {getPresets().map((preset) => {
            const isActive = dateRange.start === preset.start && dateRange.end === preset.end;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium
                  ${isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Monthly Selector */}
      {selectedMode === 'monthly' && (
        <div className="space-y-4">
          {/* Year selector */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedYear(prev => Math.max(prev - 1, currentYear - 10))}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={selectedYear <= currentYear - 10}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedYear}
            </h4>
            <button
              onClick={() => setSelectedYear(prev => Math.min(prev + 1, currentYear + 2))}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={selectedYear >= currentYear + 2}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {months.map((month, index) => {
              const isActive = isCurrentSelection('monthly', selectedYear, index);
              const isCurrentMonth = selectedYear === currentYear && index === currentMonth;
              
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelection(selectedYear, index)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium relative
                    ${isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {month.slice(0, 3)}
                  {isCurrentMonth && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Yearly Selector */}
      {selectedMode === 'yearly' && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {getYearOptions().map((year) => {
            const isActive = isCurrentSelection('yearly', year);
            const isCurrentYear = year === currentYear;
            
            return (
              <button
                key={year}
                onClick={() => handleYearSelection(year)}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium relative
                  ${isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {year}
                {isCurrentYear && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Date Range */}
      {selectedMode === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateChange(prev => ({ ...prev, start: e.target.value }))}
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
                onChange={(e) => onDateChange(prev => ({ ...prev, end: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected range display */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Selected Period:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDateForDisplay(dateRange.start)} - {formatDateForDisplay(dateRange.end)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SmartDateSelector;
