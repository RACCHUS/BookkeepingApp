/**
 * Quote List Component
 * 
 * Displays all quotes with filtering, sorting, and actions
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
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  TrashIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useQuotes, useDeleteQuote, useUpdateQuoteStatus, useConvertQuoteToInvoice, useDuplicateQuote, useDownloadQuotePDF, useSendQuoteEmail } from './hooks/useQuotes';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  expired: { label: 'Expired', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' }
};

export function QuoteList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModalId, setDeleteModalId] = useState(null);

  const { data, isLoading, error, refetch } = useQuotes({ 
    search, 
    status: statusFilter || undefined 
  });
  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();
  const convertToInvoice = useConvertQuoteToInvoice();
  const duplicateQuote = useDuplicateQuote();
  const downloadPDF = useDownloadQuotePDF();
  const sendEmail = useSendQuoteEmail();

  const quotes = data?.quotes || [];

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
      await deleteQuote.mutateAsync(deleteModalId);
      setDeleteModalId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleConvert = async (id) => {
    try {
      const result = await convertToInvoice.mutateAsync(id);
      navigate(`/invoices/${result.invoice.id}/edit`);
    } catch (err) {
      console.error('Convert failed:', err);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const result = await duplicateQuote.mutateAsync(id);
      navigate(`/quotes/${result.quote.id}/edit`);
    } catch (err) {
      console.error('Duplicate failed:', err);
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
        <p className="text-red-500 mb-4">Error loading quotes</p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quotes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your quotes and proposals
          </p>
        </div>
        <Link
          to="/quotes/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Quote
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotes..."
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

      {/* Quotes Table */}
      {quotes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter ? 'No quotes found matching your filters' : 'No quotes yet'}
          </p>
          {!search && !statusFilter && (
            <Link
              to="/quotes/new"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Create your first quote
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Quote #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Valid Until
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {quotes.map((quote) => {
                const config = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
                const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
                
                return (
                  <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <Link 
                        to={`/quotes/${quote.id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {quote.client?.name || quote.client_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(quote.quote_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={isExpired && quote.status !== 'converted' && quote.status !== 'accepted' 
                        ? 'text-red-500' 
                        : 'text-gray-500 dark:text-gray-400'}>
                        {formatDate(quote.valid_until)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/quotes/${quote.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="View"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={() => downloadPDF.mutate(quote.id)}
                          disabled={downloadPDF.isPending}
                          className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => sendEmail.mutate(quote.id)}
                          disabled={sendEmail.isPending}
                          className="p-1.5 text-gray-400 hover:text-green-600 disabled:opacity-50"
                          title="Send Email"
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                        </button>
                        
                        {quote.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(quote.id, 'sent')}
                            className="p-1.5 text-gray-400 hover:text-blue-600"
                            title="Mark as Sent"
                          >
                            <PaperAirplaneIcon className="w-4 h-4" />
                          </button>
                        )}
                        
                        {(quote.status === 'sent' || quote.status === 'viewed') && (
                          <>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'accepted')}
                              className="p-1.5 text-gray-400 hover:text-green-600"
                              title="Mark as Accepted"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(quote.id, 'declined')}
                              className="p-1.5 text-gray-400 hover:text-red-600"
                              title="Mark as Declined"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {quote.status === 'accepted' && (
                          <button
                            onClick={() => handleConvert(quote.id)}
                            disabled={convertToInvoice.isPending}
                            className="p-1.5 text-gray-400 hover:text-emerald-600"
                            title="Convert to Invoice"
                          >
                            <ArrowPathIcon className={`w-4 h-4 ${convertToInvoice.isPending ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDuplicate(quote.id)}
                          disabled={duplicateQuote.isPending}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteModalId(quote.id)}
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
              Delete Quote
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this quote? This action cannot be undone.
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
                disabled={deleteQuote.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                         disabled:opacity-50"
              >
                {deleteQuote.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteList;
