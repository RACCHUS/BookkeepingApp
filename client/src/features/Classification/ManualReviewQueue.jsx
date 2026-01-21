/**
 * ManualReviewQueue Component
 * 
 * Displays transactions that couldn't be automatically classified.
 * Allows users to manually assign categories and optionally create rules.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { IRS_CATEGORIES, IRS_CATEGORY_LABELS } from '../../../../shared/constants/categories';
import { saveClassificationRule, CLASSIFICATION_SOURCE } from '../../services/classificationService';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * Fetch transactions needing manual review
 */
const fetchUnclassifiedTransactions = async (userId, companyId) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .or('category.is.null,category.eq.');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query
    .order('date', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
};

/**
 * Update transaction with category
 */
const updateTransaction = async ({ id, category, subcategory, vendor }) => {
  const { error } = await supabase
    .from('transactions')
    .update({
      category,
      subcategory,
      vendor_name: vendor,
      classification_source: CLASSIFICATION_SOURCE.MANUAL,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
};

/**
 * Single transaction review card
 */
function TransactionCard({ transaction, onClassify, isProcessing }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [vendor, setVendor] = useState(transaction.vendor_name || '');
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState('');

  // Get subcategories for selected category
  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const categoryInfo = IRS_CATEGORIES[selectedCategory];
    return categoryInfo?.subcategories || [];
  }, [selectedCategory]);

  // Extract potential vendor pattern from description
  const suggestedPattern = useMemo(() => {
    const desc = transaction.description || '';
    // Take first 2-3 words as pattern
    const words = desc.toUpperCase().split(' ').slice(0, 3);
    return words.join(' ');
  }, [transaction.description]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedSubcategory('');
    if (!rulePattern) {
      setRulePattern(suggestedPattern);
    }
  };

  const handleClassify = () => {
    if (!selectedCategory) return;

    onClassify({
      transactionId: transaction.id,
      category: selectedCategory,
      subcategory: selectedSubcategory || null,
      vendor: vendor || null,
      createRule,
      rulePattern: createRule ? rulePattern : null,
    });
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      {/* Transaction Info */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="font-medium text-gray-900">
            {transaction.description || transaction.payee || 'No description'}
          </p>
          <p className="text-sm text-gray-500">{transaction.date}</p>
        </div>
        <div className={`text-lg font-semibold ${
          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          ${Math.abs(transaction.amount).toFixed(2)}
        </div>
      </div>

      {/* Classification Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Category Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select category...</option>
            {Object.entries(IRS_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Subcategory Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory
          </label>
          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            disabled={!selectedCategory || subcategories.length === 0}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select subcategory...</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Vendor Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor Name
          </label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g., Home Depot"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Create Rule Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id={`rule-${transaction.id}`}
            checked={createRule}
            onChange={(e) => setCreateRule(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={`rule-${transaction.id}`} className="ml-2 text-sm text-gray-700">
            Create rule for future transactions
          </label>
        </div>
      </div>

      {/* Rule Pattern (if creating rule) */}
      {createRule && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Pattern to match (future transactions containing this will auto-classify)
          </label>
          <input
            type="text"
            value={rulePattern}
            onChange={(e) => setRulePattern(e.target.value.toUpperCase())}
            placeholder={suggestedPattern}
            className="w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-xs text-blue-600 mt-1">
            Tip: Use the vendor name or key words from the description
          </p>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleClassify}
          disabled={!selectedCategory || isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Saving...' : 'Classify Transaction'}
        </button>
      </div>
    </div>
  );
}

/**
 * Bulk classification tools
 */
function BulkClassificationBar({ 
  selectedCount, 
  onBulkClassify, 
  onSelectAll, 
  onClearSelection,
  isProcessing 
}) {
  const [bulkCategory, setBulkCategory] = useState('');

  if (selectedCount === 0) {
    return (
      <div className="bg-gray-50 p-3 rounded-md mb-4">
        <p className="text-sm text-gray-600">
          Select transactions to classify them in bulk
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-3 rounded-md mb-4 flex items-center gap-4">
      <span className="text-sm font-medium text-blue-800">
        {selectedCount} selected
      </span>
      
      <select
        value={bulkCategory}
        onChange={(e) => setBulkCategory(e.target.value)}
        className="rounded-md border-blue-300 text-sm"
      >
        <option value="">Select category...</option>
        {Object.entries(IRS_CATEGORY_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <button
        onClick={() => onBulkClassify(bulkCategory)}
        disabled={!bulkCategory || isProcessing}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        Apply to All
      </button>

      <button
        onClick={onClearSelection}
        className="px-3 py-1 text-blue-600 text-sm hover:underline"
      >
        Clear
      </button>
    </div>
  );
}

/**
 * Main ManualReviewQueue Component
 */
export default function ManualReviewQueue({ companyId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processingId, setProcessingId] = useState(null);

  // Fetch unclassified transactions
  const { 
    data: transactions = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['unclassified-transactions', user?.id, companyId],
    queryFn: () => fetchUnclassifiedTransactions(user?.id, companyId),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Mutation for classifying a single transaction
  const classifyMutation = useMutation({
    mutationFn: async ({ transactionId, category, subcategory, vendor, createRule, rulePattern }) => {
      // Update transaction
      await updateTransaction({ 
        id: transactionId, 
        category, 
        subcategory, 
        vendor 
      });

      // Create rule if requested
      if (createRule && rulePattern) {
        await saveClassificationRule({
          pattern: rulePattern,
          patternType: 'contains',
          vendor,
          category,
          subcategory,
        }, user?.id);
      }
    },
    onMutate: ({ transactionId }) => {
      setProcessingId(transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['unclassified-transactions']);
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      console.error('Classification failed:', error);
      alert(`Failed to classify: ${error.message}`);
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  // Mutation for bulk classification
  const bulkClassifyMutation = useMutation({
    mutationFn: async (category) => {
      const ids = Array.from(selectedIds);
      const updates = ids.map(id => 
        updateTransaction({ id, category, subcategory: null, vendor: null })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries(['unclassified-transactions']);
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      console.error('Bulk classification failed:', error);
      alert(`Bulk classification failed: ${error.message}`);
    },
  });

  const handleClassify = (data) => {
    classifyMutation.mutate(data);
  };

  const handleBulkClassify = (category) => {
    if (!category || selectedIds.size === 0) return;
    bulkClassifyMutation.mutate(category);
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(transactions.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <h3 className="font-medium">Error loading transactions</h3>
        <p className="text-sm">{error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-2 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">
          All caught up!
        </h3>
        <p className="text-gray-600">
          No transactions need manual review right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Manual Review Queue
          </h2>
          <p className="text-sm text-gray-600">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} need classification
          </p>
        </div>
        <button
          onClick={selectAll}
          className="text-sm text-blue-600 hover:underline"
        >
          Select all
        </button>
      </div>

      {/* Bulk Classification Bar */}
      <BulkClassificationBar
        selectedCount={selectedIds.size}
        onBulkClassify={handleBulkClassify}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        isProcessing={bulkClassifyMutation.isPending}
      />

      {/* Transaction Cards */}
      <div className="space-y-4">
        {transactions.map(transaction => (
          <div key={transaction.id} className="flex gap-3">
            {/* Checkbox for bulk selection */}
            <div className="pt-4">
              <input
                type="checkbox"
                checked={selectedIds.has(transaction.id)}
                onChange={() => toggleSelection(transaction.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            {/* Transaction Card */}
            <div className="flex-1">
              <TransactionCard
                transaction={transaction}
                onClassify={handleClassify}
                isProcessing={processingId === transaction.id}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
