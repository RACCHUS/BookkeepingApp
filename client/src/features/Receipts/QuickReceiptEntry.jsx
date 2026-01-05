import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ReceiptPercentIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories';

/**
 * QuickReceiptEntry - Rapid entry of multiple receipts with automatic transaction creation
 * Optimized for entering cash/off-statement purchases quickly
 * Each receipt entered creates both a receipt record AND a transaction by default
 */
const QuickReceiptEntry = ({ isOpen, onClose, onSubmit, isLoading, companies = [] }) => {
  // Multiple receipt entries
  const [entries, setEntries] = useState([createEmptyEntry()]);
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'partial' | 'error'
  const [results, setResults] = useState([]);
  
  // Reference to auto-focus new rows
  const lastVendorRef = useRef(null);

  // Create empty entry template
  function createEmptyEntry() {
    return {
      id: Date.now() + Math.random(),
      vendor: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      companyId: '',
      notes: '',
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

  // Focus on last vendor input when adding new row
  useEffect(() => {
    if (lastVendorRef.current) {
      lastVendorRef.current.focus();
    }
  }, [entries.length]);

  // Validate single entry
  const validateEntry = useCallback((entry) => {
    const errors = [];
    if (!entry.vendor?.trim()) errors.push('Vendor required');
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
      if (lastEntry.vendor || lastEntry.amount) {
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
      const receiptsToCreate = validEntries.map(entry => ({
        vendor: entry.vendor.trim(),
        amount: parseFloat(entry.amount),
        date: entry.date,
        category: entry.category || null,
        companyId: entry.companyId || null,
        notes: entry.notes || '',
        createTransaction: entry.createTransaction, // Will create transaction on backend
        // No image for quick entry
        imageUrl: null,
        thumbnailUrl: null
      }));

      const response = await onSubmit(receiptsToCreate);
      
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
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ReceiptPercentIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Quick Receipt Entry
                </h2>
                <p className="text-sm text-gray-500">
                  Rapidly add cash receipts • Each creates a transaction automatically
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
                      All {results.length} receipts created successfully!
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
                      Error creating receipts
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
                  Add more receipts
                </button>
              </div>
            </div>
          )}

          {/* Entry Form */}
          {!submitStatus && (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b text-sm font-medium text-gray-600">
                <div className="col-span-2">Vendor *</div>
                <div className="col-span-1">Amount *</div>
                <div className="col-span-1">Date *</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Company</div>
                <div className="col-span-2">Notes</div>
                <div className="col-span-1 text-center">Create Txn</div>
                <div className="col-span-1"></div>
              </div>

              {/* Entry Rows */}
              <div className="max-h-96 overflow-y-auto">
                {entries.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className={`grid grid-cols-12 gap-2 p-2 border-b border-gray-100 items-center ${
                      entry.error ? 'bg-red-50' : ''
                    }`}
                  >
                    {/* Vendor */}
                    <div className="col-span-2">
                      <input
                        ref={index === entries.length - 1 ? lastVendorRef : null}
                        type="text"
                        value={entry.vendor}
                        onChange={(e) => updateEntry(index, 'vendor', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="Store name"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-1">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.amount}
                        onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    {/* Date */}
                    <div className="col-span-1">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, 'date', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <select
                        value={entry.category}
                        onChange={(e) => updateEntry(index, 'category', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Company */}
                    <div className="col-span-2">
                      <select
                        value={entry.companyId}
                        onChange={(e) => updateEntry(index, 'companyId', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select company</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="Optional notes"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    {/* Create Transaction Toggle */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => updateEntry(index, 'createTransaction', !entry.createTransaction)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          entry.createTransaction
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title={entry.createTransaction ? 'Will create transaction' : 'Documentation only'}
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Remove Row */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove row"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Error message */}
                    {entry.error && (
                      <div className="col-span-12 text-xs text-red-600 pl-2">
                        {entry.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <div className="p-2 border-b border-gray-200">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Row (Ctrl+Enter)
                </button>
              </div>

              {/* Summary & Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-b-xl">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{validCount}</span> valid entries
                  {validCount > 0 && (
                    <span className="ml-2">
                      • Total: <span className="font-medium text-gray-900">
                        ${totalAmount.toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={validCount === 0 || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Create {validCount} Receipt{validCount !== 1 ? 's' : ''} & Transaction{validCount !== 1 ? 's' : ''}
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

QuickReceiptEntry.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  companies: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }))
};

QuickReceiptEntry.defaultProps = {
  isLoading: false,
  companies: []
};

export default QuickReceiptEntry;
