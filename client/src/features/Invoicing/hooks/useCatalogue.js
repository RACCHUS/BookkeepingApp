/**
 * Catalogue React Query Hooks
 * 
 * Data fetching hooks for catalogue management
 * 
 * @author BookkeepingApp Team
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import catalogueService from '../../../services/catalogueService';
import toast from 'react-hot-toast';

/**
 * Hook to fetch catalogue items
 * @param {Object} options - Query options
 */
export function useCatalogueItems(options = {}) {
  return useQuery({
    queryKey: ['catalogue', options],
    queryFn: () => catalogueService.getCatalogueItems(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single catalogue item
 * @param {string} id - Item ID
 */
export function useCatalogueItem(id) {
  return useQuery({
    queryKey: ['catalogue', id],
    queryFn: () => catalogueService.getCatalogueItem(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch categories
 * @param {string} companyId - Optional company ID
 */
export function useCategories(companyId = null) {
  return useQuery({
    queryKey: ['catalogue-categories', companyId],
    queryFn: () => catalogueService.getCategories(companyId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to create a catalogue item
 */
export function useCreateCatalogueItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itemData) => catalogueService.createCatalogueItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue'] });
      toast.success('Item created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create item');
    },
  });
}

/**
 * Hook to update a catalogue item
 */
export function useUpdateCatalogueItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }) => catalogueService.updateCatalogueItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue'] });
      toast.success('Item updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });
}

/**
 * Hook to delete a catalogue item
 */
export function useDeleteCatalogueItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, hard = false }) => catalogueService.deleteCatalogueItem(id, hard),
    onSuccess: (_, { hard }) => {
      queryClient.invalidateQueries({ queryKey: ['catalogue'] });
      toast.success(hard ? 'Item permanently deleted' : 'Item deactivated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });
}

/**
 * Hook to duplicate a catalogue item
 */
export function useDuplicateCatalogueItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => catalogueService.duplicateCatalogueItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue'] });
      toast.success('Item duplicated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to duplicate item');
    },
  });
}
