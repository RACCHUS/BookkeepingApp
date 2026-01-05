import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  PhotoIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import receiptService from '../../services/receiptService';
import ReceiptCard from './ReceiptCard';
import ReceiptForm from './ReceiptForm';
import ReceiptDetailModal from './ReceiptDetailModal';
import BatchUpdateModal from './BatchUpdateModal';
import BulkAddReceiptsModal from './BulkAddReceiptsModal';
import QuickReceiptEntry from './QuickReceiptEntry';

/**
 * ReceiptList - Main receipts page with list, filters, and actions
 */
const ReceiptList = () => {
  const queryClient = useQueryClient();
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [showBatchUpdate, setShowBatchUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    hasImage: '',
    hasTransaction: '',
    startDate: '',
    endDate: '',
    companyId: ''
  });
  
  // Sort State
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Build query params
  const queryParams = useMemo(() => {
    const params = {
      sortField,
      sortDirection,
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    
    if (filters.hasImage === 'true') params.hasImage = true;
    if (filters.hasImage === 'false') params.hasImage = false;
    if (filters.hasTransaction === 'true') params.hasTransaction = true;
    if (filters.hasTransaction === 'false') params.hasTransaction = false;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.companyId) params.companyId = filters.companyId;
    
    return params;
  }, [filters, sortField, sortDirection, page]);

  // Fetch receipts
  const { 
    data: receiptsData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['receipts', queryParams],
    queryFn: () => receiptService.getReceipts(queryParams)
  });

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { apiClient } = await import('../../services/api');
      return apiClient.companies.getAll();
    }
  });

  const companies = companiesData?.data?.companies || companiesData?.companies || [];

  // Filter by search locally (for vendor name)
  const filteredReceipts = useMemo(() => {
    if (!receiptsData?.receipts) return [];
    if (!filters.search) return receiptsData.receipts;
    
    const searchLower = filters.search.toLowerCase();
    return receiptsData.receipts.filter(r => 
      (r.vendor && r.vendor.toLowerCase().includes(searchLower)) ||
      (r.notes && r.notes.toLowerCase().includes(searchLower))
    );
  }, [receiptsData, filters.search]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => receiptService.createReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      setShowAddForm(false);
      toast.success('Receipt created successfully');
    },
    onError: (err) => toast.error(err.message || 'Failed to create receipt')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => receiptService.updateReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      setEditingReceipt(null);
      toast.success('Receipt updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update receipt')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => receiptService.deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      setShowDeleteConfirm(null);
      setViewingReceipt(null);
      toast.success('Receipt deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete receipt')
  });

  const batchUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }) => receiptService.batchUpdateReceipts(ids, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      setShowBatchUpdate(false);
      setSelectedIds(new Set());
      toast.success(`${data.successCount} receipts updated`);
    },
    onError: (err) => toast.error(err.message || 'Batch update failed')
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids) => receiptService.batchDeleteReceipts(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      setSelectedIds(new Set());
      toast.success(`${data.successCount} receipts deleted`);
    },
    onError: (err) => toast.error(err.message || 'Batch delete failed')
  });

  const bulkAddMutation = useMutation({
    mutationFn: (transactions) => receiptService.bulkCreateFromTransactions(transactions),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setShowBulkAdd(false);
      toast.success(`${data.data.successCount} receipts created`);
    },
    onError: (err) => toast.error(err.message || 'Bulk add failed')
  });

  // Quick entry mutation - bulk create receipts with transaction creation
  const quickEntryMutation = useMutation({
    mutationFn: (receipts) => receiptService.bulkCreate(receipts),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setShowQuickEntry(false);
      toast.success(`${data.data?.successCount || 0} receipts & transactions created`);
    },
    onError: (err) => toast.error(err.message || 'Quick entry failed')
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ id, file }) => receiptService.uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      toast.success('Image uploaded');
    },
    onError: (err) => toast.error(err.message || 'Failed to upload image')
  });

  const deleteImageMutation = useMutation({
    mutationFn: (id) => receiptService.deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      toast.success('Image removed');
    },
    onError: (err) => toast.error(err.message || 'Failed to remove image')
  });

  const attachMutation = useMutation({
    mutationFn: ({ receiptId, transactionId }) => 
      receiptService.attachToTransaction(receiptId, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      toast.success('Transaction linked');
    },
    onError: (err) => toast.error(err.message || 'Failed to link transaction')
  });

  const detachMutation = useMutation({
    mutationFn: (receiptId) => receiptService.detachFromTransaction(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      toast.success('Transaction unlinked');
    },
    onError: (err) => toast.error(err.message || 'Failed to unlink transaction')
  });

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredReceipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReceipts.map(r => r.id)));
    }
  }, [filteredReceipts, selectedIds]);

  const handleSelectReceipt = useCallback((id, selected) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      hasImage: '',
      hasTransaction: '',
      startDate: '',
      endDate: '',
      companyId: ''
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Calculate pagination
  const totalPages = receiptsData?.total 
    ? Math.ceil(receiptsData.total / pageSize) 
    : 1;

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
          Failed to load receipts: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Receipts
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your receipts and expense documentation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickEntry(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            title="Quickly add multiple cash receipts (creates transactions too)"
          >
            <DocumentPlusIcon className="w-5 h-5" />
            Quick Entry
          </button>
          <button
            onClick={() => setShowBulkAdd(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Create receipt records for existing transactions"
          >
            <LinkIcon className="w-5 h-5" />
            Link Transactions
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Add single receipt with image upload"
          >
            <PlusIcon className="w-5 h-5" />
            Add Receipt
          </button>
        </div>
      </div>

      {/* Retention Policy Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Retention Policy:</strong> Receipts are automatically deleted after 2 years. 
            Download any important documents before expiration.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vendor or notes..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowsUpDownIcon className="w-5 h-5" />
              Sort
            </button>
          </div>

          {/* Batch Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-gray-300 dark:border-gray-600">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => setShowBatchUpdate(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                title="Batch update"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} receipts?`)) {
                    batchDeleteMutation.mutate([...selectedIds]);
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title="Delete selected"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Has Image */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Has Image
              </label>
              <select
                value={filters.hasImage}
                onChange={(e) => handleFilterChange('hasImage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="true">With Image</option>
                <option value="false">Without Image</option>
              </select>
            </div>
            
            {/* Has Transaction */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Linked to Transaction
              </label>
              <select
                value={filters.hasTransaction}
                onChange={(e) => handleFilterChange('hasTransaction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="true">Linked</option>
                <option value="false">Unlinked</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Select All */}
      {filteredReceipts.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Select all
          </span>
        </div>
      )}

      {/* Receipts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No receipts found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your filters'
              : 'Get started by adding your first receipt'
            }
          </p>
          {!hasActiveFilters && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <PlusIcon className="w-5 h-5" />
              Add Receipt
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReceipts.map(receipt => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              isSelected={selectedIds.has(receipt.id)}
              onSelect={(selected) => handleSelectReceipt(receipt.id, selected)}
              onView={() => setViewingReceipt(receipt)}
              onEdit={() => setEditingReceipt(receipt)}
              onDelete={() => setShowDeleteConfirm(receipt)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingReceipt) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setShowAddForm(false);
              setEditingReceipt(null);
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingReceipt ? 'Edit Receipt' : 'Add Receipt'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingReceipt(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <ReceiptForm
                initialData={editingReceipt}
                onSubmit={(data) => {
                  if (editingReceipt) {
                    updateMutation.mutate({ id: editingReceipt.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingReceipt(null);
                }}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ReceiptDetailModal
        receipt={viewingReceipt}
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        onEdit={(receipt) => {
          setViewingReceipt(null);
          setEditingReceipt(receipt);
        }}
        onDelete={(receipt) => {
          setShowDeleteConfirm(receipt);
        }}
        onUploadImage={(id, file) => uploadImageMutation.mutate({ id, file })}
        onDeleteImage={(id) => deleteImageMutation.mutate(id)}
        onAttachTransaction={(receiptId, transactionId) => 
          attachMutation.mutate({ receiptId, transactionId })
        }
        onDetachTransaction={(receiptId) => detachMutation.mutate(receiptId)}
        isLoading={
          uploadImageMutation.isPending || 
          deleteImageMutation.isPending || 
          attachMutation.isPending || 
          detachMutation.isPending
        }
      />

      {/* Batch Update Modal */}
      <BatchUpdateModal
        isOpen={showBatchUpdate}
        onClose={() => setShowBatchUpdate(false)}
        selectedCount={selectedIds.size}
        onSubmit={(updates) => {
          batchUpdateMutation.mutate({
            ids: [...selectedIds],
            updates
          });
        }}
        isLoading={batchUpdateMutation.isPending}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Receipt?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              This action cannot be undone. The receipt and its image will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(showDeleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add from Transactions Modal */}
      <BulkAddReceiptsModal
        isOpen={showBulkAdd}
        onClose={() => setShowBulkAdd(false)}
        onSubmit={(transactions) => bulkAddMutation.mutate(transactions)}
        isLoading={bulkAddMutation.isPending}
      />

      {/* Quick Receipt Entry Modal (primary use case - creates receipts + transactions) */}
      <QuickReceiptEntry
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onSubmit={async (receipts) => {
          const result = await receiptService.bulkCreate(receipts);
          queryClient.invalidateQueries(['receipts']);
          queryClient.invalidateQueries(['transactions']);
          return result;
        }}
        isLoading={quickEntryMutation.isPending}
        companies={companies}
      />
    </div>
  );
};

export default ReceiptList;
