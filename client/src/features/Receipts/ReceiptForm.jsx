import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ReceiptUpload from './ReceiptUpload';

/**
 * ReceiptForm - Form for creating/editing receipts
 * All fields are optional except the form handles vendor, amount, date as priority
 */
const ReceiptForm = ({ 
  initialData, 
  companies, 
  onSubmit, 
  onCancel, 
  isLoading,
  isEdit 
}) => {
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    date: '',
    notes: '',
    companyId: '',
    createTransaction: true  // Default: receipts create transactions
  });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        vendor: initialData.vendor || '',
        amount: initialData.amount !== null ? String(initialData.amount) : '',
        date: initialData.date || '',
        notes: initialData.notes || '',
        companyId: initialData.companyId || '',
        createTransaction: false // Never default to true when editing
      });
      if (initialData.fileUrl) {
        setPreviewUrl(initialData.fileUrl);
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    // Create preview URL for images
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    setPreviewUrl(initialData?.fileUrl || null);
  };

  const validate = () => {
    const newErrors = {};
    
    // If creating transaction, amount and date are required
    if (formData.createTransaction) {
      if (!formData.amount) {
        newErrors.amount = 'Amount is required when creating a transaction';
      }
      if (!formData.date) {
        newErrors.date = 'Date is required when creating a transaction';
      }
    }
    
    // Validate amount if provided
    if (formData.amount && isNaN(parseFloat(formData.amount))) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    // Validate date format if provided
    if (formData.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        newErrors.date = 'Please use YYYY-MM-DD format';
      }
    }
    
    // Validate vendor length
    if (formData.vendor && formData.vendor.length > 200) {
      newErrors.vendor = 'Vendor name must be less than 200 characters';
    }
    
    // Validate notes length
    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes must be less than 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // Prepare data - only include non-empty fields
    const submitData = {};
    if (formData.vendor.trim()) submitData.vendor = formData.vendor.trim();
    if (formData.amount) submitData.amount = parseFloat(formData.amount);
    if (formData.date) submitData.date = formData.date;
    if (formData.notes.trim()) submitData.notes = formData.notes.trim();
    if (formData.companyId) submitData.companyId = formData.companyId;
    
    // Include createTransaction flag (only for new receipts, not edits)
    if (!isEdit && formData.createTransaction) {
      submitData.createTransaction = true;
    }
    
    onSubmit(submitData, file);
  };

  // Calculate days until expiration for existing receipts
  const getDaysUntilExpiration = () => {
    if (!initialData?.expiresAt) return null;
    const expiresAt = new Date(initialData.expiresAt);
    const now = new Date();
    const days = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Retention Policy Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Receipt Retention Policy
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Receipt images are automatically deleted after 2 years. 
              Download important receipts before they expire.
            </p>
            {daysUntilExpiration !== null && daysUntilExpiration <= 30 && (
              <p className="text-red-600 dark:text-red-400 font-medium mt-2">
                ⚠️ This receipt expires in {daysUntilExpiration} days!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Priority Fields Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Receipt Details
        </h3>
        
        {/* Vendor */}
        <div>
          <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vendor / Store Name
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text"
            id="vendor"
            name="vendor"
            value={formData.vendor}
            onChange={handleChange}
            placeholder="e.g., Office Depot, Amazon, Staples"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.vendor ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.vendor && (
            <p className="text-sm text-red-500 mt-1">{errors.vendor}</p>
          )}
        </div>

        {/* Amount and Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Company */}
        {companies && companies.length > 0 && (
          <div>
            <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <select
              id="companyId"
              name="companyId"
              value={formData.companyId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isLoading}
            >
              <option value="">Select a company...</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Add any additional notes about this receipt..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none ${
              errors.notes ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes}</p>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {formData.notes.length}/1000
            </span>
          </div>
        </div>

        {/* Transaction Creation Option (only for new receipts) */}
        {!isEdit && (
          <div className={`rounded-lg p-4 ${formData.createTransaction ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.createTransaction}
                onChange={(e) => setFormData(prev => ({ ...prev, createTransaction: e.target.checked }))}
                className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 mt-0.5"
                disabled={isLoading}
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  Create transaction (include in reports)
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formData.createTransaction 
                    ? 'This expense will be added to your accounting and appear in all reports.'
                    : 'Documentation only - uncheck if this purchase is already on your bank statement.'
                  }
                </p>
                {formData.createTransaction && (!formData.amount || !formData.date) && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Amount and Date are required to create a transaction
                  </p>
                )}
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Receipt Image
        </h3>
        <ReceiptUpload
          onFileSelect={handleFileSelect}
          onRemove={handleFileRemove}
          currentFile={file}
          previewUrl={previewUrl}
          disabled={isLoading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {isEdit ? 'Update Receipt' : 'Create Receipt'}
        </button>
      </div>
    </form>
  );
};

ReceiptForm.propTypes = {
  initialData: PropTypes.object,
  companies: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  isEdit: PropTypes.bool
};

ReceiptForm.defaultProps = {
  initialData: null,
  companies: [],
  isLoading: false,
  isEdit: false
};

export default ReceiptForm;
