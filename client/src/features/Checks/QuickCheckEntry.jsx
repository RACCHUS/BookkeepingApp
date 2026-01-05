import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories';

/**
 * QuickCheckEntry - Rapid entry of multiple checks with automatic transaction creation
 * Checks can be income (received) or expense (written)
 * Each check entered creates both a check record AND a transaction by default
 */
const QuickCheckEntry = ({ isOpen, onClose, onSubmit, isLoading, companies = [] }) => {
  // Multiple check entries
  const [entries, setEntries] = useState([createEmptyEntry()]);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'partial' | 'error'
  const [results, setResults] = useState([]);
  
  // Reference to auto-focus new rows
  const lastPayeeRef = useRef(null);

  // Create empty entry template
  function createEmptyEntry() {
    return {
      id: Date.now() + Math.random(),
      payee: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense', // Default to expense (writing a check)
      checkNumber: '',
      category: '',
      companyId: '',
      memo: '',
      status: 'pending',
      createTransaction: true, // DEFAULT ON - creates transaction
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

  // Focus on last payee input when adding new row
  useEffect(() => {
    if (lastPayeeRef.current) {
      lastPayeeRef.current.focus();
    }
  }, [entries.length]);

  // Validate single entry
  const validateEntry = useCallback((entry) => {
    const errors = [];
    if (!entry.payee?.trim()) errors.push('Payee required');
    if (!entry.amount || parseFloat(entry.amount) <= 0) errors.push('Valid amount required');
    if (!entry.date) errors.push('Date required');
    if (!entry.type) errors.push('Type required');
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
      if (lastEntry.payee || lastEntry.amount) {
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
      const checksToCreate = validEntries.map(entry => ({
        payee: entry.payee.trim(),
        amount: parseFloat(entry.amount), // Always positive, sign determined by type
        date: entry.date,
        type: entry.type,
        checkNumber: entry.checkNumber || null,
        category: entry.category || null,
        companyId: entry.companyId || null,
        memo: entry.memo || '',
        status: entry.status || 'pending',
        createTransaction: entry.createTransaction
      }));

      const response = await onSubmit(checksToCreate);
      
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
  const incomeTotal = entries
    .filter(e => e.isValid && e.type === 'income')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const expenseTotal = entries
    .filter(e => e.isValid && e.type === 'expense')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Category options
  const categoryOptions = Object.entries(IRS_CATEGORIES).map(([key, value]) => ({
    value: key,
    label: value
  }));

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
        <div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Quick Check Entry
                </h2>
                <p className="text-sm text-gray-500">
                  Add checks received or written • Each creates a transaction automatically
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Success/Error State */}
          {submitStatus && (
            <div className={`p-4 ${
              submitStatus === 'success' ? 'bg-green-50' : 
              submitStatus === 'partial' ? 'bg-yellow-50' : 
              'bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {submitStatus === 'success' ? (
                  <>
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      All {results.length} checks created successfully!
                    </span>
                  </>
                ) : submitStatus === 'partial' ? (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">
                      {results.filter(r => r.success).length} of {results.length} created
                    </span>
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-red-800 font-medium">
                      Error creating checks
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
                  Add more checks
                </button>
              </div>
            </div>
          )}

          {/* Entry Form */}
          {!submitStatus && (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-1">Type</div>
                <div className="col-span-2">Payee</div>
                <div className="col-span-1">Amount</div>
                <div className="col-span-1">Check #</div>
                <div className="col-span-1">Date</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Company</div>
                <div className="col-span-1">Create Txn</div>
                <div className="col-span-1"></div>
              </div>

              {/* Entry Rows */}
              <div className="max-h-[400px] overflow-y-auto">
                {entries.map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 items-center ${
                      entry.error ? 'bg-red-50' : ''
                    }`}
                  >
                    {/* Type */}
                    <div className="col-span-1">
                      <select
                        value={entry.type}
                        onChange={(e) => updateEntry(index, 'type', e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 ${
                          entry.type === 'income' 
                            ? 'bg-green-50 border-green-300 text-green-700' 
                            : 'bg-red-50 border-red-300 text-red-700'
                        }`}
                      >
                        <option value="expense">Written</option>
                        <option value="income">Received</option>
                      </select>
                    </div>

                    {/* Payee */}
                    <div className="col-span-2">
                      <input
                        ref={index === entries.length - 1 ? lastPayeeRef : null}
                        type="text"
                        placeholder="Payee name"
                        value={entry.payee}
                        onChange={(e) => updateEntry(index, 'payee', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          className="w-full pl-5 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Check Number */}
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="#"
                        value={entry.checkNumber}
                        onChange={(e) => updateEntry(index, 'checkNumber', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Date */}
                    <div className="col-span-1">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, 'date', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <select
                        value={entry.category}
                        onChange={(e) => updateEntry(index, 'category', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Company */}
                    <div className="col-span-2">
                      <select
                        value={entry.companyId}
                        onChange={(e) => updateEntry(index, 'companyId', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select company</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Create Transaction Toggle */}
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={entry.createTransaction}
                        onChange={(e) => updateEntry(index, 'createTransaction', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        title="Create transaction from this check"
                      />
                    </div>

                    {/* Remove Row */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeRow(index)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove row"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Validation Error */}
                    {entry.error && (
                      <div className="col-span-12 text-xs text-red-600">
                        {entry.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={addRow}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Row (Ctrl+Enter)
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          {!submitStatus && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  <span className="font-medium">{validCount}</span> valid check{validCount !== 1 ? 's' : ''}
                </span>
                {incomeTotal > 0 && (
                  <span className="text-green-600">
                    +${incomeTotal.toFixed(2)} received
                  </span>
                )}
                {expenseTotal > 0 && (
                  <span className="text-red-600">
                    -${expenseTotal.toFixed(2)} written
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={validCount === 0 || isLoading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Create {validCount} Check{validCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

QuickCheckEntry.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  companies: PropTypes.array
};

QuickCheckEntry.defaultProps = {
  isLoading: false,
  companies: []
};

export default QuickCheckEntry;
