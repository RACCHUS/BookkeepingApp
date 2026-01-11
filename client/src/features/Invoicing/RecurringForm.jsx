/**
 * Recurring Schedule Form Component
 * 
 * Create or edit recurring invoice schedules
 * 
 * @author BookkeepingApp Team
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  useRecurringSchedule,
  useCreateRecurringSchedule,
  useUpdateRecurringSchedule
} from './hooks/useRecurring';
import CompanySelector from '../../components/common/CompanySelector';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' }
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export function RecurringForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: existingSchedule, isLoading: scheduleLoading } = useRecurringSchedule(id);
  const createSchedule = useCreateRecurringSchedule();
  const updateSchedule = useUpdateRecurringSchedule();

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    frequency: 'monthly',
    day_of_month: 1,
    day_of_week: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_occurrences: '',
    auto_send: false,
    template_data: {
      subtotal: 0,
      tax_total: 0,
      total: 0,
      notes: '',
      terms: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Load existing schedule data
  useEffect(() => {
    if (existingSchedule?.schedule) {
      const sched = existingSchedule.schedule;
      const templateData = sched.template_data || sched.templateData || {};
      setSelectedCompanyId(sched.company_id || sched.companyId || '');
      setFormData({
        name: sched.name || '',
        client_name: templateData.client_name || '',
        client_email: templateData.client_email || '',
        frequency: sched.frequency || 'monthly',
        day_of_month: sched.day_of_month || sched.dayOfMonth || 1,
        day_of_week: sched.day_of_week || sched.dayOfWeek || 1,
        start_date: (sched.start_date || sched.startDate || '').split('T')[0],
        end_date: (sched.end_date || sched.endDate || '').split('T')[0],
        max_occurrences: sched.max_occurrences || sched.maxOccurrences || '',
        auto_send: sched.auto_send || sched.autoSend || false,
        template_data: {
          subtotal: templateData.subtotal || 0,
          tax_total: templateData.tax_total || 0,
          total: templateData.total || 0,
          notes: templateData.notes || '',
          terms: templateData.terms || ''
        }
      });
    }
  }, [existingSchedule]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTemplateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      template_data: { ...prev.template_data, [field]: value }
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Schedule name is required';
    }
    
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

    setIsSaving(true);
    try {
      const scheduleData = {
        name: formData.name,
        company_id: selectedCompanyId || null,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        max_occurrences: formData.max_occurrences ? parseInt(formData.max_occurrences) : null,
        day_of_month: parseInt(formData.day_of_month),
        day_of_week: parseInt(formData.day_of_week),
        auto_send: formData.auto_send,
        template_data: {
          ...formData.template_data,
          client_name: formData.client_name,
          client_email: formData.client_email
        }
      };

      if (isEditing) {
        await updateSchedule.mutateAsync({ id, data: scheduleData });
      } else {
        await createSchedule.mutateAsync(scheduleData);
      }
      navigate('/recurring');
    } catch (err) {
      console.error('Save failed:', err);
      setErrors({ submit: err.message || 'Failed to save schedule' });
    } finally {
      setIsSaving(false);
    }
  };

  const showDayOfMonth = ['monthly', 'quarterly', 'semi_annual', 'annual'].includes(formData.frequency);
  const showDayOfWeek = ['weekly', 'biweekly'].includes(formData.frequency);

  if (scheduleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/recurring')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                   dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Recurring Schedules
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full 
                        flex items-center justify-center">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditing ? 'Update schedule settings' : 'Set up automatic invoice generation'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
                        text-sm rounded-lg">
            {errors.submit}
          </div>
        )}

        {/* Company Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company (Optional)
          </label>
          <CompanySelector
            value={selectedCompanyId}
            onChange={(id) => setSelectedCompanyId(id)}
            required={false}
            allowAll={false}
          />
        </div>

        {/* Schedule Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Schedule Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Monthly Website Maintenance"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-white
                      ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Client Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Name (Optional)
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              placeholder="e.g., Acme Corp"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Email (Optional)
            </label>
            <input
              type="email"
              value={formData.client_email}
              onChange={(e) => handleChange('client_email', e.target.value)}
              placeholder="e.g., billing@acme.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Frequency & Timing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency *
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

          {showDayOfMonth && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day of Month
              </label>
              <select
                value={formData.day_of_month}
                onChange={(e) => handleChange('day_of_month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {showDayOfWeek && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day of Week
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) => handleChange('day_of_week', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {DAY_OF_WEEK_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
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
                        ${errors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              min={formData.start_date}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                        text-gray-900 dark:text-white
                        ${errors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>
            )}
          </div>
        </div>

        {/* Max Occurrences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximum Occurrences (Optional)
          </label>
          <input
            type="number"
            value={formData.max_occurrences}
            onChange={(e) => handleChange('max_occurrences', e.target.value)}
            placeholder="Leave empty for unlimited"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Invoice Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Invoice Amount ($)
          </label>
          <input
            type="number"
            value={formData.template_data.total}
            onChange={(e) => handleTemplateChange('total', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Auto Send */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_send"
            checked={formData.auto_send}
            onChange={(e) => handleChange('auto_send', e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="auto_send" className="text-sm text-gray-700 dark:text-gray-300">
            Automatically send invoice when generated
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.template_data.notes}
            onChange={(e) => handleTemplateChange('notes', e.target.value)}
            rows={3}
            placeholder="Notes to include on generated invoices"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/invoices/recurring')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                     dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
          >
            {isSaving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RecurringForm;
