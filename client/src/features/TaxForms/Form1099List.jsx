/**
 * Form 1099 List Component
 * 
 * Displays list of contractors eligible for 1099-NEC forms
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  DocumentArrowDownIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { TaxFormPreview } from './TaxFormPreview';
import taxFormService from '../../services/taxFormService';
import toast from 'react-hot-toast';

/**
 * List of contractors eligible for 1099-NEC
 * @param {Object} props
 * @param {Array} props.payees - Eligible payees with payment info
 * @param {string} props.companyId - Company ID
 * @param {number} props.taxYear - Tax year
 * @param {number} props.threshold - Filing threshold (default $600)
 */
export function Form1099List({ payees = [], companyId, taxYear, threshold = 600 }) {
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPayeeId, setLoadingPayeeId] = useState(null);

  const handlePreview = async (payee) => {
    try {
      setLoadingPayeeId(payee.payeeId);
      const data = await taxFormService.preview1099NEC(payee.payeeId, { companyId, taxYear });
      setPreviewData(data);
      setSelectedPayee(payee);
      setIsPreviewOpen(true);
    } catch (error) {
      toast.error(error.message || 'Failed to load preview');
    } finally {
      setLoadingPayeeId(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPayee) return;
    
    try {
      setIsGenerating(true);
      const blob = await taxFormService.generate1099NEC(selectedPayee.payeeId, { 
        companyId, 
        taxYear 
      });
      const fileName = `1099-NEC_${taxYear}_${selectedPayee.payeeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      taxFormService.downloadBlob(blob, fileName);
      toast.success('1099-NEC downloaded successfully');
      setIsPreviewOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to generate 1099-NEC');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickGenerate = async (payee) => {
    try {
      setLoadingPayeeId(payee.payeeId);
      const blob = await taxFormService.generate1099NEC(payee.payeeId, { companyId, taxYear });
      const fileName = `1099-NEC_${taxYear}_${payee.payeeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      taxFormService.downloadBlob(blob, fileName);
      toast.success('1099-NEC downloaded');
    } catch (error) {
      toast.error(error.message || 'Failed to generate');
    } finally {
      setLoadingPayeeId(null);
    }
  };

  if (payees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No contractors with payments of ${threshold}+ found for {taxYear}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {payees.map((payee) => {
              const isComplete = payee.hasTaxId && payee.hasAddress;
              const isLoading = loadingPayeeId === payee.payeeId;
              
              return (
                <tr key={payee.payeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-purple-100 dark:bg-purple-900/30 
                                    rounded-full flex items-center justify-center">
                        <DocumentTextIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payee.payeeName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {payee.hasTaxId ? 'Tax ID on file' : 'Missing Tax ID'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${payee.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    {payee.amount >= threshold && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Meets ${threshold} threshold
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isComplete ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs 
                                     font-medium bg-green-100 text-green-800 dark:bg-green-900/30 
                                     dark:text-green-400">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs 
                                     font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 
                                     dark:text-amber-400">
                        <ExclamationCircleIcon className="w-3 h-3 mr-1" />
                        Incomplete
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handlePreview(payee)}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 
                                 dark:hover:text-blue-300 p-1"
                        title="Preview"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleQuickGenerate(payee)}
                        disabled={!isComplete || isLoading}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 
                                 dark:hover:text-green-300 p-1 disabled:opacity-50 
                                 disabled:cursor-not-allowed"
                        title="Download"
                      >
                        {isLoading ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <DocumentArrowDownIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <TaxFormPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </>
  );
}

export default Form1099List;
