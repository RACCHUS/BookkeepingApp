/**
 * Tax Form Preview Modal
 * 
 * Modal component for previewing tax form data before generation
 * 
 * @author BookkeepingApp Team
 */

import React from 'react';
import { XMarkIcon, DocumentArrowDownIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Modal for previewing tax form data
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.previewData - Preview data from API
 * @param {Function} props.onGenerate - Generate form handler
 * @param {boolean} props.isGenerating - Loading state for generation
 */
export function TaxFormPreview({ isOpen, onClose, previewData, onGenerate, isGenerating }) {
  if (!isOpen || !previewData) return null;

  const { formType, taxYear, isValid, errors = [], warnings = [], data } = previewData;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle 
                      transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formType} Preview - Tax Year {taxYear}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Validation Status */}
            <div className={`flex items-center p-3 rounded-lg ${
              isValid 
                ? 'bg-green-50 dark:bg-green-900/20' 
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              {isValid ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    All required information is complete
                  </span>
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm text-red-700 dark:text-red-300">
                    Missing required information
                  </span>
                </>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Errors:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Warnings:</h4>
                <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form Data Preview */}
            {data && (
              <div className="grid grid-cols-2 gap-6">
                {/* Payer/Employer */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formType === 'W-2' ? 'Employer' : 'Payer'}
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {data.payer?.name || data.employer?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {data.payer?.address || data.employer?.address}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {data.payer?.cityStateZip || data.employer?.cityStateZip}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      TIN: {data.payer?.tin || data.employer?.ein || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Recipient/Employee */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formType === 'W-2' ? 'Employee' : 'Recipient'}
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {data.recipient?.name || data.employee?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {data.recipient?.address || data.employee?.address}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {data.recipient?.cityStateZip || data.employee?.cityStateZip}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      TIN: {data.recipient?.tin || data.employee?.ssn || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Boxes */}
            {data?.boxes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Form Boxes
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(data.boxes).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {key.replace(/^box\d+_/, '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ${value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Important:</strong> Generated forms are for recipient copies (Copy B, C, 2). 
                Copy A for IRS filing must be e-filed or submitted on official IRS-approved forms.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                       rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onGenerate}
              disabled={!isValid || isGenerating}
              className="flex items-center px-4 py-2 text-sm font-medium text-white 
                       bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 
                       disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Generate PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxFormPreview;
