/**
 * RulesManagement Page Component
 * 
 * Comprehensive UI for managing classification rules:
 * - User-created rules (manual)
 * - Gemini-created rules (AI generated)
 * - Default vendor mappings (built-in)
 * 
 * Allows viewing, editing, enabling/disabling, and deleting rules.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_VENDORS } from '../../../../shared/constants/defaultVendors';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories';
import { LoadingSpinner } from '../../components/ui';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  UserIcon,
  BuildingStorefrontIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ChevronUpDownIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import GlobalRulesManager from './GlobalRulesManager';

// Tab types
const TABS = {
  USER: 'user',
  GEMINI: 'gemini',
  DEFAULT: 'default',
  GLOBAL: 'global',
};

/**
 * Fetch all classification rules for the user
 */
const fetchAllRules = async (userId) => {
  const { data, error } = await supabase
    .from('classification_rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch user's disabled default vendors
 */
const fetchDisabledDefaults = async (userId) => {
  const { data, error } = await supabase
    .from('disabled_default_vendors')
    .select('pattern')
    .eq('user_id', userId);

  if (error) {
    // Table might not exist yet
    console.warn('Could not fetch disabled defaults:', error);
    return [];
  }
  return data?.map(d => d.pattern) || [];
};

/**
 * Main Rules Management Component
 */
export default function RulesManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(TABS.USER);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingRule, setEditingRule] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Firebase uses uid, not id
  const userId = user?.uid || user?.id;

  // Fetch rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['all-classification-rules', userId],
    queryFn: () => fetchAllRules(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  // Fetch disabled default vendors
  const { data: disabledDefaults = [] } = useQuery({
    queryKey: ['disabled-default-vendors', userId],
    queryFn: () => fetchDisabledDefaults(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  // Split rules by source
  const { userRules, geminiRules } = useMemo(() => {
    const user = [];
    const gemini = [];
    
    for (const rule of rules) {
      if (rule.source === 'gemini') {
        gemini.push(rule);
      } else {
        user.push(rule);
      }
    }
    
    return { userRules: user, geminiRules: gemini };
  }, [rules]);

  // Convert default vendors to array format
  const defaultVendors = useMemo(() => {
    return Object.entries(DEFAULT_VENDORS).map(([pattern, data]) => ({
      pattern,
      ...data,
      isEnabled: !disabledDefaults.includes(pattern),
    }));
  }, [disabledDefaults]);

  // Get current tab data
  const currentRules = useMemo(() => {
    let data = [];
    
    switch (activeTab) {
      case TABS.USER:
        data = userRules;
        break;
      case TABS.GEMINI:
        data = geminiRules;
        break;
      case TABS.DEFAULT:
        data = defaultVendors;
        break;
      default:
        data = [];
    }

    // Apply filters
    return data.filter(rule => {
      const matchesSearch = !searchQuery || 
        rule.pattern?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !categoryFilter || rule.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [activeTab, userRules, geminiRules, defaultVendors, searchQuery, categoryFilter]);

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase
        .from('classification_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-classification-rules']);
      queryClient.invalidateQueries(['classification-rules']);
      toast.success('Rule updated');
      setEditingRule(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update rule');
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('classification_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-classification-rules']);
      queryClient.invalidateQueries(['classification-rules']);
      toast.success('Rule deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete rule');
    },
  });

  // Toggle default vendor
  const toggleDefaultVendorMutation = useMutation({
    mutationFn: async ({ pattern, enable }) => {
      if (enable) {
        // Remove from disabled list
        const { error } = await supabase
          .from('disabled_default_vendors')
          .delete()
          .eq('user_id', userId)
          .eq('pattern', pattern);
        
        if (error) throw error;
      } else {
        // Add to disabled list
        const { error } = await supabase
          .from('disabled_default_vendors')
          .insert({ user_id: userId, pattern });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['disabled-default-vendors']);
      toast.success('Default vendor updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update default vendor');
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (rule) => {
      const { error } = await supabase
        .from('classification_rules')
        .insert({
          ...rule,
          user_id: userId,
          source: 'manual',
          is_active: true,
          match_count: 0,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-classification-rules']);
      queryClient.invalidateQueries(['classification-rules']);
      toast.success('Rule created');
      setShowAddModal(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create rule');
    },
  });

  // Stats
  const stats = useMemo(() => ({
    userRules: userRules.length,
    geminiRules: geminiRules.length,
    defaultVendors: defaultVendors.length,
    enabledDefaults: defaultVendors.filter(d => d.isEnabled).length,
  }), [userRules, geminiRules, defaultVendors]);

  if (rulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Classification Rules
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage how transactions are automatically categorized
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Rule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={UserIcon}
          label="User Rules"
          value={stats.userRules}
          color="blue"
        />
        <StatCard
          icon={SparklesIcon}
          label="AI Rules"
          value={stats.geminiRules}
          color="purple"
        />
        <StatCard
          icon={BuildingStorefrontIcon}
          label="Default Vendors"
          value={stats.defaultVendors}
          color="green"
        />
        <StatCard
          icon={CheckIcon}
          label="Enabled Defaults"
          value={`${stats.enabledDefaults}/${stats.defaultVendors}`}
          color="teal"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="flex gap-4">
          <TabButton
            active={activeTab === TABS.USER}
            onClick={() => setActiveTab(TABS.USER)}
            icon={UserIcon}
            label="User Rules"
            count={userRules.length}
          />
          <TabButton
            active={activeTab === TABS.GEMINI}
            onClick={() => setActiveTab(TABS.GEMINI)}
            icon={SparklesIcon}
            label="AI Rules"
            count={geminiRules.length}
          />
          <TabButton
            active={activeTab === TABS.DEFAULT}
            onClick={() => setActiveTab(TABS.DEFAULT)}
            icon={BuildingStorefrontIcon}
            label="Default Vendors"
            count={defaultVendors.length}
          />
          <TabButton
            active={activeTab === TABS.GLOBAL}
            onClick={() => setActiveTab(TABS.GLOBAL)}
            icon={GlobeAltIcon}
            label="Global Rules"
          />
        </nav>
      </div>

      {/* Global Rules Tab - Separate Component */}
      {activeTab === TABS.GLOBAL ? (
        <GlobalRulesManager />
      ) : (
        <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patterns or vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {Object.entries(IRS_CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {activeTab === TABS.DEFAULT ? (
          <DefaultVendorsTable
            vendors={currentRules}
            onToggle={(pattern, enable) => toggleDefaultVendorMutation.mutate({ pattern, enable })}
            isToggling={toggleDefaultVendorMutation.isPending}
          />
        ) : (
          <RulesTable
            rules={currentRules}
            onEdit={setEditingRule}
            onDelete={(id) => {
              if (confirm('Are you sure you want to delete this rule?')) {
                deleteRuleMutation.mutate(id);
              }
            }}
            onToggleActive={(id, isActive) => {
              updateRuleMutation.mutate({ id, updates: { is_active: !isActive } });
            }}
            isUpdating={updateRuleMutation.isPending}
            isDeleting={deleteRuleMutation.isPending}
            showSource={activeTab === TABS.GEMINI}
          />
        )}
      </div>

      {/* Edit Modal */}
      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onSave={(updates) => updateRuleMutation.mutate({ id: editingRule.id, updates })}
          onClose={() => setEditingRule(null)}
          isLoading={updateRuleMutation.isPending}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddRuleModal
          onSave={(rule) => createRuleMutation.mutate(rule)}
          onClose={() => setShowAddModal(false)}
          isLoading={createRuleMutation.isPending}
        />
      )}
        </>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Button Component
 */
function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      <span className={`px-2 py-0.5 text-xs rounded-full ${
        active
          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      }`}>
        {count}
      </span>
    </button>
  );
}

/**
 * Rules Table Component
 */
function RulesTable({ rules, onEdit, onDelete, onToggleActive, isUpdating, isDeleting, showSource }) {
  if (rules.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        No rules found. Create a rule to automatically classify transactions.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Pattern
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Direction
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Matches
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                    {rule.pattern}
                  </code>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({rule.pattern_type || 'contains'})
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {rule.vendor_name || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {IRS_CATEGORIES[rule.category] || rule.category}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  rule.amount_direction === 'positive' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : rule.amount_direction === 'negative'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {rule.amount_direction === 'positive' ? '+ Income' : 
                   rule.amount_direction === 'negative' ? '− Expense' : 'Any'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {rule.match_count || 0}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggleActive(rule.id, rule.is_active)}
                  disabled={isUpdating}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    rule.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {rule.is_active ? (
                    <>
                      <EyeIcon className="w-3 h-3" /> Active
                    </>
                  ) : (
                    <>
                      <EyeSlashIcon className="w-3 h-3" /> Inactive
                    </>
                  )}
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(rule)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit rule"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(rule.id)}
                    disabled={isDeleting}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete rule"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Default Vendors Table Component
 */
function DefaultVendorsTable({ vendors, onToggle, isToggling }) {
  if (vendors.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        No default vendors found.
      </div>
    );
  }

  // Categories that represent income (positive direction)
  const INCOME_CATEGORIES = ['INCOME', 'GROSS_RECEIPTS', 'RENTAL_INCOME', 'INTEREST_INCOME', 'DIVIDEND_INCOME', 'CAPITAL_GAINS', 'OTHER_INCOME', 'OWNER_CONTRIBUTION'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Pattern
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Vendor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Subcategory
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Direction
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Enabled
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {vendors.map((vendor) => {
            const isIncome = INCOME_CATEGORIES.includes(vendor.category);
            return (
              <tr key={vendor.pattern} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-3 whitespace-nowrap">
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                    {vendor.pattern}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {vendor.vendor || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {IRS_CATEGORIES[vendor.category] || vendor.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {vendor.subcategory || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isIncome
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                  }`}>
                    {isIncome ? '+ Income' : '− Expense'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <button
                    onClick={() => onToggle(vendor.pattern, !vendor.isEnabled)}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      vendor.isEnabled
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        vendor.isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Edit Rule Modal
 */
function EditRuleModal({ rule, onSave, onClose, isLoading }) {
  const [formData, setFormData] = useState({
    pattern: rule.pattern || '',
    pattern_type: rule.pattern_type || 'contains',
    vendor_name: rule.vendor_name || '',
    category: rule.category || '',
    subcategory: rule.subcategory || '',
    amount_direction: rule.amount_direction || 'any',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Edit Rule
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pattern
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pattern Type
                </label>
                <select
                  value={formData.pattern_type}
                  onChange={(e) => setFormData({ ...formData, pattern_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="starts_with">Starts With</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Direction
                </label>
                <select
                  value={formData.amount_direction}
                  onChange={(e) => setFormData({ ...formData, amount_direction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  title="Match only when transaction amount is positive (income/credit), negative (expense/debit), or any direction"
                >
                  <option value="any">Any</option>
                  <option value="positive">Positive (Income)</option>
                  <option value="negative">Negative (Expense)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor Name
              </label>
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select category...</option>
                {Object.entries(IRS_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Add Rule Modal
 */
function AddRuleModal({ onSave, onClose, isLoading }) {
  const [formData, setFormData] = useState({
    pattern: '',
    pattern_type: 'contains',
    vendor_name: '',
    category: '',
    subcategory: '',
    amount_direction: 'any',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Rule
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pattern *
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="e.g., AMAZON, SHELL, OFFICE DEPOT"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Text to match in transaction descriptions (case-insensitive)
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pattern Type
                </label>
                <select
                  value={formData.pattern_type}
                  onChange={(e) => setFormData({ ...formData, pattern_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="starts_with">Starts With</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Direction
                </label>
                <select
                  value={formData.amount_direction}
                  onChange={(e) => setFormData({ ...formData, amount_direction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  title="Match only when transaction amount is positive (income/credit), negative (expense/debit), or any direction"
                >
                  <option value="any">Any</option>
                  <option value="positive">Positive (Income)</option>
                  <option value="negative">Negative (Expense)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor Name
              </label>
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="e.g., Amazon, Shell Gas"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select category...</option>
                {Object.entries(IRS_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="Optional subcategory"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.pattern || !formData.category}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
