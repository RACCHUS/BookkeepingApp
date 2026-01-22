import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import {
  CloudArrowUpIcon,
  FolderIcon,
  ReceiptPercentIcon,
  BanknotesIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowPathIcon,
  TableCellsIcon,
  QueueListIcon
} from '@heroicons/react/24/outline';
import PDFUpload from '../PDFUpload/PDFUpload';
import CSVUpload from '../CSVUpload/CSVUpload';
import ManageDocuments from './ManageDocuments';
import ManageReceipts from './ManageReceipts';
import ManageChecks from './ManageChecks';
import ManageCSVImports from './ManageCSVImports';
import { BulkReceiptEntry } from '../Receipts';
import receiptService from '../../services/receiptService';
import checkService from '../../services/checkService';
import api from '../../services/api';

/**
 * DocumentManagement - Unified document management with tabs
 * Main Tabs: Bank Statements, Receipts, Checks
 * Each has sub-tabs for Upload/Add and Manage
 */
const DocumentManagement = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Main tab: 'csv', 'receipts', 'checks', 'pdf'
  const initialTab = searchParams.get('tab') || 'csv';
  // Sub tab: 'upload' or 'manage'
  const initialSubTab = searchParams.get('sub') || 'upload';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  
  // Receipt form state
  const [receiptForm, setReceiptForm] = useState({
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    createTransaction: true
  });
  
  // Bulk receipt modal state
  const [showBulkReceiptEntry, setShowBulkReceiptEntry] = useState(false);
  
  // Check form state
  const [checkForm, setCheckForm] = useState({
    payee: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    checkNumber: '',
    memo: '',
    createTransaction: true
  });

  // Fetch companies for forms
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.companies.getAll(),
    staleTime: 5 * 60 * 1000
  });
  // Supabase returns { success: true, data: { companies: [...] } }
  const companiesRaw = companiesData?.data?.companies;
  const companies = Array.isArray(companiesRaw) ? companiesRaw : [];

  const mainTabs = [
    { id: 'csv', name: 'CSV Import', icon: TableCellsIcon },
    { id: 'receipts', name: 'Receipts', icon: ReceiptPercentIcon },
    { id: 'checks', name: 'Checks', icon: BanknotesIcon },
    { id: 'pdf', name: 'PDF Statements', icon: DocumentTextIcon }
  ];

  const getSubTabs = (mainTab) => {
    switch (mainTab) {
      case 'receipts':
        return [
          { id: 'upload', name: 'Add Receipt', icon: PlusIcon },
          { id: 'manage', name: 'Manage', icon: Cog6ToothIcon }
        ];
      case 'checks':
        return [
          { id: 'upload', name: 'Add Check', icon: PlusIcon },
          { id: 'manage', name: 'Manage', icon: Cog6ToothIcon }
        ];
      case 'csv':
        return [
          { id: 'upload', name: 'Import CSV', icon: CloudArrowUpIcon },
          { id: 'manage', name: 'Manage Imports', icon: FolderIcon }
        ];
      case 'pdf':
        return [
          { id: 'upload', name: 'Upload', icon: CloudArrowUpIcon },
          { id: 'manage', name: 'Manage', icon: FolderIcon }
        ];
      default:
        return [];
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveSubTab('upload');
    setSearchParams({ tab: tabId, sub: 'upload' });
  };

  const handleSubTabChange = (subTabId) => {
    setActiveSubTab(subTabId);
    setSearchParams({ tab: activeTab, sub: subTabId });
  };

  // Receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: (data) => receiptService.createReceipt(data),
    onSuccess: () => {
      toast.success('Receipt added successfully');
      setReceiptForm({
        vendor: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        createTransaction: true
      });
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add receipt');
    }
  });

  // Check mutation
  const createCheckMutation = useMutation({
    mutationFn: (data) => checkService.createCheck(data),
    onSuccess: () => {
      toast.success('Check added successfully');
      setCheckForm({
        payee: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        checkNumber: '',
        memo: '',
        createTransaction: true
      });
      queryClient.invalidateQueries(['checks']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add check');
    }
  });

  const handleReceiptSubmit = (e) => {
    e.preventDefault();
    if (!receiptForm.vendor || !receiptForm.amount) {
      toast.error('Vendor and amount are required');
      return;
    }
    createReceiptMutation.mutate({
      ...receiptForm,
      amount: parseFloat(receiptForm.amount)
    });
  };

  const handleCheckSubmit = (e) => {
    e.preventDefault();
    if (!checkForm.payee || !checkForm.amount) {
      toast.error('Payee and amount are required');
      return;
    }
    createCheckMutation.mutate({
      ...checkForm,
      amount: parseFloat(checkForm.amount)
    });
  };

  const renderTabContent = () => {
    // Receipts tabs
    if (activeTab === 'receipts') {
      if (activeSubTab === 'upload') {
        return (
          <div className="space-y-6">
            {/* Quick Entry Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add New Receipt
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter receipt details. A transaction will be created automatically if enabled.
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkReceiptEntry(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  title="Bulk add multiple receipts at once"
                >
                  <QueueListIcon className="w-5 h-5" />
                  Bulk Add
                </button>
              </div>
              
              <form onSubmit={handleReceiptSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vendor *
                    </label>
                    <input
                      type="text"
                      value={receiptForm.vendor}
                      onChange={(e) => setReceiptForm(prev => ({ ...prev, vendor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Office Depot"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiptForm.amount}
                      onChange={(e) => setReceiptForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={receiptForm.date}
                      onChange={(e) => setReceiptForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={receiptForm.notes}
                      onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={receiptForm.createTransaction}
                      onChange={(e) => setReceiptForm(prev => ({ ...prev, createTransaction: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Also create an expense transaction
                    </span>
                  </label>
                  
                  <button
                    type="submit"
                    disabled={createReceiptMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {createReceiptMutation.isPending ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-5 h-5" />
                        Add Receipt
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }
      return <ManageReceipts />;
    }
    
    // Checks tabs
    if (activeTab === 'checks') {
      if (activeSubTab === 'upload') {
        return (
          <div className="space-y-6">
            {/* Quick Entry Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add New Check
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter check details. A transaction will be created automatically if enabled.
              </p>
              
              <form onSubmit={handleCheckSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payee *
                    </label>
                    <input
                      type="text"
                      value={checkForm.payee}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, payee: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={checkForm.amount}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={checkForm.date}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={checkForm.type}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="expense">Expense (Check Written)</option>
                      <option value="income">Income (Check Received)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Check Number
                    </label>
                    <input
                      type="text"
                      value={checkForm.checkNumber}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, checkNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 1234"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Memo
                    </label>
                    <input
                      type="text"
                      value={checkForm.memo}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, memo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Optional memo"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkForm.createTransaction}
                      onChange={(e) => setCheckForm(prev => ({ ...prev, createTransaction: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Also create a transaction
                    </span>
                  </label>
                  
                  <button
                    type="submit"
                    disabled={createCheckMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {createCheckMutation.isPending ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-5 h-5" />
                        Add Check
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }
      return <ManageChecks />;
    }
    
    // CSV tabs
    if (activeTab === 'csv') {
      if (activeSubTab === 'upload') {
        return <CSVUpload />;
      }
      if (activeSubTab === 'manage') {
        return <ManageCSVImports />;
      }
      // Default to upload for CSV
      return <CSVUpload />;
    }
    
    // PDF tabs (last)
    if (activeTab === 'pdf') {
      if (activeSubTab === 'upload') {
        return <PDFUpload />;
      }
      if (activeSubTab === 'manage') {
        return <ManageDocuments />;
      }
      // Default to upload for PDF
      return <PDFUpload />;
    }
    
    // Fallback
    return <ReceiptUpload />;
  };

  const subTabs = getSubTabs(activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Main Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Documents
            </h1>
          </div>
          
          {/* Main Tab Navigation */}
          <div className="flex space-x-1 -mb-px">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-2">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSubTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </div>

      {/* Bulk Receipt Entry Modal */}
      <BulkReceiptEntry
        isOpen={showBulkReceiptEntry}
        onClose={() => setShowBulkReceiptEntry(false)}
        onSubmit={async (receipts) => {
          const result = await receiptService.bulkCreate(receipts);
          queryClient.invalidateQueries(['receipts']);
          queryClient.invalidateQueries(['transactions']);
          queryClient.invalidateQueries(['recent-transactions']);
          queryClient.invalidateQueries(['transaction-summary']);
          queryClient.invalidateQueries([ALL_TRANSACTIONS_KEY]);
          return result;
        }}
        isLoading={false}
      />
    </div>
  );
};

export default DocumentManagement;
