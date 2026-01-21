import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useIncomeTransactions, ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';

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
    incomeSourceId: '',
    statementId: '',
    hasCategory: '',
    hasSource: '',
    isReconciled: '',
    isReviewed: '',
    hasReceipt: '',
    hasCheckNumber: '',
    source: '',
    hasPdfSource: '',
    amountRange: { min: '', max: '' },
    dateRange: { start: '', end: '' }
  });

  // Multi-level sorting
  const [sorts, setSorts] = useState(createDefaultSorts());

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

  // Use shared transactions hook - filters to income automatically
  const { 
    transactions = [], 
    isLoading, 
    refetch: refetchTransactions,
    updateMultipleInCache,
    removeMultipleFromCache,
    invalidateAll
  } = useIncomeTransactions();

  // Apply filters
  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = !filters.searchTerm || 
      tx.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      tx.payee?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      tx.incomeSourceName?.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = !filters.category || tx.category === filters.category;
    
    // Company filter
    const matchesCompany = !filters.companyId || tx.companyId === filters.companyId;
    
    // Income source filter
    const matchesIncomeSource = !filters.incomeSourceId || tx.incomeSourceId === filters.incomeSourceId;
    
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
    
    // Source filter (transaction source: manual, pdf_import, csv_import, bank_sync)
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
           matchesIncomeSource && matchesStatement && 
           matchesHasCategory && matchesHasSource &&
           matchesReconciled && matchesReviewed &&
           matchesHasReceipt && matchesHasCheckNumber &&
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
      // Invalidate shared transactions cache - updates all views
      invalidateAll();
      toast.success('Transaction updated successfully');
      handleCloseTransactionModal();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  // Bulk update handler for TransactionBulkPanel
  const handleBulkPanelUpdate = async (updateData) => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select transactions to update');
      return;
    }

    setIsUpdating(true);
    try {
      // Build transactions array for bulk update
      const transactionsToUpdate = Array.from(selectedTransactions).map(id => {
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
      
      toast.success(`Updated ${selectedTransactions.size} transaction(s)`);
      setSelectedTransactions(new Set());
      refetchTransactions();
      onRefresh?.();
    } catch (error) {
      console.error('Error bulk updating transactions:', error);
      toast.error('Failed to update transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select transactions to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedTransactions.size} transaction(s)? This cannot be undone.`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await api.transactions.bulkDelete(Array.from(selectedTransactions));
      toast.success(`Deleted ${selectedTransactions.size} transaction(s)`);
      setSelectedTransactions(new Set());
      refetchTransactions();
      onRefresh?.();
    } catch (error) {
      console.error('Error bulk deleting transactions:', error);
      toast.error('Failed to delete transactions');
    } finally {
      setIsUpdating(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      companyId: '',
      incomeSourceId: '',
      statementId: '',
      hasCategory: '',
      hasSource: '',
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

      {/* Filter Panel */}
      <TransactionFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onReset={clearFilters}
        companies={companies}
        incomeSources={incomeSources}
        statements={statements}
        showRefresh={true}
        onRefresh={refetchTransactions}
        isLoading={isLoading}
        variant="income"
      />

      {/* Sort Panel */}
      <TransactionSortPanel
        sorts={sorts}
        onSortsChange={setSorts}
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
                      checked={selectedTransactions.size === sortedTransactions.length && sortedTransactions.length > 0}
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
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedTransactions.has(tx.id) ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(tx.id)}
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
              Showing {sortedTransactions.length} of {transactions.length} income transactions
            </span>
            {selectedTransactions.size > 0 && (
              <span className="text-green-600 dark:text-green-400">
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

export default IncomeBulkEdit;
