import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StatementSelector from '../Statements/StatementSelector';
import CompanySelector from '../../components/CompanySelector.jsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import TransactionModal from '../../components/TransactionModal';
import { 
  IRS_CATEGORIES, 
  CATEGORY_GROUPS, 
  getCategoriesForDropdown, 
  isBusinessCategory, 
  isTaxDeductible 
} from '@shared/constants/categories';
import { SECTION_OPTIONS, getSectionDisplayName } from '@shared/constants/sections';
import { SORT_OPTIONS, SORT_DIRECTIONS, SORT_PRESETS, getSortOptionByValue, getSortDirectionByValue } from '@shared/constants/sorting';

// Improved, user-friendly transaction types
const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'expense', label: 'Expense', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'transfer', label: 'Transfer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'adjustment', label: 'Adjustment', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
];

// PDF section filter options
const SECTION_FILTERS = [
  { value: '', label: 'All Sections' },
  ...SECTION_OPTIONS.map(section => ({
    value: section.code,
    label: section.label,
    icon: section.code === 'deposits' ? '💰' : 
          section.code === 'checks' ? '📝' :
          section.code === 'card' ? '💳' :
          section.code === 'electronic' ? '🔌' :
          section.code === 'manual' ? '✍️' : '❓'
  }))
];

// Helper for category label with group and subcategory
const getCategoryLabel = (category, subcategory) => {
  let label = category;
  
  // Add group prefix for better organization
  for (const [group, cats] of Object.entries(CATEGORY_GROUPS)) {
    if (cats.includes(category)) {
      const groupName = group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      label = `${groupName}: ${category}`;
      break;
    }
  }
  
  // Add subcategory if provided
  if (subcategory) {
    label += ` > ${subcategory}`;
  }
  
  // Add indicators for business/tax status
  if (!isBusinessCategory(category)) {
    label += ' (Personal)';
  } else if (!isTaxDeductible(category)) {
    label += ' (Non-deductible)';
  }
  
  return label;
};
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  TagIcon,
  CheckCircleIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';

const TransactionList = () => {
  const { user, loading: authLoading } = useAuth(); // Add authentication context with loading state
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0,
    orderBy: 'date',
    order: 'desc'
  });
  const [deletingId, setDeletingId] = useState(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [uploadFilter, setUploadFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalMode, setModalMode] = useState('edit'); // 'edit' or 'create'

  // Statement/PDF filter state
  const [statements, setStatements] = useState([]);
  const [statementFilter, setStatementFilter] = useState('');

  // Handle URL parameters for upload-specific filtering
  useEffect(() => {
    const uploadId = searchParams.get('uploadId');
    if (uploadId) {
      setUploadFilter(uploadId);
      setStatementFilter(uploadId); // Also set statement filter for consistency
    }
  }, [searchParams]);

  // Fetch available statements/PDFs for filter dropdown
  const fetchStatements = () => {
    apiClient.pdf.getUploads()
      .then((res) => {
        // The response is { success: true, data: [...] } where data is the direct array
        const uploads = Array.isArray(res?.data) ? res.data : (res?.data?.uploads || []);
        if (Array.isArray(uploads)) {
          setStatements(uploads
            .map((u, idx) => {
              // Robust unique id fallback
              const id = u.id || u._id || u.filename || u.originalname || `statement_${idx}`;
              if (!id) return null;
              let displayName = u.name && u.name !== 'undefined' ? u.name : '';
              const uploadedAt = u.uploadedAt || u.createdAt || u.timestamp;
              if (!displayName) {
                if (uploadedAt) {
                  displayName = `Statement (${new Date(uploadedAt).toLocaleDateString()}) [${String(id).slice(-6)}]`;
                } else {
                  displayName = `Statement [${id}]`;
                }
              } else {
                displayName = `${displayName} (${uploadedAt ? new Date(uploadedAt).toLocaleDateString() : ''}) [${String(id).slice(-6)}]`;
              }
              return {
                id: String(id),
                name: displayName,
                uploadedAt
              };
            })
            .filter(Boolean)
        );
        }
      })
      .catch(() => setStatements([]));
  };

  // Bulk operations state
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [bulkOperating, setBulkOperating] = useState(false);

  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const queryClient = useQueryClient();

  // Build dynamic query parameters including filters
  const queryParams = useMemo(() => {
    const params = { ...filters };
    
    if (categoryFilter) params.category = categoryFilter;
    if (typeFilter) params.type = typeFilter;
    if (sectionFilter) params.sectionCode = sectionFilter;
    if (companyFilter) params.companyId = companyFilter;
    if (uploadFilter) params.uploadId = uploadFilter;
    if (dateRange.start) params.startDate = dateRange.start;
    if (dateRange.end) params.endDate = dateRange.end;
    
    return params;
  }, [filters, categoryFilter, typeFilter, sectionFilter, companyFilter, uploadFilter, dateRange]);

  // All query and mutation hooks must be declared before any conditional logic
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => apiClient.transactions.getAll(queryParams),
    enabled: !!user && !authLoading, // Only run query when user is authenticated and auth is not loading
  });

  // Refresh statements when transaction data changes (moved after data declaration)
  useEffect(() => {
    fetchStatements();
  }, [data]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (transactionId) => apiClient.transactions.delete(transactionId),
    onSuccess: (data, transactionId) => {
      toast.success('Transaction deleted successfully');
      // Refresh the transactions list
      queryClient.invalidateQueries(['transactions']);
      setDeletingId(null);
    },
    onError: (error, transactionId) => {
      console.error('Delete transaction error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to delete transaction: ${errorMessage}`);
      setDeletingId(null);
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (transactionData) => apiClient.transactions.create(transactionData),
    onSuccess: () => {
      // Refresh the transactions list so new transaction appears with correct Firestore id
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
    },
    onError: (error) => {
      console.error('Create transaction error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      throw new Error(errorMessage);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.transactions.update(id, data),
    onSuccess: () => {
      // Refresh the transactions list
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (error) => {
      console.error('Update transaction error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      throw new Error(errorMessage);
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (transactions) => apiClient.transactions.bulkUpdate(transactions),
    onSuccess: () => {
      toast.success('Bulk operation completed successfully');
      queryClient.invalidateQueries(['transactions']);
      setSelectedTransactions(new Set());
      setIsSelectMode(false);
      setBulkOperating(false);
    },
    onError: (error) => {
      console.error('Bulk update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bulk operation failed';
      toast.error(errorMessage);
      setBulkOperating(false);
    }
  });

  // Update mutation for inline editing
  const inlineUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.transactions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setEditingCategoryId(null);
      setEditingCategoryValue('');
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      console.error('Update transaction error:', error);
      toast.error('Failed to update category');
      setEditingCategoryId(null);
      setEditingCategoryValue('');
    }
  });

  const handleDelete = async (transactionId, description) => {
    if (window.confirm(`Are you sure you want to delete "${description}"?\n\nThis action cannot be undone.`)) {
      setDeletingId(transactionId);
      deleteMutation.mutate(transactionId);
    }
  };

  // Modal handlers
  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction) => {
    // Defensive: If transaction is missing required fields, show error and do not open modal
    if (!transaction || !transaction.id) {
      toast.error('This transaction cannot be edited because it is missing an ID.');
      return;
    }

    // Defensive: Fix and sanitize all fields to prevent modal crash
    const safeTransaction = {
      ...transaction,
      amount:
        typeof transaction.amount === 'number' && !isNaN(transaction.amount)
          ? transaction.amount
          : 0,
      date: (() => {
        // Accept Firestore Timestamp, JS Date, ISO string, yyyy-mm-dd, number, null, undefined
        const d = transaction.date;
        if (!d) return '';
        if (typeof d === 'string') {
          // Try ISO or yyyy-mm-dd
          const parsed = new Date(d);
          if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
        }
        if (typeof d === 'number') {
          // Assume ms timestamp
          const parsed = new Date(d);
          if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
        }
        if (typeof d === 'object') {
          // Firestore Timestamp
          if (d.seconds && typeof d.seconds === 'number') {
            const parsed = new Date(d.seconds * 1000);
            if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
          }
          // JS Date
          if (d instanceof Date && !isNaN(d)) {
            return d.toISOString().slice(0, 10);
          }
        }
        // Fallback: blank
        return '';
      })(),
      description: typeof transaction.description === 'string' && transaction.description.trim() ? transaction.description : 'No description',
      category: typeof transaction.category === 'string' ? transaction.category : '',
      type: typeof transaction.type === 'string' ? transaction.type : '',
      payee: typeof transaction.payee === 'string' ? transaction.payee : '',
      notes: typeof transaction.notes === 'string' ? transaction.notes : '',
      statementId: typeof transaction.statementId === 'string' ? transaction.statementId : '', // Add statementId for grouping
    };

    setSelectedTransaction(safeTransaction);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleSaveTransaction = async (transactionData) => {
    try {
      if (modalMode === 'create') {
        await createMutation.mutateAsync(transactionData);
      } else if (modalMode === 'edit' && selectedTransaction) {
        await updateMutation.mutateAsync({
          id: selectedTransaction.id,
          data: transactionData
        });
      }
    } catch (error) {
      // Error is already handled in the mutation onError callback
      // Re-throw to let the modal handle the error display
      throw error;
    }
  };

  // Bulk operation handlers
  const handleSelectAll = () => {
    if (!Array.isArray(filteredTransactions)) return;
    
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (transactionId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedTransactions.size} transaction(s)?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setBulkOperating(true);
    
    try {
      // For now, delete one by one (can be optimized with a bulk delete endpoint)
      const deletePromises = Array.from(selectedTransactions).map(id => 
        apiClient.transactions.delete(id)
      );
      
      await Promise.all(deletePromises);
      toast.success(`${selectedTransactions.size} transaction(s) deleted successfully`);
      queryClient.invalidateQueries(['transactions']);
      setSelectedTransactions(new Set());
      setIsSelectMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Some transactions could not be deleted');
    } finally {
      setBulkOperating(false);
    }
  };

  const handleBulkCategorize = async (category) => {
    if (selectedTransactions.size === 0) return;

    setBulkOperating(true);
    
    const transactionsToUpdate = Array.from(selectedTransactions).map(id => ({
      id,
      category
    }));

    try {
      await bulkUpdateMutation.mutateAsync(transactionsToUpdate);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedTransactions(new Set());
  };

  // Filtered transactions based on search and filters - moved before conditional returns
  const filteredTransactions = useMemo(() => {
    // Ensure we have a valid array of transactions
    const transactions = data?.data?.transactions;
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    
    let filtered = [...transactions]; // Create a copy to avoid mutations

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.description?.toLowerCase().includes(term) ||
        transaction.payee?.toLowerCase().includes(term) ||
        transaction.category?.toLowerCase().includes(term) ||
        transaction.subcategory?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(transaction => transaction.category === categoryFilter);
    }

    // Statement/PDF filter
    if (statementFilter) {
      if (statementFilter === '__manual') {
        // Show only transactions without a statementId (manual/unlinked)
        filtered = filtered.filter(transaction => 
          !transaction.statementId || transaction.statementId === ''
        );
      } else {
        // Show only transactions with the specific statementId
        filtered = filtered.filter(transaction => 
          String(transaction.statementId) === String(statementFilter)
        );
      }
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }

    // Section filter
    if (sectionFilter) {
      if (sectionFilter === 'uncategorized') {
        // Show transactions with no sectionCode or sectionCode === 'uncategorized'
        filtered = filtered.filter(transaction => 
          !transaction.sectionCode || transaction.sectionCode === 'uncategorized'
        );
      } else {
        filtered = filtered.filter(transaction => transaction.sectionCode === sectionFilter);
      }
    }

    // Company filter
    if (companyFilter) {
      if (companyFilter === '__no_company') {
        // Show only transactions without a companyId (no company assigned)
        filtered = filtered.filter(transaction => 
          !transaction.companyId || transaction.companyId === ''
        );
      } else {
        // Show only transactions with the specific companyId
        filtered = filtered.filter(transaction => 
          String(transaction.companyId) === String(companyFilter)
        );
      }
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) <= new Date(dateRange.end)
      );
    }

    return filtered;
  }, [data?.data?.transactions, searchTerm, categoryFilter, statementFilter, typeFilter, sectionFilter, companyFilter, dateRange]);

  // Available categories for filters - moved before conditional returns
  const availableCategories = useMemo(() => {
    const transactions = data?.data?.transactions;
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    return [...new Set(transactions
      .map(t => t.category)
      .filter(Boolean)
      .sort()
    )];
  }, [data?.data?.transactions]);

  // Show loading state while auth is loading
  if (authLoading) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Please log in to view transactions</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading transactions..." />;
  }

  if (error) {
    console.error('Transaction query error:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading transactions: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Extract transaction data from the API response
  const transactions = filteredTransactions || [];
  const totalCount = data?.data?.total || 0;
  const hasMore = data?.data?.hasMore || false;

  // Add additional safety check for transactions array
  if (!Array.isArray(transactions)) {
    // Force it to be an empty array
    const safeTransactions = [];
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transactions</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">Unable to load transactions. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // Inline category editing handlers
  const handleStartCategoryEdit = (transaction) => {
    setEditingCategoryId(transaction.id);
    setEditingCategoryValue(transaction.category || '');
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryValue('');
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategoryId || !editingCategoryValue) return;
    
    try {
      await inlineUpdateMutation.mutateAsync({
        id: editingCategoryId,
        data: { category: editingCategoryValue }
      });
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const handleCategoryKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveCategoryEdit();
    } else if (e.key === 'Escape') {
      handleCancelCategoryEdit();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setTypeFilter('');
    setSectionFilter('');
    setCompanyFilter('');
    setUploadFilter('');
    setDateRange({ start: '', end: '' });
    setStatementFilter('');
    // Reset sorting to default
    setFilters(prev => ({ ...prev, orderBy: 'date', order: 'desc' }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Showing {transactions.length} of {totalCount} transactions
              {hasMore && ' (scroll for more)'}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          {isSelectMode ? (
            <>
              {/* Bulk operation controls */}
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{selectedTransactions.size} selected</span>
              </div>
              
              {selectedTransactions.size > 0 && (
                <>
                  <select
                    onChange={(e) => e.target.value && handleBulkCategorize(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={bulkOperating}
                  >
                    <option value="">Change Category...</option>
                    <option value="Office Expenses">Office Expenses</option>
                    <option value="Gross Receipts or Sales">Gross Receipts or Sales</option>
                    <option value="Meals and Entertainment">Meals and Entertainment</option>
                    <option value="Travel">Travel</option>
                    <option value="Utilities">Utilities</option>
                  </select>
                  
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkOperating}
                    className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete ({selectedTransactions.size})
                  </button>
                </>
              )}
              
              <button
                onClick={toggleSelectMode}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Cancel
              </button>
            </>
          ) : (
            <>              <button
                onClick={toggleSelectMode}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Select
              </button>
              <button 
                onClick={handleCreateTransaction}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Transaction
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Primary Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter (grouped, user-friendly) */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
              <optgroup key={group} label={group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                {cats.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Type Filter (user-friendly) */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {TRANSACTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Section Filter (PDF sections) */}
        <div>
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            title="Filter by PDF section"
          >
            {SECTION_FILTERS.map(section => (
              <option key={section.value} value={section.value}>
                {section.icon ? `${section.icon} ${section.label}` : section.label}
              </option>
            ))}
          </select>
        </div>

        {/* Statement/PDF Filter */}
        <div>
          <select
            value={statementFilter}
            onChange={e => setStatementFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            style={{ minWidth: 0 }}
            aria-label="Statement/PDF"
          >
            <option value="">All Statements</option>
            <option value="__manual">Manual/Unlinked Only</option>
            {statements.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Reset Filters */}
        <div className="flex space-x-2">
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Reset
          </button>
        </div>
        </div>

        {/* Sorting Controls */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <ArrowsUpDownIcon className="h-5 w-5 mr-2" />
              Sort Options
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choose how to order your transactions
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort by
            </label>
            <select
              value={filters.orderBy}
              onChange={(e) => setFilters(prev => ({ ...prev, orderBy: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Direction
            </label>
            <select
              value={filters.order}
              onChange={(e) => setFilters(prev => ({ ...prev, order: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {SORT_DIRECTIONS.map(direction => (
                <option key={direction.value} value={direction.value}>
                  {direction.icon} {direction.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quick Sort
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const preset = SORT_PRESETS.find(p => p.label === e.target.value);
                  if (preset) {
                    setFilters(prev => ({ ...prev, orderBy: preset.orderBy, order: preset.order }));
                  }
                }
              }}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select preset...</option>
              {SORT_PRESETS.map(preset => (
                <option key={preset.label} value={preset.label}>
                  {preset.icon} {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-500 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <div className="font-medium text-blue-900 dark:text-blue-100">
                Current: {getSortOptionByValue(filters.orderBy).icon} {getSortOptionByValue(filters.orderBy).label}
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                {getSortDirectionByValue(filters.order).icon} {getSortDirectionByValue(filters.order).label}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Date Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No transactions found.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Upload a bank statement or add transactions manually to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            {isSelectMode && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={Array.isArray(filteredTransactions) && selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Select All ({Array.isArray(filteredTransactions) ? filteredTransactions.length : 0})
                  </span>
                </label>
              </div>
            )}
            
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.isArray(filteredTransactions) && filteredTransactions.map((transaction) => {
              // Find statement info for this transaction
              const statement = statements.find(s => s.id === transaction.statementId);
              return (
                <li key={transaction.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        {/* Selection checkbox */}
                        {isSelectMode && (
                          <div className="flex-shrink-0 mr-3">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.has(transaction.id)}
                              onChange={() => handleSelectTransaction(transaction.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                          </div>
                        )}
                        <div className="flex-shrink-0">
                          {/* Type badge with color and tooltip */}
                          {(() => {
                            const typeObj = TRANSACTION_TYPES.find(t => t.value === transaction.type);
                            return (
                              <div
                                className={`h-8 w-20 rounded-full flex items-center justify-center text-sm font-semibold ${typeObj?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                                title={typeObj?.label || 'Other'}
                              >
                                {typeObj?.label || transaction.type || 'Other'}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.payee && `${transaction.payee} • `}
                            {/* Company display */}
                            {transaction.companyName && (
                              <span className="inline-block bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium mr-2">
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {transaction.companyName}
                              </span>
                            )}
                            {/* Section display */}
                            {(transaction.sectionCode || (!transaction.sectionCode && transaction.source !== 'manual')) && (
                              <span className="inline-block bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-1 rounded-full text-xs font-medium mr-2">
                                {(() => {
                                  const sectionCode = transaction.sectionCode || 'uncategorized';
                                  const section = SECTION_FILTERS.find(s => s.value === sectionCode);
                                  return section ? `${section.icon} ${section.label}` : getSectionDisplayName(sectionCode);
                                })()}
                              </span>
                            )}
                            {/* Statement/PDF display */}
                          {statement && (
                            <span className="inline-block text-blue-600 dark:text-blue-400 font-semibold mr-2">
                              {statement.name}
                            </span>
                          )}
                          {!transaction.statementId && (
                            <span className="inline-block text-gray-400 italic mr-2">Manual/Unlinked</span>
                          )}
                            <span className="inline-block">
                              {editingCategoryId === transaction.id ? (
                                <div className="flex items-center space-x-1">
                                  <select
                                    value={editingCategoryValue}
                                    onChange={(e) => setEditingCategoryValue(e.target.value)}
                                    onKeyDown={handleCategoryKeyPress}
                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  >
                                    <option value="">Select Category</option>
                                    {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
                                      <optgroup key={groupName} label={groupName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                                        {categories.map(category => (
                                          <option key={category} value={category}>
                                            {category}
                                          </option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                  <button
                                    onClick={handleSaveCategoryEdit}
                                    className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                    title="Save category"
                                  >
                                    <CheckIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={handleCancelCategoryEdit}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title="Cancel"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className={`${transaction.category ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}`} title={getCategoryLabel(transaction.category, transaction.subcategory)}>
                                    {transaction.category ? getCategoryLabel(transaction.category, transaction.subcategory) : 'Uncategorized'}
                                  </span>
                                  {!isSelectMode && (
                                    <button
                                      onClick={() => handleStartCategoryEdit(transaction)}
                                      className="ml-1 p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                      title="Edit category"
                                    >
                                      <TagIcon className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </span>
                            {transaction.source && ` • ${transaction.source}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            transaction.type === 'income' 
                              ? 'text-green-600 dark:text-green-400' 
                              : transaction.type === 'expense'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                            ${Math.abs(transaction.amount).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                        {!isSelectMode && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                              title="Edit transaction"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id, transaction.description)}
                              disabled={deletingId === transaction.id}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete transaction"
                            >
                              {deletingId === transaction.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {(!Array.isArray(transactions) || transactions.length === 0) && (
              <li className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                No transactions available
              </li>
            )}
          </ul>
          </>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTransaction}
        mode={modalMode}
        refreshTrigger={data?.timestamp || Date.now()}
      />
    </div>
  );
};

export default TransactionList;
