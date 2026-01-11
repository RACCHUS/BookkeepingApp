/**
 * @fileoverview Inventory Page - Main inventory management view
 * @description Root component for inventory feature with tabs for items, transactions, and reports
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import InventoryList from './InventoryList';
import InventoryItemForm from './InventoryItemForm';
import StockAdjustmentModal from './StockAdjustmentModal';
import InventoryReports from './InventoryReports';
import LowStockAlert from './LowStockAlert';
import { 
  useInventoryItems, 
  useCreateInventoryItem, 
  useUpdateInventoryItem, 
  useDeleteInventoryItem,
  useLowStockItems
} from '../../hooks/useInventory';
import api from '../../services/api';
import { useQuery } from '@tanstack/react-query';

const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [filters, setFilters] = useState({
    companyId: '',
    category: '',
    search: '',
    lowStock: false
  });

  const queryClient = useQueryClient();

  // Fetch companies for filter dropdown
  const { data: companiesResponse } = useQuery({
    queryKey: ['companies'],
    queryFn: api.companies.getAll,
    staleTime: 5 * 60 * 1000
  });
  // Server returns { success: true, data: [...] }
  // Supabase returns { success: true, data: { companies: [...] } }
  const companiesRaw = Array.isArray(companiesResponse?.data) 
    ? companiesResponse.data 
    : companiesResponse?.data?.companies;
  const companies = Array.isArray(companiesRaw) ? companiesRaw : [];

  // Fetch inventory items
  const { data: itemsResponse, isLoading, error, refetch } = useInventoryItems(filters);
  // Server returns { success: true, data: [...] }
  // Supabase returns { success: true, data: { items: [...], total: N } }
  const itemsRaw = Array.isArray(itemsResponse?.data) 
    ? itemsResponse.data 
    : itemsResponse?.data?.items;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  // Fetch low stock items
  const { data: lowStockResponse } = useLowStockItems({ companyId: filters.companyId });
  // Same pattern for low stock items
  const lowStockRaw = Array.isArray(lowStockResponse?.data) 
    ? lowStockResponse.data 
    : lowStockResponse?.data?.items;
  const lowStockItems = Array.isArray(lowStockRaw) ? lowStockRaw : [];

  // Mutations
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const handleCreateItem = () => {
    setSelectedItem(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleAdjustStock = (item) => {
    setSelectedItem(item);
    setIsAdjustModalOpen(true);
  };

  const handleDeleteItem = async (itemId, itemName) => {
    if (window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync(itemId);
        toast.success('Item deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete item');
      }
    }
  };

  const handleSaveItem = async (itemData) => {
    try {
      if (modalMode === 'create') {
        await createMutation.mutateAsync(itemData);
        toast.success('Item created successfully');
      } else {
        await updateMutation.mutateAsync({ itemId: selectedItem.id, data: itemData });
        toast.success('Item updated successfully');
      }
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to save item';
      toast.error(message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleCloseAdjustModal = () => {
    setIsAdjustModalOpen(false);
    setSelectedItem(null);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'items', label: 'Inventory Items', count: items.length },
    { id: 'reports', label: 'Reports' }
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading inventory</h3>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error.message}</p>
          <button 
            onClick={() => refetch()} 
            className="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your products and track stock levels
          </p>
        </div>
        <button
          onClick={handleCreateItem}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <LowStockAlert items={lowStockItems} onViewItem={handleEditItem} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' && (
        <InventoryList
          items={items}
          isLoading={isLoading}
          filters={filters}
          companies={companies}
          onFilterChange={handleFilterChange}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onAdjustStock={handleAdjustStock}
        />
      )}

      {activeTab === 'reports' && (
        <InventoryReports companyId={filters.companyId} />
      )}

      {/* Item Form Modal */}
      {isModalOpen && (
        <InventoryItemForm
          item={selectedItem}
          mode={modalMode}
          companies={companies}
          onSave={handleSaveItem}
          onClose={handleCloseModal}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedItem && (
        <StockAdjustmentModal
          item={selectedItem}
          onClose={handleCloseAdjustModal}
        />
      )}
    </div>
  );
};

export default InventoryPage;
