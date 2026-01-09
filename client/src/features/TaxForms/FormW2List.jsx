/**
 * Form W-2 List Component
 * 
 * Displays list of employees for W-2 generation
 * 
 * @author BookkeepingApp Team
 */

import React, { useState } from 'react';
import { 
  UserIcon, 
  DocumentArrowDownIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { TaxFormPreview } from './TaxFormPreview';
import taxFormService from '../../services/taxFormService';
import toast from 'react-hot-toast';

/**
 * List of employees for W-2 generation
 * @param {Object} props
 * @param {Array} props.employees - Employees with wage info
 * @param {string} props.companyId - Company ID
 * @param {number} props.taxYear - Tax year
 */
export function FormW2List({ employees = [], companyId, taxYear }) {
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState(null);

  const handlePreview = async (employee) => {
    try {
      setLoadingEmployeeId(employee.employeeId);
      const data = await taxFormService.previewW2(employee.employeeId, null, { companyId });
      setPreviewData(data);
      setSelectedEmployee(employee);
      setIsPreviewOpen(true);
    } catch (error) {
      toast.error(error.message || 'Failed to load preview');
    } finally {
      setLoadingEmployeeId(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedEmployee || !previewData?.data?.boxes) return;
    
    // Build wage data from preview
    const wageData = {
      wages: parseFloat(previewData.data.boxes.box1_wages) || 0,
      federalWithholding: parseFloat(previewData.data.boxes.box2_fedWithheld) || 0,
      socialSecurityWages: parseFloat(previewData.data.boxes.box3_ssWages) || 0,
      socialSecurityTax: parseFloat(previewData.data.boxes.box4_ssTax) || 0,
      medicareWages: parseFloat(previewData.data.boxes.box5_medicareWages) || 0,
      medicareTax: parseFloat(previewData.data.boxes.box6_medicareTax) || 0
    };
    
    try {
      setIsGenerating(true);
      const blob = await taxFormService.generateW2(selectedEmployee.employeeId, wageData, { 
        companyId
      });
      const fileName = `W-2_${taxYear}_${selectedEmployee.employeeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      taxFormService.downloadBlob(blob, fileName);
      toast.success('W-2 downloaded successfully');
      setIsPreviewOpen(false);
    } catch (error) {
      toast.error(error.message || 'Failed to generate W-2');
    } finally {
      setIsGenerating(false);
    }
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No employees with wages found for {taxYear}</p>
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
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Wages
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
            {employees.map((employee) => {
              const isComplete = employee.hasTaxId && employee.hasAddress;
              const isLoading = loadingEmployeeId === employee.employeeId;
              
              return (
                <tr key={employee.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 
                                    rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {employee.employeeName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {employee.hasTaxId ? 'SSN on file' : 'Missing SSN'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${employee.wages?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
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
                        onClick={() => handlePreview(employee)}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 
                                 dark:hover:text-blue-300 p-1"
                        title="Preview"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePreview(employee)} // Preview first, then generate
                        disabled={!isComplete || isLoading}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 
                                 dark:hover:text-green-300 p-1 disabled:opacity-50 
                                 disabled:cursor-not-allowed"
                        title="Generate"
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

export default FormW2List;
