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

// Cache configuration to prevent excessive refetching
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
  cacheTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  refetchOnWindowFocus: false, // Don't refetch on tab focus
  retry: 1,                    // Only retry once on failure
};

/**
 * ExpenseBulkEdit - Bulk edit expense transactions
 * Supports: category, vendor, company, payee, statement, note, 1099 payment, 
 * description, statement section, date, amount, and type change to income
 */
const ExpenseBulkEdit = ({ 
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
    payeeId: '',
    vendorId: '',
    statementId: '',
    hasCategory: '',
    is1099: ''
  });
  
  // Bulk update fields
  const [bulkUpdates, setBulkUpdates] = useState({
    category: '',
    companyId: '',
    companyName: '',
    payeeId: '',
    payeeName: '',
    vendorId: '',
    vendorName: '',
    statementId: '',
    notes: '',
    appendNotes: false,
    is1099Payment: '',
    description: '',
    sectionCode: '',
    type: '', // For changing to income
    incomeSourceId: '',
    incomeSourceName: '',
    date: '',
    amount: ''
  });

  // Expense categories from IRS Schedule C
  const expenseCategories = [
    'Advertising',
    'Car and Truck Expenses',
    'Commissions and Fees',
    'Contract Labor',
    'Depreciation and Section 179',
    'Employee Benefit Programs',
    'Insurance (Other than Health)',
    'Interest (Mortgage)',
    'Interest (Other)',
    'Legal and Professional Services',
    'Office Expenses',
    'Pension and Profit-Sharing Plans',
    'Rent or Lease (Vehicles, Machinery, Equipment)',
    'Rent or Lease (Other Business Property)',
    'Repairs and Maintenance',
    'Supplies (Not Inventory)',
    'Taxes and Licenses',
    'Travel',
    'Meals',
    'Utilities',
    'Wages (Less Employment Credits)',
    'Other Expenses',
    'Software Subscriptions',
    'Web Hosting & Domains',
    'Bank Fees',
    'Bad Debts',
    'Dues & Memberships',
    'Training & Education',
    'Business Gifts',
    'Tools (Under $2,500)',
    'Cost of Goods Sold',
    'Personal Expense',
    'Owner Draws/Distributions',
    'Uncategorized'
  ];

  // Statement section codes
  const sectionCodes = [
    { value: 'checks', label: 'Checks Paid' },
    { value: 'electronic', label: 'Electronic Payments' },
    { value: 'fees', label: 'Fees' },
    { value: 'deposits', label: 'Deposits' },
    { value: 'withdrawals', label: 'Withdrawals' },
    { value: 'transfers', label: 'Transfers' },
    { value: 'other', label: 'Other' }
  ];

  // Check if a transaction is an expense
  const isExpenseTransaction = (tx) => {
    if (tx.type === 'expense') return true;
    if (tx.type === 'income') return false;
    
    // Check for expense indicators
    if (tx.sectionCode && ['checks', 'electronic', 'fees', 'withdrawals'].includes(tx.sectionCode)) {
      return true;
    }
    
    // Negative amounts typically indicate expenses
    if (tx.amount < 0) return true;
    
    return false;
  };

  // Fetch expense transactions with React Query caching
  const { 
    data: transactions = [], 
    isLoading, 
    refetch: refetchTransactions 
  } = useQuery({
    queryKey: ['expense-transactions'],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      const allTransactions = response?.data?.transactions || response?.transactions || [];
      return allTransactions.filter(isExpenseTransaction);
    },
    ...QUERY_CONFIG,
    onError: (error) => {
      console.error('Error fetching expense transactions:', error);
      toast.error('Failed to load expense transactions');
    },
  });

  // Apply filters
  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = !searchTerm || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.payee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = !filters.category || tx.category === filters.category;
    
    // Company filter
    const matchesCompany = !filters.companyId || tx.companyId === filters.companyId;
    
    // Payee filter
    const matchesPayee = !filters.payeeId || tx.payeeId === filters.payeeId;
    
    // Vendor filter
    const matchesVendor = !filters.vendorId || tx.vendorId === filters.vendorId;
    
    // Statement filter
    const matchesStatement = !filters.statementId || tx.statementId === filters.statementId;
    
    // Has category filter
    const matchesHasCategory = 
      filters.hasCategory === '' || 
      (filters.hasCategory === 'yes' && tx.category) ||
      (filters.hasCategory === 'no' && !tx.category);
    
    // 1099 filter
    const matches1099 = 
      filters.is1099 === '' || 
      (filters.is1099 === 'yes' && tx.is1099Payment) ||
      (filters.is1099 === 'no' && !tx.is1099Payment);
    
    return matchesSearch && matchesCategory && matchesCompany && 
           matchesPayee && matchesVendor && matchesStatement && 
           matchesHasCategory && matches1099;
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
      payeeId: '',
      vendorId: '',
      statementId: '',
      hasCategory: '',
      is1099: ''
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
    if (bulkUpdates.is1099Payment !== '') {
      updateData.is1099Payment = bulkUpdates.is1099Payment === 'true';
    }
    if (bulkUpdates.type) {
      updateData.type = bulkUpdates.type;
      if (bulkUpdates.type === 'income' && bulkUpdates.incomeSourceId) {
        updateData.incomeSourceId = bulkUpdates.incomeSourceId;
        updateData.incomeSourceName = bulkUpdates.incomeSourceName;
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
        companyId: '',
        companyName: '',
        payeeId: '',
        payeeName: '',
        vendorId: '',
        vendorName: '',
        statementId: '',
        notes: '',
        appendNotes: false,
        is1099Payment: '',
        description: '',
        sectionCode: '',
        type: '',
        incomeSourceId: '',
        incomeSourceName: '',
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

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        {/* Search Row */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, payee, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Categories</option>
            {expenseCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            name="companyId"
            value={filters.companyId}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Has Category?</option>
            <option value="yes">Categorized</option>
            <option value="no">Uncategorized</option>
          </select>

          <select
            name="is1099"
            value={filters.is1099}
            onChange={handleFilterChange}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">1099 Status</option>
            <option value="yes">1099 Payment</option>
            <option value="no">Not 1099</option>
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {selectedTransactions.length} transaction(s) selected
              </span>
              <button
                onClick={() => setSelectedTransactions([])}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
            </div>
            
            <button
              onClick={() => setShowBulkPanel(!showBulkPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      {sectionCodes.map(section => (
                        <option key={section.value} value={section.value}>{section.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 1099 Payment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      1099 Payment
                    </label>
                    <select
                      name="is1099Payment"
                      value={bulkUpdates.is1099Payment}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      <option value="true">Yes - 1099 Payment</option>
                      <option value="false">No - Not 1099</option>
                    </select>
                  </div>

                  {/* Type (change to income) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Transaction Type
                    </label>
                    <select
                      name="type"
                      value={bulkUpdates.type}
                      onChange={handleBulkUpdateChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Don't change</option>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  {/* Income Source (only if changing to income) */}
                  {bulkUpdates.type === 'income' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Income Source
                      </label>
                      <select
                        name="incomeSourceId"
                        value={bulkUpdates.incomeSourceId}
                        onChange={handleBulkUpdateChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select source...</option>
                        {incomeSources?.map(source => (
                          <option key={source.id} value={source.id}>{source.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="appendNotes"
                      checked={bulkUpdates.appendNotes}
                      onChange={handleBulkUpdateChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
            <p>No expense transactions found</p>
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    1099
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map(tx => (
                  <React.Fragment key={tx.id}>
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedTransactions.includes(tx.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                      <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                        -{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tx.is1099Payment ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                            1099
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
              Showing {filteredTransactions.length} of {transactions.length} expense transactions
            </span>
            {selectedTransactions.length > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                {selectedTransactions.length} selected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseBulkEdit;
