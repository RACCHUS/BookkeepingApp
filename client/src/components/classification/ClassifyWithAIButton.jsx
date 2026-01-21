/**
 * ClassifyWithAIButton Component
 * 
 * Reusable button for triggering Gemini AI classification
 * Shows progress and handles the full classification flow
 */

import React, { useState } from 'react';
import { SparklesIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useGeminiClassification } from '../../hooks/useGeminiClassification';

/**
 * Compact button for AI classification
 */
export function ClassifyWithAIButton({ 
  transactions, 
  onComplete,
  disabled = false,
  variant = 'primary', // primary, secondary, icon
  size = 'md', // sm, md, lg
  showProgress = true,
  saveRules = true,
}) {
  const { classify, cancel, progress, isClassifying } = useGeminiClassification();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    if (isClassifying) {
      cancel();
      return;
    }

    if (!transactions || transactions.length === 0) {
      return;
    }

    setShowModal(true);
  };

  const handleConfirm = async () => {
    try {
      const result = await classify(transactions, { saveRules });
      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      console.error('Classification failed:', error);
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    if (isClassifying) {
      cancel();
    }
    setShowModal(false);
  };

  // Button styles based on variant and size
  const getButtonStyles = () => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
      secondary: 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50 focus:ring-purple-500 dark:bg-gray-800 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-gray-700',
      icon: 'text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30',
    };

    const sizes = {
      sm: variant === 'icon' ? 'p-1.5' : 'px-3 py-1.5 text-sm gap-1.5',
      md: variant === 'icon' ? 'p-2' : 'px-4 py-2 text-sm gap-2',
      lg: variant === 'icon' ? 'p-2.5' : 'px-5 py-2.5 text-base gap-2',
    };

    return `${base} ${variants[variant]} ${sizes[size]}`;
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || !transactions?.length}
        className={getButtonStyles()}
        title={isClassifying ? 'Cancel classification' : `Classify ${transactions?.length || 0} transactions with AI`}
      >
        {isClassifying ? (
          <StopIcon className={iconSize} />
        ) : (
          <SparklesIcon className={iconSize} />
        )}
        {variant !== 'icon' && (
          <span>
            {isClassifying 
              ? `Classifying... (${progress.currentBatch}/${progress.totalBatches})`
              : 'Classify with AI'
            }
          </span>
        )}
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <ClassificationModal
          transactions={transactions}
          progress={progress}
          isClassifying={isClassifying}
          saveRules={saveRules}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

/**
 * Modal for classification confirmation and progress
 */
function ClassificationModal({ 
  transactions, 
  progress, 
  isClassifying, 
  saveRules,
  onConfirm, 
  onCancel 
}) {
  const count = transactions?.length || 0;
  const estimatedBatches = Math.ceil(count / 200);
  const estimatedTime = estimatedBatches * 5; // ~5 seconds per batch

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={!isClassifying ? onCancel : undefined}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Close button */}
          {!isClassifying && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Classification
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Powered by Gemini
              </p>
            </div>
          </div>

          {/* Content */}
          {!isClassifying ? (
            <>
              <div className="space-y-3 mb-6">
                <p className="text-gray-600 dark:text-gray-300">
                  Classify <span className="font-semibold text-purple-600 dark:text-purple-400">{count}</span> unclassified 
                  transactions using AI?
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Estimated batches:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{estimatedBatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Estimated time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">~{estimatedTime} seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Save as rules:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{saveRules ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  High-confidence classifications will be saved as rules for future transactions.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Start Classification
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Progress view */}
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Processing batch {progress.currentBatch} of {progress.totalBatches}
                    </span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {Math.round((progress.currentBatch / progress.totalBatches) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.currentBatch / progress.totalBatches) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {progress.classified}
                    </div>
                    <div className="text-xs text-green-600/70 dark:text-green-400/70">Classified</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {progress.failed}
                    </div>
                    <div className="text-xs text-red-600/70 dark:text-red-400/70">Failed</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                    <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                      {progress.rulesCreated}
                    </div>
                    <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Rules</div>
                  </div>
                </div>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 animate-pulse">
                  Please wait while AI processes your transactions...
                </p>
              </div>

              <button
                onClick={onCancel}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Cancel Classification
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline progress bar for non-modal use
 */
export function ClassificationProgress({ progress }) {
  if (!progress.isRunning) return null;

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-purple-700 dark:text-purple-300">
          AI Classification in progress...
        </span>
        <span className="font-medium text-purple-600 dark:text-purple-400">
          Batch {progress.currentBatch}/{progress.totalBatches}
        </span>
      </div>
      <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
        <div 
          className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(progress.currentBatch / progress.totalBatches) * 100}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs text-purple-600 dark:text-purple-400">
        <span>✓ {progress.classified} classified</span>
        <span>✗ {progress.failed} failed</span>
        <span>📋 {progress.rulesCreated} rules created</span>
      </div>
    </div>
  );
}

export default ClassifyWithAIButton;
