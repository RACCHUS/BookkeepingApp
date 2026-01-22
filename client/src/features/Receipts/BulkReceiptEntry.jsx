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
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories';

/**
 * Parse pasted text data into receipt entries
 * Handles various formats: "amount date", "date amount", tab/space separated
 * 
 * @param {string} text - Raw pasted text
 * @param {string} defaultCategory - Category to apply to all entries
 * @param {string} defaultVendor - Vendor to apply to all entries
 * @returns {{ entries: Array, errors: Array, stats: Object }}
 */
export function parsePastedData(text, defaultCategory = '', defaultVendor = '') {
  const entries = [];
  const errors = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return { entries: [], errors: ['No data found in pasted text'], stats: { total: 0, parsed: 0, failed: 0 } };
  }

  // Regex patterns for parsing
  // Amount pattern: optional negative, optional $, digits with optional comma separators, optional decimal
  const amountPattern = /^-?\$?[\d,]+(?:\.\d{1,2})?$|^-?[\d,]+(?:\.\d{1,2})?\$?$/;
  
  // Date patterns: M/D/YY, M/D/YYYY, MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD
  const datePatterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,  // M/D/YY or M/D/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/            // YYYY-MM-DD (ISO)
  ];

  /**
   * Parse amount string to number
   */
  function parseAmount(str) {
    if (!str) return null;
    // Remove $ and commas, keep negative sign
    const cleaned = str.replace(/[$,]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse date string to YYYY-MM-DD format
   */
  function parseDate(str) {
    if (!str) return null;
    
    // Try M/D/YY or M/D/YYYY format
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
      let [, month, day, year] = slashMatch;
      // Convert 2-digit year to 4-digit (assume 2000s for years < 50, 1900s otherwise)
      if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        year = yearNum < 50 ? `20${year}` : `19${year}`;
      }
      // Pad month and day
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');
      
      // Validate date
      const dateObj = new Date(`${year}-${month}-${day}`);
      if (isNaN(dateObj.getTime())) return null;
      
      return `${year}-${month}-${day}`;
    }
    
    // Try ISO format YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const dateObj = new Date(str);
      if (isNaN(dateObj.getTime())) return null;
      return str;
    }
    
    return null;
  }

  /**
   * Check if a string looks like an amount
   */
  function looksLikeAmount(str) {
    return /^-?\$?[\d,]+(?:\.\d{1,2})?$/.test(str.trim()) || 
           /^-?[\d,]+(?:\.\d{1,2})?\$?$/.test(str.trim());
  }

  /**
   * Check if a string looks like a date
   */
  function looksLikeDate(str) {
    return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str.trim()) ||
           /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
  }

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    try {
      // Split by whitespace or tab
      const parts = line.split(/[\t\s]+/).filter(p => p.length > 0);
      
      if (parts.length < 2) {
        errors.push({ line: lineNum, text: line, error: 'Need at least amount and date' });
        continue;
      }

      let amount = null;
      let date = null;
      let vendor = defaultVendor;

      // Try to identify amount and date from first two parts
      // Could be "amount date" or "date amount"
      const first = parts[0];
      const second = parts[1];

      if (looksLikeAmount(first) && looksLikeDate(second)) {
        // Format: amount date [vendor...]
        amount = parseAmount(first);
        date = parseDate(second);
        // Rest could be vendor
        if (parts.length > 2) {
          vendor = parts.slice(2).join(' ') || defaultVendor;
        }
      } else if (looksLikeDate(first) && looksLikeAmount(second)) {
        // Format: date amount [vendor...]
        date = parseDate(first);
        amount = parseAmount(second);
        if (parts.length > 2) {
          vendor = parts.slice(2).join(' ') || defaultVendor;
        }
      } else {
        // Try harder - maybe there's extra text
        // Look for any amount-like and date-like values
        let foundAmount = null;
        let foundDate = null;
        let amountIdx = -1;
        let dateIdx = -1;

        for (let j = 0; j < parts.length; j++) {
          if (!foundAmount && looksLikeAmount(parts[j])) {
            foundAmount = parseAmount(parts[j]);
            amountIdx = j;
          } else if (!foundDate && looksLikeDate(parts[j])) {
            foundDate = parseDate(parts[j]);
            dateIdx = j;
          }
        }

        if (foundAmount !== null && foundDate !== null) {
          amount = foundAmount;
          date = foundDate;
          // Collect remaining parts as vendor
          const vendorParts = parts.filter((_, idx) => idx !== amountIdx && idx !== dateIdx);
          if (vendorParts.length > 0) {
            vendor = vendorParts.join(' ');
          }
        } else {
          errors.push({ 
            line: lineNum, 
            text: line, 
            error: `Could not find ${!foundAmount ? 'amount' : ''}${!foundAmount && !foundDate ? ' and ' : ''}${!foundDate ? 'date' : ''}` 
          });
          continue;
        }
      }

      // Validate parsed values
      if (amount === null) {
        errors.push({ line: lineNum, text: line, error: 'Invalid amount format' });
        continue;
      }

      if (date === null) {
        errors.push({ line: lineNum, text: line, error: 'Invalid date format (use M/D/YY or YYYY-MM-DD)' });
        continue;
      }

      // Create entry
      entries.push({
        id: Date.now() + Math.random() + i,
        amount: amount.toString(),
        date: date,
        category: defaultCategory,
        vendor: vendor
      });

    } catch (err) {
      errors.push({ line: lineNum, text: line, error: `Parse error: ${err.message}` });
    }
  }

  return {
    entries,
    errors,
    stats: {
      total: lines.length,
      parsed: entries.length,
      failed: errors.length
    }
  };
}

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
  
  // Paste mode state
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState(null);
  
  // Refs for focus management
  const amountRefs = useRef([]);
  const pasteTextareaRef = useRef(null);
  
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
      setShowPasteMode(false);
      setPasteText('');
      setParseResult(null);
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

  // Handle paste mode - parse the text and show preview
  const handleParsePaste = useCallback(() => {
    if (!pasteText.trim()) {
      setParseResult({ entries: [], errors: [{ error: 'Please paste some data first' }], stats: { total: 0, parsed: 0, failed: 0 } });
      return;
    }
    
    const result = parsePastedData(pasteText, defaults.category, defaults.vendor);
    setParseResult(result);
  }, [pasteText, defaults.category, defaults.vendor]);

  // Apply parsed entries to the main entries list
  const handleApplyParsedEntries = useCallback(() => {
    if (!parseResult || parseResult.entries.length === 0) return;
    
    // Replace empty entries or add to existing
    setEntries(prev => {
      // If only one empty entry exists, replace it
      if (prev.length === 1 && !prev[0].amount) {
        return parseResult.entries;
      }
      // Otherwise append
      return [...prev, ...parseResult.entries];
    });
    
    // Exit paste mode
    setShowPasteMode(false);
    setPasteText('');
    setParseResult(null);
  }, [parseResult]);

  // Cancel paste mode
  const handleCancelPaste = useCallback(() => {
    setShowPasteMode(false);
    setPasteText('');
    setParseResult(null);
  }, []);

  // Validate entries - allow negative amounts for refunds
  const getValidEntries = useCallback(() => {
    return entries.filter(e => {
      const amount = parseFloat(e.amount);
      return !isNaN(amount) && amount !== 0;
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
                
                {/* Paste Data Button */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowPasteMode(true);
                      setTimeout(() => pasteTextareaRef.current?.focus(), 50);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    Paste Data (amount + date per line)
                  </button>
                </div>
              </div>

              {/* Paste Mode UI */}
              {showPasteMode && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-purple-800 dark:text-purple-200">Paste Data</span>
                    </div>
                    <button
                      onClick={handleCancelPaste}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                    Paste lines with <strong>amount</strong> and <strong>date</strong> (any order). 
                    Supports: negative amounts, M/D/YY dates, optional vendor names.
                  </p>
                  
                  <textarea
                    ref={pasteTextareaRef}
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      setParseResult(null); // Clear previous results
                    }}
                    placeholder="Example:
3122.53 1/31/25
112.41 1/5/25
-95.35 9/6/25 Home Depot
1/15/25 $500.00 Amazon"
                    rows={6}
                    className="w-full px-3 py-2 text-sm font-mono border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400"
                  />
                  
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleParsePaste}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Preview Parse
                    </button>
                    
                    {parseResult && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {parseResult.stats.parsed} parsed
                        </span>
                        {parseResult.stats.failed > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {parseResult.stats.failed} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Parse Results Preview */}
                  {parseResult && parseResult.entries.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Preview ({parseResult.entries.length} entries):
                      </div>
                      <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-2 py-1 text-left text-gray-600 dark:text-gray-300">Date</th>
                              <th className="px-2 py-1 text-right text-gray-600 dark:text-gray-300">Amount</th>
                              <th className="px-2 py-1 text-left text-gray-600 dark:text-gray-300">Category</th>
                              <th className="px-2 py-1 text-left text-gray-600 dark:text-gray-300">Vendor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parseResult.entries.map((entry, idx) => (
                              <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                                <td className="px-2 py-1 text-gray-900 dark:text-white">{entry.date}</td>
                                <td className={`px-2 py-1 text-right ${parseFloat(entry.amount) < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                  {parseFloat(entry.amount) < 0 ? '' : '$'}{entry.amount}
                                </td>
                                <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{entry.category || '—'}</td>
                                <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{entry.vendor || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <button
                        onClick={handleApplyParsedEntries}
                        className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckIcon className="h-4 w-4 inline mr-1" />
                        Add {parseResult.entries.length} Entries
                      </button>
                    </div>
                  )}
                  
                  {/* Parse Errors */}
                  {parseResult && parseResult.errors.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                        Failed to parse ({parseResult.errors.length}):
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-sm">
                        {parseResult.errors.map((err, idx) => (
                          <div key={idx} className="text-red-700 dark:text-red-300 mb-1">
                            {err.line ? `Line ${err.line}: ` : ''}<code className="bg-red-100 dark:bg-red-900 px-1 rounded">{err.text || err.error}</code>
                            {err.text && <span className="text-red-500"> — {err.error}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
