/**
 * Quote React Query Hooks
 * 
 * @author BookkeepingApp Team
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import quoteService from '../../../services/quoteService';
import toast from 'react-hot-toast';

export function useQuotes(options = {}) {
  return useQuery({
    queryKey: ['quotes', options],
    queryFn: async () => {
      const result = await quoteService.getQuotes(options);
      // Return in format expected by QuoteList: { quotes: [...], total: ... }
      return { 
        quotes: result?.data || result?.quotes || [], 
        total: result?.total || 0 
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useQuote(id) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      const result = await quoteService.getQuote(id);
      // Return in format expected by QuoteForm: { quote: {...} }
      return { quote: result?.data || result };
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (quoteData) => quoteService.createQuote(quoteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create quote');
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    // Accept both { id, updates } and { id, data } for flexibility
    mutationFn: ({ id, updates, data }) => quoteService.updateQuote(id, updates || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update quote');
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => quoteService.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete quote');
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }) => quoteService.updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote status updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

export function useConvertQuoteToInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, paymentTerms }) => quoteService.convertQuoteToInvoice(id, paymentTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Quote converted to invoice');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to convert quote');
    },
  });
}

export function useDuplicateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => quoteService.duplicateQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote duplicated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to duplicate quote');
    },
  });
}

export function useDownloadQuotePDF() {
  return useMutation({
    mutationFn: (id) => quoteService.downloadQuotePDF(id),
    onSuccess: () => {
      toast.success('PDF downloaded');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to download PDF');
    },
  });
}

export function useSendQuoteEmail() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => quoteService.sendQuoteEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote sent via email');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send quote');
    },
  });
}
