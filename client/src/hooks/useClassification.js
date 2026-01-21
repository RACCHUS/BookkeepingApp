/**
 * React Query Hook for Transaction Classification
 * 
 * Provides hooks for:
 * - Classifying new transactions during import
 * - Fetching and managing classification rules
 * - Getting classification statistics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  classifyTransactions, 
  fetchUserRules, 
  saveClassificationRule,
  getClassificationStats,
  batchClassifyLocal,
} from '../services/classificationService';

/**
 * Hook to fetch user's classification rules
 */
export function useClassificationRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['classification-rules', user?.id],
    queryFn: () => fetchUserRules(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get classification statistics
 */
export function useClassificationStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['classification-stats', user?.id],
    queryFn: () => getClassificationStats(user?.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to classify a batch of transactions
 * Used during CSV/PDF import
 */
export function useClassifyTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactions, skipGemini = false }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return classifyTransactions(transactions, user.id, { skipGemini });
    },
    onSuccess: () => {
      // Invalidate relevant queries after classification
      queryClient.invalidateQueries(['classification-stats']);
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['unclassified-transactions']);
    },
    onError: (error) => {
      console.error('Classification error:', error);
    },
  });
}

/**
 * Hook for local-only classification (no Gemini)
 * Faster, no API calls
 */
export function useLocalClassification() {
  const { data: rules = [] } = useClassificationRules();

  const classify = (transactions) => {
    return batchClassifyLocal(transactions, rules);
  };

  return { classify, rules };
}

/**
 * Hook to save a new classification rule
 */
export function useSaveRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return saveClassificationRule(rule, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classification-rules']);
      queryClient.invalidateQueries(['classification-stats']);
    },
    onError: (error) => {
      console.error('Save rule error:', error);
      throw error;
    },
  });
}

/**
 * Hook to delete a classification rule
 */
export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId) => {
      const { error } = await supabase
        .from('classification_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classification-rules']);
      queryClient.invalidateQueries(['classification-stats']);
    },
  });
}

/**
 * Hook to get count of unclassified transactions
 */
export function useUnclassifiedCount(companyId) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unclassified-count', user?.id, companyId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .or('category.is.null,category.eq.');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Import supabase for the hooks that need it
import { supabase } from '../services/supabase';

export default {
  useClassificationRules,
  useClassificationStats,
  useClassifyTransactions,
  useLocalClassification,
  useSaveRule,
  useDeleteRule,
  useUnclassifiedCount,
};
