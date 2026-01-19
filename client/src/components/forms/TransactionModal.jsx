import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import StatementSelector from '../../features/Statements/StatementSelector';
import { CompanySelector } from '../common';
import api from '../../services/api';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  IRS_CATEGORIES, 
  CATEGORY_GROUPS, 
  NEUTRAL_CATEGORIES,
  getCategoriesForDropdown, 
  getSubcategories, 
  isTaxDeductible,
  isBusinessCategory,
  PAYMENT_METHODS
} from '@shared/constants/categories';

// React Query cache settings to prevent excessive Firestore reads
const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Cache persists for 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

const TransactionModal = ({ transaction, isOpen, onClose, onSave, mode = 'edit', refreshTrigger }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch PDF statements with React Query caching
  const { data: statements = [], refetch: refetchStatements } = useQuery({
    queryKey: ['pdf-statements-for-modal', refreshTrigger],
    queryFn: async () => {
      const res = await api.pdf.getUploads();
      const uploads = Array.isArray(res?.data) ? res.data : (res?.data?.uploads || []);
      if (!Array.isArray(uploads)) return [];
      
      return uploads
        .map((u, idx) => {
          const id = u.id || u.fileId || u._id || u.filename || u.originalname || `statement_${idx}`;
          if (!id) return null;
          let displayName = u.name && u.name !== 'undefined' ? u.name : '';
          const uploadedAt = u.uploadedAt || u.createdAt || u.timestamp;
          if (!displayName) {
            if (uploadedAt) {
              displayName = `Statement (${new Date(uploadedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}) [${String(id).slice(-6)}]`;
            } else {
              displayName = `Statement [${id}]`;
            }
          } else {
            displayName = `${displayName} (${uploadedAt ? new Date(uploadedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : ''}) [${String(id).slice(-6)}]`;
          }
          return {
            id: String(id),
            name: displayName,
            uploadedAt
          };
        })
        .filter(Boolean);
    },
    ...QUERY_CONFIG,
  });

  // Fetch CSV imports with React Query caching
  const { data: csvImports = [], refetch: refetchCsvImports } = useQuery({
    queryKey: ['csv-imports-for-modal', refreshTrigger],
    queryFn: async () => {
      const res = await api.csv.getImports({ status: 'completed' });
      const imports = Array.isArray(res?.data) ? res.data : [];
      
      return imports
        .map((c, idx) => {
          const id = c.id || c.import_id || `csv_${idx}`;
          if (!id) return null;
          const fileName = c.file_name || c.fileName || '';
          const bankName = c.bank_name || c.bankName || '';
          const uploadedAt = c.created_at || c.createdAt;
          let displayName = fileName || bankName;
          if (!displayName) {
            displayName = uploadedAt ? `CSV Import (${new Date(uploadedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })})` : 'CSV Import';
          } else {
            displayName = `${displayName} (${uploadedAt ? new Date(uploadedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : ''})`;
          }
          return {
            id: String(id),
            name: displayName,
            uploadedAt
          };
        })
        .filter(Boolean);
    },
    ...QUERY_CONFIG,
  });

  // Fetch income sources with React Query caching
  const { data: incomeSources = [] } = useQuery({
    queryKey: ['income-sources-for-modal'],
    queryFn: async () => {
      const res = await api.incomeSources.getAll();
      // Handle both formats: res.sources (legacy) and res.data.incomeSources (supabase)
      return res.sources || res.data?.incomeSources || [];
    },
    ...QUERY_CONFIG,
  });

  // Fetch payees (employees/vendors/contractors) with React Query caching
  const { data: payeesData } = useQuery({
    queryKey: ['payees-for-modal'],
    queryFn: async () => {
      const res = await api.payees?.getAll?.() || { data: { payees: [] } };
      return res.data?.payees || res.payees || [];
    },
    ...QUERY_CONFIG,
  });
  const payees = payeesData || [];

  // Fetch vendors (payees with type 'vendor') for vendor dropdown
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-for-modal'],
    queryFn: async () => {
      const res = await api.payees?.getVendors?.() || { data: { vendors: [] } };
      return res.data?.vendors || res.vendors || [];
    },
    ...QUERY_CONFIG,
  });
  const vendors = vendorsData || [];

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
      payeeId: typeof transaction?.payeeId === 'string' ? transaction.payeeId : '',
      payee: typeof transaction?.payee === 'string' ? transaction.payee : '',
      vendorId: typeof transaction?.vendorId === 'string' ? transaction.vendorId : '',
      vendorName: typeof transaction?.vendorName === 'string' ? transaction.vendorName : '',
      isContractorPayment: !!transaction?.isContractorPayment || !!transaction?.is1099Payment,
      isReconciled: !!transaction?.isReconciled,
      isReviewed: !!transaction?.isReviewed,
      paymentMethod: typeof transaction?.paymentMethod === 'string' ? transaction.paymentMethod : '',
      checkNumber: typeof transaction?.checkNumber === 'string' ? transaction.checkNumber : '',
      tags: Array.isArray(transaction?.tags) ? transaction.tags.join(', ') : '',
      notes: typeof transaction?.notes === 'string' ? transaction.notes : '',
      statementId: typeof transaction?.statementId === 'string' ? transaction.statementId : '',
      csvImportId: typeof transaction?.csvImportId === 'string' ? transaction.csvImportId : '',
      companyId: typeof transaction?.companyId === 'string' ? transaction.companyId : '',
      companyName: typeof transaction?.companyName === 'string' ? transaction.companyName : '',
      incomeSourceId: typeof transaction?.incomeSourceId === 'string' ? transaction.incomeSourceId : '',
      incomeSourceName: typeof transaction?.incomeSourceName === 'string' ? transaction.incomeSourceName : ''
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
        type: typeof transaction?.type === 'string' && ['income','expense','transfer'].includes(transaction.type) ? transaction.type : (typeof transaction?.amount === 'number' && transaction.amount > 0 ? 'income' : 'expense'),
        payeeId: typeof transaction?.payeeId === 'string' ? transaction.payeeId : '',
        payee: typeof transaction?.payee === 'string' ? transaction.payee : '',
        vendorId: typeof transaction?.vendorId === 'string' ? transaction.vendorId : '',
        vendorName: typeof transaction?.vendorName === 'string' ? transaction.vendorName : '',
        isContractorPayment: !!transaction?.isContractorPayment || !!transaction?.is1099Payment,
        isReconciled: !!transaction?.isReconciled,
        isReviewed: !!transaction?.isReviewed,
        paymentMethod: typeof transaction?.paymentMethod === 'string' ? transaction.paymentMethod : '',
        checkNumber: typeof transaction?.checkNumber === 'string' ? transaction.checkNumber : '',
        tags: Array.isArray(transaction?.tags) ? transaction.tags.join(', ') : '',
        notes: typeof transaction?.notes === 'string' ? transaction.notes : '',
        statementId: typeof transaction?.statementId === 'string' ? transaction.statementId : '',
        csvImportId: typeof transaction?.csvImportId === 'string' ? transaction.csvImportId : '',
        companyId: typeof transaction?.companyId === 'string' ? transaction.companyId : '',
        companyName: typeof transaction?.companyName === 'string' ? transaction.companyName : '',
        incomeSourceId: typeof transaction?.incomeSourceId === 'string' ? transaction.incomeSourceId : '',
        incomeSourceName: typeof transaction?.incomeSourceName === 'string' ? transaction.incomeSourceName : ''
      });
    } else if (mode === 'create') {
      reset({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category: '',
        subcategory: '',
        type: 'expense',
        payeeId: '',
        payee: '',
        vendorId: '',
        vendorName: '',
        isContractorPayment: false,
        isReconciled: false,
        isReviewed: false,
        paymentMethod: '',
        checkNumber: '',
        tags: '',
        notes: '',
        statementId: '',
        csvImportId: '',
        companyId: '',
        companyName: '',
        incomeSourceId: '',
        incomeSourceName: ''
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
      // Transfer amounts stay positive (neutral), income positive, expense negative
      let finalAmount;
      if (data.type === 'transfer') {
        finalAmount = Math.abs(amount); // Transfers are neutral, store as positive
      } else if (data.type === 'income') {
        finalAmount = Math.abs(amount);
      } else {
        finalAmount = -Math.abs(amount);
      }

      // Parse tags from comma-separated string
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const transactionData = {
        ...data,
        amount: finalAmount,
        date: data.date, // Keep as string for API
        statementId: data.statementId || '',
        csvImportId: data.csvImportId || '',
        companyId: data.companyId || '',
        companyName: data.companyName || '',
        incomeSourceId: data.type === 'income' ? (data.incomeSourceId || '') : '',
        incomeSourceName: data.type === 'income' ? (data.incomeSourceName || '') : '',
        payeeId: data.payeeId || null,
        payee: data.payee || '', // Keep payee name for display purposes
        vendorId: data.vendorId || null,
        vendorName: data.vendorName || '', // Keep vendor name for display purposes
        is1099Payment: data.isContractorPayment || false,
        isReconciled: data.isReconciled || false,
        isReviewed: data.isReviewed || false,
        paymentMethod: data.paymentMethod || '',
        checkNumber: data.checkNumber || '',
        tags: tags
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
                  <option value="transfer">Transfer/Neutral</option>
                </select>
                {watch('type') === 'transfer' && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Transfers don't affect income/expense totals (e.g., owner contributions, loans, account transfers)
                  </p>
                )}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="form-label">
                Amount ({watch('type') === 'income' ? 'Income' : watch('type') === 'transfer' ? 'Transfer' : 'Expense'})
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
                {...register('category')}
                className={`form-input category-select ${!watch('category') ? 'text-gray-400 dark:text-gray-500' : ''}`}
              >
                <option value="">Select a category (optional)</option>
                
                {/* Show neutral categories for transfer type */}
                {watch('type') === 'transfer' && (
                  <optgroup label="— Transfer/Neutral Categories —">
                    {Object.values(NEUTRAL_CATEGORIES).sort().map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </optgroup>
                )}
                
                {/* Show regular categories for income/expense */}
                {watch('type') !== 'transfer' && Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
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

            {/* Payee (who you pay) */}
            <div>
              <label className="form-label">
                Payee
                <span className="text-gray-500 text-xs ml-2">(select from payee list)</span>
              </label>
              <select
                {...register('payeeId')}
                onChange={(e) => {
                  const selectedPayee = payees.find(p => p.id === e.target.value);
                  setValue('payeeId', e.target.value);
                  setValue('payee', selectedPayee?.name || '');
                  // Auto-check contractor payment if payee is a contractor
                  if (selectedPayee?.type === 'contractor') {
                    setValue('isContractorPayment', true);
                  }
                }}
                className="form-input"
              >
                <option value="">-- Select a Payee --</option>
                {payees.filter(p => p.isActive !== false).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.type ? `(${p.type})` : ''}
                  </option>
                ))}
              </select>
              {payees.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No payees found. <a href="/payees" className="text-blue-600 hover:underline">Add payees in Payee Management</a>
                </p>
              )}
            </div>

            {/* Vendor (business you purchase from) */}
            <div>
              <label className="form-label">
                Vendor
                <span className="text-gray-500 text-xs ml-2">(select from vendor list)</span>
              </label>
              <select
                {...register('vendorId')}
                onChange={(e) => {
                  const selectedVendor = vendors.find(v => v.id === e.target.value);
                  setValue('vendorId', e.target.value);
                  setValue('vendorName', selectedVendor?.name || '');
                }}
                className="form-input"
              >
                <option value="">-- Select a Vendor --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {vendors.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No vendors found. <a href="/vendors" className="text-blue-600 hover:underline">Add a vendor</a>
                </p>
              )}
            </div>

            {/* Contractor Payment Checkbox */}
            {watch('type') === 'expense' && (
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    {...register('isContractorPayment')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label className="font-medium text-gray-700 dark:text-gray-200">
                    This is a contractor/1099 payment
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Check this if the payee is an independent contractor who may need a 1099-NEC form (payments of $600 or more require filing).
                  </p>
                </div>
              </div>
            )}

            {/* Income Source (for income transactions) */}
            {watch('type') === 'income' && (
              <div>
                <label className="form-label">
                  Income Source
                  <span className="text-gray-500 text-xs ml-2">(customer, client, or source of income)</span>
                </label>
                <select
                  {...register('incomeSourceId')}
                  onChange={(e) => {
                    const sourceId = e.target.value;
                    setValue('incomeSourceId', sourceId);
                    const source = incomeSources.find(s => s.id === sourceId);
                    setValue('incomeSourceName', source?.name || '');
                  }}
                  className={`form-input ${!watch('incomeSourceId') ? 'text-gray-400 dark:text-gray-500' : ''}`}
                >
                  <option value="" className="text-gray-400 dark:text-gray-500">Select an income source...</option>
                  {incomeSources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.name} {source.sourceType ? `(${source.sourceType})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Assign this income to a customer or source. Create new sources in Income Management.
                </p>
              </div>
            )}


            {/* Statement/PDF Link */}
            <StatementSelector
              value={watch('statementId')}
              onChange={val => setValue('statementId', val, { shouldDirty: true })}
              statements={statements}
              onRefresh={refetchStatements}
            />

            {/* CSV Import Link */}
            <div>
              <div className="flex items-center justify-between">
                <label className="form-label">CSV Import</label>
                <button
                  type="button"
                  onClick={() => refetchCsvImports()}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Refresh List
                </button>
              </div>
              <select
                className={`form-input ${!watch('csvImportId') ? 'text-gray-400 dark:text-gray-500' : ''}`}
                value={watch('csvImportId') || ''}
                onChange={e => setValue('csvImportId', e.target.value, { shouldDirty: true })}
              >
                <option value="">Unlinked (Manual/None)</option>
                {csvImports.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method and Check Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Payment Method</label>
                <select
                  {...register('paymentMethod')}
                  className={`form-input ${!watch('paymentMethod') ? 'text-gray-400 dark:text-gray-500' : ''}`}
                >
                  <option value="">Select method...</option>
                  {Object.values(PAYMENT_METHODS).map(method => (
                    <option key={method} value={method}>
                      {method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Check Number</label>
                <input
                  type="text"
                  {...register('checkNumber')}
                  className="form-input"
                  placeholder="If paid by check"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="form-label">
                Tags
                <span className="text-gray-500 text-xs ml-2">(comma-separated)</span>
              </label>
              <input
                type="text"
                {...register('tags')}
                className="form-input"
                placeholder="e.g., quarterly, office-supplies, client-project"
              />
            </div>

            {/* Status Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isReconciled')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Reconciled
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isReviewed')}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Reviewed
                </label>
              </div>
            </div>

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
