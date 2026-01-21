/**
 * Classification Feature Module
 * 
 * Exports components and utilities for transaction classification
 */

export { default as ManualReviewQueue } from './ManualReviewQueue';
export { default as RulesManagement } from './RulesManagement';

// Re-export hooks for convenience
export { 
  useClassificationRules,
  useClassificationStats,
  useClassifyTransactions,
  useLocalClassification,
  useSaveRule,
  useDeleteRule,
  useUnclassifiedCount,
} from '../../hooks/useClassification';

// Re-export Gemini classification hook
export { 
  useGeminiClassification,
  useUnclassifiedTransactions,
} from '../../hooks/useGeminiClassification';

// Re-export service functions
export {
  classifyLocal,
  batchClassifyLocal,
  classifyTransactions,
  cleanDescription,
  extractVendor,
  CLASSIFICATION_SOURCE,
} from '../../services/classificationService';
