import React, { useState, useMemo } from 'react';
import {
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CATEGORY_GROUPS, PAYMENT_METHODS } from '@shared/constants/categories';
import { ClassifyWithAIButton } from '../../components/classification';

// Payment method display labels
const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal',
  venmo: 'Venmo',
  zelle: 'Zelle',
  other_electronic: 'Other Electronic',
  other: 'Other'
};

/**
 * TransactionBulkPanel - Collapsible panel for bulk editing selected transactions
 * Shows when transactions are selected and provides comprehensive update options
 */
const TransactionBulkPanel = ({
  selectedCount,
  selectedTransactions, // Set of transaction IDs
  transactions, // Array of all transactions for calculating totals
  companies = [],
  payees = [],
  vendors = [],
  incomeSources = [],
  statements = [],
  receipts = [],
  checks = [],
  csvImports = [],
  onBulkUpdate,
  onBulkDelete,
  onClearSelection,
  isUpdating = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFieldSelector, setShowFieldSelector] = useState(true);
  
  // Track which fields to update
  const [fieldsToUpdate, setFieldsToUpdate] = useState({
    category: false,
    subcategory: false,
    type: false,
    companyId: false,
    payee: false,
    vendorName: false,
    incomeSourceId: false,
    statementId: false,
    description: false,
    date: false,
    amount: false,
    notes: false,
    isReconciled: false,
    paymentMethod: false,
    checkNumber: false,
    isReviewed: false,
    is1099Payment: false,
    tags: false,
    csvImportId: false,
    receiptId: false,
    checkId: false
  });

  // Field values
  const [updateValues, setUpdateValues] = useState({
    category: '',
    subcategory: '',
    type: '',
    companyId: '',
    companyName: '',
    payee: '',
    payeeId: '',
    vendorName: '',
    vendorId: '',
    incomeSourceId: '',
    incomeSourceName: '',
    statementId: '',
    description: '',
    date: '',
    amount: '',
    notes: '',
    appendNotes: false,
    isReconciled: false,
    paymentMethod: '',
    checkNumber: '',
    isReviewed: false,
    is1099Payment: false,
    tags: '',
    csvImportId: '',
    receiptId: '',
    checkId: ''
  });

  // Transaction types
  const transactionTypes = [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' }
  ];

  // Get selected transactions data
  const selectedTransactionsData = transactions.filter(t => selectedTransactions.has(t.id));
  
  // Calculate totals
  const totalAmount = selectedTransactionsData.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  const incomeCount = selectedTransactionsData.filter(t => t.type === 'income' || t.amount > 0).length;
  const expenseCount = selectedTransactionsData.filter(t => t.type === 'expense' || t.amount < 0).length;
  const categorizedCount = selectedTransactionsData.filter(t => t.category).length;
  
  // Get uncategorized transactions for AI classification
  const uncategorizedTransactions = useMemo(() => 
    selectedTransactionsData.filter(t => !t.category),
    [selectedTransactionsData]
  );
  const uncategorizedCount = uncategorizedTransactions.length;

  const handleFieldToggle = (field) => {
    setFieldsToUpdate(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleValueChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUpdateValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Handle linked fields for names
    if (name === 'companyId') {
      const company = companies.find(c => c.id === value);
      setUpdateValues(prev => ({ ...prev, companyName: company?.name || '' }));
    }
    if (name === 'incomeSourceId') {
      const source = incomeSources?.find(s => s.id === value);
      setUpdateValues(prev => ({ ...prev, incomeSourceName: source?.name || '' }));
    }
  };

  const handleApplyUpdates = () => {
    // Build update object with only enabled fields
    const updates = {};
    
    if (fieldsToUpdate.category && updateValues.category) {
      updates.category = updateValues.category;
    }
    if (fieldsToUpdate.subcategory) {
      updates.subcategory = updateValues.subcategory || null;
    }
    if (fieldsToUpdate.type && updateValues.type) {
      updates.type = updateValues.type;
    }
    if (fieldsToUpdate.companyId) {
      updates.companyId = updateValues.companyId || null;
      updates.companyName = updateValues.companyName || null;
    }
    if (fieldsToUpdate.payee) {
      updates.payee = updateValues.payee || null;
      updates.payeeId = updateValues.payeeId || null;
    }
    if (fieldsToUpdate.vendorName) {
      updates.vendorName = updateValues.vendorName || null;
      updates.vendorId = updateValues.vendorId || null;
    }
    if (fieldsToUpdate.incomeSourceId) {
      updates.incomeSourceId = updateValues.incomeSourceId || null;
      updates.incomeSourceName = updateValues.incomeSourceName || null;
    }
    if (fieldsToUpdate.statementId) {
      updates.statementId = updateValues.statementId || null;
    }
    if (fieldsToUpdate.description && updateValues.description?.trim()) {
      updates.description = updateValues.description.trim();
    }
    if (fieldsToUpdate.date && updateValues.date) {
      updates.date = updateValues.date;
    }
    if (fieldsToUpdate.amount && updateValues.amount) {
      updates.amount = parseFloat(updateValues.amount);
    }
    if (fieldsToUpdate.notes) {
      updates.notes = updateValues.notes || '';
      updates.appendNotes = updateValues.appendNotes;
    }
    if (fieldsToUpdate.isReconciled) {
      updates.isReconciled = updateValues.isReconciled;
    }
    if (fieldsToUpdate.paymentMethod) {
      updates.paymentMethod = updateValues.paymentMethod || null;
    }
    if (fieldsToUpdate.checkNumber) {
      updates.checkNumber = updateValues.checkNumber || null;
    }
    if (fieldsToUpdate.isReviewed) {
      updates.isReviewed = updateValues.isReviewed;
    }
    if (fieldsToUpdate.is1099Payment) {
      updates.is1099Payment = updateValues.is1099Payment;
    }
    if (fieldsToUpdate.tags && updateValues.tags?.trim()) {
      // Parse comma-separated tags
      updates.tags = updateValues.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (fieldsToUpdate.csvImportId) {
      updates.csvImportId = updateValues.csvImportId || null;
    }
    if (fieldsToUpdate.receiptId) {
      updates.receiptId = updateValues.receiptId || null;
    }
    if (fieldsToUpdate.checkId) {
      updates.checkId = updateValues.checkId || null;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    onBulkUpdate(updates);
  };

  const resetForm = () => {
    setFieldsToUpdate({
      category: false,
      subcategory: false,
      type: false,
      companyId: false,
      payee: false,
      vendorName: false,
      incomeSourceId: false,
      statementId: false,
      description: false,
      date: false,
      amount: false,
      notes: false,
      isReconciled: false,
      paymentMethod: false,
      checkNumber: false,
      isReviewed: false,
      is1099Payment: false,
      tags: false,
      csvImportId: false,
      receiptId: false,
      checkId: false
    });
    setUpdateValues({
      category: '',
      subcategory: '',
      type: '',
      companyId: '',
      companyName: '',
      payee: '',
      payeeId: '',
      vendorName: '',
      vendorId: '',
      incomeSourceId: '',
      incomeSourceName: '',
      statementId: '',
      description: '',
      date: '',
      amount: '',
      notes: '',
      appendNotes: false,
      isReconciled: false,
      paymentMethod: '',
      checkNumber: '',
      isReviewed: false,
      is1099Payment: false,
      tags: '',
      csvImportId: '',
      receiptId: '',
      checkId: ''
    });
  };

  const enabledFieldsCount = Object.values(fieldsToUpdate).filter(Boolean).length;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <PencilSquareIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="font-medium text-blue-800 dark:text-blue-200">
              Bulk Edit Panel
            </span>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full">
              {selectedCount} selected
            </span>
            <span className="text-blue-600 dark:text-blue-300">
              ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {incomeCount > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {incomeCount} income
              </span>
            )}
            {expenseCount > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {expenseCount} expense
              </span>
            )}
            <span className={categorizedCount === selectedCount ? 'text-green-600' : 'text-yellow-600'}>
              {categorizedCount}/{selectedCount} categorized
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearSelection();
            }}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Clear Selection
          </button>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-700">
          {/* Field Selection Toggles */}
          <div className="py-3 border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select fields to update ({enabledFieldsCount} selected)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFieldSelector(!showFieldSelector)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showFieldSelector ? 'Hide field selector' : 'Show field selector'}
                </button>
                <button
                  onClick={resetForm}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Reset
                </button>
              </div>
            </div>
            
            {showFieldSelector && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2">
                {[
                  { key: 'category', label: 'Category' },
                  { key: 'subcategory', label: 'Subcategory' },
                  { key: 'type', label: 'Type' },
                  { key: 'companyId', label: 'Company' },
                  { key: 'payee', label: 'Payee' },
                  { key: 'vendorName', label: 'Vendor' },
                  { key: 'incomeSourceId', label: 'Income Source' },
                  { key: 'statementId', label: 'Statement' },
                  { key: 'paymentMethod', label: 'Payment Method' },
                  { key: 'checkNumber', label: 'Check Number' },
                  { key: 'description', label: 'Description' },
                  { key: 'date', label: 'Date' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'tags', label: 'Tags' },
                  { key: 'isReconciled', label: 'Reconciled' },
                  { key: 'isReviewed', label: 'Reviewed' },
                  { key: 'is1099Payment', label: '1099 Payment' },
                  { key: 'csvImportId', label: 'CSV Import' },
                  { key: 'receiptId', label: 'Receipt' },
                  { key: 'checkId', label: 'Check' }
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      fieldsToUpdate[key]
                        ? 'bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600'
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate[key]}
                      onChange={() => handleFieldToggle(key)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Update Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">
            {/* Category */}
            {fieldsToUpdate.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={updateValues.category}
                  onChange={handleValueChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                    <optgroup key={group} label={group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                      {cats.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Subcategory */}
            {fieldsToUpdate.subcategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  name="subcategory"
                  value={updateValues.subcategory}
                  onChange={handleValueChange}
                  placeholder="Enter subcategory..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Type */}
            {fieldsToUpdate.type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={updateValues.type}
                  onChange={handleValueChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  {transactionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Company */}
            {fieldsToUpdate.companyId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <select
                  name="companyId"
                  value={updateValues.companyId}
                  onChange={handleValueChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No company / Clear</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Payee */}
            {fieldsToUpdate.payee && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payee
                </label>
                {payees?.length > 0 ? (
                  <select
                    name="payeeId"
                    value={updateValues.payeeId}
                    onChange={(e) => {
                      const selectedPayee = payees.find(p => p.id === e.target.value);
                      handleValueChange({ target: { name: 'payee', value: selectedPayee?.name || '' }});
                      handleValueChange({ target: { name: 'payeeId', value: e.target.value }});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No payee / Clear</option>
                    {payees.filter(p => p.isActive !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.type ? `(${p.type})` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No payees available. <a href="/payees" className="text-blue-600 hover:underline">Add payees first</a>
                  </div>
                )}
              </div>
            )}

            {/* Vendor */}
            {fieldsToUpdate.vendorName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor
                </label>
                {vendors?.length > 0 ? (
                  <select
                    name="vendorId"
                    value={updateValues.vendorId}
                    onChange={(e) => {
                      const selectedVendor = vendors.find(v => v.id === e.target.value);
                      handleValueChange({ target: { name: 'vendorName', value: selectedVendor?.name || '' }});
                      handleValueChange({ target: { name: 'vendorId', value: e.target.value }});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No vendor / Clear</option>
                    {vendors.filter(v => v.isActive !== false).map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No vendors available. <a href="/vendors" className="text-blue-600 hover:underline">Add a vendor</a>
                  </div>
                )}
              </div>
            )}

            {/* Income Source */}
            {fieldsToUpdate.incomeSourceId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Income Source
                </label>
                {incomeSources?.length > 0 ? (
                  <select
                    name="incomeSourceId"
                    value={updateValues.incomeSourceId}
                    onChange={handleValueChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No source / Clear</option>
                    {incomeSources.map(source => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No income sources available. Create income sources first.
                  </div>
                )}
              </div>
            )}

            {/* Statement */}
            {fieldsToUpdate.statementId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Statement/PDF
                </label>
                {statements?.length > 0 ? (
                  <select
                    name="statementId"
                    value={updateValues.statementId}
                    onChange={handleValueChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unlink from statement</option>
                    {statements.map(stmt => (
                      <option key={stmt.id} value={stmt.id}>{stmt.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No statements available. Upload PDF statements first.
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {fieldsToUpdate.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={updateValues.description}
                  onChange={handleValueChange}
                  placeholder="New description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Date */}
            {fieldsToUpdate.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={updateValues.date}
                  onChange={handleValueChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Amount */}
            {fieldsToUpdate.amount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  name="amount"
                  value={updateValues.amount}
                  onChange={handleValueChange}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Notes */}
            {fieldsToUpdate.notes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <div className="space-y-2">
                  <textarea
                    name="notes"
                    value={updateValues.notes}
                    onChange={handleValueChange}
                    rows={2}
                    placeholder="Add notes..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      name="appendNotes"
                      checked={updateValues.appendNotes}
                      onChange={handleValueChange}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    Append to existing notes (instead of replacing)
                  </label>
                </div>
              </div>
            )}

            {/* Reconciled */}
            {fieldsToUpdate.isReconciled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reconciliation Status
                </label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="isReconciled"
                    checked={updateValues.isReconciled}
                    onChange={handleValueChange}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Mark as reconciled</span>
                </label>
              </div>
            )}

            {/* Payment Method */}
            {fieldsToUpdate.paymentMethod && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={updateValues.paymentMethod}
                  onChange={handleValueChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payment method...</option>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Check Number */}
            {fieldsToUpdate.checkNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check Number
                </label>
                <input
                  type="text"
                  name="checkNumber"
                  value={updateValues.checkNumber}
                  onChange={handleValueChange}
                  placeholder="Enter check number..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Is Reviewed */}
            {fieldsToUpdate.isReviewed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Review Status
                </label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="isReviewed"
                    checked={updateValues.isReviewed}
                    onChange={handleValueChange}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Mark as reviewed</span>
                </label>
              </div>
            )}

            {/* Is 1099 Payment */}
            {fieldsToUpdate.is1099Payment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  1099 Payment Status
                </label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="is1099Payment"
                    checked={updateValues.is1099Payment}
                    onChange={handleValueChange}
                    className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Mark as 1099 payment</span>
                </label>
              </div>
            )}

            {/* Tags */}
            {fieldsToUpdate.tags && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={updateValues.tags}
                  onChange={handleValueChange}
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate with commas</p>
              </div>
            )}

            {/* CSV Import */}
            {fieldsToUpdate.csvImportId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CSV Import
                </label>
                {csvImports?.length > 0 ? (
                  <select
                    name="csvImportId"
                    value={updateValues.csvImportId}
                    onChange={handleValueChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unlink from CSV import</option>
                    {csvImports.map(imp => (
                      <option key={imp.id} value={imp.id}>{imp.file_name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No CSV imports available
                  </div>
                )}
              </div>
            )}

            {/* Receipt */}
            {fieldsToUpdate.receiptId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receipt
                </label>
                {receipts?.length > 0 ? (
                  <select
                    name="receiptId"
                    value={updateValues.receiptId}
                    onChange={handleValueChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unlink receipt</option>
                    {receipts.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.vendor || 'Receipt'} - ${r.amount?.toFixed(2)} ({new Date(r.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No receipts available. Add receipts first.
                  </div>
                )}
              </div>
            )}

            {/* Check */}
            {fieldsToUpdate.checkId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check
                </label>
                {checks?.length > 0 ? (
                  <select
                    name="checkId"
                    value={updateValues.checkId}
                    onChange={handleValueChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unlink check</option>
                    {checks.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.checkNumber || c.check_number || 'N/A'} - {c.payee} (${c.amount?.toFixed(2)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                    No checks available. Add checks first.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3">
              <button
                onClick={onBulkDelete}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
                Delete {selectedCount}
              </button>
              
              {/* AI Classify Button for uncategorized */}
              {uncategorizedCount > 0 && (
                <ClassifyWithAIButton
                  transactions={uncategorizedTransactions}
                  variant="secondary"
                  size="md"
                  saveRules={true}
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              {enabledFieldsCount > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {enabledFieldsCount} field{enabledFieldsCount !== 1 ? 's' : ''} to update
                </span>
              )}
              <button
                onClick={handleApplyUpdates}
                disabled={isUpdating || enabledFieldsCount === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Apply to {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionBulkPanel;
