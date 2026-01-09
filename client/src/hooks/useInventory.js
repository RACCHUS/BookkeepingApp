/**
 * @fileoverview Inventory Hooks - React Query hooks for inventory management
 * @description Custom hooks for fetching and mutating inventory data
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';

/**
 * Hook to fetch inventory items
 * @param {object} filters - Filter options (companyId, category, lowStock, search)
 * @param {object} options - Additional React Query options
 */
export function useInventoryItems(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['inventory', 'items', filters],
    queryFn: () => inventoryService.getAll(filters),
    ...options
  });
}

/**
 * Hook to fetch a single inventory item by ID
 * @param {string} itemId - Item ID
 * @param {object} options - Additional React Query options
 */
export function useInventoryItem(itemId, options = {}) {
  return useQuery({
    queryKey: ['inventory', 'item', itemId],
    queryFn: () => inventoryService.getById(itemId),
    enabled: !!itemId,
    ...options
  });
}

/**
 * Hook to create an inventory item
 */
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData) => inventoryService.create(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}

/**
 * Hook to update an inventory item
 */
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }) => inventoryService.update(itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'item', itemId] });
    }
  });
}

/**
 * Hook to delete an inventory item
 */
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId) => inventoryService.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}

/**
 * Hook to adjust stock for an item
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }) => inventoryService.adjustStock(itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'item', itemId] });
    }
  });
}

/**
 * Hook to record a sale
 */
export function useRecordSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }) => inventoryService.recordSale(itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'item', itemId] });
    }
  });
}

/**
 * Hook to record a purchase
 */
export function useRecordPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }) => inventoryService.recordPurchase(itemId, data),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'item', itemId] });
    }
  });
}

/**
 * Hook to fetch inventory valuation report
 * @param {object} params - Query parameters (companyId)
 * @param {object} options - Additional React Query options
 */
export function useInventoryValuation(params = {}, options = {}) {
  return useQuery({
    queryKey: ['inventory', 'valuation', params],
    queryFn: () => inventoryService.getValuation(params),
    ...options
  });
}

/**
 * Hook to fetch low stock items
 * @param {object} params - Query parameters (companyId)
 * @param {object} options - Additional React Query options
 */
export function useLowStockItems(params = {}, options = {}) {
  return useQuery({
    queryKey: ['inventory', 'low-stock', params],
    queryFn: () => inventoryService.getLowStock(params),
    ...options
  });
}

/**
 * Hook to fetch inventory transactions
 * @param {object} params - Query parameters (itemId, companyId, type, startDate, endDate)
 * @param {object} options - Additional React Query options
 */
export function useInventoryTransactions(params = {}, options = {}) {
  return useQuery({
    queryKey: ['inventory', 'transactions', params],
    queryFn: () => inventoryService.getTransactions(params),
    ...options
  });
}

/**
 * Hook to fetch inventory categories
 * @param {object} options - Additional React Query options
 */
export function useInventoryCategories(options = {}) {
  return useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => inventoryService.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
}
