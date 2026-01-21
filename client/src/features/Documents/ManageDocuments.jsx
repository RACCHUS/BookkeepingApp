import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { getUploads, renameUpload, deleteUpload, batchDeleteUploads } from '../../services/uploadsService';
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingSpinner } from '../../components/ui';
import { CompanySelector } from '../../components/common';
import {
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

/**
 * ManageDocuments - PDF management tab with delete/rename functionality
 * Delete option includes checkbox for deleting associated transactions (off by default)
 */
const ManageDocuments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUpload, setDeletingUpload] = useState(null);
  const [deleteTransactions, setDeleteTransactions] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteTransactions, setBulkDeleteTransactions] = useState(false);

  // Fetch uploads
  const validCompany = selectedCompany && selectedCompany.trim() !== '' && selectedCompany !== 'null';
  
  const { data: uploadsResponse, isLoading, refetch } = useQuery({
    queryKey: ['uploads', user?.uid, validCompany ? selectedCompany : undefined, searchTerm, sortBy, sortOrder],
    queryFn: async () => {
      if (!user?.uid) return { data: [] };
      const params = {
        userId: user.uid,
        search: searchTerm || undefined,
        sortBy,
        sortOrder
      };
      if (validCompany) params.companyId = selectedCompany;
      
      try {
        const result = await getUploads(params);
        if (!result) return { data: [] };
        if (Array.isArray(result)) return { data: result };
        if (typeof result === 'object' && Array.isArray(result.data)) return result;
        return { data: [] };
      } catch (err) {
        console.error('[ManageDocuments] getUploads error:', err);
        return { data: [] };
      }
    },
    enabled: !!user?.uid,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const uploads = Array.isArray(uploadsResponse?.data) ? uploadsResponse.data : 
                  Array.isArray(uploadsResponse) ? uploadsResponse : [];

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: ({ uploadId, newName }) => renameUpload(uploadId, newName),
    onSuccess: (response, { uploadId, newName }) => {
      toast.success('Upload renamed successfully');
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      setEditingId(null);
      setEditName('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to rename upload');
    }
  });

  // Delete mutation - supports optional transaction deletion
  const deleteMutation = useMutation({
    mutationFn: ({ uploadId, deleteAssociatedTransactions }) => 
      deleteUpload(uploadId, { deleteTransactions: deleteAssociatedTransactions }),
    onSuccess: (response, { uploadId }) => {
      toast.success(deleteTransactions 
        ? 'Upload and associated transactions deleted' 
        : 'Upload deleted (transactions preserved)');
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      setShowDeleteModal(false);
      setDeletingUpload(null);
      setDeleteTransactions(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete upload');
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: ({ uploadIds, deleteTransactions }) => 
      batchDeleteUploads(uploadIds, { deleteTransactions }),
    onSuccess: (response) => {
      const { successful, failed } = response.data || response;
      const successCount = successful?.length || 0;
      const failCount = failed?.length || 0;
      
      if (failCount === 0) {
        toast.success(`Deleted ${successCount} uploads successfully`);
      } else {
        toast.success(`Deleted ${successCount} uploads, ${failCount} failed`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY] });
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
      setBulkDeleteTransactions(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete uploads');
    }
  });

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === uploads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(uploads.map(u => u.id)));
    }
  }, [selectedIds.size, uploads]);

  const handleSelectOne = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteTransactions(false);
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    bulkDeleteMutation.mutate({
      uploadIds: Array.from(selectedIds),
      deleteTransactions: bulkDeleteTransactions
    });
  };

  // Handlers
  const handleStartEdit = (upload) => {
    setEditingId(upload.id);
    setEditName(upload.name || upload.originalName || upload.fileName || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = (uploadId) => {
    if (editName.trim()) {
      renameMutation.mutate({ uploadId, newName: editName.trim() });
    }
  };

  const handleOpenDeleteModal = (upload) => {
    setDeletingUpload(upload);
    setDeleteTransactions(false); // Default to NOT deleting transactions
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletingUpload) {
      deleteMutation.mutate({ 
        uploadId: deletingUpload.id, 
        deleteAssociatedTransactions: deleteTransactions 
      });
    }
  };

  // Filter uploads by search
  const filteredUploads = uploads.filter(upload => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (upload.name || '').toLowerCase().includes(searchLower) ||
      (upload.originalName || '').toLowerCase().includes(searchLower) ||
      (upload.fileName || '').toLowerCase().includes(searchLower) ||
      (upload.companyName || '').toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search PDFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Company Filter */}
          <CompanySelector
            value={selectedCompany}
            onChange={(id) => setSelectedCompany(id)}
            placeholder="All companies"
            allowAll={true}
            allowCreate={false}
          />

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Uploads List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredUploads.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="mx-auto h-12 w-12 mb-4" />
            <p>No PDF uploads found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredUploads.length > 0 && selectedIds.size === filteredUploads.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUploads.map((upload) => (
                <tr key={upload.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(upload.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(upload.id)}
                      onChange={() => handleSelectOne(upload.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === upload.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-64 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(upload.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(upload.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title="Save"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-gray-400 hover:text-gray-500"
                          title="Cancel"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {upload.name || upload.originalName || upload.fileName || 'Unnamed'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {upload.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {upload.companyName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {upload.uploadedAt 
                      ? format(new Date(upload.uploadedAt), 'MMM d, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      upload.status === 'processed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : upload.status === 'error'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {upload.status || 'uploaded'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {upload.transactionCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(upload)}
                        className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        title="Rename"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(upload)}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete PDF Upload
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Are you sure you want to delete "{deletingUpload.name || deletingUpload.originalName || 'this upload'}"?
                This action cannot be undone.
              </p>

              {/* Transaction count info */}
              {(deletingUpload.transactionCount || 0) > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This upload has <strong>{deletingUpload.transactionCount}</strong> associated transactions.
                  </p>
                </div>
              )}

              {/* Delete transactions checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteTransactions}
                    onChange={(e) => setDeleteTransactions(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Also delete associated transactions
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      If unchecked, transactions will be preserved but unlinked from this PDF.
                      The PDF ID will be recorded for reference.
                    </p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowBulkDeleteModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete {selectedIds.size} PDF Uploads
                </h3>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Are you sure you want to delete {selectedIds.size} selected uploads?
                This action cannot be undone.
              </p>

              {/* Delete transactions checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkDeleteTransactions}
                    onChange={(e) => setBulkDeleteTransactions(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Also delete associated transactions
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      If unchecked, transactions will be preserved but unlinked from these PDFs.
                    </p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedIds.size} Uploads`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDocuments;
