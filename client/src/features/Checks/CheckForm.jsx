import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  XMarkIcon,
  BanknotesIcon,
  PhotoIcon,
  TrashIcon,
  ArrowUpTrayIcon as UploadIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { IRS_CATEGORIES } from '../../../../shared/constants/categories';

/**
 * CheckForm - Create or edit a single check
 * Supports income (received) or expense (written) checks
 * Optional image/document upload
 */
const CheckForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  check = null, 
  isLoading,
  companies = [],
  onUploadImage,
  onDeleteImage
}) => {
  const isEditing = !!check;

  const [formData, setFormData] = useState({
    payee: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    checkNumber: '',
    category: '',
    companyId: '',
    memo: '',
    status: 'pending',
    createTransaction: true,
    bankName: '',
    routingNumber: '',
    accountNumber: ''
  });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  // Reset form when check changes
  useEffect(() => {
    if (isOpen) {
      if (check) {
        setFormData({
          payee: check.payee || '',
          amount: check.amount ? Math.abs(check.amount).toString() : '',
          date: check.date || new Date().toISOString().split('T')[0],
          type: check.type || 'expense',
          checkNumber: check.checkNumber || '',
          category: check.category || '',
          companyId: check.companyId || '',
          memo: check.memo || '',
          status: check.status || 'pending',
          createTransaction: check.createTransaction !== false,
          bankName: check.bankName || '',
          routingNumber: check.routingNumber || '',
          accountNumber: check.accountNumber || ''
        });
        setPreview(check.fileUrl || null);
      } else {
        setFormData({
          payee: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          type: 'expense',
          checkNumber: '',
          category: '',
          companyId: '',
          memo: '',
          status: 'pending',
          createTransaction: true,
          bankName: '',
          routingNumber: '',
          accountNumber: ''
        });
        setPreview(null);
      }
      setFile(null);
      setErrors({});
    }
  }, [isOpen, check]);

  // Handle file selection
  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(droppedFile);
    }
  }, []);

  // Handle form input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.payee?.trim()) newErrors.payee = 'Payee is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.type) newErrors.type = 'Type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const checkData = {
      ...formData,
      amount: parseFloat(formData.amount), // Always positive
      checkNumber: formData.checkNumber || null,
      category: formData.category || null,
      companyId: formData.companyId || null
    };

    await onSubmit(checkData, file);
  };

  // Handle remove image (for existing check)
  const handleRemoveImage = async () => {
    if (isEditing && check.hasImage && onDeleteImage) {
      await onDeleteImage(check.id);
      setPreview(null);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  // Category options
  const categoryOptions = Object.entries(IRS_CATEGORIES).map(([key, value]) => ({
    value: key,
    label: value
  }));

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'cleared', label: 'Cleared' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'voided', label: 'Voided' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Check' : 'Add Check'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Type *
              </label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.type === 'expense' 
                    ? 'border-red-500 bg-red-50 ring-1 ring-red-500' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="sr-only"
                  />
                  <ArrowUpTrayIcon className={`w-5 h-5 ${formData.type === 'expense' ? 'text-red-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${formData.type === 'expense' ? 'text-red-700' : 'text-gray-700'}`}>
                      Written (Expense)
                    </p>
                    <p className="text-xs text-gray-500">Check you wrote to pay someone</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.type === 'income' 
                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="sr-only"
                  />
                  <ArrowDownTrayIcon className={`w-5 h-5 ${formData.type === 'income' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${formData.type === 'income' ? 'text-green-700' : 'text-gray-700'}`}>
                      Received (Income)
                    </p>
                    <p className="text-xs text-gray-500">Check you received from someone</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Payee and Amount Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payee *
                </label>
                <input
                  type="text"
                  value={formData.payee}
                  onChange={(e) => handleChange('payee', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 ${
                    errors.payee ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={formData.type === 'expense' ? 'Who you paid' : 'Who paid you'}
                />
                {errors.payee && <p className="text-xs text-red-500 mt-1">{errors.payee}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              </div>
            </div>

            {/* Check Number and Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Number
                </label>
                <input
                  type="text"
                  value={formData.checkNumber}
                  onChange={(e) => handleChange('checkNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
            </div>

            {/* Category and Company Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => handleChange('companyId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Memo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memo / Notes
              </label>
              <textarea
                value={formData.memo}
                onChange={(e) => handleChange('memo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Optional memo or notes"
              />
            </div>

            {/* Create Transaction Toggle */}
            {!isEditing && (
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createTransaction}
                  onChange={(e) => handleChange('createTransaction', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Create transaction automatically</p>
                  <p className="text-xs text-gray-500">Creates a matching transaction record for this check</p>
                </div>
              </label>
            )}

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Image (Optional)
              </label>
              {preview ? (
                <div className="relative">
                  <img 
                    src={preview} 
                    alt="Check preview" 
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('check-image-input').click()}
                >
                  <PhotoIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, or PDF up to 10MB
                  </p>
                  <input
                    id="check-image-input"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : (isEditing ? 'Update Check' : 'Create Check')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

CheckForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  check: PropTypes.object,
  isLoading: PropTypes.bool,
  companies: PropTypes.array,
  onUploadImage: PropTypes.func,
  onDeleteImage: PropTypes.func
};

CheckForm.defaultProps = {
  check: null,
  isLoading: false,
  companies: [],
  onUploadImage: null,
  onDeleteImage: null
};

export default CheckForm;
