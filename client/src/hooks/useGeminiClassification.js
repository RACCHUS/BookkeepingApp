/**
 * React Query Hook for Gemini AI Classification
 * 
 * Provides hooks for calling the Gemini-based classification Edge Function
 * and saving the resulting rules back to the database.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { CLASSIFICATION_SOURCE } from '../services/classificationService';
import { toast } from 'react-hot-toast';

// Batch size for Gemini requests (matches Edge Function)
const BATCH_SIZE = 200;

// Rate limit delay between batches (ms)
const BATCH_DELAY = 4500;

/**
 * Call the Gemini classification Edge Function
 * @param {Array} transactions - Transactions to classify
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Classification results
 */
async function callGeminiEdgeFunction(transactions, userId) {
  console.log('Calling Gemini Edge Function with:', {
    transactionCount: transactions.length,
    userId,
    sampleTransaction: JSON.stringify(transactions[0]),
  });

  // Call with headers to bypass JWT requirement (we validate userId in the function)
  const { data, error } = await supabase.functions.invoke('classify-transactions', {
    body: {
      transactions: transactions.map(t => ({
        id: t.id,
        description: t.description || t.payee || '',
        amount: t.amount,
        // Map type correctly: income/expense -> CREDIT/DEBIT, or infer from amount
        type: t.type === 'income' ? 'CREDIT' : 
              t.type === 'expense' ? 'DEBIT' : 
              (t.amount >= 0 ? 'CREDIT' : 'DEBIT'),
      })),
      userId,
    },
    headers: {
      // Pass authorization header with anon key for public edge function
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  console.log('Gemini Edge Function response - data:', JSON.stringify(data, null, 2));
  console.log('Gemini Edge Function response - error:', error);

  if (error) {
    console.error('Gemini Edge Function error:', error);
    throw new Error(error.message || 'Failed to call Gemini classification');
  }

  return data;
}

/**
 * Update transactions with Gemini classifications
 * @param {Array} results - Classification results from Gemini
 * @returns {Promise<Object>} - Update stats
 */
async function updateTransactionsWithClassifications(results) {
  let updated = 0;
  let failed = 0;

  // Neutral categories that should have type='transfer' (not income/expense)
  // Must match EXACTLY with shared/constants/categories.js NEUTRAL_CATEGORIES
  // NOTE: Owner Draw/Distribution is NOT neutral - it's tracked as expense for tax purposes
  const NEUTRAL_CATEGORY_VALUES = [
    'Owner Contribution/Capital',
    'Transfer Between Accounts',
    'Loan Received',
    'Loan Payment (Principal)',
    'Refund Received',
    'Refund Issued',
    'Security Deposit',
    'Security Deposit Return',
    'Escrow Deposit',
    'Escrow Release',
    'Credit Card Payment',
    'Sales Tax Collected',
    'Sales Tax Payment',
    'Payroll Tax Deposit',
    'Reimbursement Received',
    'Reimbursement Paid',
    'Personal Funds Added',
    'Personal Funds Withdrawn',
    'Opening Balance',
    'Balance Adjustment',
  ];

  console.log('updateTransactionsWithClassifications called with', results.length, 'results');
  console.log('Sample result:', JSON.stringify(results[0]));

  for (const result of results) {
    if (!result.category) {
      console.log(`Skipping transaction ${result.id} - no category`);
      continue; // Skip unclassified
    }

    console.log(`Updating transaction ${result.id} with category: ${result.category}`);
    
    // Determine transaction type based on category
    const isNeutralCategory = NEUTRAL_CATEGORY_VALUES.includes(result.category);
    const updateData = {
      category: result.category,
      subcategory: result.subcategory,
      vendor_name: result.vendor,
      classification_source: CLASSIFICATION_SOURCE.GEMINI_API,
      classification_confidence: result.confidence,
      updated_at: new Date().toISOString(),
    };
    
    // Set type to 'transfer' for neutral categories
    if (isNeutralCategory) {
      updateData.type = 'transfer';
    }

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', result.id);

    if (error) {
      console.error(`Failed to update transaction ${result.id}:`, error);
      failed++;
    } else {
      updated++;
    }
  }

  return { updated, failed };
}

/**
 * Save Gemini classifications as reusable rules
 * @param {Array} results - Classification results with high confidence
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of rules created
 */
async function saveGeminiRules(results, userId) {
  let rulesCreated = 0;

  console.log('saveGeminiRules called with', results.length, 'results for user', userId);

  // Vendors that should NOT have rules created (category depends on context/amount)
  const EXCLUDED_VENDORS = [
    // Gas stations - could be gas (Car Expenses) or food/drinks (Meals)
    'WAWA', 'SPEEDWAY', 'SHEETZ', 'SUNOCO', 'SHELL', 'CHEVRON', 'EXXON', 'MOBIL',
    'BP', 'CITGO', '7-ELEVEN', '7 ELEVEN', 'RACETRAC', 'QUIKTRIP', 'QT', 'CIRCLE K',
    'CUMBERLAND FARMS', 'KWIK TRIP', 'LOVES', 'PILOT', 'FLYING J', 'TA TRAVEL',
    'MARATHON', 'VALERO', 'PHILLIPS 66', 'CONOCO', 'ARCO', 'CASEY', 'CASEYS',
    // Big box stores - could be office supplies, materials, personal, etc.
    'WALMART', 'WAL-MART', 'TARGET', 'COSTCO', 'SAM\'S CLUB', 'SAMS CLUB', 'BJ\'S',
    // Amazon - could be anything
    'AMAZON', 'AMZN',
  ];

  // Only save rules for high-confidence classifications (>= 0.75)
  const highConfidenceResults = results.filter(
    r => r.category && r.confidence >= 0.75 && r.vendor
  );

  console.log('High confidence results (>=0.75 with vendor):', highConfidenceResults.length);

  // Group by vendor to avoid duplicate rules
  const vendorMap = new Map();
  for (const result of highConfidenceResults) {
    const vendorKey = result.vendor.toUpperCase();
    
    // Skip excluded vendors
    if (EXCLUDED_VENDORS.some(excluded => vendorKey.includes(excluded))) {
      console.log('Skipping excluded vendor (context-dependent):', result.vendor);
      continue;
    }
    
    if (!vendorMap.has(vendorKey) || vendorMap.get(vendorKey).confidence < result.confidence) {
      vendorMap.set(vendorKey, result);
    }
  }

  console.log('Unique vendors to save as rules:', vendorMap.size);

  for (const result of vendorMap.values()) {
    // Check if rule already exists
    const { data: existing, error: checkError } = await supabase
      .from('classification_rules')
      .select('id')
      .eq('user_id', userId)
      .eq('pattern', result.vendor.toUpperCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing rule:', checkError);
    }

    if (existing) {
      console.log('Rule already exists for:', result.vendor);
      continue;
    }

    console.log('Creating rule for vendor:', result.vendor, 'category:', result.category);

    const { error } = await supabase
      .from('classification_rules')
      .insert({
        user_id: userId,
        name: result.vendor, // Required field - use vendor name as the rule name
        pattern: result.vendor.toUpperCase(),
        pattern_type: 'contains',
        vendor_name: result.vendor,
        category: result.category,
        subcategory: result.subcategory,
        confidence: result.confidence,
        source: 'gemini',
        is_active: true,
        match_count: 0,
      });

    if (error) {
      console.error('Failed to create rule for', result.vendor, '- Error:', JSON.stringify(error));
    } else {
      console.log('Successfully created rule for:', result.vendor);
      rulesCreated++;
    }
  }

  console.log('Total rules created:', rulesCreated);
  return rulesCreated;
}

/**
 * Hook for Gemini AI classification of transactions
 * Handles batching, progress tracking, and rule saving
 */
export function useGeminiClassification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState({
    isRunning: false,
    currentBatch: 0,
    totalBatches: 0,
    classified: 0,
    failed: 0,
    rulesCreated: 0,
  });

  const classifyMutation = useMutation({
    mutationFn: async ({ transactions, saveRules = true }) => {
      // Firebase uses 'uid', not 'id'
      const userId = user?.uid || user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions to classify');
      }

      const totalBatches = Math.ceil(transactions.length / BATCH_SIZE);
      let allResults = [];
      let totalClassified = 0;
      let totalFailed = 0;
      let totalRulesCreated = 0;

      setProgress({
        isRunning: true,
        currentBatch: 0,
        totalBatches,
        classified: 0,
        failed: 0,
        rulesCreated: 0,
      });

      // Process batches
      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = transactions.slice(i, i + BATCH_SIZE);

        setProgress(prev => ({
          ...prev,
          currentBatch: batchNum,
        }));

        try {
          // Call Gemini Edge Function
          const response = await callGeminiEdgeFunction(batch, userId);

          if (response.success && response.results) {
            allResults.push(...response.results);

            // Update transactions in database
            const { updated, failed } = await updateTransactionsWithClassifications(response.results);
            totalClassified += updated;
            totalFailed += failed;

            // Optionally save as rules
            if (saveRules) {
              const rulesCreated = await saveGeminiRules(response.results, userId);
              totalRulesCreated += rulesCreated;
            }

            setProgress(prev => ({
              ...prev,
              classified: totalClassified,
              failed: totalFailed,
              rulesCreated: totalRulesCreated,
            }));
          }

          // Rate limit delay (except for last batch)
          if (i + BATCH_SIZE < transactions.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        } catch (batchError) {
          console.error(`Batch ${batchNum} failed:`, batchError);
          totalFailed += batch.length;
          setProgress(prev => ({
            ...prev,
            failed: totalFailed,
          }));
        }
      }

      setProgress(prev => ({
        ...prev,
        isRunning: false,
      }));

      return {
        results: allResults,
        stats: {
          total: transactions.length,
          classified: totalClassified,
          failed: totalFailed,
          rulesCreated: totalRulesCreated,
        },
      };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['unclassified-transactions']);
      queryClient.invalidateQueries(['uncategorized-transactions']);
      queryClient.invalidateQueries(['classification-rules']);
      queryClient.invalidateQueries(['classification-stats']);

      // Don't show toast here - let the onComplete callback handle it
      // so consumers can customize the message
    },
    onError: (error) => {
      setProgress(prev => ({
        ...prev,
        isRunning: false,
      }));
      console.error('Gemini classification error:', error);
      toast.error(error.message || 'Classification failed');
    },
  });

  const classify = useCallback((transactions, options = {}) => {
    return classifyMutation.mutateAsync({ transactions, ...options });
  }, [classifyMutation]);

  const cancel = useCallback(() => {
    // Note: Can't truly cancel in-flight requests, but can stop processing more batches
    setProgress(prev => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  return {
    classify,
    cancel,
    progress,
    isClassifying: classifyMutation.isPending || progress.isRunning,
    error: classifyMutation.error,
  };
}

/**
 * Hook to get unclassified transactions for Gemini processing
 */
export function useUnclassifiedTransactions(companyId) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unclassified-for-gemini', user?.id, companyId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('id, description, amount, date, payee')
        .eq('user_id', user?.id)
        .or('category.is.null,category.eq.')
        .order('date', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.limit(1000); // Max 1000 at a time

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

// Need to import useQuery
import { useQuery } from '@tanstack/react-query';

export default useGeminiClassification;
