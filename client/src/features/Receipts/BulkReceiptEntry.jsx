import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ReceiptPercentIcon,
  CheckIcon,
  ExclamationCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories';

/**
 * BulkReceiptEntry - Fast bulk entry for multiple receipts
 * 
 * Features:
 * - Set default vendor/date/category that applies to all new entries
 * - Simple 4-column entry: Date, Amount, Category, Vendor
 * - Each receipt automatically creates a transaction
 * - Keyboard shortcuts for rapid entry
 */
const BulkReceiptEntry = ({ isOpen, onClose, onSubmit, isLoading }) => {
  // Default values applied to all new entries
  const [defaults, setDefaults] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    category: ''
  });
  
  // Receipt entries
  const [entries, setEntries] = useState([createEmptyEntry()]);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [results, setResults] = useState([]);
  
  // Refs for focus management
  const amountRefs = useRef([]);
  
  // Fetch vendors for autocomplete
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.payees.getAll(),
    enabled: isOpen
  });
  
  const vendors = vendorsData?.data?.payees || vendorsData?.payees || [];

  // Create empty entry with defaults applied
  function createEmptyEntry(useDefaults = true) {
    return {
      id: Date.now() + Math.random(),
      vendor: useDefaults ? defaults.vendor : '',
      amount: '',
      date: useDefaults ? defaults.date : new Date().toISOString().split('T')[0],
      category: useDefaults ? defaults.category : ''
    };
  }

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setDefaults({
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        category: ''
      });
      setEntries([createEmptyEntry(false)]);
      setSubmitStatus(null);
      setResults([]);
    }
  }, [isOpen]);

  // Update entry field
  const updateEntry = useCallback((index, field, value) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Add new row with defaults
  const addRow = useCallback(() => {
    setEntries(prev => [...prev, {
      id: Date.now() + Math.random(),
      vendor: defaults.vendor,
      amount: '',
      date: defaults.date,
      category: defaults.category
    }]);
    // Focus on amount of new row after render
    setTimeout(() => {
      const lastRef = amountRefs.current[amountRefs.current.length - 1];
      if (lastRef) lastRef.focus();
    }, 50);
  }, [defaults]);

  // Remove row
  const removeRow = useCallback((index) => {
    setEntries(prev => {
      if (prev.length === 1) {
        return [createEmptyEntry()];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, [defaults]);

  // Apply defaults to all empty fields
  const applyDefaultsToAll = useCallback(() => {
    setEntries(prev => prev.map(entry => ({
      ...entry,
      vendor: entry.vendor || defaults.vendor,
      date: entry.date || defaults.date,
      category: entry.category || defaults.category
    })));
  }, [defaults]);

  // Handle Enter key to add new row
  const handleKeyDown = useCallback((e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === entries.length - 1) {
        addRow();
      } else {
        // Move to next row's amount
        const nextRef = amountRefs.current[index + 1];
        if (nextRef) nextRef.focus();
      }
    }
  }, [entries.length, addRow]);

  // Validate entries
  const getValidEntries = useCallback(() => {
    return entries.filter(e => {
      const amount = parseFloat(e.amount);
      return !isNaN(amount) && amount > 0;
    });
  }, [entries]);

  // Submit all valid entries
  const handleSubmit = async () => {
    const validEntries = getValidEntries();
    if (validEntries.length === 0) return;

    try {
      const receiptsToCreate = validEntries.map(entry => {
        // Use vendor if provided, otherwise use category name, otherwise 'Unknown'
        const vendorName = entry.vendor?.trim() || entry.category || 'Unknown Vendor';
        return {
          vendor: vendorName,
          amount: parseFloat(entry.amount),
          date: entry.date || new Date().toISOString().split('T')[0],
          category: entry.category || null,
          createTransaction: true
        };
      });

      const response = await onSubmit(receiptsToCreate);
      
      if (response?.allSucceeded || response?.successCount === receiptsToCreate.length) {
        setSubmitStatus('success');
        setResults(response.results || []);
      } else if (response?.successCount > 0) {
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
  const validCount = getValidEntries().length;
  const totalAmount = getValidEntries().reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Category options from IRS categories
  const categoryOptions = Object.values(IRS_CATEGORIES).sort();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <ReceiptPercentIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Bulk Receipt Entry
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Each receipt creates a transaction • Press Enter to add rows
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
              submitStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30' : 
              submitStatus === 'partial' ? 'bg-yellow-50 dark:bg-yellow-900/30' : 
              'bg-red-50 dark:bg-red-900/30'
            }`}>
              <div className="flex items-center gap-2">
                {submitStatus === 'success' ? (
                  <>
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      All {results.length} receipts created with transactions!
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
              {/* Default Values Section */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default Values (applied to new rows)
                  </span>
                  <button
                    onClick={applyDefaultsToAll}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Apply to all empty fields
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default Vendor</label>
                    <input
                      type="text"
                      list="vendor-list"
                      value={defaults.vendor}
                      onChange={(e) => setDefaults(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="e.g., Home Depot"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <datalist id="vendor-list">
                      {vendors.map(v => (
                        <option key={v.id} value={v.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default Date</label>
                    <input
                      type="date"
                      value={defaults.date}
                      onChange={(e) => setDefaults(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Default Category</label>
                    <select
                      value={defaults.category}
                      onChange={(e) => setDefaults(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select category...</option>
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Amount *</div>
                <div className="col-span-3">Category</div>
                <div className="col-span-4">Vendor</div>
                <div className="col-span-1"></div>
              </div>

              {/* Entry Rows */}
              <div className="max-h-80 overflow-y-auto">
                {entries.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 items-center hover:bg-gray-50 dark:hover:bg-gray-750"
                  >
                    {/* Date */}
                    <div className="col-span-2">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, 'date', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-2">
                      <input
                        ref={el => amountRefs.current[index] = el}
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.amount}
                        onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Category */}
                    <div className="col-span-3">
                      <select
                        value={entry.category}
                        onChange={(e) => updateEntry(index, 'category', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Select...</option>
                        {categoryOptions.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vendor */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        list="vendor-list"
                        value={entry.vendor}
                        onChange={(e) => updateEntry(index, 'vendor', e.target.value)}
                        placeholder="Vendor name"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeRow(index)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove row"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Row
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {validCount > 0 ? (
                    <span>
                      <strong>{validCount}</strong> receipt{validCount !== 1 ? 's' : ''} ready • 
                      Total: <strong>${totalAmount.toFixed(2)}</strong>
                    </span>
                  ) : (
                    <span className="text-gray-400">Enter amounts to enable submit</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={validCount === 0 || isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin">⟳</span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Create {validCount} Receipt{validCount !== 1 ? 's' : ''} & Transactions
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

BulkReceiptEntry.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool
};

BulkReceiptEntry.defaultProps = {
  isLoading: false
};

export default BulkReceiptEntry;
