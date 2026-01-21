/**
 * CSV Upload Feature
 * Main component for importing transactions from CSV files
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api'; // Use default export (hybridApiClient)
import { ALL_TRANSACTIONS_KEY } from '../../hooks/useAllTransactions';
import { LoadingSpinner } from '../../components/ui';
import { CompanySelector } from '../../components/common';
import { ClassifyWithAIButton } from '../../components/classification';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

/**
 * CSV Upload and Import Component
 * Flow: Select Bank → Upload CSV → Preview → Confirm Import
 */
const CSVUpload = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [selectedBank, setSelectedBank] = useState('auto');
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, preview, importing, success, error
  const [previewData, setPreviewData] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState(null); // Track import results for AI classification

  // Fetch supported banks
  const { data: banksData } = useQuery({
    queryKey: ['csv-banks'],
    queryFn: () => api.csv.getBanks(),
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });

  const banks = banksData?.data || [];

  // Upload mutation - uses client-side parsing via supabaseClient
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      console.log('Uploading file:', file.name, file.size);
      // Pass file directly with options - supabaseClient.csv.upload handles parsing
      return api.csv.upload(file, {
        bankFormat: selectedBank || 'auto',
        companyId: selectedCompany,
        companyName: selectedCompanyData?.name || '',
      });
    },
    onSuccess: (response) => {
      console.log('Upload response:', response);
      if (response.success) {
        console.log('Preview data:', response.data);
        console.log('Sample transactions:', response.data.sampleTransactions);
        setPreviewData(response.data);
        setUploadState('preview');
        
        if (response.data.detectedBank && response.data.detectedBank !== 'auto' && response.data.detectedBank !== 'generic') {
          toast.success(`Detected ${response.data.detectedBankName} format`);
        } else if (response.data.requiresMapping) {
          toast.info('Bank format not detected. Please review the column mapping.');
        }
      } else {
        setUploadState('error');
        toast.error(response.message || 'Failed to parse CSV');
      }
    },
    onError: (error) => {
      setUploadState('error');
      toast.error(error.message || 'Failed to parse CSV');
    },
  });

  // Confirm import mutation - now inserts directly to Supabase
  const confirmMutation = useMutation({
    mutationFn: () => {
      return api.csv.confirmImport(previewData.transactions, {
        skipDuplicates,
        companyId: selectedCompany,
        fileName: previewData.fileName || 'import.csv',
        bankFormat: previewData.detectedBank || 'auto',
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        setUploadState('success');
        
        const { imported, duplicates, classified, unclassified, unclassifiedTransactions } = response.data;
        
        // Store result for AI classification
        setImportResult({
          imported,
          duplicates,
          classified,
          unclassified: unclassified || (imported - (classified || 0)),
          unclassifiedTransactions: unclassifiedTransactions || [],
        });
        
        let message = `Successfully imported ${imported} transactions`;
        if (duplicates > 0) {
          message += ` (${duplicates} duplicates skipped)`;
        }
        if (classified > 0) {
          message += `. ${classified} auto-categorized by rules`;
        }
        toast.success(message);
        
        // Invalidate and refetch all transaction-related queries
        queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['recent-transactions'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['transaction-summary'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['csv-imports'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['csv-imports-for-modal'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: [ALL_TRANSACTIONS_KEY], refetchType: 'all' });
      } else {
        toast.error(response.message || 'Failed to import transactions');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to import transactions');
    },
  });

  // Cancel mutation - just reset state (no server call needed)
  const cancelMutation = useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      resetState();
      toast.info('Import cancelled');
    },
  });

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadState('uploading');
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploadState === 'uploading',
  });

  // Reset state
  const resetState = () => {
    setUploadState('idle');
    setPreviewData(null);
    setImportResult(null);
  };

  // Handle confirm import
  const handleConfirm = () => {
    setUploadState('importing');
    confirmMutation.mutate();
  };

  // Handle cancel
  const handleCancel = () => {
    if (previewData?.uploadId) {
      cancelMutation.mutate();
    } else {
      resetState();
    }
  };

  // Navigate to transactions after success
  const handleViewTransactions = () => {
    navigate('/transactions');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import CSV</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Import transactions from your bank's CSV export
        </p>
      </div>

      {/* Step 1: Company Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          1. Select Company
        </h2>
        <CompanySelector
          value={selectedCompany}
          onChange={(id, company) => {
            setSelectedCompany(id);
            setSelectedCompanyData(company);
          }}
          disabled={uploadState !== 'idle'}
        />
      </div>

      {/* Step 2: Bank Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          2. Select Bank Format
        </h2>
        <select
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          disabled={uploadState !== 'idle'}
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option key="auto" value="auto">Auto-Detect Bank Format</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Select "Auto-Detect" to let us identify your bank format automatically
        </p>
      </div>

      {/* Step 3: Upload Area (only show when idle) */}
      {uploadState === 'idle' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            3. Upload CSV File
          </h2>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${!selectedCompany 
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-50'
                : isDragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isDragActive
                ? 'Drop the CSV file here...'
                : 'Drag and drop a CSV file, or click to select'
              }
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              CSV files up to 5MB
            </p>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Parsing CSV file...</p>
        </div>
      )}

      {/* Preview State */}
      {uploadState === 'preview' && previewData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Preview Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Preview Import
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {previewData.fileName} • {previewData.parsedCount} transactions found
                  {previewData.detectedBankName && ` • ${previewData.detectedBankName} format`}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Sample Transactions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(previewData.sampleTransactions || previewData.transactions || []).slice(0, 10).map((tx, idx) => (
                  <tr key={idx} className="bg-white dark:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tx.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                      ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tx.type}
                    </td>
                  </tr>
                ))}
                {!(previewData.sampleTransactions || previewData.transactions || []).length && (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No transactions found in file
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {previewData.parsedCount > 10 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
              Showing 10 of {previewData.parsedCount} transactions
            </div>
          )}

          {/* Import Options */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Skip duplicate transactions
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {confirmMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Import {previewData.parsedCount} Transactions
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={confirmMutation.isPending}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Importing State */}
      {uploadState === 'importing' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Importing transactions...</p>
        </div>
      )}

      {/* Success State */}
      {uploadState === 'success' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Import Complete!
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {importResult?.imported || 0} transactions imported successfully.
            </p>
          </div>

          {/* Import Stats */}
          {importResult && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResult.imported}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Imported</div>
              </div>
              {importResult.duplicates > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importResult.duplicates}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">Duplicates</div>
                </div>
              )}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResult.classified || 0}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Classified</div>
              </div>
              {importResult.unclassified > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {importResult.unclassified}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Needs Review</div>
                </div>
              )}
            </div>
          )}

          {/* AI Classification Prompt */}
          {importResult?.unclassified > 0 && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-start gap-3">
                <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-purple-900 dark:text-purple-200">
                    {importResult.unclassified} transactions need classification
                  </h4>
                  <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
                    Use AI to automatically classify these transactions into IRS tax categories.
                    High-confidence results will be saved as rules for future imports.
                  </p>
                  <div className="mt-3">
                    <ClassifyWithAIButton
                      transactions={importResult.unclassifiedTransactions || []}
                      variant="primary"
                      size="md"
                      saveRules={true}
                      onComplete={(result) => {
                        // Refresh data after classification
                        queryClient.invalidateQueries({ queryKey: ['transactions'] });
                        queryClient.invalidateQueries({ queryKey: ['classification-rules'] });
                        
                        // Update import result to reflect classified transactions
                        const classified = result?.stats?.classified || 0;
                        setImportResult(prev => ({
                          ...prev,
                          classified: (prev.classified || 0) + classified,
                          unclassified: Math.max(0, prev.unclassified - classified),
                          unclassifiedTransactions: [], // Clear the list
                        }));
                        
                        let message = `AI classified ${classified} transactions`;
                        if (result?.stats?.rulesCreated > 0) {
                          message += ` and created ${result.stats.rulesCreated} rules`;
                        }
                        toast.success(message);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={handleViewTransactions}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              View Transactions
            </button>
            <button
              onClick={resetState}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Import Another
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-red-200 dark:border-red-800 text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Import Failed
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            There was an error processing your CSV file. Please check the format and try again.
          </p>
          <button
            onClick={resetState}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Supported Banks
        </h3>
        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
          <p>
            We auto-detect CSV formats from: Chase, Bank of America, Wells Fargo, 
            Capital One, Discover, US Bank, Citibank, PNC, and American Express.
          </p>
          <p className="mt-2">
            For other banks, select "Other / Custom Mapping" and we'll help you map the columns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;
