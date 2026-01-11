/**
 * ReceiptVendorAssignment Component
 * Allows users to assign/unassign vendors to receipt documents
 * Receipts use 'vendor' field (string) for vendor name
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import receiptService from '../../services/receiptService';
import { formatCurrency } from '../../utils/currencyUtils';

const ReceiptVendorAssignment = ({ onAssignmentComplete }) => {
  const [viewMode, setViewMode] = useState('unassigned'); // 'unassigned' or 'assigned'
  const [selectedReceipts, setSelectedReceipts] = useState(new Set());
  const [selectedVendor, setSelectedVendor] = useState('');
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  const queryClient = useQueryClient();

  // Fetch all receipts
  const { data: receiptsData, isLoading: loadingReceipts, error: receiptsError } = useQuery({
    queryKey: ['receipts-for-vendor-assignment', viewMode],
    queryFn: async () => {
      const result = await receiptService.getReceipts({}, {}, { limit: 100 });
      return result?.data || result;
    },
    retry: 2,
    onError: (error) => {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to load receipts. Please refresh the page.');
    }
  });

  // Fetch all vendors (payees with type 'vendor')
  const { data: vendorsData, isLoading: loadingVendors, error: vendorsError } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: () => api.payees.getVendors(),
    retry: 2,
    onError: (error) => {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors. Please refresh the page.');
    }
  });

  // Receipt API returns { success: true, data: [...], total: N }
  const allReceiptsRaw = receiptsData?.data || receiptsData?.receipts;
  const allReceipts = Array.isArray(allReceiptsRaw) ? allReceiptsRaw : [];
  const unassignedReceipts = allReceipts.filter(r => !r.vendor || r.vendor.trim() === '');
  const assignedReceipts = allReceipts.filter(r => r.vendor && r.vendor.trim() !== '');
  const receipts = viewMode === 'unassigned' ? unassignedReceipts : assignedReceipts;
  // Vendors API returns { data: { vendors: [...] } } or { vendors: [...] }
  const vendorsRaw = vendorsData?.data?.vendors || vendorsData?.vendors || vendorsData?.data?.payees || vendorsData?.payees;
  const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];

  // Mutation for bulk vendor assignment to receipts
  const assignVendorMutation = useMutation({
    mutationFn: async ({ receiptIds, vendorName }) => {
      // Update each receipt with the vendor
      const results = await Promise.all(
        receiptIds.map(receiptId => 
          receiptService.updateReceipt(receiptId, { vendor: vendorName })
        )
      );
      return { updatedCount: results.length };
    },
    onSuccess: (data) => {
      toast.success(`Vendor assigned to ${data.updatedCount} receipts`);
      setSelectedReceipts(new Set());
      setSelectedVendor('');
      queryClient.invalidateQueries(['receipts-for-vendor-assignment']);
      queryClient.invalidateQueries(['receipts']);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error assigning vendor:', error);
      toast.error('Failed to assign vendor to receipts');
    }
  });

  // Mutation for bulk vendor unassignment
  const unassignVendorMutation = useMutation({
    mutationFn: async (receiptIds) => {
      // Clear vendor from each receipt
      const results = await Promise.all(
        receiptIds.map(receiptId => 
          receiptService.updateReceipt(receiptId, { vendor: '' })
        )
      );
      return { updatedCount: results.length };
    },
    onSuccess: (data) => {
      toast.success(`Vendor removed from ${data.updatedCount} receipts`);
      setSelectedReceipts(new Set());
      queryClient.invalidateQueries(['receipts-for-vendor-assignment']);
      queryClient.invalidateQueries(['receipts']);
      onAssignmentComplete?.();
    },
    onError: (error) => {
      console.error('Error unassigning vendor:', error);
      toast.error('Failed to remove vendor from receipts');
    }
  });

  // Mutation for creating new vendor
  const createVendorMutation = useMutation({
    mutationFn: (vendorData) => api.payees.create(vendorData),
    onSuccess: (data) => {
      toast.success('Vendor created successfully');
      const newVendorId = data?.data?.id || data?.id;
      setSelectedVendor(newVendorId);
      setShowNewVendorForm(false);
      setNewVendorName('');
      queryClient.invalidateQueries(['all-vendors']);
    },
    onError: (error) => {
      console.error('Error creating vendor:', error);
      toast.error('Failed to create vendor');
    }
  });

  const handleSelectAll = () => {
    if (selectedReceipts.size === receipts.length) {
      setSelectedReceipts(new Set());
    } else {
      setSelectedReceipts(new Set(receipts.map(r => r.id)));
    }
  };

  const handleReceiptSelect = (receiptId) => {
    const newSelected = new Set(selectedReceipts);
    if (newSelected.has(receiptId)) {
      newSelected.delete(receiptId);
    } else {
      newSelected.add(receiptId);
    }
    setSelectedReceipts(newSelected);
  };

  const handleAssignVendor = () => {
    if (selectedReceipts.size === 0) {
      toast.error('Please select at least one receipt');
      return;
    }

    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }

    const vendor = vendors.find(v => v.id === selectedVendor);
    if (!vendor) {
      toast.error('Selected vendor not found');
      return;
    }

    assignVendorMutation.mutate({
      receiptIds: Array.from(selectedReceipts),
      vendorName: vendor.name
    });
  };

  const handleUnassignVendor = () => {
    if (selectedReceipts.size === 0) {
      toast.error('Please select at least one receipt');
      return;
    }

    unassignVendorMutation.mutate(Array.from(selectedReceipts));
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedReceipts(new Set());
    setSelectedVendor('');
  };

  const handleCreateNewVendor = () => {
    if (!newVendorName.trim()) {
      toast.error('Please enter a vendor name');
      return;
    }

    createVendorMutation.mutate({
      name: newVendorName.trim(),
      type: 'vendor',
      isActive: true
    });
  };

  if (loadingReceipts || loadingVendors) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (vendorsError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 dark:text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error loading vendors</p>
          <p className="text-sm">Please refresh the page or try again later.</p>
          <p className="text-xs mt-2 text-gray-500">{vendorsError.message}</p>
        </div>
      </div>
    );
  }

  if (receiptsError) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 dark:text-red-400">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-medium">Error loading receipts</p>
          <p className="text-sm">Please refresh the page or try again later.</p>
          <p className="text-xs mt-2 text-gray-500">{receiptsError.message}</p>
        </div>
      </div>
    );
  }

  const showEmptyState = receipts.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => handleViewModeChange('unassigned')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            viewMode === 'unassigned'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Unassigned ({unassignedReceipts.length})
        </button>
        <button
          onClick={() => handleViewModeChange('assigned')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            viewMode === 'assigned'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Assigned ({assignedReceipts.length})
        </button>
      </div>

      {showEmptyState ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">{viewMode === 'unassigned' ? '✅' : '🧾'}</div>
            <p className="text-lg font-medium">
              {viewMode === 'unassigned' 
                ? 'All receipts have vendors assigned!' 
                : 'No assigned receipts found.'}
            </p>
            <p className="text-sm">
              {viewMode === 'unassigned' 
                ? 'No unassigned receipts found.' 
                : 'Receipts will appear here once vendors are assigned.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {viewMode === 'unassigned' ? 'Assign Vendors to Receipts' : 'Remove Vendors from Receipts'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} {viewMode === 'unassigned' ? 'need vendor assignment' : 'have vendors assigned'}
              </p>
            </div>
            
            {selectedReceipts.size > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedReceipts.size} selected
                </span>
              </div>
            )}
          </div>

          {/* Vendor Selection / Unassign Section */}
          {viewMode === 'unassigned' ? (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Vendor
                  </label>
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Choose a vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-6">
                  <button
                    onClick={() => setShowNewVendorForm(!showNewVendorForm)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
                  >
                    {showNewVendorForm ? 'Cancel' : 'Add New'}
                  </button>
                </div>
              </div>

              {/* New Vendor Form */}
              {showNewVendorForm && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Vendor Name
                      </label>
                      <input
                        type="text"
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        placeholder="Enter vendor name"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    
                    <div className="pt-6">
                      <button
                        onClick={handleCreateNewVendor}
                        disabled={createVendorMutation.isPending || !newVendorName.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createVendorMutation.isPending ? 'Creating...' : 'Create Vendor'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAssignVendor}
                  disabled={assignVendorMutation.isPending || selectedReceipts.size === 0 || !selectedVendor}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignVendorMutation.isPending 
                    ? 'Assigning...' 
                    : `Assign to ${selectedReceipts.size} Receipt${selectedReceipts.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          ) : (
            /* Unassign Section */
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select receipts to remove their vendor assignment
                </p>
                <button
                  onClick={handleUnassignVendor}
                  disabled={unassignVendorMutation.isPending || selectedReceipts.size === 0}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unassignVendorMutation.isPending 
                    ? 'Removing...' 
                    : `Remove Vendor from ${selectedReceipts.size} Receipt${selectedReceipts.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          )}

          {/* Receipts Table */}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedReceipts.size === receipts.length && receipts.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Current Vendor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedReceipts.has(receipt.id) ? 'bg-blue-50 dark:bg-blue-900' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedReceipts.has(receipt.id)}
                        onChange={() => handleReceiptSelect(receipt.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {receipt.date && !isNaN(new Date(receipt.date))
                        ? new Date(receipt.date).toLocaleDateString()
                        : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate" title={receipt.notes}>
                        {receipt.notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {receipt.hasImage ? '📷 Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {receipt.vendor || 'No vendor assigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Total Amount:</strong> {formatCurrency(
                receipts.reduce((sum, r) => sum + (r.amount || 0), 0)
              )}
              {selectedReceipts.size > 0 && (
                <>
                  {' • '}
                  <strong>Selected Amount:</strong> {formatCurrency(
                    receipts
                      .filter(r => selectedReceipts.has(r.id))
                      .reduce((sum, r) => sum + (r.amount || 0), 0)
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceiptVendorAssignment;
