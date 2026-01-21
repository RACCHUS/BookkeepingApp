/**
 * VendorManagement - Vendor management page
 * Provides vendor CRUD operations and assignment to checks/receipts
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import VendorList from './VendorList';
import VendorForm from './VendorForm';
import { CheckVendorAssignment } from '../Checks';
import { ReceiptVendorAssignment } from '../Receipts';
import { ExpenseVendorAssignment } from '../Expenses';
import { useExpenseTransactions } from '../../hooks/useAllTransactions';

const VendorManagement = () => {
  const [activeTab, setActiveTab] = useState('vendors');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Fetch vendors
  const { data: vendorsData, isLoading, refetch } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.payees.getVendors()
  });

  // Fetch checks without vendors for badge count - use same API as CheckVendorAssignment
  const { data: checksData } = useQuery({
    queryKey: ['unassigned-check-vendor-transactions'],
    queryFn: () => api.payees.getTransactionsWithoutVendors({ paymentMethod: 'check' })
  });

  // Fetch receipts without vendors for badge count
  const { data: receiptsData } = useQuery({
    queryKey: ['receipts-without-vendors'],
    queryFn: async () => {
      const { default: receiptService } = await import('../../services/receiptService');
      const result = await receiptService.getReceipts({}, {}, { limit: 100 });
      // Receipt API returns { success: true, data: [...], total: N }
      const receipts = result?.data || result?.receipts || [];
      return receipts.filter(r => !r.vendor || r.vendor.trim() === '');
    }
  });

  // Get expense transactions for unassigned expense count
  const { transactions: expenseTransactions = [] } = useExpenseTransactions();

  const vendorsRaw = vendorsData?.data?.vendors || vendorsData?.vendors || vendorsData?.data?.payees || vendorsData?.payees;
  const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];
  // checksData comes from getTransactionsWithoutVendors which returns { transactions: [...] }
  const unassignedChecks = checksData?.transactions || checksData || [];
  const unassignedCheckCount = Array.isArray(unassignedChecks) ? unassignedChecks.length : 0;
  const unassignedReceiptCount = Array.isArray(receiptsData) ? receiptsData.length : 0;
  
  // Calculate unassigned expense count (excludes checks only)
  const unassignedExpenseCount = expenseTransactions.filter(tx => {
    const isCheck = tx.paymentMethod === 'check' || tx.sectionCode === 'checks';
    if (isCheck) return false;
    return !tx.vendorId && !tx.vendorName;
  }).length;

  const handleCreateVendor = () => {
    setEditingVendor(null);
    setShowForm(true);
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingVendor(null);
    refetch();
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      await api.payees.delete(vendorId);
      toast.success('Vendor deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const tabs = [
    { key: 'vendors', label: 'All Vendors', icon: '🏢' },
    { 
      key: 'expense-assignment', 
      label: 'Expense Assignment', 
      icon: '💰',
      badge: unassignedExpenseCount 
    },
    { 
      key: 'check-assignment', 
      label: 'Check Assignment', 
      icon: '📝',
      badge: unassignedCheckCount 
    },
    { 
      key: 'receipt-assignment', 
      label: 'Receipt Assignment', 
      icon: '🧾',
      badge: unassignedReceiptCount 
    }
  ];

  if (showForm) {
    return (
      <VendorForm
        vendor={editingVendor}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Vendor Management
        </h1>
        {activeTab === 'vendors' && (
          <button
            onClick={handleCreateVendor}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Vendor
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {activeTab === 'vendors' && (
          <VendorList
            vendors={vendors}
            isLoading={isLoading}
            onEdit={handleEditVendor}
            onDelete={handleDeleteVendor}
          />
        )}
        {activeTab === 'expense-assignment' && (
          <ExpenseVendorAssignment 
            onAssignmentComplete={() => {
              refetch();
            }}
          />
        )}
        {activeTab === 'check-assignment' && (
          <CheckVendorAssignment 
            onAssignmentComplete={() => {
              refetch();
            }}
          />
        )}
        {activeTab === 'receipt-assignment' && (
          <ReceiptVendorAssignment 
            onAssignmentComplete={() => {
              refetch();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default VendorManagement;
