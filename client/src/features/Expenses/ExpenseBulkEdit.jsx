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
import { useExpenseTransactions, ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';

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

  // Columns configuration for expense transactions
  const defaultColumns = [
    { id: 'category', label: 'Category', visible: true },
    { id: 'vendor', label: 'Vendor', visible: true },
    { id: 'company', label: 'Company', visible: true },
    { id: 'payee', label: 'Payee', visible: true },
    { id: 'is1099Payment', label: '1099', visible: true },
    { id: 'paymentMethod', label: 'Payment Method', visible: false },
    { id: 'checkNumber', label: 'Check #', visible: false },
    { id: 'sectionCode', label: 'Section', visible: false },
    { id: 'source', label: 'Import Source', visible: false },
    { id: 'isReconciled', label: 'Reconciled', visible: false },
    { id: 'isReviewed', label: 'Reviewed', visible: false },
    { id: 'notes', label: 'Notes', visible: false },
  ];

  // Default column widths
  const defaultColumnWidths = {
    date: 90,
    description: 250,
    category: 160,
    vendor: 130,
    company: 130,
    payee: 130,
    is1099Payment: 70,
    paymentMethod: 110,
    checkNumber: 80,
    sectionCode: 100,
    source: 100,
    isReconciled: 90,
    isReviewed: 90,
    notes: 150,
    amount: 100,
  };

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

  // Use shared transactions hook - filters to expenses automatically
  const { 
    transactions = [], 
    isLoading, 
    refetch: refetchTransactions,
    updateMultipleInCache,
    removeMultipleFromCache,
    invalidateAll
  } = useExpenseTransactions();

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

      {/* Transaction Grid with draggable columns, sorting, and selection */}
      <TransactionGrid
        transactions={sortedTransactions}
        isLoading={isLoading}
        selectedTransactions={selectedTransactions}
        onSelectionChange={setSelectedTransactions}
        selectionColor="blue"
        sorts={sorts}
        onSortsChange={setSorts}
        defaultColumns={defaultColumns}
        storageKey="expenseGridColumns"
        defaultColumnWidths={defaultColumnWidths}
        onEdit={handleEditTransaction}
        variant="expense"
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

export default ExpenseBulkEdit;
