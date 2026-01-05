import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  CurrencyDollarIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import IncomeSourceList from './IncomeSourceList';
import IncomeSourceForm from './IncomeSourceForm';
import IncomeAssignment from './IncomeAssignment';
import api from '../../services/api';

// React Query cache settings to prevent excessive Firestore reads
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Cache persists for 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

/**
 * IncomeSourcesPage - Standalone page for managing income sources
 * Similar to Payees/Vendors pages for expense management
 * 
 * Tabs:
 * - Income Sources: CRUD for income sources (customers, clients)
 * - Transaction Assignment: Assign income transactions to sources
 */
const IncomeSourcesPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sources');
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Income categories for filtering
  const incomeCategories = [
    'Gross Receipts', 'Gross Receipts - Sales', 'Gross Receipts - Services',
    'Interest Income', 'Dividend Income', 'Rental Income', 'Other Income', 'Business Income'
  ];

  // Check if a transaction is income
  const isIncomeTransaction = (tx) => {
    if (tx.type === 'income') return true;
    if (tx.type === 'expense') return false;
    if (tx.category) {
      const catLower = tx.category.toLowerCase();
      if (incomeCategories.some(cat => catLower.includes(cat.toLowerCase()))) return true;
      if (catLower.includes('income') || catLower.includes('receipt') || catLower.includes('revenue')) return true;
    }
    if (tx.sectionCode === 'deposits') return true;
    return false;
  };

  // Fetch income sources with React Query caching
  const { 
    data: sourcesData = [], 
    isLoading, 
    refetch: refetchSources 
  } = useQuery({
    queryKey: ['income-sources'],
    queryFn: async () => {
      try {
        const response = await api.incomeSources.getAll();
        const sources = response?.sources || response?.data?.sources;
        return Array.isArray(sources) ? sources : [];
      } catch (err) {
        console.error('Error fetching income sources:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  // Ensure sources is always an array
  const sources = Array.isArray(sourcesData) ? sourcesData : [];

  // Fetch unassigned count with React Query caching
  const { 
    data: unassignedCount = 0, 
    refetch: refetchUnassignedCount 
  } = useQuery({
    queryKey: ['income-unassigned-count'],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      const allTransactions = response?.data?.transactions || response?.transactions || [];
      const incomeTransactions = allTransactions.filter(isIncomeTransaction);
      return incomeTransactions.filter(tx => !tx.incomeSourceId).length;
    },
    ...QUERY_CONFIG,
    onError: (error) => {
      console.error('Error fetching unassigned count:', error);
    },
  });

  const handleRefresh = () => {
    refetchSources();
    refetchUnassignedCount();
  };

  const handleAddSource = () => {
    setEditingSource(null);
    setShowForm(true);
  };

  const handleEditSource = (source) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSource(null);
  };

  const handleSaveSource = async (sourceData) => {
    setIsSaving(true);
    try {
      if (sourceData.id) {
        await api.incomeSources.update(sourceData.id, sourceData);
        toast.success('Income source updated');
      } else {
        await api.incomeSources.create(sourceData);
        toast.success('Income source created');
      }
      
      setShowForm(false);
      setEditingSource(null);
      refetchSources();
    } catch (error) {
      console.error('Error saving income source:', error);
      toast.error('Failed to save income source');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    if (!window.confirm('Are you sure you want to delete this income source?')) {
      return;
    }

    try {
      await api.incomeSources.delete(sourceId);
      toast.success('Income source deleted');
      refetchSources();
    } catch (error) {
      console.error('Error deleting income source:', error);
      toast.error('Failed to delete income source');
    }
  };

  // Calculate stats
  const totalSources = sources.length;
  const activeSources = sources.filter(s => s.isActive !== false).length;
  const totalRevenue = sources.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const tabs = [
    { 
      id: 'sources', 
      label: 'Income Sources',
      icon: UserGroupIcon,
      count: sources.length
    },
    { 
      id: 'assignment', 
      label: 'Transaction Assignment',
      icon: ClipboardDocumentListIcon,
      count: unassignedCount,
      badge: unassignedCount > 0 ? 'warning' : null
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Income Sources</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage customers, clients, and revenue sources
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {activeTab === 'sources' && (
                <button
                  onClick={handleAddSource}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Income Source
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Sources</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalSources}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Active Sources</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeSources}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Revenue (Tracked)</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalRevenue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Unassigned Transactions</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{unassignedCount}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-4" aria-label="Tabs">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        tab.badge === 'warning' 
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'sources' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {showForm && (
              <IncomeSourceForm
                source={editingSource}
                onSave={handleSaveSource}
                onCancel={handleCancelForm}
                isLoading={isSaving}
              />
            )}
            <IncomeSourceList
              sources={sources}
              isLoading={isLoading}
              onEdit={handleEditSource}
              onDelete={handleDeleteSource}
            />
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <IncomeAssignment 
              sources={sources}
              onAssignmentChange={fetchUnassignedCount}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeSourcesPage;
