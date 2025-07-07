import React, { useState, useEffect } from 'react';
import StatementSelector from '../features/Statements/StatementSelector';
import CompanySelector from './CompanySelector.jsx';
import { apiClient } from '../services/api';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  IRS_CATEGORIES, 
  CATEGORY_GROUPS, 
  getCategoriesForDropdown, 
  getSubcategories, 
  isTaxDeductible,
  isBusinessCategory 
} from '@shared/constants/categories';
import { STATEMENT_SECTIONS, SECTION_OPTIONS, getSectionDisplayName } from '@shared/constants/sections';

const TransactionModal = ({ transaction, isOpen, onClose, onSave, mode = 'edit', refreshTrigger }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statements, setStatements] = useState([]);

  // Function to fetch statements
  const fetchStatements = () => {
    apiClient.pdf.getUploads()
      .then((res) => {
        // The response is { success: true, data: [...] } where data is the direct array
        const uploads = Array.isArray(res?.data) ? res.data : (res?.data?.uploads || []);
        if (Array.isArray(uploads)) {
          setStatements(uploads
            .map((u, idx) => {
              // Robust unique id fallback (should always be present after backend fix)
              const id = u.id || u.fileId || u._id || u.filename || u.originalname || `statement_${idx}`;
              if (!id) return null; // skip if no id at all
              let displayName = u.name && u.name !== 'undefined' ? u.name : '';
              const uploadedAt = u.uploadedAt || u.createdAt || u.timestamp;
              if (!displayName) {
                if (uploadedAt) {
                  displayName = `Statement (${new Date(uploadedAt).toLocaleDateString()}) [${String(id).slice(-6)}]`;
                } else {
                  displayName = `Statement [${id}]`;
                }
              } else {
                displayName = `${displayName} (${uploadedAt ? new Date(uploadedAt).toLocaleDateString() : ''}) [${String(id).slice(-6)}]`;
              }
              return {
                id: String(id),
                name: displayName,
                uploadedAt
              };
            })
            .filter(Boolean)
          );
        }
      })
      .catch(() => setStatements([]));
  };

  // Fetch available statements/PDFs for linking
  useEffect(() => {
    fetchStatements();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      date: (() => {
        const dateValue = transaction?.date;
        if (!dateValue) return new Date().toISOString().split('T')[0];
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
        if (typeof dateValue === 'string') {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          const match = dateValue.match(/\d{4}-\d{2}-\d{2}/);
          if (match) return match[0];
          return new Date().toISOString().split('T')[0];
        }
        if (typeof dateValue?.toDate === 'function') {
          const d = dateValue.toDate();
          if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return new Date().toISOString().split('T')[0];
        }
        if (dateValue instanceof Date) {
          if (!isNaN(dateValue.getTime())) return dateValue.toISOString().split('T')[0];
          return new Date().toISOString().split('T')[0];
        }
        if (typeof dateValue === 'number') {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return new Date().toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
      })(),
      amount: typeof transaction?.amount === 'number' && !isNaN(transaction.amount) ? Math.abs(transaction.amount) : '',
      description: typeof transaction?.description === 'string' ? transaction.description : '',
      category: typeof transaction?.category === 'string' ? transaction.category : '',
      subcategory: typeof transaction?.subcategory === 'string' ? transaction.subcategory : '',
      type: typeof transaction?.type === 'string' && ['income','expense'].includes(transaction.type) ? transaction.type : (typeof transaction?.amount === 'number' && transaction.amount > 0 ? 'income' : 'expense'),
      payee: typeof transaction?.payee === 'string' ? transaction.payee : '',
      notes: typeof transaction?.notes === 'string' ? transaction.notes : '',
      statementId: typeof transaction?.statementId === 'string' ? transaction.statementId : '',
      sectionCode: typeof transaction?.sectionCode === 'string' ? transaction.sectionCode : 'manual',
      companyId: typeof transaction?.companyId === 'string' ? transaction.companyId : '',
      companyName: typeof transaction?.companyName === 'string' ? transaction.companyName : ''
    }
  });

  // Reset form when transaction changes
  useEffect(() => {
    // Defensive: handle Firestore Timestamp, Date, or string for transaction.date
    function getDateString(dateValue) {
      // If null/undefined/empty, fallback
      if (!dateValue) return new Date().toISOString().split('T')[0];
      // If already a valid yyyy-mm-dd string
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // If string, try to parse
      if (typeof dateValue === 'string') {
        const d = new Date(dateValue);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        // Try to extract date from weird string
        const match = dateValue.match(/\d{4}-\d{2}-\d{2}/);
        if (match) return match[0];
        return new Date().toISOString().split('T')[0];
      }
      // Firestore Timestamp
      if (typeof dateValue?.toDate === 'function') {
        const d = dateValue.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
      }
      // JS Date
      if (dateValue instanceof Date) {
        if (!isNaN(dateValue.getTime())) return dateValue.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
      }
      // Fallback: try to parse as number (timestamp)
      if (typeof dateValue === 'number') {
        const d = new Date(dateValue);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
      }
      // Last resort: fallback
      return new Date().toISOString().split('T')[0];
    }
    if (transaction && mode === 'edit') {
      reset({
        date: (() => {
          const dateValue = transaction?.date;
          if (!dateValue) return new Date().toISOString().split('T')[0];
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
          if (typeof dateValue === 'string') {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            const match = dateValue.match(/\d{4}-\d{2}-\d{2}/);
            if (match) return match[0];
            return new Date().toISOString().split('T')[0];
          }
          if (typeof dateValue?.toDate === 'function') {
            const d = dateValue.toDate();
            if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return new Date().toISOString().split('T')[0];
          }
          if (dateValue instanceof Date) {
            if (!isNaN(dateValue.getTime())) return dateValue.toISOString().split('T')[0];
            return new Date().toISOString().split('T')[0];
          }
          if (typeof dateValue === 'number') {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return new Date().toISOString().split('T')[0];
          }
          return new Date().toISOString().split('T')[0];
        })(),
        amount: typeof transaction?.amount === 'number' && !isNaN(transaction.amount) ? Math.abs(transaction.amount) : '',
        description: typeof transaction?.description === 'string' ? transaction.description : '',
        category: typeof transaction?.category === 'string' ? transaction.category : '',
        subcategory: typeof transaction?.subcategory === 'string' ? transaction.subcategory : '',
        type: typeof transaction?.type === 'string' && ['income','expense'].includes(transaction.type) ? transaction.type : (typeof transaction?.amount === 'number' && transaction.amount > 0 ? 'income' : 'expense'),
        payee: typeof transaction?.payee === 'string' ? transaction.payee : '',
        notes: typeof transaction?.notes === 'string' ? transaction.notes : '',
        statementId: typeof transaction?.statementId === 'string' ? transaction.statementId : '',
        sectionCode: typeof transaction?.sectionCode === 'string' ? transaction.sectionCode : 'manual',
        companyId: typeof transaction?.companyId === 'string' ? transaction.companyId : '',
        companyName: typeof transaction?.companyName === 'string' ? transaction.companyName : ''
      });
    } else if (mode === 'create') {
      reset({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category: '',
        subcategory: '',
        type: 'expense',
        payee: '',
        notes: '',
        statementId: '',
        sectionCode: 'manual',
        companyId: '',
        companyName: ''
      });
    }
  }, [transaction, mode, reset]);

  // Watch for category changes and clear subcategory
  const watchedCategory = watch('category');
  useEffect(() => {
    // Clear subcategory when category changes
    setValue('subcategory', '');
  }, [watchedCategory, setValue]);

  // Get available subcategories for the selected category
  const availableSubcategories = watchedCategory ? getSubcategories(watchedCategory) : [];

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Convert amount to number and apply sign based on type
      const amount = parseFloat(data.amount);
      const finalAmount = data.type === 'income' ? Math.abs(amount) : -Math.abs(amount);

      const transactionData = {
        ...data,
        amount: finalAmount,
        date: data.date, // Keep as string for API
        statementId: data.statementId || '',
        sectionCode: data.sectionCode || 'manual',
        section: data.sectionCode ? getSectionDisplayName(data.sectionCode) : 'Manual Entry',
        companyId: data.companyId || '',
        companyName: data.companyName || ''
      };

      await onSave(transactionData);
      
      if (mode === 'create') {
        toast.success('Transaction created successfully!');
        reset(); // Clear form for next entry
      } else {
        toast.success('Transaction updated successfully!');
      }
      
      if (mode === 'edit') {
        onClose();
      }
    } catch (error) {
      console.error('Transaction save error:', error);
      toast.error(error.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onClose();
  };


  // Defensive: If in edit mode and required fields are missing, show error instead of blank modal
  if (isOpen && mode === 'edit' && (!transaction || !transaction.id)) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Error</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="py-6 text-center">
              <p className="text-red-600 dark:text-red-400 text-lg font-semibold">Cannot edit this transaction: missing required fields.</p>
              <p className="text-gray-500 dark:text-gray-300 mt-2">This transaction is missing a valid ID or other required data. Please try refreshing or contact support if this persists.</p>
              <button onClick={onClose} className="mt-6 btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!isOpen) return null;

  const modalTitle = mode === 'create' ? 'Add New Transaction' : 'Edit Transaction';
  const submitText = mode === 'create' ? 'Create Transaction' : 'Update Transaction';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {modalTitle}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Date and Type Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  className="form-input"
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>
                )}
              </div>
              
              <div>
                <label className="form-label">Type</label>
                <select {...register('type')} className="form-input">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            {/* Section Selection */}
            <div>
              <label className="form-label">
                Statement Section
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  (For manual transactions, choose the most appropriate section)
                </span>
              </label>
              <select 
                {...register('sectionCode')} 
                className="form-input"
              >
                {SECTION_OPTIONS.map((section) => (
                  <option key={section.code} value={section.code}>
                    {section.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This helps categorize your transaction within the statement structure.
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="form-label">
                Amount ({watch('type') === 'income' ? 'Income' : 'Expense'})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amount', { 
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  className="form-input pl-7"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="form-label">Description</label>
              <input
                type="text"
                {...register('description', { required: 'Description is required' })}
                className="form-input"
                placeholder="Transaction description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="form-label">Company</label>
              <CompanySelector
                value={watch('companyId')}
                onChange={(companyId, company) => {
                  setValue('companyId', companyId);
                  setValue('companyName', company?.name || '');
                }}
                className="w-full"
                placeholder="Select a company..."
                allowCreate={false}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Assign this transaction to a specific business or company.
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="form-label">Category</label>
              <select 
                {...register('category', { required: 'Category is required' })}
                className="form-input category-select"
              >
                <option value="">Select a category</option>
                
                {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
                  <optgroup 
                    key={groupName} 
                    label={groupName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  >
                    {categories.map((categoryName) => (
                      <option key={categoryName} value={categoryName}>
                        {categoryName}
                        {!isBusinessCategory(categoryName) && ' (Personal)'}
                        {!isTaxDeductible(categoryName) && isBusinessCategory(categoryName) && ' (Non-deductible)'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>
              )}
            </div>

            {/* Subcategory */}
            {availableSubcategories.length > 0 && (
              <div>
                <label className="form-label">
                  Subcategory 
                  <span className="text-gray-500 text-sm">(Optional)</span>
                </label>
                <select 
                  {...register('subcategory')}
                  className="form-input category-select"
                >
                  <option value="">Select a subcategory</option>
                  {availableSubcategories.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payee */}
            <div>
              <label className="form-label">Payee/Source</label>
              <input
                type="text"
                {...register('payee')}
                className="form-input"
                placeholder="Who did you pay or who paid you?"
              />
            </div>


            {/* Statement/PDF Link */}
            <StatementSelector
              value={watch('statementId')}
              onChange={val => setValue('statementId', val, { shouldDirty: true })}
              statements={statements}
              onRefresh={fetchStatements}
            />

            {/* Notes */}
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                {...register('notes')}
                rows={2}
                className="form-input"
                placeholder="Additional notes about this transaction"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : submitText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
