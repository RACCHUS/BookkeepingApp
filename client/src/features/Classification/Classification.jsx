import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import { IRS_CATEGORIES } from '@shared/constants/categories';
import { LoadingSpinner } from '../../components/ui';

const Classification = () => {
  const [rules, setRules] = useState([]);
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [newRule, setNewRule] = useState({
    keywords: '',
    category: ''
  });

  // Test transaction state
  const [testTransaction, setTestTransaction] = useState({
    description: '',
    amount: '',
    type: 'debit'
  });

  useEffect(() => {
    loadClassificationData();
  }, []);

  const loadClassificationData = async () => {
    try {
      setLoading(true);
      const [rulesResponse, uncategorizedResponse] = await Promise.all([
        apiClient.classification.getRules(),
        apiClient.classification.getUncategorized()
      ]);

      setRules(rulesResponse.rules || rulesResponse);
      setUncategorizedTransactions(uncategorizedResponse.transactions || uncategorizedResponse);
    } catch (error) {
      console.error('Error loading classification data:', error);
      toast.error('Failed to load classification data');
    } finally {
      setLoading(false);
    }
  };

  // Remove test classification logic (no longer needed)

  const handleCreateRule = async () => {
    try {
      if (!newRule.keywords.trim() || !newRule.category) {
        toast.error('Please fill in keywords and category');
        return;
      }

      const rule = {
        keywords: newRule.keywords.split(',').map(k => k.trim()).filter(k => k),
        category: newRule.category
      };

      await apiClient.classification.createRule(rule);
      toast.success('Classification rule created');
      // Reset form and reload data
      setNewRule({ keywords: '', category: '' });
      loadClassificationData();
    } catch (error) {
      console.error('Create rule error:', error);
      toast.error('Failed to create rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await apiClient.classification.deleteRule(ruleId);
      toast.success('Rule deleted');
      loadClassificationData();
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
              {Object.entries(IRS_CATEGORIES).map(([key, category]) => (
                <option key={key} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleCreateRule}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Rule
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
                    {new Date(transaction.date).toLocaleDateString()} • ${Math.abs(transaction.amount).toFixed(2)}
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
