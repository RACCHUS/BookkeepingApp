/**
 * Tax Forms Dashboard
 * 
 * Main dashboard for viewing and generating IRS tax forms (1099-NEC, 1099-MISC, W-2)
 * 
 * @author BookkeepingApp Team
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon,
  CalendarIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { Form1099List } from './Form1099List';
import { FormW2List } from './FormW2List';
import { MissingInfoAlert } from './MissingInfoAlert';
import taxFormService from '../../services/taxFormService';
import { useBulkGenerate1099NEC, useBulkGenerateW2 } from './hooks/useTaxForms';
import toast from 'react-hot-toast';

/**
 * Main Tax Forms Dashboard Component
 */
export function TaxFormsDashboard() {
  // Default to previous year for tax filing
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [activeTab, setActiveTab] = useState('1099-nec');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Fetch tax form summary
  const { 
    data: summaryData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['taxFormSummary', taxYear, selectedCompanyId],
    queryFn: () => taxFormService.getTaxFormSummary(taxYear, selectedCompanyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Bulk generation mutations
  const bulkGenerate1099 = useBulkGenerate1099NEC();
  const bulkGenerateW2 = useBulkGenerateW2();

  const handleBulkGenerate1099 = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company');
      return;
    }
    await bulkGenerate1099.mutateAsync({ companyId: selectedCompanyId, taxYear });
    refetch();
  };

  const handleBulkGenerateW2 = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company');
      return;
    }
    await bulkGenerateW2.mutateAsync({ companyId: selectedCompanyId, taxYear });
    refetch();
  };

  // Year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  // Tab configuration
  const tabs = [
    { id: '1099-nec', label: '1099-NEC', icon: DocumentTextIcon },
    { id: 'w2', label: 'W-2', icon: UserGroupIcon },
  ];

  // Stats from summary
  const form1099Stats = summaryData?.form1099NEC || {};
  const formW2Stats = summaryData?.formW2 || {};
  const missingInfo = summaryData?.missingInfo || {};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tax Forms
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate IRS tax forms for contractors and employees
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <div className="flex items-center">
            <CalendarIcon className="w-5 h-5 text-gray-400 mr-2" />
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(parseInt(e.target.value))}
              className="block w-32 rounded-md border-gray-300 dark:border-gray-600 
                       dark:bg-gray-800 dark:text-white shadow-sm 
                       focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Tax Year {year}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                     dark:hover:text-gray-200"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkGenerate1099}
            disabled={!selectedCompanyId || bulkGenerate1099.isPending || form1099Stats.eligible === 0}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white 
                     bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 
                     disabled:cursor-not-allowed"
          >
            <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
            {bulkGenerate1099.isPending ? 'Generating...' : 'Bulk 1099-NEC'}
          </button>
          <button
            onClick={handleBulkGenerateW2}
            disabled={!selectedCompanyId || bulkGenerateW2.isPending || formW2Stats.employees === 0}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white 
                     bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 
                     disabled:cursor-not-allowed"
          >
            <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
            {bulkGenerateW2.isPending ? 'Generating...' : 'Bulk W-2'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* 1099-NEC Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">1099-NEC Eligible</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {form1099Stats.eligible || 0}
              </p>
            </div>
          </div>
        </div>

        {/* 1099 Total Amount */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">1099 Total</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${(form1099Stats.totalAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* W-2 Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">W-2 Employees</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formW2Stats.employees || 0}
              </p>
            </div>
          </div>
        </div>

        {/* W-2 Total Wages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Wages</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${(formW2Stats.totalWages || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deadlines Reminder */}
      {summaryData?.deadlines && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 
                      rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <CalendarIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Filing Deadlines for {taxYear}
              </h3>
              <ul className="mt-1 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• 1099-NEC: {summaryData.deadlines.form1099NEC}</li>
                <li>• W-2: {summaryData.deadlines.formW2}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Missing Info Alerts */}
      {activeTab === '1099-nec' && missingInfo.form1099NEC?.length > 0 && (
        <MissingInfoAlert 
          payees={missingInfo.form1099NEC} 
          formType="1099-NEC"
        />
      )}
      {activeTab === 'w2' && missingInfo.formW2?.length > 0 && (
        <MissingInfoAlert 
          payees={missingInfo.formW2} 
          formType="W-2"
        />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
              {tab.id === '1099-nec' && form1099Stats.eligible > 0 && (
                <span className="ml-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 
                               dark:text-purple-400 text-xs px-2 py-0.5 rounded-full">
                  {form1099Stats.eligible}
                </span>
              )}
              {tab.id === 'w2' && formW2Stats.employees > 0 && (
                <span className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 
                               dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                  {formW2Stats.employees}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3" />
            <p>Failed to load tax form data</p>
            <button 
              onClick={() => refetch()}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {activeTab === '1099-nec' && (
              <Form1099List
                payees={form1099Stats.payees || []}
                companyId={selectedCompanyId}
                taxYear={taxYear}
                threshold={form1099Stats.threshold || 600}
              />
            )}
            {activeTab === 'w2' && (
              <FormW2List
                employees={formW2Stats.payees || []}
                companyId={selectedCompanyId}
                taxYear={taxYear}
              />
            )}
          </>
        )}
      </div>

      {/* Compliance Notice */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 
                    rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Important Compliance Information
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Generated forms are for recipient copies (Copy B, C, 2) only.</li>
          <li>• Copy A for IRS/SSA filing requires e-filing or official red scannable forms.</li>
          <li>• If filing 10+ forms, e-filing is required.</li>
          <li>• Verify all information before distributing to recipients.</li>
        </ul>
      </div>
    </div>
  );
}

export default TaxFormsDashboard;
