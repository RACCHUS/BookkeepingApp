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
    queryKey: ['invoices', options],
    queryFn: () => invoiceService.getInvoices(options),
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoiceService.getInvoice(id),
    enabled: !!id,
  });
}

export function useInvoiceSummary(options = {}) {
  return useQuery({
    queryKey: ['invoices', 'summary', options],
    queryFn: () => invoiceService.getInvoiceSummary(options),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (invoiceData) => invoiceService.createInvoice(invoiceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
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
    mutationFn: ({ id, updates }) => invoiceService.updateInvoice(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
    mutationFn: ({ id, permanent }) => invoiceService.deleteInvoice(id, permanent),
    onSuccess: (_, { permanent }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
