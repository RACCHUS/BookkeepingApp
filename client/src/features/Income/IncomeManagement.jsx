import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  BanknotesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import IncomeBulkEdit from './IncomeBulkEdit';
import api from '../../services/api';

// Cache time configuration - 5 minutes stale time prevents rapid refetching
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
  cacheTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  refetchOnWindowFocus: false, // Don't refetch on tab focus
  retry: 1,                    // Only retry once on failure
};

// Income categories from IRS Schedule C
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

/**
 * IncomeManagement - Main page for bulk editing income transactions
 * 
 * Note: Income Sources and Transaction Assignment are now at /income-sources
 */
const IncomeManagement = () => {
  const queryClient = useQueryClient();

  // Fetch income sources with caching
  const { data: sourcesData } = useQuery({
    queryKey: ['income-sources'],
    queryFn: async () => {
      try {
        const res = await api.incomeSources.getAll();
        // api.get extracts response.data via interceptor, so res = { success, sources }
        const sources = res?.sources || res?.data?.sources;
        return Array.isArray(sources) ? sources : [];
      } catch (err) {
        console.error('Failed to fetch income sources:', err);
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

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

  // Fetch income stats with caching
  const { data: statsData, isLoading, refetch: refetchStats } = useQuery({
    queryKey: ['income-stats'],
    queryFn: async () => {
      const response = await api.transactions.getAll({ limit: 200 });
      const allTransactions = response?.data?.transactions || response?.transactions || [];
      const incomeTransactions = allTransactions.filter(isIncomeTransaction);
      
      return {
        incomeCount: incomeTransactions.length,
        uncategorizedCount: incomeTransactions.filter(tx => !tx.category).length
      };
    },
    ...QUERY_CONFIG,
  });

  const sources = Array.isArray(sourcesData) ? sourcesData : [];
  const companies = Array.isArray(companiesData) ? companiesData : [];
  const payees = Array.isArray(payeesData) ? payeesData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const statements = Array.isArray(statementsData) ? statementsData : [];

  const handleRefresh = () => {
    queryClient.invalidateQueries(['income-stats']);
    queryClient.invalidateQueries(['income-sources']);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Income</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View and bulk edit income transactions
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <IncomeBulkEdit
          companies={companies}
          payees={payees}
          vendors={vendors}
          incomeSources={sources}
          statements={statements}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

export default IncomeManagement;
