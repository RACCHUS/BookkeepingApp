/**
 * Invoice Form Component
 * 
 * Create and edit invoices with line items, client selection, and payment terms
 * 
 * @author BookkeepingApp Team
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useInvoice, useCreateInvoice, useUpdateInvoice } from './hooks/useInvoices';
import { LineItemEditor } from './LineItemEditor';

const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt', days: 0 },
  { value: 'net_7', label: 'Net 7', days: 7 },
  { value: 'net_15', label: 'Net 15', days: 15 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_45', label: 'Net 45', days: 45 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'net_90', label: 'Net 90', days: 90 },
  { value: 'custom', label: 'Custom', days: null }
];

export function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { data: existingInvoice, isLoading: loadingInvoice } = useInvoice(id, { enabled: isEditing });
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_email: '',
    client_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'net_30',
    title: '',
    notes: '',
    terms: '',
    discount_type: 'percentage',
    discount_value: 0,
    line_items: []
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Calculate due date based on payment terms
  useEffect(() => {
    if (formData.payment_terms !== 'custom' && formData.invoice_date) {
      const term = PAYMENT_TERMS.find(t => t.value === formData.payment_terms);
      if (term && term.days !== null) {
        const dueDate = new Date(formData.invoice_date);
        dueDate.setDate(dueDate.getDate() + term.days);
        setFormData(prev => ({
          ...prev,
          due_date: dueDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [formData.payment_terms, formData.invoice_date]);

  // Load existing invoice data
  useEffect(() => {
    if (existingInvoice?.invoice) {
      const inv = existingInvoice.invoice;
      setFormData({
        client_id: inv.client_id || '',
        client_name: inv.client_name || '',
        client_email: inv.client_email || '',
        client_address: inv.client_address || '',
        invoice_date: inv.invoice_date ? inv.invoice_date.split('T')[0] : '',
        due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
        payment_terms: inv.payment_terms || 'custom',
        title: inv.title || '',
        notes: inv.notes || '',
        terms: inv.terms || '',
        discount_type: inv.discount_type || 'percentage',
        discount_value: inv.discount_value || 0,
        line_items: inv.line_items || []
      });
    }
  }, [existingInvoice]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.client_name?.trim()) {
      newErrors.client_name = 'Client name is required';
    }
    
    if (!formData.invoice_date) {
      newErrors.invoice_date = 'Invoice date is required';
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    
    if (formData.line_items.length === 0) {
      newErrors.line_items = 'At least one line item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateInvoice.mutateAsync({ id, data: formData });
      } else {
        await createInvoice.mutateAsync(formData);
      }
      navigate('/invoices');
    } catch (err) {
      console.error('Save failed:', err);
      setErrors({ submit: err.message || 'Failed to save invoice' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Calculate totals
  const subtotal = formData.line_items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );
  const taxTotal = formData.line_items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0) * ((item.tax_rate || 0) / 100),
    0
  );
  const discountAmount = formData.discount_type === 'percentage'
    ? (subtotal + taxTotal) * ((formData.discount_value || 0) / 100)
    : (formData.discount_value || 0);
  const total = subtotal + taxTotal - discountAmount;

  if (loadingInvoice) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEditing ? `Invoice #${existingInvoice?.invoice?.invoice_number}` : 'Create a new invoice'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {errors.submit}
          </div>
        )}

        {/* Client Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Client Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => handleChange('client_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                         text-gray-900 dark:text-white
                         ${errors.client_name 
                           ? 'border-red-500' 
                           : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="Enter client name"
              />
              {errors.client_name && (
                <p className="mt-1 text-sm text-red-500">{errors.client_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Email
              </label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => handleChange('client_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="client@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Address
              </label>
              <textarea
                value={formData.client_address}
                onChange={(e) => handleChange('client_address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter client address"
              />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Invoice Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => handleChange('invoice_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                         text-gray-900 dark:text-white
                         ${errors.invoice_date 
                           ? 'border-red-500' 
                           : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.invoice_date && (
                <p className="mt-1 text-sm text-red-500">{errors.invoice_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => handleChange('payment_terms', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {PAYMENT_TERMS.map(term => (
                  <option key={term.value} value={term.value}>{term.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => {
                  handleChange('due_date', e.target.value);
                  handleChange('payment_terms', 'custom');
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 
                         text-gray-900 dark:text-white
                         ${errors.due_date 
                           ? 'border-red-500' 
                           : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.due_date && (
                <p className="mt-1 text-sm text-red-500">{errors.due_date}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Project title"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <LineItemEditor
            items={formData.line_items}
            onChange={(items) => handleChange('line_items', items)}
          />
          {errors.line_items && (
            <p className="mt-2 text-sm text-red-500">{errors.line_items}</p>
          )}

          {/* Discount */}
          {formData.line_items.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-4 justify-end">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Discount
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => handleChange('discount_type', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => handleChange('discount_value', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                />
              </div>
              
              {/* Updated Totals with Discount */}
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {taxTotal > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Tax</span>
                      <span>{formatCurrency(taxTotal)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Discount</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes & Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notes & Terms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes for the client..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => handleChange('terms', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Payment terms, conditions..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                     dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSaving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InvoiceForm;
