/**
 * SplitTransactionModal Component
 * 
 * Modal for splitting a transaction into multiple parts with different
 * categories, descriptions, and amounts.
 * 
 * Features:
 * - Add/remove split parts dynamically
 * - Real-time validation of amounts
 * - Shows remainder calculation
 * - Category dropdown with IRS categories
 * - Support for single and bulk split modes
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { IRS_CATEGORIES } from '../constants';

// Format number as currency
const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Math.abs(num));
};

// Get category display name
const getCategoryDisplay = (category) => {
  if (!category) return 'Uncategorized';
  return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Default empty split part
const createEmptySplitPart = () => ({
  id: Date.now() + Math.random(),
  amount: '',
  category: '',
  subcategory: '',
  description: '',
  vendorName: '',
  notes: ''
});

/**
 * Individual split part row component
 */
const SplitPartRow = ({ 
  part, 
  index, 
  onUpdate, 
  onRemove, 
  canRemove,
  maxAmount,
  categories 
}) => {
  const handleChange = (field, value) => {
    onUpdate(part.id, { ...part, [field]: value });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow empty or valid decimal numbers
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      handleChange('amount', value);
    }
  };

  const isAmountValid = part.amount === '' || 
    (parseFloat(part.amount) > 0 && parseFloat(part.amount) <= maxAmount);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 bg-gray-50 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Split Part {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(part.id)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              value={part.amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className={`w-full pl-7 pr-3 py-2 border rounded-md text-sm
                ${isAmountValid 
                  ? 'border-gray-300 dark:border-gray-600' 
                  : 'border-red-500'
                }
                dark:bg-gray-700 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          {!isAmountValid && part.amount !== '' && (
            <p className="text-xs text-red-500 mt-1">
              Amount must be between $0.01 and {formatCurrency(maxAmount)}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Category *
          </label>
          <select
            value={part.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
              dark:bg-gray-700 dark:text-white
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryDisplay(cat)}
              </option>
            ))}
          </select>
        </div>

        {/* Description (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={part.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Override description..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
              dark:bg-gray-700 dark:text-white
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Vendor Name (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Vendor (optional)
          </label>
          <input
            type="text"
            value={part.vendorName}
            onChange={(e) => handleChange('vendorName', e.target.value)}
            placeholder="Override vendor..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
              dark:bg-gray-700 dark:text-white
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Notes (optional) */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          value={part.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Add notes for this split..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
            dark:bg-gray-700 dark:text-white
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
};

/**
 * Main SplitTransactionModal component
 */
const SplitTransactionModal = ({
  isOpen,
  onClose,
  transaction,
  onSplit,
  isLoading = false
}) => {
  const [splitParts, setSplitParts] = useState([createEmptySplitPart()]);
  const [error, setError] = useState('');

  // Get available categories
  const categories = useMemo(() => {
    return Object.values(IRS_CATEGORIES).filter(cat => cat && cat !== 'UNCATEGORIZED');
  }, []);

  // Reset state when modal opens with new transaction
  useEffect(() => {
    if (isOpen && transaction) {
      setSplitParts([createEmptySplitPart()]);
      setError('');
    }
  }, [isOpen, transaction?.id]);

  // Calculate amounts
  const originalAmount = useMemo(() => {
    return Math.abs(parseFloat(transaction?.amount) || 0);
  }, [transaction?.amount]);

  const totalSplitAmount = useMemo(() => {
    return splitParts.reduce((sum, part) => {
      const amt = parseFloat(part.amount) || 0;
      return sum + amt;
    }, 0);
  }, [splitParts]);

  const remainder = useMemo(() => {
    return Math.max(0, originalAmount - totalSplitAmount);
  }, [originalAmount, totalSplitAmount]);

  const isOverBudget = totalSplitAmount > originalAmount + 0.01;

  // Update a split part
  const handleUpdatePart = useCallback((partId, updatedPart) => {
    setSplitParts(parts => 
      parts.map(p => p.id === partId ? updatedPart : p)
    );
  }, []);

  // Remove a split part
  const handleRemovePart = useCallback((partId) => {
    setSplitParts(parts => parts.filter(p => p.id !== partId));
  }, []);

  // Add a new split part
  const handleAddPart = useCallback(() => {
    setSplitParts(parts => [...parts, createEmptySplitPart()]);
  }, []);

  // Validate and submit
  const handleSubmit = async () => {
    setError('');

    // Validate all parts
    const validParts = splitParts.filter(p => p.amount && p.category);
    
    if (validParts.length === 0) {
      setError('At least one split part with amount and category is required');
      return;
    }

    // Check for incomplete parts
    const incompleteParts = splitParts.filter(p => 
      (p.amount && !p.category) || (!p.amount && p.category)
    );
    if (incompleteParts.length > 0) {
      setError('All split parts must have both amount and category');
      return;
    }

    // Check total doesn't exceed original
    if (isOverBudget) {
      setError(`Total split amount (${formatCurrency(totalSplitAmount)}) exceeds original (${formatCurrency(originalAmount)})`);
      return;
    }

    // Format parts for API
    const formattedParts = validParts.map(p => ({
      amount: parseFloat(p.amount),
      category: p.category,
      subcategory: p.subcategory || undefined,
      description: p.description || undefined,
      vendorName: p.vendorName || undefined,
      notes: p.notes || undefined
    }));

    try {
      await onSplit(transaction.id, formattedParts);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to split transaction');
    }
  };

  // Quick split: split evenly by count
  const handleQuickSplit = (count) => {
    const amountPerPart = Math.floor((originalAmount / count) * 100) / 100;
    const parts = [];
    
    for (let i = 0; i < count; i++) {
      parts.push({
        ...createEmptySplitPart(),
        amount: i === count - 1 
          ? (originalAmount - (amountPerPart * (count - 1))).toFixed(2) 
          : amountPerPart.toFixed(2)
      });
    }
    
    setSplitParts(parts);
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Split Transaction
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Original Transaction Info */}
          <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {transaction.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(transaction.date).toLocaleDateString()} • {transaction.category || 'Uncategorized'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Original Amount
                </p>
              </div>
            </div>
          </div>

          {/* Quick Split Buttons */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Quick split:</span>
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleQuickSplit(count)}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  {count} ways
                </button>
              ))}
            </div>
          </div>

          {/* Split Parts - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 380px)' }}>
            {splitParts.map((part, index) => (
              <SplitPartRow
                key={part.id}
                part={part}
                index={index}
                onUpdate={handleUpdatePart}
                onRemove={handleRemovePart}
                canRemove={splitParts.length > 1}
                maxAmount={originalAmount}
                categories={categories}
              />
            ))}

            {/* Add Part Button */}
            <button
              type="button"
              onClick={handleAddPart}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 
                rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500
                transition-colors text-sm"
            >
              + Add Another Split Part
            </button>
          </div>

          {/* Summary */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Original</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(originalAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Split Total</p>
                <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {formatCurrency(totalSplitAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Remainder</p>
                <p className={`text-sm font-semibold ${remainder > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {formatCurrency(remainder)}
                </p>
              </div>
            </div>

            {remainder > 0.01 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 text-center">
                Remainder of {formatCurrency(remainder)} will stay with the original transaction
              </p>
            )}

            {error && (
              <p className="text-sm text-red-500 mt-2 text-center">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isOverBudget || splitParts.every(p => !p.amount || !p.category)}
              className="px-4 py-2 text-sm font-medium text-white 
                bg-blue-600 hover:bg-blue-700 rounded-md transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Splitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Split Transaction
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitTransactionModal;
