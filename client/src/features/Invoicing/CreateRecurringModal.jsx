/**
 * Create Recurring Schedule Modal Component
 * 
 * Modal to set up a recurring schedule from an existing invoice
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import {
  XMarkIcon,
  ArrowPathIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { useCreateRecurringFromInvoice } from './hooks/useRecurring';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' }
];

export function CreateRecurringModal({ invoiceId, invoiceNumber, onClose, onSuccess }) {
  const createRecurring = useCreateRecurringFromInvoice();

  const [formData, setFormData] = useState({
    frequency: 'monthly',
    interval_count: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_occurrences: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      const options = {
        frequency: formData.frequency,
        interval_count: parseInt(formData.interval_count) || 1,
        start_date: formData.start_date
      };

      if (formData.end_date) {
        options.end_date = formData.end_date;
      }

      if (formData.max_occurrences) {
        options.max_occurrences = parseInt(formData.max_occurrences);
      }

      await createRecurring.mutateAsync({ invoiceId, options });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Create recurring failed:', err);
      setErrors({ submit: err.message || 'Failed to create recurring schedule' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full 
                          flex items-center justify-center">
              <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Make Recurring
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Invoice #{invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
                          text-sm rounded-lg">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Every
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.interval_count}
                  onChange={(e) => handleChange('interval_count', e.target.value)}
                  min="1"
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {formData.frequency === 'daily' ? 'day(s)' :
                   formData.frequency === 'weekly' ? 'week(s)' :
                   formData.frequency === 'monthly' ? 'month(s)' :
                   'period(s)'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-white
                       ${errors.start_date 
                         ? 'border-red-500' 
                         : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
                <span className="text-gray-400 text-xs ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                         text-gray-900 dark:text-white
                         ${errors.end_date 
                           ? 'border-red-500' 
                           : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Occurrences
                <span className="text-gray-400 text-xs ml-1">(optional)</span>
              </label>
              <input
                type="number"
                value={formData.max_occurrences}
                onChange={(e) => handleChange('max_occurrences', e.target.value)}
                min="1"
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              A new invoice will be automatically created based on this template 
              {formData.frequency === 'monthly' && formData.interval_count === 1 
                ? ' every month' 
                : ` according to the selected frequency`}.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRecurring.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {createRecurring.isPending && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              Create Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRecurringModal;
