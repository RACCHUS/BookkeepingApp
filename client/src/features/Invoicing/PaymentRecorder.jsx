/**
 * Payment Recorder Component
 * 
 * Modal for recording payments against invoices
 * Supports linking to existing transactions
 * 
 * @author BookkeepingApp Team
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useInvoice, useRecordPayment, useDeletePayment } from './hooks/useInvoices';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'ach', label: 'ACH' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' }
];

export function PaymentRecorder() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { data, isLoading } = useInvoice(id);
  const recordPayment = useRecordPayment();
  const deletePayment = useDeletePayment();

  const invoice = data?.invoice;
  const payments = invoice?.payments || [];

  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState(null);

  // Set default amount to remaining balance
  useEffect(() => {
    if (invoice && !formData.amount) {
      const balance = invoice.total - (invoice.amount_paid || 0);
      setFormData(prev => ({
        ...prev,
        amount: balance > 0 ? balance.toFixed(2) : ''
      }));
    }
  }, [invoice, formData.amount]);

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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const amount = parseFloat(formData.amount);
    
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valid payment amount is required';
    }
    
    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }
    
    if (!formData.payment_method) {
      newErrors.payment_method = 'Payment method is required';
    }

    // Check if amount exceeds balance
    if (invoice) {
      const balance = invoice.total - (invoice.amount_paid || 0);
      if (amount > balance + 0.01) { // Allow small floating point difference
        newErrors.amount = `Amount exceeds remaining balance of ${formatCurrency(balance)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsRecording(true);
    try {
      await recordPayment.mutateAsync({
        invoiceId: id,
        paymentData: {
          ...formData,
          amount: parseFloat(formData.amount)
        }
      });
      
      // Reset form
      const balance = invoice.total - (invoice.amount_paid || 0) - parseFloat(formData.amount);
      setFormData({
        amount: balance > 0 ? balance.toFixed(2) : '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
      
      // If fully paid, navigate back
      if (balance <= 0.01) {
        navigate(`/invoices/${id}`);
      }
    } catch (err) {
      console.error('Record payment failed:', err);
      setErrors({ submit: err.message || 'Failed to record payment' });
    } finally {
      setIsRecording(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteModalId) return;
    try {
      await deletePayment.mutateAsync({ invoiceId: id, paymentId: deleteModalId });
      setDeleteModalId(null);
    } catch (err) {
      console.error('Delete payment failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Invoice not found</p>
      </div>
    );
  }

  const balance = invoice.total - (invoice.amount_paid || 0);
  const isPaid = balance <= 0.01;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/invoices/${id}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Record Payment
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Invoice #{invoice.invoice_number} - {invoice.client_name}
          </p>
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Invoice Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(invoice.total)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(invoice.amount_paid || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Balance Due</p>
            <p className={`text-xl font-bold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment History
          </h2>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div 
                key={payment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(payment.payment_date)} • {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method}
                      {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModalId(payment.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                  title="Delete payment"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record New Payment Form */}
      {!isPaid && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Record New Payment
          </h2>

          {errors.submit && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-4">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    min="0.01"
                    max={balance}
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                             text-gray-900 dark:text-white text-right
                             ${errors.amount 
                               ? 'border-red-500' 
                               : 'border-gray-300 dark:border-gray-600'}`}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleChange('payment_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-white
                           ${errors.payment_date 
                             ? 'border-red-500' 
                             : 'border-gray-300 dark:border-gray-600'}`}
                />
                {errors.payment_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.payment_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => handleChange('payment_method', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-white
                           ${errors.payment_method 
                             ? 'border-red-500' 
                             : 'border-gray-300 dark:border-gray-600'}`}
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-500">{errors.payment_method}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => handleChange('reference_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Check #, Transaction ID, etc."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Optional notes about this payment..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/invoices/${id}`)}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecording}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                         disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isRecording && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fully Paid Message */}
      {isPaid && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
            Invoice Fully Paid
          </h3>
          <p className="text-green-600 dark:text-green-500">
            This invoice has been paid in full.
          </p>
          <button
            onClick={() => navigate('/invoices')}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Invoices
          </button>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Payment
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete this payment? This will update the invoice balance.
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
                onClick={handleDeletePayment}
                disabled={deletePayment.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                         disabled:opacity-50"
              >
                {deletePayment.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentRecorder;
