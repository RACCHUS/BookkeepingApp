/**
 * Invoice React Query Hooks
 * 
 * @author BookkeepingApp Team
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import invoiceService from '../../../services/invoiceService';
import toast from 'react-hot-toast';

export function useInvoices(options = {}) {
  return useQuery({
    queryKey: ['invoices', 'list', options],
    queryFn: async () => {
      const response = await invoiceService.getInvoices(options);
      // Transform to expected format: { invoices: [...], total: ... }
      return {
        invoices: response?.data || [],
        total: response?.total || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoices', 'detail', id],
    queryFn: async () => {
      const response = await invoiceService.getInvoice(id);
      // Transform to expected format: { invoice: {...} }
      return {
        invoice: response?.data || null,
      };
    },
    enabled: !!id,
  });
}

export function useInvoiceSummary(options = {}) {
  return useQuery({
    queryKey: ['invoices', 'summary', options],
    queryFn: async () => {
      const response = await invoiceService.getInvoiceSummary(options);
      // Return the summary data directly
      return response?.data || {};
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (invoiceData) => invoiceService.createInvoice(invoiceData),
    onSuccess: () => {
      // Invalidate all invoice-related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });
}

export function useCreateInvoiceFromQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ quoteId, paymentTerms }) => invoiceService.createInvoiceFromQuote(quoteId, paymentTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['quotes'], refetchType: 'all' });
      toast.success('Invoice created from quote');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, data }) => invoiceService.updateInvoice(id, updates || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update invoice');
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    // Accept either just id or { id, permanent } object
    mutationFn: (params) => {
      const id = typeof params === 'object' ? params.id : params;
      const permanent = typeof params === 'object' ? params.permanent : true;
      return invoiceService.deleteInvoice(id, permanent);
    },
    onSuccess: (_, params) => {
      const permanent = typeof params === 'object' ? params.permanent : true;
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      toast.success(permanent ? 'Invoice deleted' : 'Invoice voided');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete invoice');
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId, paymentData }) => invoiceService.recordPayment(invoiceId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      toast.success('Payment recorded');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId, paymentId }) => invoiceService.deletePayment(invoiceId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment removed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove payment');
    },
  });
}

export function useDownloadInvoicePDF() {
  return useMutation({
    mutationFn: (id) => invoiceService.downloadInvoicePDF(id),
    onSuccess: () => {
      toast.success('PDF downloaded');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to download PDF');
    },
  });
}

export function useSendInvoiceEmail() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => invoiceService.sendInvoiceEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent via email');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send invoice');
    },
  });
}
