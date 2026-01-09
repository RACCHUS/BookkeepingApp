import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import { LoadingSpinner } from '../../components/ui';
import { CompanySelector } from '../../components/common';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const PDFUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [createTransactions, setCreateTransactions] = useState(true); // Option to auto-create transactions
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch companies to check if any exist
  const { data: companiesResponse } = useQuery({
    queryKey: ['companies'],
    queryFn: apiClient.companies.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const companies = companiesResponse?.data || [];
  const hasCompanies = companies.length > 0;

  // Auto-select default company when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && (selectedCompany === null || selectedCompany === undefined)) {
      const defaultCompany = companies.find(company => company.isDefault);
      if (defaultCompany) {
        setSelectedCompany(defaultCompany.id);
        setSelectedCompanyData(defaultCompany);
      } else if (companies.length === 1) {
        // If only one company exists, select it automatically
        setSelectedCompany(companies[0].id);
        setSelectedCompanyData(companies[0]);
      }
    }
  }, [companies, selectedCompany]);

  // Fix for cases where we have company data but not company ID
  useEffect(() => {
    if (selectedCompanyData && (selectedCompany === null || selectedCompany === undefined) && companies.length > 0) {
      const matchingCompany = companies.find(company => 
        company.name === selectedCompanyData.name || 
        company.id === selectedCompanyData.id
      );
      if (matchingCompany) {
        setSelectedCompany(matchingCompany.id);
      }
    }
  }, [selectedCompanyData, selectedCompany, companies]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({file, tempId}) => {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('bankType', 'chase'); // Default to Chase for now
      formData.append('createTransactions', createTransactions.toString());
      // Only append companyId if it is a valid non-empty string
      if (selectedCompany && typeof selectedCompany === 'string' && selectedCompany.trim().length > 0) {
        formData.append('companyId', selectedCompany);
        if (selectedCompanyData?.name) {
          formData.append('companyName', selectedCompanyData.name);
        }
      }
      return apiClient.pdf.upload(formData);
    },
    onSuccess: (data, {file, tempId}) => {
      console.log('🔍 Upload success response:', data);
      console.log('🔍 Response type:', typeof data);
      console.log('🔍 Response keys:', Object.keys(data));
      
      // Let's check all possible locations for the file ID
      console.log('🔍 data.fileId:', data.fileId);
      console.log('🔍 data.data:', data.data);
      console.log('🔍 data.data.fileId:', data.data?.fileId);
      console.log('🔍 data.uploadId:', data.uploadId);
      console.log('🔍 data.id:', data.id);
      
      // The backend response now returns: { success: true, data: { fileId: "..." } }
      const fileId = data.data?.fileId;
      console.log('🔍 Final FileId from response:', fileId);
      console.log('🔍 Full response structure:', JSON.stringify(data, null, 2));
      
      if (!fileId) {
        console.error('❌ No fileId found in response:', data);
        toast.error('Upload succeeded but no file ID received');
        return;
      }
      
      toast.success(`${file.name} uploaded successfully!`);
      setUploadedFiles(prev => prev.map(f => 
        f.tempId === tempId
          ? { 
              ...f, 
              id: fileId,
              status: 'uploaded',
              uploadedAt: new Date().toISOString(),
              companyId: data.data?.companyId || selectedCompany,
              companyName: data.data?.companyName || selectedCompanyData?.name
            }
          : f
      ));
      // Force refresh all transaction-related queries
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['recent-transactions']);
      queryClient.invalidateQueries(['transaction-summary']);
    },
    onError: (error, {file, tempId}) => {
      toast.error(`Failed to upload ${file.name}: ${error.response?.data?.message || error.message}`);
      setUploadedFiles(prev => prev.map(f => 
        f.tempId === tempId
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    }
  });

  // Process PDF mutation
  const processMutation = useMutation({
    mutationFn: ({uploadId, shouldCreateTransactions}) => apiClient.pdf.process(uploadId, { 
      autoSave: shouldCreateTransactions !== false,
      createTransactions: shouldCreateTransactions !== false
    }),
    onSuccess: async (data, {uploadId, shouldCreateTransactions}) => {
      console.log('🔍 Process success response:', data);
      
      // Backend returns: { success: true, data: { processId: '...', status: 'processing' } }
      const result = data.data || {};
      const processId = result.processId;
      
      console.log('🔍 Process ID:', processId);
      console.log('🔍 Processing status:', result.status);
      
      if (processId) {
        // Start polling for results
        toast.loading('Processing PDF... This may take 30-60 seconds.', { id: `processing-${uploadId}` });
        
        // Update file status to show processing
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadId 
            ? { 
                ...f, 
                status: 'processing', 
                processId,
                startTime: new Date().toISOString()
              }
            : f
        ));
        
        // Start polling for completion
        pollProcessingStatus(processId, uploadId);
      } else {
        toast.error('PDF processing started but no process ID returned.');
      }
    },
    onError: (error, uploadId) => {
      toast.error(`Failed to process PDF: ${error.response?.data?.message || error.message}`);
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadId 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadId);
        return newSet;
      });
    }
  });

  // Mutation for updating upload company information
  const updateUploadCompanyMutation = useMutation({
    mutationFn: ({ uploadId, companyId, companyName }) => 
      apiClient.pdf.updateUploadCompany(uploadId, { companyId, companyName }),
    onSuccess: (response, { uploadId, companyId, companyName }) => {
      // Update the local file state
      setUploadedFiles(prev => prev.map(file => 
        file.id === uploadId 
          ? { ...file, companyId, companyName: companyName }
          : file
      ));
    },
    onError: (error) => {
      console.error('Failed to update upload company:', error);
      toast.error('Failed to update upload company');
    }
  });

  // Function to poll processing status
  const pollProcessingStatus = async (processId, uploadId) => {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        console.log(`🔄 Polling attempt ${attempts} for process ${processId}`);
        
        const statusData = await apiClient.pdf.getStatus(processId);
        console.log('🔄 Status response:', statusData);
        
        const status = statusData.data?.status || statusData.status;
        const result = statusData.data?.result || statusData.result;
        
        if (status === 'completed') {
          clearInterval(pollInterval);
          
          const transactionCount = result?.transactionCount || 0;
          const savedCount = result?.savedTransactionIds?.length || 0;
          
          console.log('✅ Processing completed:', { transactionCount, savedCount });
          
          // Dismiss loading toast and show success
          toast.dismiss(`processing-${uploadId}`);
          
          if (savedCount > 0) {
            toast.success(`Successfully processed and saved ${savedCount} transactions!`);
            
            // Update file status
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadId 
                ? { 
                    ...f, 
                    status: 'completed', 
                    transactionsCount: transactionCount,
                    savedCount: savedCount,
                    result: result
                  }
                : f
            ));
            
            // Refresh all transaction-related queries
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['recent-transactions']);
            queryClient.invalidateQueries(['transaction-summary']);
          } else {
            toast.error('PDF processed but no transactions were saved.');
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadId 
                ? { ...f, status: 'no-transactions', result: result }
                : f
            ));
          }
          
        } else if (status === 'error') {
          clearInterval(pollInterval);
          toast.dismiss(`processing-${uploadId}`);
          toast.error(`Processing failed: ${result?.message || 'Unknown error'}`);
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadId 
              ? { ...f, status: 'error', error: result?.message || 'Processing failed' }
              : f
          ));
        } else if (attempts >= maxAttempts) {
          // Timeout
          clearInterval(pollInterval);
          toast.dismiss(`processing-${uploadId}`);
          toast.error('Processing timeout. Please try again.');
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadId 
              ? { ...f, status: 'timeout', error: 'Processing timeout' }
              : f
          ));
        }
        // Continue polling if status is still 'processing'
        
      } catch (error) {
        console.error('Status polling error:', error);
        attempts++; // Count as attempt
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          toast.dismiss(`processing-${uploadId}`);
          toast.error('Failed to check processing status. Please refresh and try again.');
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleCompanyChange = (companyId, companyData) => {
    // Handle empty string IDs (treat as valid)
    if ((companyId || companyId === '') && companyData) {
      setSelectedCompany(companyId);
      setSelectedCompanyData(companyData);
      
      // Update company for all uploaded files that are not yet processed
      uploadedFiles.forEach(file => {
        if (file.id && file.status === 'uploaded') {
          updateUploadCompanyMutation.mutate({
            uploadId: file.id,
            companyId: companyId,
            companyName: companyData.name
          });
        }
      });
      
    } else if (companyData && (companyData.id || companyData.id === '')) {
      // Fallback: use ID from company data if companyId is missing
      setSelectedCompany(companyData.id);
      setSelectedCompanyData(companyData);
      
      // Update company for all uploaded files that are not yet processed
      uploadedFiles.forEach(file => {
        if (file.id && file.status === 'uploaded') {
          updateUploadCompanyMutation.mutate({
            uploadId: file.id,
            companyId: companyData.id,
            companyName: companyData.name
          });
        }
      });
      
    } else {
      console.warn('Invalid company selection:', { companyId, companyData });
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    // Check if company is selected (handle empty string IDs)
    if (selectedCompany === null || selectedCompany === undefined) {
      toast.error('Please select a company before uploading files');
      return;
    }

    acceptedFiles.forEach(file => {
      // Generate unique temp ID for tracking
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to uploaded files immediately with pending status
      setUploadedFiles(prev => [...prev, {
        tempId,
        name: file.name,
        size: file.size,
        status: 'uploading',
        companyId: selectedCompany,
        companyName: selectedCompanyData?.name
      }]);
      
      // Start upload
      uploadMutation.mutate({file, tempId});
    });
  }, [uploadMutation, selectedCompany, selectedCompanyData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleProcess = (uploadId, shouldCreateTransactions = createTransactions) => {
    console.log('🔍 Processing file with ID:', uploadId, 'createTransactions:', shouldCreateTransactions);
    setProcessingFiles(prev => new Set(prev).add(uploadId));
    processMutation.mutate({ uploadId, shouldCreateTransactions });
  };

  const handleRemove = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <LoadingSpinner size="sm" />;
      case 'uploaded':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'processed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (file) => {
    switch (file.status) {
      case 'uploading':
        return 'Uploading...';
      case 'uploaded':
        return 'Ready to process';
      case 'processed':
        return `Processed ${file.transactionsCount || 0} transactions`;
      case 'error':
        return `Error: ${file.error}`;
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDF Upload & Processing</h1>
        <p className="text-gray-600 dark:text-gray-300">Upload bank statements to automatically import transactions</p>
      </div>

      {/* Company Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <BuildingOfficeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Select Company</h2>
        </div>
        <div className="max-w-md">
          <CompanySelector
            value={selectedCompany}
            onChange={handleCompanyChange}
            placeholder="Choose which company these statements belong to..."
            allowCreate={true}
            onCreateNew={(searchTerm) => {
              toast('Redirecting to company management...');
              navigate('/companies');
            }}
            required={true}
            error={!selectedCompany && uploadedFiles.length > 0 ? 'Company selection is required' : null}
          />
        </div>
        
        {/* Alternative Create Company Button - Only show when no companies exist */}
        {!hasCompanies && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Don't have any companies yet?
            </p>
            <button
              type="button"
              onClick={() => {
                toast('Navigating to company creation...');
                navigate('/companies');
              }}
              className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-sm font-medium text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Company
            </button>
          </div>
        )}
        
        {selectedCompanyData && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Selected: <span className="font-medium text-gray-900 dark:text-white">{selectedCompanyData.name}</span>
            {selectedCompanyData.isDefault && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                Default
              </span>
            )}
          </div>
        )}
      </div>

      {/* Upload Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload Options</h2>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={createTransactions}
            onChange={(e) => setCreateTransactions(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Automatically create transactions from PDF
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {createTransactions 
                ? 'Transactions will be extracted and created when the PDF is processed.'
                : 'PDF will be stored but no transactions will be created. You can link existing transactions manually.'}
            </p>
          </div>
        </label>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          (selectedCompany === null || selectedCompany === undefined)
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-50'
            : isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 cursor-pointer'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-700/50 cursor-pointer'
        }`}
      >
        <input {...getInputProps()} disabled={selectedCompany === null || selectedCompany === undefined} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {(selectedCompany === null || selectedCompany === undefined)
              ? 'Select a company above to start uploading'
              : isDragActive 
              ? 'Drop files here' 
              : 'Drag & drop PDF files here'
            }
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {(selectedCompany === null || selectedCompany === undefined)
              ? 'Choose which company these bank statements belong to first'
              : 'or click to browse (PDF files only, max 10MB each)'
            }
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {uploadedFiles.map((file, index) => (
              <li key={file.tempId || file.id || index}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getStatusIcon(file.status)}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{getStatusText(file)} • {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          {file.companyName && (
                            <>
                              <span>•</span>
                              <div className="flex items-center">
                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                <span className="font-medium">{file.companyName}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status === 'uploaded' && (
                        <button
                          onClick={() => handleProcess(file.id)}
                          disabled={processingFiles.has(file.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                          {processingFiles.has(file.id) ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Processing...
                            </>
                          ) : (
                            'Process'
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(index)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Instructions</h3>
        <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
          <ol className="list-decimal list-inside space-y-1">
            <li>Select the company that these bank statements belong to</li>
            <li>Upload your bank statement PDF files (currently supports Chase Bank format)</li>
            <li>Wait for upload to complete, then click "Process" for each file</li>
            <li>Review the imported transactions in the Transactions section</li>
            <li>Edit categories and classifications as needed</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;
