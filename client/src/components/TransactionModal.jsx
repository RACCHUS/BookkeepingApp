import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { IRS_CATEGORIES, CATEGORY_GROUPS } from '@shared/constants/categories';

const TransactionModal = ({ transaction, isOpen, onClose, onSave, mode = 'edit' }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      date: transaction?.date || new Date().toISOString().split('T')[0],
      amount: transaction?.amount || '',
      description: transaction?.description || '',
      category: transaction?.category || '',
      type: transaction?.type || 'expense',
      payee: transaction?.payee || '',
      notes: transaction?.notes || ''
    }
  });

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && mode === 'edit') {
      reset({
        date: transaction.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        amount: Math.abs(transaction.amount) || '',
        description: transaction.description || '',
        category: transaction.category || '',
        type: transaction.type || (transaction.amount > 0 ? 'income' : 'expense'),
        payee: transaction.payee || '',
        notes: transaction.notes || ''
      });
    } else if (mode === 'create') {
      reset({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category: '',
        type: 'expense',
        payee: '',
        notes: ''
      });
    }
  }, [transaction, mode, reset]);

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

            {/* Category */}
            <div>
              <label className="form-label">Category</label>
              <select 
                {...register('category', { required: 'Category is required' })}
                className="form-input"
              >
                <option value="">Select a category</option>
                
                <optgroup label="Income">
                  {CATEGORY_GROUPS.INCOME.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Operating Expenses">
                  {CATEGORY_GROUPS.OPERATING_EXPENSES.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Professional Services">
                  {CATEGORY_GROUPS.PROFESSIONAL_SERVICES.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Employee Costs">
                  {CATEGORY_GROUPS.EMPLOYEE_COSTS.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Vehicle Expenses">
                  {CATEGORY_GROUPS.VEHICLE_EXPENSES.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Financial">
                  {CATEGORY_GROUPS.FINANCIAL.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Travel & Meals">
                  {CATEGORY_GROUPS.TRAVEL_MEALS.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Depreciation">
                  {CATEGORY_GROUPS.DEPRECIATION.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Other">
                  {CATEGORY_GROUPS.OTHER.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Personal">
                  {CATEGORY_GROUPS.PERSONAL.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>
                      {categoryName}
                    </option>
                  ))}
                </optgroup>
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>
              )}
            </div>

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
