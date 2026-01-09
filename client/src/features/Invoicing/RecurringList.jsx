/**
 * Recurring Invoice List Component
 * 
 * Displays all recurring invoice schedules with management actions
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  CalendarDaysIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  useRecurringSchedules,
  useDeleteRecurringSchedule,
  usePauseRecurringSchedule,
  useResumeRecurringSchedule,
  useProcessRecurringInvoices
} from './hooks/useRecurring';

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual'
};

export function RecurringList() {
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [deleteModalId, setDeleteModalId] = useState(null);

  const { data, isLoading, error, refetch } = useRecurringSchedules({ 
    activeOnly: showActiveOnly 
  });
  const deleteSchedule = useDeleteRecurringSchedule();
  const pauseSchedule = usePauseRecurringSchedule();
  const resumeSchedule = useResumeRecurringSchedule();
  const processRecurring = useProcessRecurringInvoices();

  const schedules = data?.schedules || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async () => {
    if (!deleteModalId) return;
    try {
      await deleteSchedule.mutateAsync(deleteModalId);
      setDeleteModalId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handlePause = async (id) => {
    try {
      await pauseSchedule.mutateAsync(id);
    } catch (err) {
      console.error('Pause failed:', err);
    }
  };

  const handleResume = async (id) => {
    try {
      await resumeSchedule.mutateAsync(id);
    } catch (err) {
      console.error('Resume failed:', err);
    }
  };

  const handleProcess = async () => {
    try {
      await processRecurring.mutateAsync();
    } catch (err) {
      console.error('Process failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Error loading recurring schedules</p>
        <button onClick={() => refetch()} className="text-blue-500 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage automatic invoice generation schedules
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleProcess}
            disabled={processRecurring.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 
                     text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 
                     dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${processRecurring.isPending ? 'animate-spin' : ''}`} />
            Process Now
          </button>
          <Link
            to="/invoices/new?recurring=true"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            New Schedule
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 
                     focus:ring-blue-500"
          />
          Show active only
        </label>
      </div>

      {/* Schedules Table */}
      {schedules.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No recurring schedules yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
            Create a schedule to automatically generate invoices
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Invoice Template
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Frequency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Next Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Last Run
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Occurrences
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {schedules.map((schedule) => {
                const invoice = schedule.invoice;
                const isOverdue = schedule.is_active && 
                  new Date(schedule.next_run_date) < new Date();
                
                return (
                  <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      {invoice ? (
                        <div>
                          <Link 
                            to={`/invoices/${invoice.id}`}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {invoice.invoice_number}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.client_name} • {formatCurrency(invoice.total)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">No template</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {FREQUENCY_LABELS[schedule.frequency] || schedule.frequency}
                        </span>
                        {schedule.interval_count > 1 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            (every {schedule.interval_count})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? 'text-orange-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                        {formatDate(schedule.next_run_date)}
                        {isOverdue && ' (Due)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(schedule.last_run_date) || 'Never'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-900 dark:text-white">
                        {schedule.occurrences_count}
                        {schedule.max_occurrences && (
                          <span className="text-gray-400"> / {schedule.max_occurrences}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {schedule.is_active ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full 
                                       bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full 
                                       bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {schedule.is_active ? (
                          <button
                            onClick={() => handlePause(schedule.id)}
                            disabled={pauseSchedule.isPending}
                            className="p-1.5 text-gray-400 hover:text-yellow-600"
                            title="Pause"
                          >
                            <PauseIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResume(schedule.id)}
                            disabled={resumeSchedule.isPending}
                            className="p-1.5 text-gray-400 hover:text-green-600"
                            title="Resume"
                          >
                            <PlayIcon className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => setDeleteModalId(schedule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Schedule
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this recurring schedule? 
              Previously generated invoices will not be affected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalId(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSchedule.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                         disabled:opacity-50"
              >
                {deleteSchedule.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurringList;
