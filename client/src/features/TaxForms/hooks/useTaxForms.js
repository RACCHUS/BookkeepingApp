/**
 * Tax Forms Custom Hook
 * 
 * React Query hooks for tax form data fetching and mutations
 * 
 * @author BookkeepingApp Team
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import taxFormService from '../../../services/taxFormService';
import toast from 'react-hot-toast';

/**
 * Hook to fetch tax form summary
 * @param {number} taxYear - Tax year
 * @param {string} companyId - Company ID (optional)
 */
export function useTaxFormSummary(taxYear, companyId = null) {
  return useQuery({
    queryKey: ['taxFormSummary', taxYear, companyId],
    queryFn: () => taxFormService.getTaxFormSummary(taxYear, companyId),
    enabled: !!taxYear,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch payees with missing tax info
 * @param {Object} options - Query options
 */
export function useMissingTaxInfo(options = {}) {
  return useQuery({
    queryKey: ['missingTaxInfo', options],
    queryFn: () => taxFormService.getMissingInfo(options),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to preview 1099-NEC
 * @param {string} payeeId - Payee ID
 * @param {Object} options - Query options
 */
export function usePreview1099NEC(payeeId, options = {}) {
  return useQuery({
    queryKey: ['preview1099NEC', payeeId, options],
    queryFn: () => taxFormService.preview1099NEC(payeeId, options),
    enabled: !!payeeId,
  });
}

/**
 * Hook to preview W-2
 * @param {string} employeeId - Employee ID
 * @param {Object} wageData - Wage data (optional)
 * @param {Object} options - Query options
 */
export function usePreviewW2(employeeId, wageData = null, options = {}) {
  return useQuery({
    queryKey: ['previewW2', employeeId, wageData, options],
    queryFn: () => taxFormService.previewW2(employeeId, wageData, options),
    enabled: !!employeeId,
  });
}

/**
 * Hook for generating 1099-NEC
 */
export function useGenerate1099NEC() {
  return useMutation({
    mutationFn: async ({ payeeId, options }) => {
      const blob = await taxFormService.generate1099NEC(payeeId, options);
      const fileName = `1099-NEC_${options.taxYear || new Date().getFullYear() - 1}.pdf`;
      taxFormService.downloadBlob(blob, fileName);
      return { success: true };
    },
    onSuccess: () => {
      toast.success('1099-NEC generated and downloaded');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate 1099-NEC');
    }
  });
}

/**
 * Hook for generating W-2
 */
export function useGenerateW2() {
  return useMutation({
    mutationFn: async ({ employeeId, wageData, options }) => {
      const blob = await taxFormService.generateW2(employeeId, wageData, options);
      const fileName = `W-2_${options.taxYear || new Date().getFullYear() - 1}.pdf`;
      taxFormService.downloadBlob(blob, fileName);
      return { success: true };
    },
    onSuccess: () => {
      toast.success('W-2 generated and downloaded');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate W-2');
    }
  });
}

/**
 * Hook for bulk generating 1099-NECs
 */
export function useBulkGenerate1099NEC() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyId, taxYear }) => {
      return taxFormService.bulkGenerate1099NEC(companyId, taxYear);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['taxFormSummary']);
      toast.success(`Generated ${data.summary.generated} 1099-NEC forms`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to bulk generate 1099-NECs');
    }
  });
}

/**
 * Hook for bulk generating W-2s
 */
export function useBulkGenerateW2() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyId, taxYear, wageDataMap }) => {
      return taxFormService.bulkGenerateW2(companyId, taxYear, wageDataMap);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['taxFormSummary']);
      toast.success(`Generated ${data.summary.generated} W-2 forms`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to bulk generate W-2s');
    }
  });
}

export default {
  useTaxFormSummary,
  useMissingTaxInfo,
  usePreview1099NEC,
  usePreviewW2,
  useGenerate1099NEC,
  useGenerateW2,
  useBulkGenerate1099NEC,
  useBulkGenerateW2
};
