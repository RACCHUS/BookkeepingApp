import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { IRS_CATEGORIES } from '@shared/constants/categories';

/**
 * QuickTransactionEntry - Rapid entry of multiple transactions
 * Optimized for entering multiple transactions quickly
 */
const QuickTransactionEntry = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  // Multiple transaction entries
  const [entries, setEntries] = useState([createEmptyEntry()]);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'partial' | 'error'
  const [results, setResults] = useState([]);
  
  // Reference to auto-focus new rows
  const lastDescriptionRef = useRef(null);

  // Create empty entry template
  function createEmptyEntry() {
    return {
      id: Date.now() + Math.random(),
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: '',
      notes: '',
      isValid: false,
      error: null
    };
  }

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setEntries([createEmptyEntry()]);
      setSubmitStatus(null);
      setResults([]);
    }
  }, [isOpen]);

  // Focus on last description input when adding new row
  useEffect(() => {
    if (lastDescriptionRef.current) {
      lastDescriptionRef.current.focus();
    }
  }, [entries.length]);

  // Validate single entry
  const validateEntry = useCallback((entry) => {
    const errors = [];
    if (!entry.description?.trim()) errors.push('Description required');
    if (!entry.amount || parseFloat(entry.amount) <= 0) errors.push('Valid amount required');
    if (!entry.date) errors.push('Date required');
    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : null
    };
  }, []);

  // Update entry field
  const updateEntry = useCallback((index, field, value) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Re-validate
      const validation = validateEntry(updated[index]);
      updated[index].isValid = validation.isValid;
      updated[index].error = validation.error;
      return updated;
    });
  }, [validateEntry]);

  // Add new row
  const addRow = useCallback(() => {
    setEntries(prev => [...prev, createEmptyEntry()]);
  }, []);

  // Remove row
  const removeRow = useCallback((index) => {
    setEntries(prev => {
      if (prev.length === 1) {
        // Keep at least one row, just reset it
        return [createEmptyEntry()];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e, index) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to add new row
      e.preventDefault();
      addRow();
    } else if (e.key === 'Tab' && !e.shiftKey && index === entries.length - 1) {
      // Tab on last field of last row - add new row
      const lastEntry = entries[index];
      if (lastEntry.description || lastEntry.amount) {
        e.preventDefault();
        addRow();
      }
    }
  }, [entries, addRow]);

  // Submit all valid entries
  const handleSubmit = async () => {
    const validEntries = entries.filter(e => e.isValid);
    if (validEntries.length === 0) return;

    try {
      const transactionsToCreate = validEntries.map(entry => {
        // Apply sign based on type: income = positive, expense = negative
        const rawAmount = parseFloat(entry.amount);
        const finalAmount = entry.type === 'income' ? Math.abs(rawAmount) : -Math.abs(rawAmount);
        
        return {
          description: entry.description.trim(),
          amount: finalAmount,
          date: entry.date,
          type: entry.type || 'expense',
          category: entry.category || '',
          notes: entry.notes || ''
        };
      });

      const response = await onSubmit(transactionsToCreate);
      
      // Handle response
      if (response.allSucceeded) {
        setSubmitStatus('success');
        setResults(response.results || []);
      } else if (response.someSucceeded) {
        setSubmitStatus('partial');
        setResults(response.results || []);
      } else {
        setSubmitStatus('error');
        setResults(response.errors || []);
      }
    } catch (error) {
      setSubmitStatus('error');
      setResults([{ error: error.message }]);
    }
  };

  // Count valid entries
  const validCount = entries.filter(e => e.isValid).length;
  const totalAmount = entries
    .filter(e => e.isValid)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Category options - use VALUE not KEY (KEY is like CAR_TRUCK_EXPENSES, VALUE is "Car and Truck Expenses")
  const categoryOptions = Object.values(IRS_CATEGORIES).sort().map(value => ({
    value: value,
    label: value
  }));

  // Transaction type options
  const typeOptions = [
    { value: 'expense', label: 'Expense', color: 'text-red-600' },
    { value: 'income', label: 'Income', color: 'text-green-600' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-7xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Quick Transaction Entry
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Rapidly add multiple transactions • Ctrl+Enter to add row
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Success/Error State */}
          {submitStatus && (
            <div className={`p-4 ${
              submitStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 
              submitStatus === 'partial' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
              'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-2">
                {submitStatus === 'success' ? (
                  <>
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      All {results.length} transactions created successfully!
                    </span>
                  </>
                ) : submitStatus === 'partial' ? (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                      {results.filter(r => r.success).length} of {results.length} created
                    </span>
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-red-800 dark:text-red-200 font-medium">
                      Error creating transactions
                    </span>
                  </>
                )}
                <button
                  onClick={() => {
                    setSubmitStatus(null);
                    setResults([]);
                    setEntries([createEmptyEntry()]);
                  }}
                  className="ml-auto text-sm underline hover:no-underline"
                >
                  Add more transactions
                </button>
              </div>
            </div>
          )}

          {/* Entry Form */}
          {!submitStatus && (
            <>
              <div className="grid grid-cols-10 gap-2 p-3 bg-gray-50 dark:bg-gray-700 border-b text-sm font-medium text-gray-600 dark:text-gray-300">
                <div className="col-span-3">Description *</div>
                <div className="col-span-2">Amount *</div>
                <div className="col-span-2">Date *</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-2">Category</div>
              </div>

              {/* Entry Rows */}
              <div className="max-h-96 overflow-y-auto">
                {entries.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className={`grid grid-cols-10 gap-2 p-2 border-b border-gray-100 dark:border-gray-700 items-center ${
                      entry.error ? 'bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                  >
                    {/* Description */}
                    <div className="col-span-3">
                      <input
                        ref={index === entries.length - 1 ? lastDescriptionRef : null}
                        type="text"
                        value={entry.description}
                        onChange={(e) => updateEntry(index, 'description', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="Transaction description"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.amount}
                        onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Date */}
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, 'date', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Type */}
                    <div className="col-span-1">
                      <select
                        value={entry.type}
                        onChange={(e) => updateEntry(index, 'type', e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 ${
                          entry.type === 'income' ? 'text-green-600 dark:text-green-400' : entry.type === 'transfer' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {typeOptions.map(opt => (
                          <option key={opt.value} value={opt.value} className={opt.color}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <select
                        value={entry.category}
                        onChange={(e) => updateEntry(index, 'category', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Error message */}
                    {entry.error && (
                      <div className="col-span-10 text-xs text-red-600 dark:text-red-400 pl-2">
                        {entry.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Row (Ctrl+Enter)
                </button>
              </div>

              {/* Summary & Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">{validCount}</span> valid entries
                  {validCount > 0 && (
                    <span className="ml-2">
                      • Total: <span className="font-medium text-gray-900 dark:text-white">
                        ${totalAmount.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={validCount === 0 || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Create {validCount} Transaction{validCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

QuickTransactionEntry.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

export default QuickTransactionEntry;
