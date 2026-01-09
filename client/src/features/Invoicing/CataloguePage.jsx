/**
 * Catalogue Page Component
 * 
 * Main page for managing catalogue items (products/services)
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  FunnelIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { 
  useCatalogueItems, 
  useCategories,
  useDeleteCatalogueItem,
  useDuplicateCatalogueItem 
} from './hooks/useCatalogue';
import { CatalogueItemForm } from './CatalogueItemForm';
import { LoadingSpinner } from '../../components/ui';

const UNIT_LABELS = {
  each: 'Each',
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
  sqft: 'Sq Ft',
  linear_ft: 'Linear Ft',
  unit: 'Unit',
  project: 'Project',
  service: 'Service'
};

export function CataloguePage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, error } = useCatalogueItems({
    search,
    category: categoryFilter,
    activeOnly: !showInactive
  });
  
  const { data: categoriesData } = useCategories();
  const deleteMutation = useDeleteCatalogueItem();
  const duplicateMutation = useDuplicateCatalogueItem();

  const items = data?.items || [];
  const categories = categoriesData?.categories || [];

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDuplicate = (id) => {
    duplicateMutation.mutate(id);
  };

  const handleDelete = (id, hard = false) => {
    deleteMutation.mutate({ id, hard });
    setDeleteConfirm(null);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        Error loading catalogue: {error.message}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product & Service Catalogue
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your products and services for quotes and invoices
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Show Inactive Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show Inactive</span>
        </label>
      </div>

      {/* Items Grid/List */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <CubeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No catalogue items found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {search || categoryFilter 
              ? 'Try adjusting your filters'
              : 'Get started by adding your first product or service'
            }
          </p>
          {!search && !categoryFilter && (
            <button
              onClick={() => { setEditingItem(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                      {item.sku && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          SKU: {item.sku}
                        </div>
                      )}
                      {item.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.category ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                        {item.category}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatPrice(item.unit_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {UNIT_LABELS[item.unit] || item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.tax_rate > 0 ? `${item.tax_rate}%` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.is_active 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(item.id)}
                        className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                        title="Duplicate"
                      >
                        <DocumentDuplicateIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Count */}
      {items.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {items.length} item{items.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <CatalogueItemForm
          item={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete "{deleteConfirm.name}"?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Choose how to remove this item:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleDelete(deleteConfirm.id, false)}
                className="w-full px-4 py-2 text-left bg-yellow-50 dark:bg-yellow-900/20 
                         text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 
                         dark:hover:bg-yellow-900/30 transition-colors"
              >
                <div className="font-medium">Deactivate</div>
                <div className="text-sm opacity-75">Hide from selection, keep for records</div>
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id, true)}
                className="w-full px-4 py-2 text-left bg-red-50 dark:bg-red-900/20 
                         text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 
                         dark:hover:bg-red-900/30 transition-colors"
              >
                <div className="font-medium">Delete Permanently</div>
                <div className="text-sm opacity-75">Remove completely (cannot be undone)</div>
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 
                         dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 
                         transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CataloguePage;
