/**
 * Line Item Editor Component
 * 
 * Reusable table for editing quote/invoice line items
 * Supports adding from catalogue or ad-hoc items
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useCatalogueItems } from './hooks/useCatalogue';

const UNIT_LABELS = {
  each: 'ea',
  hour: 'hr',
  day: 'day',
  week: 'wk',
  month: 'mo',
  year: 'yr',
  sqft: 'sqft',
  linear_ft: 'lft',
  unit: 'unit',
  project: 'proj',
  service: 'svc'
};

export function LineItemEditor({ 
  items = [], 
  onChange, 
  readOnly = false,
  showTax = true 
}) {
  const [showCatalogueSearch, setShowCatalogueSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: catalogueData } = useCatalogueItems({ search: searchQuery, activeOnly: true });
  
  // API returns { success: true, data: { items: [...] } }
  const catalogueItems = catalogueData?.data?.items || catalogueData?.items || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const calculateLineTotal = (item) => {
    const subtotal = (item.quantity || 0) * (item.unit_price || 0);
    const tax = showTax ? subtotal * ((item.tax_rate || 0) / 100) : 0;
    return subtotal + tax;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate line total
    newItems[index].line_total = calculateLineTotal(newItems[index]);
    
    onChange(newItems);
  };

  const addItem = (catalogueItem = null) => {
    const newItem = catalogueItem 
      ? {
          catalogue_item_id: catalogueItem.id,
          description: catalogueItem.name,
          quantity: 1,
          unit_price: catalogueItem.unit_price,
          tax_rate: catalogueItem.tax_rate || 0,
          unit: catalogueItem.unit,
          line_total: catalogueItem.unit_price * (1 + (catalogueItem.tax_rate || 0) / 100)
        }
      : {
          catalogue_item_id: null,
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
          unit: 'each',
          line_total: 0
        };
    
    onChange([...items, newItem]);
    setShowCatalogueSearch(false);
    setSearchQuery('');
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const taxTotal = showTax 
    ? items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0) * ((item.tax_rate || 0) / 100), 0)
    : 0;
  const total = subtotal + taxTotal;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</h3>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCatalogueSearch(!showCatalogueSearch)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 
                       text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              From Catalogue
            </button>
            <button
              type="button"
              onClick={() => addItem()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 
                       text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <PlusIcon className="w-4 h-4" />
              Add Custom
            </button>
          </div>
        )}
      </div>

      {/* Catalogue Search Dropdown */}
      {showCatalogueSearch && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <input
            type="text"
            placeholder="Search catalogue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md mb-2
                     bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {catalogueItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                {searchQuery ? 'No items found' : 'Start typing to search...'}
              </p>
            ) : (
              catalogueItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30
                           text-sm flex justify-between items-center"
                >
                  <span className="text-gray-900 dark:text-white">{item.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.unit_price)}/{UNIT_LABELS[item.unit] || item.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Line Items Table */}
      {items.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">No line items yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Add items from catalogue or create custom items</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                {!readOnly && <th className="w-10 py-2"></th>}
                <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Description</th>
                <th className="w-20 text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Qty</th>
                <th className="w-28 text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Price</th>
                {showTax && (
                  <th className="w-20 text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Tax %</th>
                )}
                <th className="w-28 text-right py-2 text-gray-600 dark:text-gray-400 font-medium">Total</th>
                {!readOnly && <th className="w-10 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item, index) => (
                <tr key={index} className="group">
                  {!readOnly && (
                    <td className="py-2">
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="py-2">
                    {readOnly ? (
                      <span className="text-gray-900 dark:text-white">{item.description}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600
                                 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500
                                 focus:ring-1 focus:ring-blue-500 rounded
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Item description"
                      />
                    )}
                  </td>
                  <td className="py-2">
                    {readOnly ? (
                      <span className="text-right block text-gray-900 dark:text-white">{item.quantity}</span>
                    ) : (
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0.01"
                        step="0.01"
                        className="w-full px-2 py-1 text-right border border-gray-200 dark:border-gray-600
                                 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500
                                 focus:ring-1 focus:ring-blue-500 rounded
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    )}
                  </td>
                  <td className="py-2">
                    {readOnly ? (
                      <span className="text-right block text-gray-900 dark:text-white">
                        {formatCurrency(item.unit_price)}
                      </span>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                        <input
                          type="number"
                          value={item.unit_price || ''}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full pl-6 pr-2 py-1 text-right border border-gray-200 dark:border-gray-600 
                                   hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 
                                   focus:ring-1 focus:ring-blue-500 rounded
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}
                  </td>
                  {showTax && (
                    <td className="py-2">
                      {readOnly ? (
                        <span className="text-right block text-gray-900 dark:text-white">{item.tax_rate}%</span>
                      ) : (
                        <input
                          type="number"
                          value={item.tax_rate || ''}
                          onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full px-2 py-1 text-right border border-gray-200 dark:border-gray-600
                                   hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500
                                   focus:ring-1 focus:ring-blue-500 rounded
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      )}
                    </td>
                  )}
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(calculateLineTotal(item))}
                  </td>
                  {!readOnly && (
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {showTax && taxTotal > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax</span>
                  <span>{formatCurrency(taxTotal)}</span>
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
  );
}

export default LineItemEditor;
