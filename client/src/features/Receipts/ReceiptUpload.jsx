import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';

/**
 * ReceiptUpload - Drag and drop file upload component
 * Supports images (JPG, PNG, GIF) and PDFs up to 5MB
 */
const ReceiptUpload = ({ onFileSelect, onRemove, currentFile, previewUrl, disabled, compact }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload JPG, PNG, GIF, or PDF.';
    }
    if (file.size > MAX_SIZE) {
      return 'File is too large. Maximum size is 5MB.';
    }
    return null;
  };

  const handleFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove();
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Determine if we have a file to show
  const hasFile = currentFile || previewUrl;
  const isPDF = currentFile?.type === 'application/pdf' || previewUrl?.endsWith('.pdf');

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,application/pdf"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        {hasFile ? (
          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {isPDF ? (
              <DocumentIcon className="w-8 h-8 text-red-500" />
            ) : (
              <img 
                src={previewUrl || URL.createObjectURL(currentFile)} 
                alt="Receipt preview" 
                className="w-8 h-8 object-cover rounded"
              />
            )}
            <span className="text-sm truncate max-w-[100px]">
              {currentFile?.name || 'Receipt'}
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              disabled={disabled}
            >
              <XMarkIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-dashed border-blue-300 dark:border-blue-600 disabled:opacity-50"
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            Add Image
          </button>
        )}
        
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,application/pdf"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${hasFile ? 'bg-gray-50 dark:bg-gray-800' : ''}
        `}
      >
        {hasFile ? (
          <div className="flex flex-col items-center gap-3">
            {isPDF ? (
              <div className="flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <DocumentIcon className="w-12 h-12 text-red-500" />
              </div>
            ) : (
              <img 
                src={previewUrl || URL.createObjectURL(currentFile)} 
                alt="Receipt preview" 
                className="max-h-40 rounded-lg shadow-sm"
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                {currentFile?.name || 'Uploaded receipt'}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                disabled={disabled}
              >
                <XMarkIcon className="w-5 h-5 text-gray-500 hover:text-red-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full">
              <CloudArrowUpIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop image here or click to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                JPG, PNG, GIF, or PDF up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <XMarkIcon className="w-4 h-4" />
          {error}
        </p>
      )}
      
      {/* Optional label */}
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        Image upload is optional
      </p>
    </div>
  );
};

ReceiptUpload.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  currentFile: PropTypes.object,
  previewUrl: PropTypes.string,
  disabled: PropTypes.bool,
  compact: PropTypes.bool
};

ReceiptUpload.defaultProps = {
  currentFile: null,
  previewUrl: null,
  disabled: false,
  compact: false
};

export default ReceiptUpload;
