/**
 * GlobalRulesManager Component
 * 
 * Manages global (shared) classification rules:
 * - Master toggle to enable/disable all global rules
 * - Individual toggle for each global rule
 * - Shows rule details (pattern, category, vote count)
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getGlobalRulesWithStatus,
  toggleGlobalRules,
  disableGlobalRule,
  enableGlobalRule,
} from '../../services/classificationService';
import { LoadingSpinner } from '../../components/ui';
import {
  GlobeAltIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  UsersIcon,
  SparklesIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';

/**
 * Sort options for global rules
 */
const SORT_OPTIONS = {
  VOTES: 'votes',
  NAME: 'name',
  CATEGORY: 'category',
};

/**
 * GlobalRulesManager Component
 */
export default function GlobalRulesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.VOTES);
  const [filterCategory, setFilterCategory] = useState('all');

  // Fetch global rules with user's enabled/disabled status
  const { data, isLoading, error } = useQuery({
    queryKey: ['globalRules', user?.uid],
    queryFn: () => getGlobalRulesWithStatus(user?.uid),
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Toggle master global rules setting
  const toggleMasterMutation = useMutation({
    mutationFn: (useGlobal) => toggleGlobalRules(user?.uid, useGlobal),
    onSuccess: (_, useGlobal) => {
      queryClient.invalidateQueries(['globalRules']);
      toast.success(useGlobal ? 'Global rules enabled' : 'Global rules disabled');
    },
    onError: (err) => {
      toast.error(`Failed to update setting: ${err.message}`);
    },
  });

  // Toggle individual rule
  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, enable }) => 
      enable ? enableGlobalRule(user?.uid, ruleId) : disableGlobalRule(user?.uid, ruleId),
    onSuccess: (_, { enable, ruleName }) => {
      queryClient.invalidateQueries(['globalRules']);
      toast.success(`${ruleName} ${enable ? 'enabled' : 'disabled'}`);
    },
    onError: (err) => {
      toast.error(`Failed to update rule: ${err.message}`);
    },
  });

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    if (!data?.rules) return [];
    const cats = [...new Set(data.rules.map(r => r.category))];
    return cats.sort();
  }, [data?.rules]);

  // Filter and sort rules
  const filteredRules = useMemo(() => {
    if (!data?.rules) return [];

    let filtered = data.rules;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(search) ||
        r.pattern?.toLowerCase().includes(search) ||
        r.category?.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.VOTES:
          return (b.global_vote_count || 0) - (a.global_vote_count || 0);
        case SORT_OPTIONS.NAME:
          return (a.name || a.pattern).localeCompare(b.name || b.pattern);
        case SORT_OPTIONS.CATEGORY:
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [data?.rules, searchTerm, filterCategory, sortBy]);

  // Stats
  const stats = useMemo(() => {
    if (!data?.rules) return { total: 0, enabled: 0, disabled: 0 };
    return {
      total: data.rules.length,
      enabled: data.rules.filter(r => r.isEnabled).length,
      disabled: data.rules.filter(r => !r.isEnabled).length,
    };
  }, [data?.rules]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load global rules: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with master toggle */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GlobeAltIcon className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Global Classification Rules</h2>
              <p className="text-sm text-gray-500">
                Shared rules from all users for common vendors
              </p>
            </div>
          </div>
          
          {/* Master Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {data?.useGlobal ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => toggleMasterMutation.mutate(!data?.useGlobal)}
              disabled={toggleMasterMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                data?.useGlobal ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  data?.useGlobal ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Rules</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
            <div className="text-xs text-gray-500">Enabled</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.disabled}</div>
            <div className="text-xs text-gray-500">Disabled</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {data?.useGlobal && (
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-48">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="w-40">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={SORT_OPTIONS.VOTES}>Sort by Votes</option>
                <option value={SORT_OPTIONS.NAME}>Sort by Name</option>
                <option value={SORT_OPTIONS.CATEGORY}>Sort by Category</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {data?.useGlobal ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pattern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="h-4 w-4" />
                    <span>Votes</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterCategory !== 'all' 
                      ? 'No rules match your filters'
                      : 'No global rules available'
                    }
                  </td>
                </tr>
              ) : (
                filteredRules.map(rule => (
                  <tr 
                    key={rule.id} 
                    className={`hover:bg-gray-50 ${!rule.isEnabled ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRuleMutation.mutate({ 
                          ruleId: rule.id, 
                          enable: !rule.isEnabled,
                          ruleName: rule.name || rule.pattern,
                        })}
                        disabled={toggleRuleMutation.isPending}
                        className={`p-1 rounded ${
                          rule.isEnabled 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {rule.isEnabled ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <XMarkIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {rule.name || rule.vendor_name || rule.pattern}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {rule.pattern}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {rule.category}
                      </span>
                      {rule.subcategory && (
                        <span className="ml-1 text-xs text-gray-500">
                          / {rule.subcategory}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <UsersIcon className="h-4 w-4" />
                        <span>{rule.global_vote_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rule.source === 'system' ? (
                        <span className="inline-flex items-center text-xs text-purple-600">
                          <SparklesIcon className="h-4 w-4 mr-1" />
                          System
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-green-600">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          Community
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <GlobeAltIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-yellow-800">Global Rules Disabled</h3>
          <p className="text-sm text-yellow-600 mt-1">
            Enable global rules to use shared vendor classifications from other users.
          </p>
          <button
            onClick={() => toggleMasterMutation.mutate(true)}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Enable Global Rules
          </button>
        </div>
      )}
    </div>
  );
}
