import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowPathIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { TransactionModal } from '../../components/forms';
import TransactionBulkPanel from '../Transactions/TransactionBulkPanel';
import TransactionFilterPanel from '../Transactions/TransactionFilterPanel';
import TransactionSortPanel from '../Transactions/TransactionSortPanel';
import { createDefaultSorts, multiLevelSort } from '@shared/constants/sorting';

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
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Transaction edit modal state
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  
  // Filters - using comprehensive filter format
  const [filters, setFilters] = useState({
    searchTerm: '',
    category: '',
    companyId: '',
    payee: '',
    vendor: '',
    statementId: '',
    hasCategory: '',
    is1099: '',
    isReconciled: '',
    isReviewed: '',
    hasReceipt: '',
    hasCheckNumber: '',
    source: '',
    hasPdfSource: '',
    amountRange: { min: '', max: '' },
    dateRange: { start: '', end: '' }
  });

  // Multi-level sorting state
  const [sorts, setSorts] = useState(createDefaultSorts());

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

  // Check if a transaction is an expense
  const isExpenseTransaction = (tx) => {
    if (tx.type === 'expense') return true;
    if (tx.type === 'income') return false;
    
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
    const matchesSearch = !filters.searchTerm || 
      tx.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      tx.payee?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      tx.vendor?.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = !filters.category || tx.category === filters.category;
    
    // Company filter
    const matchesCompany = !filters.companyId || tx.companyId === filters.companyId;
    
    // Payee filter (now uses payee name, not payeeId)
    const matchesPayee = !filters.payee || 
      tx.payee?.toLowerCase().includes(filters.payee.toLowerCase());
    
    // Vendor filter (now uses vendor name, not vendorId)
    const matchesVendor = !filters.vendor || 
      tx.vendor?.toLowerCase().includes(filters.vendor.toLowerCase());
    
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
    
    // Reconciled filter
    const matchesReconciled = 
      filters.isReconciled === '' || 
      (filters.isReconciled === 'yes' && tx.isReconciled) ||
      (filters.isReconciled === 'no' && !tx.isReconciled);
    
    // Reviewed filter
    const matchesReviewed = 
      filters.isReviewed === '' || 
      (filters.isReviewed === 'yes' && tx.isReviewed) ||
      (filters.isReviewed === 'no' && !tx.isReviewed);
    
    // Has receipt filter
    const matchesHasReceipt = 
      filters.hasReceipt === '' || 
      (filters.hasReceipt === 'yes' && tx.receiptUrl) ||
      (filters.hasReceipt === 'no' && !tx.receiptUrl);
    
    // Has check number filter
    const matchesHasCheckNumber = 
      filters.hasCheckNumber === '' || 
      (filters.hasCheckNumber === 'yes' && tx.checkNumber) ||
      (filters.hasCheckNumber === 'no' && !tx.checkNumber);
    
    // Source filter
    const matchesSource = !filters.source || tx.source === filters.source;
    
    // Has PDF/source file filter
    const matchesHasPdfSource = 
      filters.hasPdfSource === '' || 
      (filters.hasPdfSource === 'yes' && (tx.sourceFileId || tx.statementId)) ||
      (filters.hasPdfSource === 'no' && !tx.sourceFileId && !tx.statementId);
    
    // Amount range filter
    const txAmount = Math.abs(tx.amount || 0);
    const matchesAmountMin = !filters.amountRange?.min || 
      txAmount >= parseFloat(filters.amountRange.min);
    const matchesAmountMax = !filters.amountRange?.max || 
      txAmount <= parseFloat(filters.amountRange.max);
    
    // Date range filter
    const txDate = tx.date ? new Date(tx.date.toDate ? tx.date.toDate() : tx.date) : null;
    const matchesDateStart = !filters.dateRange?.start || 
      (txDate && txDate >= new Date(filters.dateRange.start));
    const matchesDateEnd = !filters.dateRange?.end || 
      (txDate && txDate <= new Date(filters.dateRange.end + 'T23:59:59'));
    
    return matchesSearch && matchesCategory && matchesCompany && 
           matchesPayee && matchesVendor && matchesStatement && 
           matchesHasCategory && matches1099 && matchesReconciled &&
           matchesReviewed && matchesHasReceipt && matchesHasCheckNumber &&
           matchesSource && matchesHasPdfSource &&
           matchesAmountMin && matchesAmountMax &&
           matchesDateStart && matchesDateEnd;
  });

  // Apply multi-level sorting
  const sortedTransactions = multiLevelSort(filteredTransactions, sorts);

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
    if (selectedTransactions.size === sortedTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(sortedTransactions.map(tx => tx.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  // Transaction edit modal handlers
  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);
  };

  const handleSaveTransaction = async (transactionData) => {
    try {
      await api.transactions.update(editingTransaction.id, transactionData);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
      toast.success('Transaction updated successfully');
      handleCloseTransactionModal();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      companyId: '',
      payee: '',
      vendor: '',
      statementId: '',
      hasCategory: '',
      is1099: '',
      isReconciled: '',
      isReviewed: '',
      hasReceipt: '',
      hasCheckNumber: '',
      source: '',
      hasPdfSource: '',
      amountRange: { min: '', max: '' },
      dateRange: { start: '', end: '' }
    });
  };

  // Bulk update handler for TransactionBulkPanel
  const handleBulkPanelUpdate = async (updateData) => {
    if (selectedTransactions.size === 0) return;

    setIsUpdating(true);
    try {
      // Build transactions array with updates
      const transactionsToUpdate = Array.from(selectedTransactions).map(id => {
        const updatePayload = { id };
        const existingTx = sortedTransactions.find(tx => tx.id === id);
        
        // Handle notes append logic
        if (updateData.notes !== undefined) {
          if (updateData.appendNotes && existingTx?.notes) {
            updatePayload.notes = `${existingTx.notes}\n${updateData.notes}`;
          } else {
            updatePayload.notes = updateData.notes;
          }
        }
        
        // Add all other fields
        Object.entries(updateData).forEach(([key, value]) => {
          if (key !== 'notes' && key !== 'appendNotes') {
            updatePayload[key] = value;
          }
        });
        
        return updatePayload;
      });

      await api.transactions.bulkUpdate(transactionsToUpdate);
      toast.success(`Updated ${selectedTransactions.size} transaction(s)`);
      setSelectedTransactions(new Set());
      refetchTransactions();
      onRefresh?.();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTransactions.size} transaction(s)?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await Promise.all(Array.from(selectedTransactions).map(id => 
        api.transactions.delete(id)
      ));
      toast.success(`Deleted ${selectedTransactions.size} transaction(s)`);
      setSelectedTransactions(new Set());
      refetchTransactions();
      onRefresh?.();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Panel */}
      <TransactionFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onReset={clearFilters}
        companies={companies}
        payees={payees}
        vendors={vendors}
        statements={statements}
        showRefresh={true}
        onRefresh={refetchTransactions}
        isLoading={isLoading}
        variant="expense"
      />

      {/* Sort Panel */}
      <TransactionSortPanel
        sorts={sorts}
        onSortsChange={setSorts}
        maxLevels={5}
        showPresets={true}
        collapsible={true}
        defaultCollapsed={true}
      />

      {/* Bulk Edit Panel */}
      <TransactionBulkPanel
        selectedCount={selectedTransactions.size}
        selectedTransactions={selectedTransactions}
        transactions={sortedTransactions}
        companies={companies}
        payees={payees}
        vendors={vendors}
        incomeSources={incomeSources}
        statements={statements}
        onBulkUpdate={handleBulkPanelUpdate}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedTransactions(new Set())}
        isUpdating={isUpdating}
      />

      {/* Transaction Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : sortedTransactions.length === 0 ? (
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
                      checked={selectedTransactions.size === sortedTransactions.length && sortedTransactions.length > 0}
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
                    Actions
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedTransactions.map(tx => (
                  <React.Fragment key={tx.id}>
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedTransactions.has(tx.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(tx.id)}
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
                          onClick={() => handleEditTransaction(tx)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit transaction"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
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
                        <td colSpan={8} className="px-4 py-4">
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
              Showing {sortedTransactions.length} of {transactions.length} expense transactions
            </span>
            {selectedTransactions.size > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                {selectedTransactions.size} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Edit Modal */}
      <TransactionModal
        transaction={editingTransaction}
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        onSave={handleSaveTransaction}
        mode="edit"
      />
    </div>
  );
};

export default ExpenseBulkEdit;
