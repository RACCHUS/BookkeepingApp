import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  CheckIcon,
  PencilSquareIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

// React Query cache settings to prevent excessive Firestore reads
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Cache persists for 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

/**
 * IncomeBulkEdit - Bulk edit income transactions
 * Supports: category, income source, company, payee, statement, description, 
 * date, amount, notes, and type change to expense
 */
const IncomeBulkEdit = ({ 
  companies: companiesProp = [], 
  payees: payeesProp = [], 
  vendors: vendorsProp = [],
  incomeSources: incomeSourcesProp = [],
  statements: statementsProp = [],
  onRefresh 
}) => {
  // Ensure all props are arrays to prevent .map errors
  const companies = Array.isArray(companiesProp) ? companiesProp : [];
  const payees = Array.isArray(payeesProp) ? payeesProp : [];
  const vendors = Array.isArray(vendorsProp) ? vendorsProp : [];
  const incomeSources = Array.isArray(incomeSourcesProp) ? incomeSourcesProp : [];
  const statements = Array.isArray(statementsProp) ? statementsProp : [];

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    companyId: '',
    incomeSourceId: '',
    statementId: '',
    hasCategory: '',
    hasSource: ''
  });
  
  // Bulk update fields
  const [bulkUpdates, setBulkUpdates] = useState({
    category: '',
    incomeSourceId: '',
    incomeSourceName: '',
    companyId: '',
    companyName: '',
    payeeId: '',
    payeeName: '',
    vendorId: '',
    vendorName: '',
    statementId: '',
    notes: '',
    appendNotes: false,
    description: '',
    sectionCode: '',
    type: '', // For changing to expense
    date: '',
    amount: ''
  });

  // Income categories from IRS Schedule C
  const incomeCategories = [
    'Gross Receipts',
    'Gross Receipts - Sales',
    'Gross Receipts - Services',
    'Gross Receipts or Sales',
    'Returns and Allowances',
    'Interest Income',
    'Dividend Income',
    'Rental Income',
    'Royalties',
    'Other Income',
    'Business Income',
    'Customer Payments',
    'Service Revenue',
    'Product Sales',
    'Consulting Income',
    'Freelance Income',
    'Commission Income',
    'Refunds Received'
  ];

  // Expense categories (for type conversion)
  const expenseCategories = [
    'Advertising',
    'Car and Truck Expenses',
    'Commissions and Fees',
    'Contract Labor',
    'Office Expenses',
    'Supplies (Not Inventory)',
    'Utilities',
    'Repairs and Maintenance',
    'Insurance (Other than Health)',
    'Legal and Professional Services',
    'Rent or Lease (Other Business Property)',
    'Travel',
    'Meals',
    'Bank Fees',
    'Software Subscriptions',
    'Other Expenses',
    'Uncategorized'
  ];

  // Statement section codes
  const sectionCodes = [
    { value: 'deposits', label: 'Deposits' },
    { value: 'checks', label: 'Checks Paid' },
    { value: 'electronic', label: 'Electronic Payments' },
    { value: 'transfers', label: 'Transfers' },
    { value: 'other', label: 'Other' }
  ];

  // Check if a transaction is income
  const isIncomeTransaction = (tx) => {
    if (tx.type === 'income') return true;
    if (tx.type === 'expense') return false;
    
    // Check for income indicators
    if (tx.category) {
      const catLower = tx.category.toLowerCase();
      if (incomeCategories.some(cat => catLower.includes(cat.toLowerCase()))) {
        return true;
      }
      if (catLower.includes('income') || catLower.includes('receipt') || catLower.includes('revenue')) {
        return true;
      }
    }
    
    if (tx.sectionCode === 'deposits') return true;
    
    // Positive amounts might indicate income
    if (tx.amount > 0 && !tx.sectionCode) return true;
    
    return false;
  };

  // Fetch income transactions with React Query caching
  const { 
    data: transactions = [], 
    isLoading, 
    refetch: refetchTransactions 
  } = useQuery({
    queryKey: ['income-transactions'],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      const allTransactions = response?.data?.transactions || response?.transactions || [];
      return allTransactions.filter(isIncomeTransaction);
    },
    ...QUERY_CONFIG,
    onError: (error) => {
      console.error('Error fetching income transactions:', error);
      toast.error('Failed to load income transactions');
    },
  });

  // Apply filters
  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = !searchTerm || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.payee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.incomeSourceName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = !filters.category || tx.category === filters.category;
    
    // Company filter
    const matchesCompany = !filters.companyId || tx.companyId === filters.companyId;
    
    // Income source filter
    const matchesSource = !filters.incomeSourceId || tx.incomeSourceId === filters.incomeSourceId;
    
    // Statement filter
    const matchesStatement = !filters.statementId || tx.statementId === filters.statementId;
    
    // Has category filter
    const matchesHasCategory = 
      filters.hasCategory === '' || 
      (filters.hasCategory === 'yes' && tx.category) ||
      (filters.hasCategory === 'no' && !tx.category);
    
    // Has source filter
    const matchesHasSource = 
      filters.hasSource === '' || 
      (filters.hasSource === 'yes' && tx.incomeSourceId) ||
      (filters.hasSource === 'no' && !tx.incomeSourceId);
    
    return matchesSearch && matchesCategory && matchesCompany && 
           matchesSource && matchesStatement && 
           matchesHasCategory && matchesHasSource;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount || 0));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(tx => tx.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(txId => txId !== id)
        : [...prev, id]
    );
  };

  const toggleExpand = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkUpdateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBulkUpdates(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Handle linked fields
    if (name === 'companyId') {
      const company = companies?.find(c => c.id === value);
      setBulkUpdates(prev => ({ ...prev, companyName: company?.name || '' }));
    }
    if (name === 'payeeId') {
      const payee = payees?.find(p => p.id === value);
      setBulkUpdates(prev => ({ ...prev, payeeName: payee?.name || '' }));
    }
    if (name === 'vendorId') {
      const vendor = vendors?.find(v => v.id === value);
      setBulkUpdates(prev => ({ ...prev, vendorName: vendor?.name || '' }));
    }
    if (name === 'incomeSourceId') {
      const source = incomeSources?.find(s => s.id === value);
      setBulkUpdates(prev => ({ ...prev, incomeSourceName: source?.name || '' }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      companyId: '',
      incomeSourceId: '',
      statementId: '',
      hasCategory: '',
      hasSource: ''
    });
    setSearchTerm('');
  };

  const handleBulkUpdate = async () => {
    if (selectedTransactions.length === 0) {
      toast.error('Please select transactions to update');
      return;
    }

    // Build update object with only non-empty fields
    const updateData = {};
    
    if (bulkUpdates.category) updateData.category = bulkUpdates.category;
    if (bulkUpdates.incomeSourceId) {
      updateData.incomeSourceId = bulkUpdates.incomeSourceId;
      updateData.incomeSourceName = bulkUpdates.incomeSourceName;
    }
    if (bulkUpdates.companyId) {
      updateData.companyId = bulkUpdates.companyId;
      updateData.companyName = bulkUpdates.companyName;
    }
    if (bulkUpdates.payeeId) {
      updateData.payeeId = bulkUpdates.payeeId;
      updateData.payeeName = bulkUpdates.payeeName;
    }
    if (bulkUpdates.vendorId) {
      updateData.vendorId = bulkUpdates.vendorId;
      updateData.vendorName = bulkUpdates.vendorName;
    }
    if (bulkUpdates.statementId) updateData.statementId = bulkUpdates.statementId;
    if (bulkUpdates.sectionCode) updateData.sectionCode = bulkUpdates.sectionCode;
    if (bulkUpdates.type) {
      updateData.type = bulkUpdates.type;
      // If converting to expense, clear income source
      if (bulkUpdates.type === 'expense') {
        updateData.incomeSourceId = null;
        updateData.incomeSourceName = null;
      }
    }
    if (bulkUpdates.date) updateData.date = bulkUpdates.date;
    if (bulkUpdates.amount) updateData.amount = parseFloat(bulkUpdates.amount);
    if (bulkUpdates.description?.trim()) updateData.description = bulkUpdates.description.trim();
    
    // Handle notes (append or replace)
    if (bulkUpdates.notes?.trim()) {
      updateData.notes = bulkUpdates.notes.trim();
      updateData.appendNotes = bulkUpdates.appendNotes;
    }

    if (Object.keys(updateData).length === 0) {
      toast.error('Please fill in at least one field to update');
      return;
    }

    setIsUpdating(true);
    try {
      // Build transactions array for bulk update
      const transactionsToUpdate = selectedTransactions.map(id => {
        const updatePayload = { id };
        
        // Handle notes append logic
        if (updateData.notes) {
          if (updateData.appendNotes) {
            const existingTx = transactions.find(tx => tx.id === id);
            updatePayload.notes = existingTx?.notes 
              ? `${existingTx.notes}\n${updateData.notes}` 
              : updateData.notes;
          } else {
            updatePayload.notes = updateData.notes;
          }
        }
        
        // Add other fields
        Object.entries(updateData).forEach(([key, value]) => {
          if (key !== 'notes' && key !== 'appendNotes') {
            updatePayload[key] = value;
          }
        });
        
        return updatePayload;
      });

      await api.transactions.bulkUpdate(transactionsToUpdate);
      
      toast.success(`Updated ${selectedTransactions.length} transaction(s)`);
      setSelectedTransactions([]);
      setBulkUpdates({
        category: '',
        incomeSourceId: '',
        incomeSourceName: '',
        companyId: '',
        companyName: '',
        payeeId: '',
        payeeName: '',
        vendorId: '',
        vendorName: '',
        statementId: '',
        notes: '',
        appendNotes: false,
        description: '',
        sectionCode: '',
        type: '',
        date: '',
        amount: ''
      });
      setShowBulkPanel(false);
      refetchTransactions();
      onRefresh?.();
    } catch (error) {
      console.error('Error bulk updating transactions:', error);
      toast.error('Failed to update transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Calculate stats
  const totalIncome = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const uncategorizedCount = transactions.filter(tx => !tx.category).length;
  const unassignedCount = transactions.filter(tx => !tx.incomeSourceId).length;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Income Transactions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{transactions.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Income Amount</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Uncategorized</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{uncategorizedCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Unassigned (No Source)</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{unassignedCount}</div>
        </div>
      </div>

      {/* Header with search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        {/* Search Row */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, payee, source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <button
            onClick={() => refetchTransactions()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Categories</option>
            {incomeCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            name="incomeSourceId"
            value={filters.incomeSourceId}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Sources</option>
            {incomeSources?.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>

          <select
            name="companyId"
            value={filters.companyId}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Companies</option>
            {companies?.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          <select
            name="hasCategory"
            value={filters.hasCategory}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Has Category?</option>
            <option value="yes">Categorized</option>
            <option value="no">Uncategorized</option>
          </select>

          <select
            name="hasSource"
            value={filters.hasSource}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Has Source?</option>
            <option value="yes">Assigned</option>
            <option value="no">Unassigned</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selection Actions Bar */}
      {selectedTransactions.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-green-700 dark:text-green-300 font-medium">
                {selectedTransactions.length} transaction(s) selected
              </span>
              <button
                onClick={() => setSelectedTransactions([])}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                Clear selection
              </button>
            </div>
            
            <button
              onClick={() => setShowBulkPanel(!showBulkPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PencilSquareIcon className="w-5 h-5" />
              Bulk Edit
              {showBulkPanel ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Bulk Edit Panel */}
          {showBulkPanel && (
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Only filled fields will be updated. Empty fields will be left unchanged.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      value={bulkUpdates.category}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {incomeCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Income Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Income Source
                    </label>
                    <select
                      name="incomeSourceId"
                      value={bulkUpdates.incomeSourceId}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {incomeSources?.map(source => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company
                    </label>
                    <select
                      name="companyId"
                      value={bulkUpdates.companyId}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {companies?.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payee
                    </label>
                    <select
                      name="payeeId"
                      value={bulkUpdates.payeeId}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {payees?.map(payee => (
                        <option key={payee.id} value={payee.id}>{payee.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vendor
                    </label>
                    <select
                      name="vendorId"
                      value={bulkUpdates.vendorId}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {vendors?.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Statement */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Statement
                    </label>
                    <select
                      name="statementId"
                      value={bulkUpdates.statementId}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {statements?.map(stmt => (
                        <option key={stmt.id} value={stmt.id}>{stmt.name || stmt.filename}</option>
                      ))}
                    </select>
                  </div>

                  {/* Section Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Statement Section
                    </label>
                    <select
                      name="sectionCode"
                      value={bulkUpdates.sectionCode}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {sectionCodes.map(section => (
                        <option key={section.value} value={section.value}>{section.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type (change to expense) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Transaction Type
                    </label>
                    <select
                      name="type"
                      value={bulkUpdates.type}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={bulkUpdates.date}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={bulkUpdates.amount}
                      onChange={handleBulkUpdateChange}
                      step="0.01"
                      placeholder="Don't change"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={bulkUpdates.description}
                      onChange={handleBulkUpdateChange}
                      placeholder="Don't change"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Notes Section */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={bulkUpdates.notes}
                    onChange={handleBulkUpdateChange}
                    rows={2}
                    placeholder="Don't change"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="appendNotes"
                      checked={bulkUpdates.appendNotes}
                      onChange={handleBulkUpdateChange}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Append to existing notes (instead of replacing)
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowBulkPanel(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUpdate}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isUpdating ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-5 h-5" />
                        Apply to {selectedTransactions.length} Transaction(s)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No income transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map(tx => (
                  <React.Fragment key={tx.id}>
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedTransactions.includes(tx.id) ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white truncate max-w-[250px]">
                          {tx.description || 'No description'}
                        </div>
                        {tx.payeeName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Payee: {tx.payeeName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tx.incomeSourceName ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                            {tx.incomeSourceName}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tx.category ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                            {tx.category}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                            Uncategorized
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                        +{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpand(tx.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          {expandedRows.has(tx.id) ? (
                            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandedRows.has(tx.id) && (
                      <tr className="bg-gray-50 dark:bg-gray-700/30">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Company:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{tx.companyName || 'None'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Vendor:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{tx.vendorName || 'None'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Statement:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{tx.statementId || 'None'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Section:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{tx.sectionCode || 'None'}</span>
                            </div>
                            {tx.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">{tx.notes}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with count */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {filteredTransactions.length} of {transactions.length} income transactions
            </span>
            {selectedTransactions.length > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {selectedTransactions.length} selected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeBulkEdit;
