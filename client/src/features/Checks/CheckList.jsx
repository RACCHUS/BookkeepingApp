import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  Bars3Icon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import checkService from '../../services/checkService';
import companyService from '../../services/companyService';
import CheckCard from './CheckCard';
import CheckForm from './CheckForm';
import CheckDetailModal from './CheckDetailModal';
import QuickCheckEntry from './QuickCheckEntry';
import BulkAddChecksModal from './BulkAddChecksModal';
import useDebounce from '../../hooks/useDebounce';

/**
 * CheckList - Main check management view
 * Displays, filters, and manages checks (income and expense)
 */
const CheckList = () => {
  const queryClient = useQueryClient();

  // UI state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showBulkLink, setShowBulkLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    companyId: '',
    hasImage: '',
    startDate: '',
    endDate: ''
  });

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.getAll(),
    staleTime: 5 * 60 * 1000
  });
  // Server returns { success: true, data: [...] }
  // Supabase returns { success: true, data: { companies: [...] } }
  const companies = Array.isArray(companiesData?.data) 
    ? companiesData.data 
    : (companiesData?.data?.companies || []);

  // Build query filters
  const queryFilters = useMemo(() => {
    const params = {};
    if (debouncedSearch) params.payee = debouncedSearch;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.companyId) params.companyId = filters.companyId;
    if (filters.hasImage) params.hasImage = filters.hasImage === 'true';
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return params;
  }, [debouncedSearch, filters]);

  // Fetch checks
  const { data: checksData, isLoading, error, refetch } = useQuery({
    queryKey: ['checks', queryFilters],
    queryFn: () => checkService.getChecks(queryFilters),
    staleTime: 30 * 1000
  });
  // Check API returns { data: [...], pagination: {...} } - data is array directly
  const checks = checksData?.data?.checks || checksData?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ checkData, file }) => checkService.createCheck(checkData, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => checkService.updateCheck(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      setShowForm(false);
      setSelectedCheck(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => checkService.deleteCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      setShowDeleteConfirm(false);
      setShowDetail(false);
      setSelectedCheck(null);
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (checksArr) => checkService.bulkCreate(checksArr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
    }
  });

  // Bulk create from existing transactions (link transactions)
  const bulkLinkMutation = useMutation({
    mutationFn: (transactions) => checkService.bulkCreateFromTransactions(transactions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowBulkLink(false);
      const count = data?.data?.successful?.length || data?.successful?.length || 0;
      toast.success(`${count} check${count !== 1 ? 's' : ''} linked to transactions`);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to link checks');
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ id, file }) => checkService.uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: (id) => checkService.deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks'] });
    }
  });

  // Handlers
  const handleView = useCallback((check) => {
    setSelectedCheck(check);
    setShowDetail(true);
  }, []);

  const handleEdit = useCallback((check) => {
    setSelectedCheck(check);
    setShowForm(true);
    setShowDetail(false);
  }, []);

  const handleDelete = useCallback((check) => {
    setSelectedCheck(check);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedCheck) {
      deleteMutation.mutate(selectedCheck.id);
    }
  }, [selectedCheck, deleteMutation]);

  const handleFormSubmit = useCallback(async (checkData, file) => {
    if (selectedCheck) {
      await updateMutation.mutateAsync({ id: selectedCheck.id, updates: checkData });
    } else {
      await createMutation.mutateAsync({ checkData, file });
    }
  }, [selectedCheck, createMutation, updateMutation]);

  const handleBulkSubmit = useCallback(async (checksArr) => {
    const result = await bulkCreateMutation.mutateAsync(checksArr);
    return {
      allSucceeded: result.data?.allSucceeded,
      someSucceeded: result.data?.successCount > 0,
      results: result.data?.results || []
    };
  }, [bulkCreateMutation]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      companyId: '',
      hasImage: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v).length + (searchTerm ? 1 : 0);

  // Calculate summary
  const summary = useMemo(() => {
    const income = checks.filter(c => c.type === 'income');
    const expense = checks.filter(c => c.type === 'expense');
    return {
      totalCount: checks.length,
      incomeCount: income.length,
      incomeTotal: income.reduce((sum, c) => sum + (c.amount || 0), 0),
      expenseCount: expense.length,
      expenseTotal: expense.reduce((sum, c) => sum + (c.amount || 0), 0)
    };
  }, [checks]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BanknotesIcon className="w-7 h-7 text-blue-600" />
            Checks
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage checks received and written
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickEntry(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            title="Quickly add multiple cash/off-statement checks"
          >
            <PlusIcon className="w-4 h-4" />
            Quick Add
          </button>
          <button
            onClick={() => setShowBulkLink(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            title="Create check records for existing transactions"
          >
            <LinkIcon className="w-4 h-4" />
            Link Transactions
          </button>
          <button
            onClick={() => {
              setSelectedCheck(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Check
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Checks</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-1 text-sm text-green-600">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Received
          </div>
          <div className="text-2xl font-bold text-green-600">
            +${summary.incomeTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{summary.incomeCount} check{summary.incomeCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-1 text-sm text-red-600">
            <ArrowUpTrayIcon className="w-4 h-4" />
            Written
          </div>
          <div className="text-2xl font-bold text-red-600">
            -${summary.expenseTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{summary.expenseCount} check{summary.expenseCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by payee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              activeFilterCount > 0 
                ? 'border-blue-500 bg-blue-50 text-blue-600' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-5 h-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="income">Received</option>
                  <option value="expense">Written</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="cleared">Cleared</option>
                  <option value="bounced">Bounced</option>
                  <option value="voided">Voided</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Company Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                <select
                  value={filters.companyId}
                  onChange={(e) => handleFilterChange('companyId', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Companies</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Has Image Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Image</label>
                <select
                  value={filters.hasImage}
                  onChange={(e) => handleFilterChange('hasImage', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">Any</option>
                  <option value="true">With Image</option>
                  <option value="false">Without Image</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">Failed to load checks</p>
          <p className="text-sm text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && checks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BanknotesIcon className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">No checks found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Add your first check to get started'}
          </p>
          <button
            onClick={() => {
              setSelectedCheck(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add Check
          </button>
        </div>
      )}

      {/* Checks Grid/List */}
      {!isLoading && !error && checks.length > 0 && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
        }>
          {checks.map(check => (
            <CheckCard
              key={check.id}
              check={check}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CheckForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedCheck(null);
        }}
        onSubmit={handleFormSubmit}
        check={selectedCheck}
        isLoading={createMutation.isPending || updateMutation.isPending}
        companies={companies}
        onUploadImage={(id, file) => uploadImageMutation.mutate({ id, file })}
        onDeleteImage={(id) => deleteImageMutation.mutate(id)}
      />

      <CheckDetailModal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedCheck(null);
        }}
        check={selectedCheck}
        onEdit={handleEdit}
        onDelete={handleDelete}
        companies={companies}
      />

      <QuickCheckEntry
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onSubmit={handleBulkSubmit}
        isLoading={bulkCreateMutation.isPending}
        companies={companies}
      />

      <BulkAddChecksModal
        isOpen={showBulkLink}
        onClose={() => setShowBulkLink(false)}
        onSubmit={(transactions) => bulkLinkMutation.mutate(transactions)}
        isLoading={bulkLinkMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Check?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this check? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckList;
