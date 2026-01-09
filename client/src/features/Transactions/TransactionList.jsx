import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import StatementSelector from '../Statements/StatementSelector';
import { CompanySelector } from '../../components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import receiptService from '../../services/receiptService';
import checkService from '../../services/checkService';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { TransactionModal } from '../../components/forms';
import { 
  IRS_CATEGORIES, 
  CATEGORY_GROUPS, 
  getCategoriesForDropdown, 
  isBusinessCategory, 
  isTaxDeductible,
  PAYMENT_METHODS
} from '@shared/constants/categories';
import { createDefaultSorts, multiLevelSort } from '@shared/constants/sorting';

// Payment method display labels
const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: { label: 'Cash', icon: '💵' },
  [PAYMENT_METHODS.CHECK]: { label: 'Check', icon: '📝' },
  [PAYMENT_METHODS.CREDIT_CARD]: { label: 'Credit Card', icon: '💳' },
  [PAYMENT_METHODS.DEBIT_CARD]: { label: 'Debit Card', icon: '💳' },
  [PAYMENT_METHODS.BANK_TRANSFER]: { label: 'Bank Transfer', icon: '🏦' },
  [PAYMENT_METHODS.PAYPAL]: { label: 'PayPal', icon: '🅿️' },
  [PAYMENT_METHODS.VENMO]: { label: 'Venmo', icon: '📱' },
  [PAYMENT_METHODS.ZELLE]: { label: 'Zelle', icon: '⚡' },
  [PAYMENT_METHODS.OTHER_ELECTRONIC]: { label: 'Electronic', icon: '🔌' },
  [PAYMENT_METHODS.OTHER]: { label: 'Other', icon: '📋' },
};

// Helper to get payment method display
const getPaymentMethodDisplay = (paymentMethod) => {
  const method = PAYMENT_METHOD_LABELS[paymentMethod];
  if (method) {
    return `${method.icon} ${method.label}`;
  }
  return paymentMethod || 'Unknown';
};

// Improved, user-friendly transaction types
const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'expense', label: 'Expense', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'transfer', label: 'Transfer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'adjustment', label: 'Adjustment', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
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
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  TagIcon,
  CheckCircleIcon,
  ReceiptPercentIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import QuickTransactionEntry from './QuickTransactionEntry';
import TransactionBulkPanel from './TransactionBulkPanel';
import TransactionFilterPanel from './TransactionFilterPanel';
import TransactionSortPanel from './TransactionSortPanel';
import CompactTransactionRow from '../../components/CompactTransactionRow';

const TransactionList = () => {
  const { user, loading: authLoading } = useAuth(); // Add authentication context with loading state
  const [searchParams] = useSearchParams();
  const [deletingId, setDeletingId] = useState(null);
  
  // Unified filter state for TransactionFilterPanel
  const [transactionFilters, setTransactionFilters] = useState({
    searchTerm: '',
    category: '',
    type: '',
    companyId: '',
    statementId: '',
    payee: '',
    vendor: '',
    hasCategory: '',
    hasNotes: '',
    is1099: '',
    isReconciled: '',
    isReviewed: '',
    taxDeductible: '',
    hasReceipt: '',
    hasCheckNumber: '',
    source: '',
    hasPdfSource: '',
    amountRange: { min: '', max: '' },
    dateRange: { start: '', end: '' }
  });
  
  // Query/pagination filters (separate from display filters)
  const [queryFilters, setQueryFilters] = useState({
    limit: 1000,
    offset: 0
  });
  
  // Multi-level sorting state
  const [sorts, setSorts] = useState(createDefaultSorts());
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalMode, setModalMode] = useState('edit'); // 'edit' or 'create'
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [bulkEntryLoading, setBulkEntryLoading] = useState(false);

  // Statement/PDF filter state
  const [statements, setStatements] = useState([]);

  // Link to upload mode - when navigating from upload details to link transactions
  const linkToUploadId = searchParams.get('linkToUpload');
  const isLinkMode = !!linkToUploadId;

  // Handle URL parameters for upload-specific filtering
  useEffect(() => {
    const uploadId = searchParams.get('uploadId');
    if (uploadId) {
      setTransactionFilters(prev => ({ ...prev, statementId: uploadId }));
    }
    // Enable select mode automatically when in link mode
    if (linkToUploadId) {
      setIsSelectMode(true);
    }
  }, [searchParams, linkToUploadId]);

  // Fetch available statements (both PDF and CSV) for filter dropdown
  const fetchStatements = () => {
    Promise.all([
      apiClient.pdf.getUploads().catch(() => ({ data: [] })),
      apiClient.csv.getImports({ status: 'completed' }).catch(() => ({ data: [] }))
    ])
      .then(([pdfRes, csvRes]) => {
        // Process PDF uploads
        const pdfUploads = Array.isArray(pdfRes?.data) ? pdfRes.data : (pdfRes?.data?.uploads || []);
        const pdfStatements = (Array.isArray(pdfUploads) ? pdfUploads : [])
          .map((u, idx) => {
            const id = u.id || u._id || u.filename || u.originalname || `pdf_${idx}`;
            if (!id) return null;
            let displayName = u.name && u.name !== 'undefined' ? u.name : '';
            const uploadedAt = u.uploadedAt || u.createdAt || u.timestamp;
            if (!displayName) {
              if (uploadedAt) {
                displayName = `PDF Statement (${new Date(uploadedAt).toLocaleDateString()})`;
              } else {
                displayName = `PDF Statement`;
              }
            }
            return {
              id: String(id),
              name: `[PDF] ${displayName}`,
              uploadedAt,
              type: 'pdf'
            };
          })
          .filter(Boolean);
        
        // Process CSV imports
        const csvImports = Array.isArray(csvRes?.data) ? csvRes.data : [];
        const csvStatements = csvImports
          .map((c, idx) => {
            const id = c.id || c.import_id || `csv_${idx}`;
            if (!id) return null;
            const fileName = c.file_name || c.fileName || '';
            const bankName = c.bank_name || c.bankName || '';
            const uploadedAt = c.created_at || c.createdAt;
            let displayName = fileName || bankName;
            if (!displayName) {
              displayName = uploadedAt ? `CSV Import (${new Date(uploadedAt).toLocaleDateString()})` : 'CSV Import';
            }
            return {
              id: String(id),
              name: `[CSV] ${displayName}`,
              uploadedAt,
              type: 'csv'
            };
          })
          .filter(Boolean);
        
        // Combine and sort by date (newest first)
        const allStatements = [...pdfStatements, ...csvStatements].sort((a, b) => {
          const dateA = a.uploadedAt ? new Date(a.uploadedAt) : new Date(0);
          const dateB = b.uploadedAt ? new Date(b.uploadedAt) : new Date(0);
          return dateB - dateA;
        });
        
        setStatements(allStatements);
      })
      .catch((error) => {
        console.error('Failed to load statements:', error);
        toast.error('Failed to load statements');
        setStatements([]);
      });
  };

  // Bulk operations state
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(true); // Enable selection by default for bulk operations
  const [bulkOperating, setBulkOperating] = useState(false);

  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const queryClient = useQueryClient();

  // Build dynamic query parameters including filters
  const queryParams = useMemo(() => {
    const params = { ...queryFilters };
    
    if (transactionFilters.category && transactionFilters.category !== '__uncategorized__') {
      params.category = transactionFilters.category;
    }
    if (transactionFilters.type) params.type = transactionFilters.type;
    if (transactionFilters.companyId) params.companyId = transactionFilters.companyId;
    if (transactionFilters.statementId) params.uploadId = transactionFilters.statementId;
    if (transactionFilters.dateRange?.start) params.startDate = transactionFilters.dateRange.start;
    if (transactionFilters.dateRange?.end) params.endDate = transactionFilters.dateRange.end;
    
    return params;
  }, [queryFilters, transactionFilters]);

  // All query and mutation hooks must be declared before any conditional logic
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => apiClient.transactions.getAll(queryParams),
    enabled: !!user && !authLoading, // Only run query when user is authenticated and auth is not loading
  });

  // Fetch companies for bulk transaction entry
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient.companies.getAll(),
    enabled: !!user && !authLoading,
  });

  const companies = companiesData?.data?.companies || companiesData?.companies || [];

  // Fetch payees for bulk edit panel
  const { data: payeesData } = useQuery({
    queryKey: ['payees'],
    queryFn: () => apiClient.payees?.getAll?.() || Promise.resolve({ data: [] }),
    enabled: !!user && !authLoading,
  });

  const payees = payeesData?.data?.payees || payeesData?.data || [];

  // Fetch income sources for bulk edit panel
  const { data: incomeSourcesData } = useQuery({
    queryKey: ['income-sources'],
    queryFn: () => apiClient.incomeSources?.getAll?.() || Promise.resolve({ data: [] }),
    enabled: !!user && !authLoading,
  });

  const incomeSources = incomeSourcesData?.data?.sources || incomeSourcesData?.data || [];

  // Fetch receipts for bulk edit panel
  const { data: receiptsData } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptService.getReceipts(),
    enabled: !!user && !authLoading,
  });

  const receipts = receiptsData?.data || [];

  // Fetch checks for bulk edit panel
  const { data: checksData } = useQuery({
    queryKey: ['checks'],
    queryFn: () => checkService.getChecks(),
    enabled: !!user && !authLoading,
  });

  const checks = checksData?.data || [];

  // Fetch CSV imports for bulk edit panel
  const { data: csvImportsData } = useQuery({
    queryKey: ['csv-imports'],
    queryFn: () => apiClient.csv.getImports(),
    enabled: !!user && !authLoading,
  });

  const csvImports = csvImportsData?.data?.imports || csvImportsData?.data || [];

  // Fetch statements once on mount
  useEffect(() => {
    fetchStatements();
  }, []);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (transactionId) => apiClient.transactions.delete(transactionId),
    onSuccess: (data, transactionId) => {
      toast.success('Transaction deleted successfully');
      // Refresh all transaction-related queries
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
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
      // Refresh all transaction-related queries
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
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
      // Refresh all transaction-related queries
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
      setSelectedTransactions(new Set());
      setBulkOperating(false);
      // Note: Don't disable select mode - user might want to continue bulk editing
    },
    onError: (error) => {
      console.error('Bulk update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bulk operation failed';
      toast.error(errorMessage);
      setBulkOperating(false);
    }
  });

  // Bulk create mutation for quick transaction entry
  const bulkCreateMutation = useMutation({
    mutationFn: (transactions) => apiClient.transactions.bulkCreate(transactions),
    onSuccess: (response) => {
      const { results, successCount, failedCount } = response?.data || {};
      if (failedCount === 0) {
        toast.success(`${successCount} transaction${successCount !== 1 ? 's' : ''} created successfully`);
      } else if (successCount > 0) {
        toast.success(`${successCount} created, ${failedCount} failed`);
      }
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
      setIsBulkEntryOpen(false);
      setBulkEntryLoading(false);
    },
    onError: (error) => {
      console.error('Bulk create error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bulk create failed';
      toast.error(errorMessage);
      setBulkEntryLoading(false);
    }
  });

  // Update mutation for inline editing
  const inlineUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.transactions.update(id, data),
    onSuccess: () => {
      // Refresh all transaction-related queries
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
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

  // Link transactions to upload mutation
  const linkToUploadMutation = useMutation({
    mutationFn: ({ uploadId, transactionIds }) => apiClient.pdf.linkTransactions(uploadId, transactionIds),
    onSuccess: (data) => {
      const linkedCount = data?.data?.linkedCount || 0;
      toast.success(`Linked ${linkedCount} transactions to upload`);
      setSelectedTransactions(new Set());
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['uploads']);
      queryClient.invalidateQueries(['uploadDetails']);
      // Navigate back to upload details
      window.history.back();
    },
    onError: (error) => {
      console.error('Link transactions error:', error);
      toast.error(error.message || 'Failed to link transactions');
    }
  });

  // Handler for linking selected transactions to upload
  const handleLinkToUpload = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select transactions to link');
      return;
    }
    if (!linkToUploadId) {
      toast.error('No upload ID specified');
      return;
    }
    
    const confirmMessage = `Link ${selectedTransactions.size} transaction(s) to this upload?`;
    if (window.confirm(confirmMessage)) {
      linkToUploadMutation.mutate({
        uploadId: linkToUploadId,
        transactionIds: Array.from(selectedTransactions)
      });
    }
  };

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
      // Note: Don't disable select mode - user might want to continue bulk operations
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

  // Comprehensive bulk update handler for the bulk panel
  const handleBulkPanelUpdate = async (updateData) => {
    if (selectedTransactions.size === 0) return;

    setBulkOperating(true);
    
    try {
      // Build transactions array with updates
      const transactionsToUpdate = Array.from(selectedTransactions).map(id => {
        const updatePayload = { id };
        const existingTx = filteredTransactions.find(tx => tx.id === id);
        
        // Handle notes append logic
        if (updateData.notes !== undefined) {
          if (updateData.appendNotes && existingTx?.notes) {
            updatePayload.notes = `${existingTx.notes}\n${updateData.notes}`;
          } else {
            updatePayload.notes = updateData.notes;
          }
        }
        
        // Add all other fields
        Object.entries(updateData).forEach(([key, value]) => {
          if (key !== 'notes' && key !== 'appendNotes') {
            updatePayload[key] = value;
          }
        });
        
        return updatePayload;
      });

      await bulkUpdateMutation.mutateAsync(transactionsToUpdate);
      toast.success(`Updated ${selectedTransactions.size} transaction(s)`);
      setSelectedTransactions(new Set());
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update transactions');
    } finally {
      setBulkOperating(false);
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
    const f = transactionFilters; // Shorthand

    // Search filter
    if (f.searchTerm) {
      const term = f.searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description?.toLowerCase().includes(term) ||
        tx.payee?.toLowerCase().includes(term) ||
        tx.category?.toLowerCase().includes(term) ||
        tx.subcategory?.toLowerCase().includes(term) ||
        tx.notes?.toLowerCase().includes(term) ||
        tx.checkNumber?.toString().includes(term)
      );
    }

    // Category filter
    if (f.category) {
      if (f.category === '__uncategorized__') {
        filtered = filtered.filter(tx => !tx.category || tx.category === '' || tx.category === 'Uncategorized');
      } else {
        filtered = filtered.filter(tx => tx.category === f.category);
      }
    }

    // Statement/PDF/CSV filter
    if (f.statementId) {
      if (f.statementId === '__manual') {
        filtered = filtered.filter(tx => 
          (!tx.statementId || tx.statementId === '') &&
          (!tx.csvImportId || tx.csvImportId === '')
        );
      } else {
        const selectedStatement = statements.find(s => String(s.id) === String(f.statementId));
        if (selectedStatement?.type === 'csv') {
          filtered = filtered.filter(tx => String(tx.csvImportId) === String(f.statementId));
        } else {
          filtered = filtered.filter(tx => String(tx.statementId) === String(f.statementId));
        }
      }
    }

    // Type filter
    if (f.type) {
      filtered = filtered.filter(tx => tx.type === f.type);
    }

    // Company filter
    if (f.companyId) {
      if (f.companyId === '__no_company') {
        filtered = filtered.filter(tx => !tx.companyId || tx.companyId === '');
      } else {
        filtered = filtered.filter(tx => String(tx.companyId) === String(f.companyId));
      }
    }

    // Payee filter
    if (f.payee) {
      if (f.payee === '__no_payee') {
        filtered = filtered.filter(tx => !tx.payee || tx.payee.trim() === '');
      } else {
        filtered = filtered.filter(tx => 
          tx.payee?.toLowerCase().includes(f.payee.toLowerCase())
        );
      }
    }

    // Vendor filter
    if (f.vendor) {
      if (f.vendor === '__no_vendor') {
        filtered = filtered.filter(tx => !tx.vendorName || tx.vendorName.trim() === '');
      } else {
        filtered = filtered.filter(tx => 
          tx.vendorName?.toLowerCase().includes(f.vendor.toLowerCase())
        );
      }
    }

    // Amount range filter
    if (f.amountRange?.min) {
      const minAmount = parseFloat(f.amountRange.min);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(tx => Math.abs(parseFloat(tx.amount) || 0) >= minAmount);
      }
    }
    if (f.amountRange?.max) {
      const maxAmount = parseFloat(f.amountRange.max);
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(tx => Math.abs(parseFloat(tx.amount) || 0) <= maxAmount);
      }
    }

    // Has category filter
    if (f.hasCategory) {
      if (f.hasCategory === 'yes') {
        filtered = filtered.filter(tx => tx.category && tx.category !== '' && tx.category !== 'Uncategorized');
      } else if (f.hasCategory === 'no') {
        filtered = filtered.filter(tx => !tx.category || tx.category === '' || tx.category === 'Uncategorized');
      }
    }

    // Notes filter
    if (f.hasNotes) {
      if (f.hasNotes === 'with') {
        filtered = filtered.filter(tx => tx.notes && tx.notes.trim() !== '');
      } else if (f.hasNotes === 'without') {
        filtered = filtered.filter(tx => !tx.notes || tx.notes.trim() === '');
      }
    }

    // 1099 filter
    if (f.is1099) {
      if (f.is1099 === 'yes') {
        filtered = filtered.filter(tx => tx.is1099Payment || tx.isContractorPayment);
      } else if (f.is1099 === 'no') {
        filtered = filtered.filter(tx => !tx.is1099Payment && !tx.isContractorPayment);
      }
    }

    // Tax deductible filter
    if (f.taxDeductible) {
      if (f.taxDeductible === 'yes') {
        filtered = filtered.filter(tx => tx.category && isTaxDeductible(tx.category));
      } else if (f.taxDeductible === 'no') {
        filtered = filtered.filter(tx => !tx.category || !isTaxDeductible(tx.category));
      }
    }

    // Reconciliation filter
    if (f.isReconciled) {
      if (f.isReconciled === 'yes') {
        filtered = filtered.filter(tx => tx.isReconciled === true);
      } else if (f.isReconciled === 'no') {
        filtered = filtered.filter(tx => !tx.isReconciled);
      }
    }

    // Review status filter
    if (f.isReviewed) {
      if (f.isReviewed === 'yes') {
        filtered = filtered.filter(tx => tx.isManuallyReviewed === true);
      } else if (f.isReviewed === 'no') {
        filtered = filtered.filter(tx => !tx.isManuallyReviewed);
      }
    }

    // Has receipt filter
    if (f.hasReceipt) {
      if (f.hasReceipt === 'yes') {
        filtered = filtered.filter(tx => tx.receiptUrl);
      } else if (f.hasReceipt === 'no') {
        filtered = filtered.filter(tx => !tx.receiptUrl);
      }
    }

    // Has check number filter
    if (f.hasCheckNumber) {
      if (f.hasCheckNumber === 'yes') {
        filtered = filtered.filter(tx => tx.checkNumber);
      } else if (f.hasCheckNumber === 'no') {
        filtered = filtered.filter(tx => !tx.checkNumber);
      }
    }

    // Source filter
    if (f.source) {
      filtered = filtered.filter(tx => tx.source === f.source);
    }

    // Has PDF/source file filter
    if (f.hasPdfSource) {
      if (f.hasPdfSource === 'yes') {
        filtered = filtered.filter(tx => tx.sourceFileId || tx.statementId);
      } else if (f.hasPdfSource === 'no') {
        filtered = filtered.filter(tx => !tx.sourceFileId && !tx.statementId);
      }
    }

    // Date range filter
    if (f.dateRange?.start) {
      filtered = filtered.filter(tx => new Date(tx.date) >= new Date(f.dateRange.start));
    }
    if (f.dateRange?.end) {
      filtered = filtered.filter(tx => new Date(tx.date) <= new Date(f.dateRange.end));
    }

    // Apply multi-level sorting
    return multiLevelSort(filtered, sorts);
  }, [data?.data?.transactions, transactionFilters, statements, sorts]);

  // Compute visible columns based on active filters and sorts
  // These columns will be shown inline in the compact row view
  const visibleColumns = useMemo(() => {
    const columns = new Set();
    const f = transactionFilters;
    
    // Add columns for active filters
    if (f.category) columns.add('category');
    if (f.companyId) columns.add('company');
    if (f.payee) columns.add('payee');
    if (f.vendor) columns.add('vendor');
    if (f.statementId) columns.add('statementId');
    if (f.source) columns.add('source');
    if (f.hasReceipt === 'yes') columns.add('hasReceipt');
    if (f.hasCheckNumber === 'yes') columns.add('hasCheckNumber');
    
    // Add columns for active sorts (first 2 levels only to avoid clutter)
    sorts.slice(0, 2).forEach(sort => {
      if (sort.field && sort.field !== 'date' && sort.field !== 'amount' && sort.field !== 'description' && sort.field !== 'type') {
        if (sort.field === 'companyName') columns.add('company');
        else if (sort.field === 'payeeName' || sort.field === 'payee') columns.add('payee');
        else columns.add(sort.field);
      }
    });
    
    return Array.from(columns);
  }, [transactionFilters, sorts]);

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

  // Available payees for filter dropdown (who you pay - employees, contractors, etc.)
  const availablePayees = useMemo(() => {
    const transactions = data?.data?.transactions;
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    // Return as objects with id and name for TransactionFilterPanel
    const payeeNames = [...new Set(transactions
      .map(t => t.payee)
      .filter(p => p && p.trim() !== '')
    )].sort((a, b) => a.localeCompare(b));
    return payeeNames.map(name => ({ id: name, name }));
  }, [data?.data?.transactions]);

  // Available vendors for filter dropdown (external businesses you purchase from)
  const availableVendors = useMemo(() => {
    const transactions = data?.data?.transactions;
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    // Return as objects with id and name for TransactionFilterPanel
    const vendorNames = [...new Set(transactions
      .map(t => t.vendorName)
      .filter(v => v && v.trim() !== '')
    )].sort((a, b) => a.localeCompare(b));
    return vendorNames.map(name => ({ id: name, name }));
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
    setTransactionFilters({
      searchTerm: '',
      category: '',
      type: '',
      companyId: '',
      statementId: '',
      payee: '',
      vendor: '',
      hasCategory: '',
      hasNotes: '',
      is1099: '',
      isReconciled: '',
      isReviewed: '',
      taxDeductible: '',
      hasReceipt: '',
      hasCheckNumber: '',
      source: '',
      hasPdfSource: '',
      amountRange: { min: '', max: '' },
      dateRange: { start: '', end: '' }
    });
    // Reset sorting to default (date descending)
    setSorts(createDefaultSorts());
  };

  return (
    <div className="space-y-6">
      {/* Link Mode Banner */}
      {isLinkMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Link Transactions to Upload
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Select transactions to link to this PDF upload. Use filters to find the right transactions.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedTransactions.size} selected
              </span>
              <button
                onClick={handleLinkToUpload}
                disabled={selectedTransactions.size === 0 || linkToUploadMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {linkToUploadMutation.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckIcon className="h-4 w-4 mr-2" />
                )}
                Link Selected
              </button>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Panel - Shows when transactions are selected */}
      {!isLinkMode && isSelectMode && (
        <TransactionBulkPanel
          selectedCount={selectedTransactions.size}
          selectedTransactions={selectedTransactions}
          transactions={filteredTransactions}
          companies={companies}
          payees={payees}
          vendors={availableVendors}
          incomeSources={incomeSources}
          statements={statements}
          receipts={receipts}
          checks={checks}
          csvImports={csvImports}
          onBulkUpdate={handleBulkPanelUpdate}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedTransactions(new Set())}
          isUpdating={bulkOperating}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Showing {transactions.length} of {totalCount} transactions
              {hasMore && ` (Page ${Math.floor(queryFilters.offset / queryFilters.limit) + 1} of ${Math.ceil(totalCount / queryFilters.limit)})`}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          {/* Selection toggle and count */}
          {isSelectMode ? (
            <>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                  {selectedTransactions.size} selected
                </span>
              </div>
              
              <button
                onClick={toggleSelectMode}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Exit Select Mode
              </button>
            </>
          ) : (
            <button
              onClick={toggleSelectMode}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Select for Bulk Edit
            </button>
          )}
          
          <button 
            onClick={handleCreateTransaction}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
          <button 
            onClick={() => setIsBulkEntryOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            <BanknotesIcon className="h-4 w-4 mr-2" />
            Bulk Add
          </button>
        </div>
      </div>

      {/* Search and Filters - Using TransactionFilterPanel for consistency */}
      <TransactionFilterPanel
        filters={transactionFilters}
        onFiltersChange={setTransactionFilters}
        onReset={resetFilters}
        companies={companies}
        payees={availablePayees}
        vendors={availableVendors}
        statements={statements}
        showRefresh={true}
        onRefresh={refetch}
        isLoading={isLoading}
        variant="all"
      />

      {/* Multi-level Sorting Controls */}
      <TransactionSortPanel
        sorts={sorts}
        onSortsChange={setSorts}
        maxLevels={5}
        showPresets={true}
        showGrouped={false}
        collapsible={true}
        defaultCollapsed={true}
      />

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors mb-6">
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
            
            {/* Column Headers */}
            <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="w-6 mr-2"></div> {/* Expand button spacer */}
              {isSelectMode && <div className="w-4 mr-3"></div>} {/* Checkbox spacer */}
              <div className="w-16 flex-shrink-0">Date</div>
              <div className="w-16 flex-shrink-0 text-center">Type</div>
              <div className="flex-1 mx-3">Description</div>
              {visibleColumns.length > 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
                  {visibleColumns.map(col => (
                    <span key={col} className="px-2 py-0.5 text-xs">
                      {col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace('Id', '').trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="w-24 flex-shrink-0 text-right">Amount</div>
              <div className="w-20 ml-2 flex-shrink-0 text-right">Actions</div>
            </div>
            
            <ul className="divide-y-0">
            {Array.isArray(filteredTransactions) && filteredTransactions.map((transaction) => {
              // Find statement info for this transaction
              const statement = statements.find(s => s.id === transaction.statementId);
              return (
                <CompactTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isSelectMode={isSelectMode}
                  isSelected={selectedTransactions.has(transaction.id)}
                  onSelect={handleSelectTransaction}
                  editingCategoryId={editingCategoryId}
                  editingCategoryValue={editingCategoryValue}
                  onCategoryEdit={handleStartCategoryEdit}
                  onCategoryChange={setEditingCategoryValue}
                  onCategoryKeyPress={handleCategoryKeyPress}
                  onSaveCategoryEdit={handleSaveCategoryEdit}
                  onCancelCategoryEdit={handleCancelCategoryEdit}
                  onEdit={handleEditTransaction}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  visibleColumns={visibleColumns}
                  statement={statement}
                  getPaymentMethodDisplay={getPaymentMethodDisplay}
                />
              );
            })}
            {(!Array.isArray(transactions) || transactions.length === 0) && (
              <li className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                No transactions available
              </li>
            )}
          </ul>
          
          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {queryFilters.offset + 1} - {Math.min(queryFilters.offset + queryFilters.limit, totalCount)} of {totalCount}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQueryFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  disabled={queryFilters.offset === 0}
                  className={`px-3 py-1 text-sm font-medium rounded-md border ${
                    queryFilters.offset === 0
                      ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {Math.floor(queryFilters.offset / queryFilters.limit) + 1} of {Math.ceil(totalCount / queryFilters.limit)}
                </span>
                <button
                  onClick={() => setQueryFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!hasMore}
                  className={`px-3 py-1 text-sm font-medium rounded-md border ${
                    !hasMore
                      ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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

      {/* Quick Transaction Entry Modal for bulk adding */}
      <QuickTransactionEntry
        isOpen={isBulkEntryOpen}
        onClose={() => setIsBulkEntryOpen(false)}
        onSubmit={async (transactions) => {
          setBulkEntryLoading(true);
          const result = await bulkCreateMutation.mutateAsync(transactions);
          return result;
        }}
        isLoading={bulkEntryLoading || bulkCreateMutation.isPending}
        companies={companies}
      />
    </div>
  );
};

export default TransactionList;
