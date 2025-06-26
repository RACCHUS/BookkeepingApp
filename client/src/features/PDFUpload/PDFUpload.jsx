import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const PDFUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({file, tempId}) => {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('bankType', 'chase'); // Default to Chase for now
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
              uploadedAt: new Date().toISOString()
            }
          : f
      ));
      // Force refresh transactions list
      queryClient.invalidateQueries(['transactions']);
      queryClient.refetchQueries(['transactions']);
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
    mutationFn: (uploadId) => apiClient.pdf.process(uploadId, { autoSave: true }),
    onSuccess: async (data, uploadId) => {
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
            
            // Refresh transactions list
            queryClient.invalidateQueries(['transactions']);
            queryClient.refetchQueries(['transactions']);
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

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(file => {
      // Generate unique temp ID for tracking
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to uploaded files immediately with pending status
      setUploadedFiles(prev => [...prev, {
        tempId,
        name: file.name,
        size: file.size,
        status: 'uploading'
      }]);
      
      // Start upload
      uploadMutation.mutate({file, tempId});
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleProcess = (uploadId) => {
    console.log('🔍 Processing file with ID:', uploadId);
    setProcessingFiles(prev => new Set(prev).add(uploadId));
    processMutation.mutate(uploadId);
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

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-700/50'
        }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {isDragActive ? 'Drop files here' : 'Drag & drop PDF files here'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            or click to browse (PDF files only, max 10MB each)
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getStatusText(file)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
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
