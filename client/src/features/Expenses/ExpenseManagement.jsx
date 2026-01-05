import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCardIcon,
  ArrowPathIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import ExpenseBulkEdit from './ExpenseBulkEdit';
import api from '../../services/api';

// Cache time configuration - 5 minutes stale time prevents rapid refetching
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
  cacheTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  refetchOnWindowFocus: false, // Don't refetch on tab focus
  retry: 1,                    // Only retry once on failure
};

/**
 * ExpenseManagement - Main page for managing and bulk editing expense transactions
 * 
 * Features:
 * - Bulk edit category, vendor, company, payee, statement, note
 * - 1099 payment tracking
 * - Description and date/amount editing
 * - Statement section management
 * - Option to convert to income type
 */
const ExpenseManagement = () => {
  const queryClient = useQueryClient();

  // Fetch companies with caching
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      try {
        const res = await api.companies.getAll();
        const companies = res?.companies || res?.data?.companies;
        return Array.isArray(companies) ? companies : [];
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  // Fetch payees with caching
  const { data: payeesData } = useQuery({
    queryKey: ['payees'],
    queryFn: async () => {
      try {
        const res = await api.payees.getAll();
        const payees = res?.payees || res?.data?.payees;
        return Array.isArray(payees) ? payees : [];
      } catch (err) {
        console.error('Failed to fetch payees:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  // Fetch vendors with caching
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const res = await api.payees.getVendors();
        const vendors = res?.vendors || res?.data?.vendors || res?.payees;
        return Array.isArray(vendors) ? vendors : [];
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  // Fetch income sources with caching
  const { data: incomeSourcesData } = useQuery({
    queryKey: ['income-sources'],
    queryFn: async () => {
      try {
        const res = await api.incomeSources.getAll();
        const sources = res?.sources || res?.data?.sources;
        return Array.isArray(sources) ? sources : [];
      } catch (err) {
        console.error('Failed to fetch income sources:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  // Fetch uploads/statements with caching
  const { data: statementsData } = useQuery({
    queryKey: ['uploads'],
    queryFn: async () => {
      try {
        const res = await api.pdf.getUploads();
        const uploads = res?.uploads || res?.data?.uploads || res?.data;
        return Array.isArray(uploads) ? uploads : [];
      } catch (err) {
        console.error('Failed to fetch statements:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  // Fetch expense stats with caching
  const { data: statsData, isLoading, refetch: refetchStats } = useQuery({
    queryKey: ['expense-stats'],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      const allTransactions = response?.data?.transactions || response?.transactions || [];
      
      // Filter to expenses
      const expenses = allTransactions.filter(tx => {
        if (tx.type === 'expense') return true;
        if (tx.type === 'income') return false;
        if (tx.sectionCode && ['checks', 'electronic', 'fees', 'withdrawals'].includes(tx.sectionCode)) {
          return true;
        }
        if (tx.amount < 0) return true;
        return false;
      });

      const uncategorized = expenses.filter(tx => !tx.category).length;
      const total1099 = expenses.filter(tx => tx.is1099Payment).length;
      const totalAmount = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      return {
        totalExpenses: expenses.length,
        uncategorized,
        total1099,
        totalAmount
      };
    },
    ...QUERY_CONFIG,
  });

  const companies = Array.isArray(companiesData) ? companiesData : [];
  const payees = Array.isArray(payeesData) ? payeesData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const incomeSources = Array.isArray(incomeSourcesData) ? incomeSourcesData : [];
  const statements = Array.isArray(statementsData) ? statementsData : [];
  const stats = statsData || { totalExpenses: 0, uncategorized: 0, total1099: 0, totalAmount: 0 };

  const handleRefresh = () => {
    // Invalidate the stats cache to trigger refetch
    queryClient.invalidateQueries(['expense-stats']);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <CreditCardIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Expense Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bulk edit and manage expense transactions
            </p>
          </div>
        </div>
        
        <button
          onClick={() => refetchStats()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalExpenses.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">transactions</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(stats.totalAmount)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">in expenses</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Uncategorized</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.uncategorized.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">need categories</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">1099 Payments</div>
          <div className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.total1099.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">contractor payments</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FunnelIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Bulk Editing Instructions
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
              Use the filters to find specific transactions, then select multiple transactions using checkboxes.
              Click "Bulk Edit" to update category, vendor, company, payee, 1099 status, and more for all selected transactions at once.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Bulk Edit Component */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      ) : (
        <ExpenseBulkEdit 
          companies={companies}
          payees={payees}
          vendors={vendors}
          incomeSources={incomeSources}
          statements={statements}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};

export default ExpenseManagement;
