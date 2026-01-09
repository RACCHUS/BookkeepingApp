/**
 * Invoice List Component
 * 
 * Displays all invoices with filtering, sorting, and payment tracking
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useInvoices, useInvoiceSummary, useDeleteInvoice, useDownloadInvoicePDF, useSendInvoiceEmail } from './hooks/useInvoices';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500' }
};

export function InvoiceList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModalId, setDeleteModalId] = useState(null);

  const { data, isLoading, error, refetch } = useInvoices({ 
    search, 
    status: statusFilter || undefined 
  });
  const { data: summary } = useInvoiceSummary();
  const deleteInvoice = useDeleteInvoice();
  const downloadPDF = useDownloadInvoicePDF();
  const sendEmail = useSendInvoiceEmail();

  const invoices = data?.invoices || [];

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
      await deleteInvoice.mutateAsync(deleteModalId);
      setDeleteModalId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const isOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
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
        <p className="text-red-500 mb-4">Error loading invoices</p>
        <button onClick={() => refetch()} className="text-blue-500 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Outstanding</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalOutstanding)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalOverdue)}
            </p>
            {summary.overdueCount > 0 && (
              <p className="text-xs text-red-500">{summary.overdueCount} invoice(s)</p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Paid (This Month)</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.paidThisMonth)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Draft</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {summary.draftCount || 0}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your invoices and track payments
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter ? 'No invoices found matching your filters' : 'No invoices yet'}
          </p>
          {!search && !statusFilter && (
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Create your first invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((invoice) => {
                const overdue = isOverdue(invoice);
                const config = overdue ? STATUS_CONFIG.overdue : (STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft);
                const balance = invoice.total - (invoice.amount_paid || 0);
                
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <Link 
                        to={`/invoices/${invoice.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {invoice.invoice_number}
                        {overdue && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {invoice.client?.name || invoice.client_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={overdue ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                        {formatDate(invoice.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={balance > 0 ? 'font-medium text-orange-600' : 'text-green-600'}>
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="View"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={() => downloadPDF.mutate(invoice.id)}
                          disabled={downloadPDF.isPending}
                          className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => sendEmail.mutate(invoice.id)}
                          disabled={sendEmail.isPending}
                          className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50"
                          title="Send Email"
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                        </button>
                        
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                          <Link
                            to={`/invoices/${invoice.id}/payment`}
                            className="p-1.5 text-gray-400 hover:text-green-600"
                            title="Record Payment"
                          >
                            <CurrencyDollarIcon className="w-4 h-4" />
                          </Link>
                        )}
                        
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                          disabled={invoice.status === 'paid'}
                          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteModalId(invoice.id)}
                          disabled={invoice.status === 'paid'}
                          className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
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
              Delete Invoice
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this invoice? This action cannot be undone.
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
                disabled={deleteInvoice.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                         disabled:opacity-50"
              >
                {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceList;
