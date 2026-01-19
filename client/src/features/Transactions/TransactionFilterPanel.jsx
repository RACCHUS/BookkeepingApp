import React, { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { CATEGORY_GROUPS } from '@shared/constants/categories';

/**
 * TransactionFilterPanel - Reusable, comprehensive filter panel for transactions
 * 
 * Can be used in TransactionList, ExpenseBulkEdit, IncomeBulkEdit, and other pages
 * that need to filter transactions.
 * 
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {Function} props.onReset - Callback to reset all filters
 * @param {Array} props.companies - List of companies for company filter
 * @param {Array} props.payees - List of payees for payee filter
 * @param {Array} props.vendors - List of vendors for vendor filter
 * @param {Array} props.statements - List of statements/uploads for statement filter
 * @param {Array} props.incomeSources - List of income sources for income source filter
 * @param {Array} props.csvImports - List of CSV imports for CSV import filter
 * @param {boolean} props.showSearch - Whether to show search input (default: true)
 * @param {boolean} props.showAdvanced - Whether to show advanced filters section (default: true)
 * @param {boolean} props.showRefresh - Whether to show refresh button (default: false)
 * @param {Function} props.onRefresh - Callback for refresh button
 * @param {boolean} props.isLoading - Whether data is loading (for refresh button)
 * @param {string} props.variant - 'expense' | 'income' | 'all' - affects category options
 * @param {boolean} props.compact - Use compact layout (default: false)
 */
const TransactionFilterPanel = ({
  filters = {},
  onFiltersChange,
  onReset,
  companies = [],
  payees = [],
  vendors = [],
  statements = [],
  incomeSources = [],
  csvImports = [],
  showSearch = true,
  showAdvanced = true,
  showRefresh = false,
  onRefresh,
  isLoading = false,
  variant = 'all',
  compact = false
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm || '');
  const [localDateRange, setLocalDateRange] = useState({
    start: filters.dateRange?.start || '',
    end: filters.dateRange?.end || ''
  });
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  
  const REFRESH_COOLDOWN_SECONDS = 10; // 10 second cooldown between refreshes

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== filters.searchTerm) {
        handleFilterChange('searchTerm', localSearchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Debounce date range - wait for user to finish entering date
  useEffect(() => {
    const timer = setTimeout(() => {
      const startChanged = localDateRange.start !== (filters.dateRange?.start || '');
      const endChanged = localDateRange.end !== (filters.dateRange?.end || '');
      
      if (startChanged || endChanged) {
        // Only update if we have a valid date or empty string
        const isValidStart = !localDateRange.start || /^\d{4}-\d{2}-\d{2}$/.test(localDateRange.start);
        const isValidEnd = !localDateRange.end || /^\d{4}-\d{2}-\d{2}$/.test(localDateRange.end);
        
        if (isValidStart && isValidEnd) {
          onFiltersChange?.({
            ...filters,
            dateRange: localDateRange
          });
        }
      }
    }, 500); // 500ms debounce for date input
    return () => clearTimeout(timer);
  }, [localDateRange]);

  // Sync local search term with external filters
  useEffect(() => {
    if (filters.searchTerm !== undefined && filters.searchTerm !== localSearchTerm) {
      setLocalSearchTerm(filters.searchTerm);
    }
  }, [filters.searchTerm]);

  // Sync local date range with external filters
  useEffect(() => {
    const externalStart = filters.dateRange?.start || '';
    const externalEnd = filters.dateRange?.end || '';
    if (externalStart !== localDateRange.start || externalEnd !== localDateRange.end) {
      setLocalDateRange({ start: externalStart, end: externalEnd });
    }
  }, [filters.dateRange?.start, filters.dateRange?.end]);

  // Refresh cooldown timer
  useEffect(() => {
    if (refreshCooldown > 0) {
      const timer = setTimeout(() => {
        setRefreshCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshCooldown]);

  // Handle refresh with cooldown
  const handleRefresh = () => {
    const now = Date.now();
    const timeSinceLastRefresh = (now - lastRefreshTime) / 1000;
    
    if (timeSinceLastRefresh < REFRESH_COOLDOWN_SECONDS) {
      return; // Still in cooldown
    }
    
    setLastRefreshTime(now);
    setRefreshCooldown(REFRESH_COOLDOWN_SECONDS);
    onRefresh?.();
  };

  const handleFilterChange = (field, value) => {
    onFiltersChange?.({
      ...filters,
      [field]: value
    });
  };

  const handleDateRangeChange = (field, value) => {
    // Update local state - debounced effect will update parent
    setLocalDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountRangeChange = (field, value) => {
    onFiltersChange?.({
      ...filters,
      amountRange: {
        ...filters.amountRange,
        [field]: value
      }
    });
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.category) count++;
    if (filters.type) count++;
    if (filters.companyId) count++;
    if (filters.statementId) count++;
    if (filters.payee || filters.payeeId) count++;
    if (filters.vendor || filters.vendorId) count++;
    if (filters.incomeSourceId) count++;
    if (filters.csvImportId) count++;
    if (filters.amountRange?.min || filters.amountRange?.max) count++;
    if (filters.dateRange?.start || filters.dateRange?.end) count++;
    if (filters.hasCategory) count++;
    if (filters.hasNotes) count++;
    if (filters.is1099) count++;
    if (filters.isReconciled) count++;
    if (filters.isReviewed) count++;
    if (filters.taxDeductible) count++;
    if (filters.hasReceipt) count++;
    if (filters.hasCheckNumber) count++;
    if (filters.source) count++;
    if (filters.hasPdfSource) count++;
    return count;
  }, [filters]);

  // Transaction type options
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'expense', label: 'Expenses' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfers' }
  ];

  // Get expense categories
  const expenseCategories = useMemo(() => {
    const cats = [];
    Object.entries(CATEGORY_GROUPS).forEach(([group, categories]) => {
      if (!['INCOME'].includes(group)) {
        cats.push(...categories);
      }
    });
    return [...new Set(cats)];
  }, []);

  // Get income categories
  const incomeCategories = useMemo(() => {
    return CATEGORY_GROUPS.INCOME || [];
  }, []);

  // Categories based on variant
  const categoryOptions = useMemo(() => {
    if (variant === 'expense') return expenseCategories;
    if (variant === 'income') return incomeCategories;
    return [...expenseCategories, ...incomeCategories];
  }, [variant, expenseCategories, incomeCategories]);

  // Date preset handler
  const handleDatePreset = (preset) => {
    const today = new Date();
    let start = '', end = '';
    
    if (preset === 'today') {
      start = end = today.toISOString().split('T')[0];
    } else if (preset === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (preset === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      start = monthAgo.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (preset === 'quarter') {
      const quarterAgo = new Date(today);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      start = quarterAgo.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (preset === 'year') {
      start = `${today.getFullYear()}-01-01`;
      end = today.toISOString().split('T')[0];
    } else if (preset === 'lastyear') {
      start = `${today.getFullYear() - 1}-01-01`;
      end = `${today.getFullYear() - 1}-12-31`;
    }
    
    // Update local state immediately for quick presets
    setLocalDateRange({ start, end });
    // Also update parent immediately for presets (no need to debounce clicks)
    onFiltersChange?.({
      ...filters,
      dateRange: { start, end }
    });
  };

  const selectClassName = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
  const inputClassName = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
      {/* Primary Filters Row */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'}`}>
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className={`${inputClassName} pl-10`}
            />
          </div>
        )}

        {/* Category */}
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className={selectClassName}
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
            <optgroup key={group} label={group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
              {cats.filter(cat => cat !== 'Uncategorized').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </optgroup>
          ))}
          <option value="__uncategorized__">Uncategorized</option>
        </select>

        {/* Type (only show if variant is 'all') */}
        {variant === 'all' && (
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={selectClassName}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {/* Company */}
        <select
          value={filters.companyId || ''}
          onChange={(e) => handleFilterChange('companyId', e.target.value)}
          className={selectClassName}
        >
          <option value="">All Companies</option>
          <option value="__no_company">No Company</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>

        {/* Statement/Source */}
        {statements.length > 0 && (
          <select
            value={filters.statementId || ''}
            onChange={(e) => handleFilterChange('statementId', e.target.value)}
            className={selectClassName}
          >
            <option value="">All Sources</option>
            <option value="__manual">Manual/Unlinked</option>
            {statements.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.filename}</option>
            ))}
          </select>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isLoading || refreshCooldown > 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                refreshCooldown > 0 
                  ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={refreshCooldown > 0 ? `Wait ${refreshCooldown}s` : 'Refresh transactions'}
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {refreshCooldown > 0 ? `${refreshCooldown}s` : 'Refresh'}
            </button>
          )}
          
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            <XMarkIcon className="w-4 h-4" />
            Reset {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          {showAdvanced && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                showAdvancedFilters 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              More
              {showAdvancedFilters ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && showAdvancedFilters && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Advanced Filters</h4>
          
          {/* Row 1: Payee, Vendor, Income Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Payee Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Payee <span className="text-gray-400">(who you pay)</span>
              </label>
              <select
                value={filters.payee || filters.payeeId || ''}
                onChange={(e) => handleFilterChange('payee', e.target.value)}
                className={selectClassName}
              >
                <option value="">All Payees</option>
                <option value="__no_payee">No Payee</option>
                {payees.map(p => (
                  <option key={p.id || p} value={p.id || p}>{p.name || p}</option>
                ))}
              </select>
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Vendor <span className="text-gray-400">(purchase from)</span>
              </label>
              <select
                value={filters.vendor || filters.vendorId || ''}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
                className={selectClassName}
              >
                <option value="">All Vendors</option>
                <option value="__no_vendor">No Vendor</option>
                {vendors.map(v => (
                  <option key={v.id || v} value={v.id || v}>{v.name || v}</option>
                ))}
              </select>
            </div>

            {/* Income Source (for income variant) */}
            {(variant === 'income' || variant === 'all') && incomeSources.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Income Source
                </label>
                <select
                  value={filters.incomeSourceId || ''}
                  onChange={(e) => handleFilterChange('incomeSourceId', e.target.value)}
                  className={selectClassName}
                >
                  <option value="">All Sources</option>
                  <option value="__no_source">No Source</option>
                  {incomeSources.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* CSV Import */}
            {csvImports.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  CSV Import
                </label>
                <select
                  value={filters.csvImportId || ''}
                  onChange={(e) => handleFilterChange('csvImportId', e.target.value)}
                  className={selectClassName}
                >
                  <option value="">All Imports</option>
                  <option value="__no_import">Not from CSV</option>
                  {csvImports.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.file_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Row 2: Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Min Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={filters.amountRange?.min || ''}
                onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Max Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="No limit"
                value={filters.amountRange?.max || ''}
                onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={localDateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={localDateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          {/* Row 3: Quick Date Presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 py-1">Quick dates:</span>
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'Last 7 Days' },
              { key: 'month', label: 'Last 30 Days' },
              { key: 'quarter', label: 'Last 90 Days' },
              { key: 'year', label: 'This Year' },
              { key: 'lastyear', label: 'Last Year' }
            ].map(preset => (
              <button
                key={preset.key}
                onClick={() => handleDatePreset(preset.key)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Row 4: Boolean Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Has Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Category Status
              </label>
              <select
                value={filters.hasCategory || ''}
                onChange={(e) => handleFilterChange('hasCategory', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Categorized</option>
                <option value="no">Uncategorized</option>
              </select>
            </div>

            {/* Has Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Notes
              </label>
              <select
                value={filters.hasNotes || ''}
                onChange={(e) => handleFilterChange('hasNotes', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="with">With Notes</option>
                <option value="without">Without Notes</option>
              </select>
            </div>

            {/* 1099 Status (expense variant) */}
            {(variant === 'expense' || variant === 'all') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  1099 Status
                </label>
                <select
                  value={filters.is1099 || ''}
                  onChange={(e) => handleFilterChange('is1099', e.target.value)}
                  className={selectClassName}
                >
                  <option value="">All</option>
                  <option value="yes">1099 Payment</option>
                  <option value="no">Not 1099</option>
                </select>
              </div>
            )}

            {/* Reconciliation */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Reconciliation
              </label>
              <select
                value={filters.isReconciled || ''}
                onChange={(e) => handleFilterChange('isReconciled', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Reconciled</option>
                <option value="no">Not Reconciled</option>
              </select>
            </div>

            {/* Review Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Review Status
              </label>
              <select
                value={filters.isReviewed || ''}
                onChange={(e) => handleFilterChange('isReviewed', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Reviewed</option>
                <option value="no">Not Reviewed</option>
              </select>
            </div>

            {/* Tax Deductible */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tax Deductible
              </label>
              <select
                value={filters.taxDeductible || ''}
                onChange={(e) => handleFilterChange('taxDeductible', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Deductible</option>
                <option value="no">Not Deductible</option>
              </select>
            </div>

            {/* Has Receipt */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Receipt
              </label>
              <select
                value={filters.hasReceipt || ''}
                onChange={(e) => handleFilterChange('hasReceipt', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Has Receipt</option>
                <option value="no">No Receipt</option>
              </select>
            </div>

            {/* Has Check Number */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Check Number
              </label>
              <select
                value={filters.hasCheckNumber || ''}
                onChange={(e) => handleFilterChange('hasCheckNumber', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Has Check #</option>
                <option value="no">No Check #</option>
              </select>
            </div>

            {/* Transaction Source */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Source
              </label>
              <select
                value={filters.source || ''}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className={selectClassName}
              >
                <option value="">All Sources</option>
                <option value="manual">Manual Entry</option>
                <option value="pdf_import">PDF Import</option>
                <option value="csv_import">CSV Import</option>
                <option value="bank_sync">Bank Sync</option>
              </select>
            </div>

            {/* Has PDF/Source File */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                PDF/File
              </label>
              <select
                value={filters.hasPdfSource || ''}
                onChange={(e) => handleFilterChange('hasPdfSource', e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="yes">Has PDF/File</option>
                <option value="no">No PDF/File</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400 py-1">Active filters:</span>
              {filters.searchTerm && (
                <FilterTag 
                  label={`Search: "${filters.searchTerm}"`}
                  onRemove={() => { setLocalSearchTerm(''); handleFilterChange('searchTerm', ''); }}
                  color="blue"
                />
              )}
              {filters.category && (
                <FilterTag 
                  label={`Category: ${filters.category === '__uncategorized__' ? 'Uncategorized' : filters.category}`}
                  onRemove={() => handleFilterChange('category', '')}
                  color="purple"
                />
              )}
              {filters.type && (
                <FilterTag 
                  label={`Type: ${filters.type}`}
                  onRemove={() => handleFilterChange('type', '')}
                  color="green"
                />
              )}
              {filters.companyId && (
                <FilterTag 
                  label={`Company: ${companies.find(c => c.id === filters.companyId)?.name || filters.companyId}`}
                  onRemove={() => handleFilterChange('companyId', '')}
                  color="indigo"
                />
              )}
              {(filters.dateRange?.start || filters.dateRange?.end) && (
                <FilterTag 
                  label={`Date: ${filters.dateRange?.start || '...'} to ${filters.dateRange?.end || '...'}`}
                  onRemove={() => onFiltersChange?.({ ...filters, dateRange: { start: '', end: '' } })}
                  color="orange"
                />
              )}
              {(filters.amountRange?.min || filters.amountRange?.max) && (
                <FilterTag 
                  label={`Amount: $${filters.amountRange?.min || '0'} - $${filters.amountRange?.max || '∞'}`}
                  onRemove={() => onFiltersChange?.({ ...filters, amountRange: { min: '', max: '' } })}
                  color="yellow"
                />
              )}
              {filters.hasReceipt && (
                <FilterTag 
                  label={`Receipt: ${filters.hasReceipt === 'yes' ? 'Has' : 'None'}`}
                  onRemove={() => handleFilterChange('hasReceipt', '')}
                  color="gray"
                />
              )}
              {filters.hasCheckNumber && (
                <FilterTag 
                  label={`Check #: ${filters.hasCheckNumber === 'yes' ? 'Has' : 'None'}`}
                  onRemove={() => handleFilterChange('hasCheckNumber', '')}
                  color="gray"
                />
              )}
              {filters.source && (
                <FilterTag 
                  label={`Source: ${filters.source.replace('_', ' ')}`}
                  onRemove={() => handleFilterChange('source', '')}
                  color="indigo"
                />
              )}
              {filters.hasPdfSource && (
                <FilterTag 
                  label={`PDF: ${filters.hasPdfSource === 'yes' ? 'Has' : 'None'}`}
                  onRemove={() => handleFilterChange('hasPdfSource', '')}
                  color="red"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * FilterTag - Small tag showing an active filter with remove button
 */
const FilterTag = ({ label, onRemove, color = 'gray' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {label}
      <button 
        onClick={onRemove} 
        className="ml-1 hover:opacity-70"
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </span>
  );
};

export default TransactionFilterPanel;
