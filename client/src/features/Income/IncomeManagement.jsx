import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  BanknotesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import IncomeBulkEdit from './IncomeBulkEdit';
import api from '../../services/api';
import { useIncomeTransactions, ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';

// Cache time configuration - 5 minutes stale time prevents rapid refetching
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
  cacheTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  refetchOnWindowFocus: false, // Don't refetch on tab focus
  retry: 1,                    // Only retry once on failure
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

  // Use shared income transactions hook for stats
  const { 
    transactions: incomeTransactions = [], 
    isLoading: statsLoading 
  } = useIncomeTransactions();
  
  const statsData = {
    incomeCount: incomeTransactions.length,
    uncategorizedCount: incomeTransactions.filter(tx => !tx.category).length
  };

  const sources = Array.isArray(sourcesData) ? sourcesData : [];
  const companies = Array.isArray(companiesData) ? companiesData : [];
  const payees = Array.isArray(payeesData) ? payeesData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const statements = Array.isArray(statementsData) ? statementsData : [];
  const isLoading = statsLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
    queryClient.invalidateQueries({ queryKey: ['income-sources'] });
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
