/**
 * @fileoverview Stock Adjustment Modal - Quick stock adjustment form
 * @description Modal for adjusting inventory stock levels
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAdjustStock } from '../../hooks/useInventory';

const ADJUSTMENT_TYPES = [
  { value: 'adjustment', label: 'Manual Adjustment', description: 'General stock correction' },
  { value: 'return', label: 'Customer Return', description: 'Items returned by customer' },
  { value: 'damaged', label: 'Damaged/Lost', description: 'Items damaged or lost' },
  { value: 'correction', label: 'Inventory Count', description: 'Correction after physical count' }
];

const StockAdjustmentModal = ({ item, onClose }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    type: 'adjustment',
    notes: '',
    unitCost: item.unitCost?.toString() || ''
  });
  const [adjustmentMode, setAdjustmentMode] = useState('add'); // 'add' or 'subtract'

  const adjustStock = useAdjustStock();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const finalQuantity = adjustmentMode === 'subtract' ? -quantity : quantity;

    // Check if subtracting more than available
    if (finalQuantity < 0 && Math.abs(finalQuantity) > item.quantity) {
      toast.error(`Cannot remove more than current stock (${item.quantity})`);
      return;
    }

    try {
      await adjustStock.mutateAsync({
        itemId: item.id,
        data: {
          quantity: finalQuantity,
          type: formData.type,
          notes: formData.notes.trim() || undefined,
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined
        }
      });
      toast.success('Stock adjusted successfully');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const newQuantity = item.quantity + (
    formData.quantity 
      ? (adjustmentMode === 'subtract' ? -parseInt(formData.quantity) : parseInt(formData.quantity))
      : 0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Adjust Stock
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.name} ({item.sku})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Current Quantity Display */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Current Stock</span>
                <span className={`text-2xl font-bold ${
                  item.isLowStock 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {item.quantity} {item.unit}
                </span>
              </div>
              {formData.quantity && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-500 dark:text-gray-400">New Stock</span>
                  <span className={`text-2xl font-bold ${
                    newQuantity < 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : newQuantity <= item.reorderLevel
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                  }`}>
                    {newQuantity} {item.unit}
                  </span>
                </div>
              )}
            </div>

            {/* Add/Subtract Toggle */}
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setAdjustmentMode('add')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                  adjustmentMode === 'add'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                + Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentMode('subtract')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${
                  adjustmentMode === 'subtract'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                - Remove Stock
              </button>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quantity"
                autoFocus
              />
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-blue-500 focus:border-blue-500"
              >
                {ADJUSTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {ADJUSTMENT_TYPES.find(t => t.value === formData.type)?.description}
              </p>
            </div>

            {/* Unit Cost (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                name="unitCost"
                value={formData.unitCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-blue-500 focus:border-blue-500"
                placeholder="Use existing cost"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional notes about this adjustment"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                       border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={adjustStock.isPending || !formData.quantity}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       ${adjustmentMode === 'add' 
                         ? 'bg-green-600 hover:bg-green-700' 
                         : 'bg-red-600 hover:bg-red-700'}`}
            >
              {adjustStock.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                adjustmentMode === 'add' ? 'Add Stock' : 'Remove Stock'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustmentModal;
