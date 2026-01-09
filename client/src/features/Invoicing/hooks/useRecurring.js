/**
 * Recurring Invoice Hooks
 * 
 * React Query hooks for recurring invoice schedule operations
 * 
 * @author BookkeepingApp Team
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import recurringService from '../../../services/recurringService';
import toast from 'react-hot-toast';

const QUERY_KEY = 'recurring-schedules';

/**
 * Hook to fetch all recurring schedules
 */
export function useRecurringSchedules(params = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => recurringService.getRecurringSchedules(params)
  });
}

/**
 * Hook to fetch a single recurring schedule
 */
export function useRecurringSchedule(id, options = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => recurringService.getRecurringSchedule(id),
    enabled: !!id && options.enabled !== false
  });
}

/**
 * Hook to create a recurring schedule
 */
export function useCreateRecurringSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => recurringService.createRecurringSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Recurring schedule created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create recurring schedule');
    }
  });
}

/**
 * Hook to create recurring schedule from invoice
 */
export function useCreateRecurringFromInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId, options }) => 
      recurringService.createFromInvoice(invoiceId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Recurring schedule created from invoice');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create recurring schedule');
    }
  });
}

/**
 * Hook to update a recurring schedule
 */
export function useUpdateRecurringSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => recurringService.updateRecurringSchedule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
      toast.success('Recurring schedule updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update recurring schedule');
    }
  });
}

/**
 * Hook to delete a recurring schedule
 */
export function useDeleteRecurringSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => recurringService.deleteRecurringSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Recurring schedule deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete recurring schedule');
    }
  });
}

/**
 * Hook to pause a recurring schedule
 */
export function usePauseRecurringSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => recurringService.pauseRecurringSchedule(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
      toast.success('Recurring schedule paused');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to pause recurring schedule');
    }
  });
}

/**
 * Hook to resume a recurring schedule
 */
export function useResumeRecurringSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => recurringService.resumeRecurringSchedule(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
      toast.success('Recurring schedule resumed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resume recurring schedule');
    }
  });
}

/**
 * Hook to manually process recurring invoices
 */
export function useProcessRecurringInvoices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => recurringService.processRecurringInvoices(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Processed ${result.processed} recurring invoice(s)`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to process recurring invoices');
    }
  });
}
