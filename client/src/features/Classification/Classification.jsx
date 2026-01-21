import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { IRS_CATEGORIES } from '@shared/constants/categories';
import { LoadingSpinner } from '../../components/ui';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

// React Query cache settings to prevent excessive Firestore reads
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Cache persists for 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

const Classification = () => {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState(null);
  const [newRule, setNewRule] = useState({
    keywords: '',
    category: '',
    applyToExisting: false
  });
  const [applyingRule, setApplyingRule] = useState(false);

  // Test transaction state
  const [testTransaction, setTestTransaction] = useState({
    description: '',
    amount: '',
    type: 'debit'
  });

  // Fetch classification rules with React Query caching
  const { 
    data: rulesData, 
    isLoading: rulesLoading,
    refetch: refetchRules 
  } = useQuery({
    queryKey: ['classification-rules'],
    queryFn: async () => {
      const response = await api.classification.getRules();
      // Handle various response formats: { rules: [...] }, { data: { rules: [...] } }, or direct array
      const rules = response?.rules || response?.data?.rules || response?.data || response;
      return Array.isArray(rules) ? rules : [];
    },
    ...QUERY_CONFIG,
    onError: (error) => {
      console.error('Error loading classification rules:', error);
      toast.error('Failed to load classification rules');
    },
  });

  // Ensure rules is always an array
  const rules = Array.isArray(rulesData) ? rulesData : [];

  // Fetch uncategorized transactions with React Query caching
  const { 
    data: uncategorizedData, 
    isLoading: uncategorizedLoading 
  } = useQuery({
    queryKey: ['uncategorized-transactions'],
    queryFn: async () => {
      const response = await api.classification.getUncategorized();
      // Handle various response formats
      const transactions = response?.transactions || response?.data?.transactions || response?.data || response;
      return Array.isArray(transactions) ? transactions : [];
    },
    ...QUERY_CONFIG,
    onError: (error) => {
      console.error('Error loading uncategorized transactions:', error);
    },
  });

  // Ensure uncategorizedTransactions is always an array
  const uncategorizedTransactions = Array.isArray(uncategorizedData) ? uncategorizedData : [];

  const loading = rulesLoading || uncategorizedLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries(['classification-rules']);
    queryClient.invalidateQueries(['uncategorized-transactions']);
  };

  // Remove test classification logic (no longer needed)

  const handleCreateRule = async () => {
    try {
      if (!newRule.keywords.trim() || !newRule.category) {
        toast.error('Please fill in keywords and category');
        return;
      }

      const keywords = newRule.keywords.split(',').map(k => k.trim()).filter(k => k);
      const rule = {
        keywords,
        category: newRule.category
      };

      await api.classification.createRule(rule);
      toast.success('Classification rule created');

      // Apply to existing transactions if checkbox is checked
      if (newRule.applyToExisting) {
        setApplyingRule(true);
        try {
          const result = await api.classification.applyRuleToExisting(keywords, newRule.category);
          if (result.count > 0) {
            toast.success(`Updated ${result.count} existing transaction${result.count > 1 ? 's' : ''}`);
            // Invalidate transactions cache
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['recent-transactions']);
            queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
          } else {
            toast.info('No matching uncategorized transactions found');
          }
        } catch (applyError) {
          console.error('Error applying rule to existing:', applyError);
          toast.error('Rule created, but failed to apply to existing transactions');
        } finally {
          setApplyingRule(false);
        }
      }

      // Reset form and reload data
      setNewRule({ keywords: '', category: '', applyToExisting: false });
      handleRefresh();
    } catch (error) {
      console.error('Create rule error:', error);
      toast.error('Failed to create rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await api.classification.deleteRule(ruleId);
      toast.success('Rule deleted');
      handleRefresh();
    } catch (error) {
      console.error('Delete rule error:', error);
      toast.error('Failed to delete rule');
    }
  };

  // Remove bulk reclassify logic (no longer needed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transaction Classification
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage rule-based transaction categorization. Rules map keywords to IRS categories. If no rule matches, the category is left empty.
          </p>
        </div>
        <Link
          to="/classification/rules"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
          Manage Rules
        </Link>
      </div>

      {/* Create New Rule */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Create Classification Rule
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={newRule.keywords}
              onChange={(e) => setNewRule(prev => ({ ...prev, keywords: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="walmart, grocery, food..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={newRule.category}
              onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select category...</option>
              <optgroup label="— Income —">
                {Object.entries(IRS_CATEGORIES)
                  .filter(([key]) => ['GROSS_RECEIPTS', 'RETURNS_ALLOWANCES', 'OTHER_INCOME'].includes(key))
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([key, category]) => (
                    <option key={key} value={category}>{category}</option>
                  ))}
              </optgroup>
              <optgroup label="— Cost of Goods Sold —">
                {Object.entries(IRS_CATEGORIES)
                  .filter(([key]) => ['COST_OF_GOODS_SOLD', 'INVENTORY_BEGINNING', 'INVENTORY_PURCHASES', 'COST_OF_LABOR', 'MATERIALS_SUPPLIES', 'OTHER_COSTS', 'INVENTORY_ENDING'].includes(key))
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([key, category]) => (
                    <option key={key} value={category}>{category}</option>
                  ))}
              </optgroup>
              <optgroup label="— Business Expenses (Schedule C) —">
                {Object.entries(IRS_CATEGORIES)
                  .filter(([key]) => ['ADVERTISING', 'CAR_TRUCK_EXPENSES', 'COMMISSIONS_FEES', 'CONTRACT_LABOR', 'DEPLETION', 'DEPRECIATION', 'EMPLOYEE_BENEFIT_PROGRAMS', 'INSURANCE_OTHER', 'INTEREST_MORTGAGE', 'INTEREST_OTHER', 'LEGAL_PROFESSIONAL', 'OFFICE_EXPENSES', 'PENSION_PROFIT_SHARING', 'RENT_LEASE_VEHICLES', 'RENT_LEASE_OTHER', 'REPAIRS_MAINTENANCE', 'SUPPLIES', 'TAXES_LICENSES', 'TRAVEL', 'MEALS', 'UTILITIES', 'WAGES'].includes(key))
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([key, category]) => (
                    <option key={key} value={category}>{category}</option>
                  ))}
              </optgroup>
              <optgroup label="— Other Expenses —">
                {Object.entries(IRS_CATEGORIES)
                  .filter(([key]) => ['OTHER_EXPENSES', 'SOFTWARE_SUBSCRIPTIONS', 'WEB_HOSTING', 'BANK_FEES', 'BAD_DEBTS', 'DUES_MEMBERSHIPS', 'TRAINING_EDUCATION', 'TRADE_PUBLICATIONS', 'SECURITY_SERVICES', 'BUSINESS_GIFTS', 'UNIFORMS_SAFETY', 'TOOLS_EQUIPMENT'].includes(key))
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([key, category]) => (
                    <option key={key} value={category}>{category}</option>
                  ))}
              </optgroup>
              <optgroup label="— Personal / Non-Deductible —">
                {Object.entries(IRS_CATEGORIES)
                  .filter(([key]) => ['PERSONAL_EXPENSE', 'PERSONAL_TRANSFER', 'OWNER_DRAWS', 'UNCATEGORIZED', 'SPLIT_TRANSACTION'].includes(key))
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([key, category]) => (
                    <option key={key} value={category}>{category}</option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={newRule.applyToExisting}
              onChange={(e) => setNewRule(prev => ({ ...prev, applyToExisting: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            Apply to existing uncategorized transactions
          </label>
        </div>
        <button
          onClick={handleCreateRule}
          disabled={applyingRule}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {applyingRule ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Applying...
            </>
          ) : (
            'Create Rule'
          )}
        </button>
      </div>

      {/* Existing Rules */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Classification Rules
        </h2>
        {rules.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No classification rules found.</p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {rule.category}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Keywords: {rule.keywords.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Uncategorized Transactions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Uncategorized Transactions
        </h2>
        {uncategorizedTransactions.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No uncategorized transactions found.</p>
        ) : (
          <div className="space-y-2">
            {uncategorizedTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(transaction.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} • ${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs rounded">
                  Uncategorized
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Classification;
