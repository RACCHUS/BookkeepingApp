/**
 * @fileoverview Inventory Item Form - Add/Edit form for inventory items
 * @description Modal form for creating and editing inventory items
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';

const InventoryItemForm = ({
  item,
  mode,
  companies,
  onSave,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unitCost: '',
    sellingPrice: '',
    quantity: '',
    reorderLevel: '',
    unit: 'each',
    supplier: '',
    companyId: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        sku: item.sku || '',
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        unitCost: item.unitCost?.toString() || '',
        sellingPrice: item.sellingPrice?.toString() || '',
        quantity: item.quantity?.toString() || '',
        reorderLevel: item.reorderLevel?.toString() || '',
        unit: item.unit || 'each',
        supplier: item.supplier || '',
        companyId: item.companyId || ''
      });
    }
  }, [item, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // SKU is optional - if provided, just validate length
    if (formData.sku && formData.sku.length > 50) {
      newErrors.sku = 'SKU must be less than 50 characters';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.unitCost && (isNaN(formData.unitCost) || parseFloat(formData.unitCost) < 0)) {
      newErrors.unitCost = 'Unit cost must be a positive number';
    }

    if (formData.sellingPrice && (isNaN(formData.sellingPrice) || parseFloat(formData.sellingPrice) < 0)) {
      newErrors.sellingPrice = 'Selling price must be a positive number';
    }

    if (formData.quantity && (isNaN(formData.quantity) || parseInt(formData.quantity) < 0)) {
      newErrors.quantity = 'Quantity must be a non-negative integer';
    }

    if (formData.reorderLevel && (isNaN(formData.reorderLevel) || parseInt(formData.reorderLevel) < 0)) {
      newErrors.reorderLevel = 'Reorder level must be a non-negative integer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
      sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0,
      quantity: formData.quantity ? parseInt(formData.quantity) : 0,
      reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : 0,
      unit: formData.unit || 'each',
      supplier: formData.supplier.trim() || undefined,
      companyId: formData.companyId || undefined
    };

    onSave(submitData);
  };

  const unitOptions = [
    'each', 'piece', 'unit', 'box', 'case', 'pack', 'set',
    'lb', 'oz', 'kg', 'g',
    'ft', 'in', 'm', 'cm',
    'gal', 'qt', 'pt', 'L', 'ml',
    'sq ft', 'sq m'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {mode === 'create' ? 'Add Inventory Item' : 'Edit Inventory Item'}
            </h3>
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
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* SKU and Name row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SKU <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500
                           ${errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="e.g., PROD-001"
                />
                {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500
                           ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Product name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional product description"
              />
            </div>

            {/* Category and Company row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Electronics, Clothing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <select
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500
                           ${errors.unitCost ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="0.00"
                />
                {errors.unitCost && <p className="mt-1 text-sm text-red-500">{errors.unitCost}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Selling Price ($)
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500
                           ${errors.sellingPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="0.00"
                />
                {errors.sellingPrice && <p className="mt-1 text-sm text-red-500">{errors.sellingPrice}</p>}
              </div>
            </div>

            {/* Quantity and Unit row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {mode === 'create' ? 'Initial Quantity' : 'Quantity'}
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  disabled={mode === 'edit'}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500
                           ${mode === 'edit' ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}
                           ${errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="0"
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                {mode === 'edit' && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Use stock adjustment to change quantity
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-blue-500 focus:border-blue-500"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reorder Level
                </label>
                <input
                  type="number"
                  name="reorderLevel"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500
                           ${errors.reorderLevel ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="0"
                />
                {errors.reorderLevel && <p className="mt-1 text-sm text-red-500">{errors.reorderLevel}</p>}
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-blue-500 focus:border-blue-500"
                placeholder="Supplier name"
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
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md 
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                mode === 'create' ? 'Add Item' : 'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemForm;
