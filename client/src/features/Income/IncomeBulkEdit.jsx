import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { TransactionModal } from '../../components/forms';
import TransactionBulkPanel from '../Transactions/TransactionBulkPanel';
import TransactionFilterPanel from '../Transactions/TransactionFilterPanel';
import TransactionSortPanel from '../Transactions/TransactionSortPanel';
import TransactionGrid from '../Transactions/TransactionGrid';
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

  // Columns configuration for income transactions
  const defaultColumns = [
    { id: 'category', label: 'Category', visible: true },
    { id: 'incomeSource', label: 'Income Source', visible: true },
    { id: 'company', label: 'Company', visible: true },
    { id: 'payee', label: 'Payee', visible: true },
    { id: 'vendor', label: 'Vendor', visible: false },
    { id: 'paymentMethod', label: 'Payment Method', visible: false },
    { id: 'checkNumber', label: 'Check #', visible: false },
    { id: 'source', label: 'Import Source', visible: false },
    { id: 'isReconciled', label: 'Reconciled', visible: false },
    { id: 'isReviewed', label: 'Reviewed', visible: false },
    { id: 'notes', label: 'Notes', visible: false },
  ];

  // Default column widths
  const defaultColumnWidths = {
    date: 90,
    description: 250,
    category: 140,
    incomeSource: 140,
    company: 130,
    payee: 130,
    vendor: 130,
    paymentMethod: 110,
    checkNumber: 80,
    source: 100,
    isReconciled: 90,
    isReviewed: 90,
    notes: 150,
    amount: 100,
  };

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

      {/* Transaction Grid with draggable columns, sorting, and selection */}
      <TransactionGrid
        transactions={sortedTransactions}
        isLoading={isLoading}
        selectedTransactions={selectedTransactions}
        onSelectionChange={setSelectedTransactions}
        selectionColor="green"
        sorts={sorts}
        onSortsChange={setSorts}
        defaultColumns={defaultColumns}
        storageKey="incomeGridColumns"
        defaultColumnWidths={defaultColumnWidths}
        onEdit={handleEditTransaction}
        variant="income"
      />

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
