import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api.js';
import CompanyForm from './CompanyForm.jsx';
import CompanyList from './CompanyList.jsx';
import TransactionCompanyAssignment from './TransactionCompanyAssignment.jsx';

const CompanyManagement = () => {
  const [activeTab, setActiveTab] = useState('companies');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companiesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: apiClient.companies.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Fetch unassigned transactions count
  const { data: unassignedData, refetch: refetchUnassigned } = useQuery({
    queryKey: ['unassigned-company-transactions'],
    queryFn: apiClient.companies.getTransactionsWithoutCompany,
    staleTime: 60 * 1000, // 1 minute
  });

  const companiesRaw = companiesResponse?.data;
  const companies = Array.isArray(companiesRaw) ? companiesRaw : [];
  const unassignedTxns = unassignedData?.transactions;
  const unassignedCount = Array.isArray(unassignedTxns) ? unassignedTxns.length : 0;

  // Create company mutation
  const createMutation = useMutation({
    mutationFn: apiClient.companies.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Company created successfully');
      setIsModalOpen(false);
      setSelectedCompany(null);
    },
    onError: (error) => {
      console.error('Create company error:', error);
      console.log('Error response:', error.response);
      console.log('Error data:', error.response?.data);
      console.log('Error details:', error.response?.data?.details);
      
      let errorMessage = 'Failed to create company';
      if (error.response?.data?.details) {
        // If we have validation details, show them
        const validationErrors = error.response.data.details.map(detail => detail.msg).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    }
  });

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.companies.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Company updated successfully');
      setIsModalOpen(false);
      setSelectedCompany(null);
    },
    onError: (error) => {
      console.error('Update company error:', error);
      toast.error(error.response?.data?.message || 'Failed to update company');
    }
  });

  // Delete company mutation
  const deleteMutation = useMutation({
    mutationFn: apiClient.companies.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Company deleted successfully');
    },
    onError: (error) => {
      console.error('Delete company error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete company');
    }
  });

  // Set default company mutation
  const setDefaultMutation = useMutation({
    mutationFn: apiClient.companies.setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      toast.success('Default company updated');
    },
    onError: (error) => {
      console.error('Set default company error:', error);
      toast.error(error.response?.data?.message || 'Failed to set default company');
    }
  });

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteCompany = async (companyId, companyName) => {
    if (!companyId) {
      console.error('Company ID is missing!');
      toast.error('Cannot delete company: ID is missing');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(companyId);
    }
  };

  const handleSetDefault = (companyId) => {
    setDefaultMutation.mutate(companyId);
  };

  const handleSaveCompany = (companyData) => {
    if (modalMode === 'create') {
      createMutation.mutate(companyData);
    } else {
      updateMutation.mutate({ id: selectedCompany.id, data: companyData });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your business entities</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading companies...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your business entities</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-center py-8">
              <div className="text-red-600 dark:text-red-400">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-lg font-medium">Error loading companies</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {error.message?.includes('index') 
                    ? 'Database configuration needed. Your companies may load after initial setup is complete.'
                    : error.message || 'Please try refreshing the page'
                  }
                </p>
                <button
                  onClick={handleCreateCompany}
                  className="mt-4 btn btn-primary"
                >
                  Create New Company
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'companies', label: 'Companies', icon: '🏢' },
    { key: 'assignment', label: `Transaction Assignment ${unassignedCount > 0 ? `(${unassignedCount})` : ''}`, icon: '📝', badge: unassignedCount }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Management</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your business entities ({companies.length} {companies.length === 1 ? 'company' : 'companies'})
          </p>
        </div>
        {activeTab === 'companies' && (
          <button
            onClick={handleCreateCompany}
            className="btn btn-primary"
            disabled={createMutation.isLoading}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {activeTab === 'assignment' ? (
          <TransactionCompanyAssignment 
            onAssignmentComplete={() => {
              refetchUnassigned();
              refetch();
            }}
          />
        ) : (
          <div className="card-body">
            {companies.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No companies yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Get started by creating your first company or business entity.
                  </p>
                  <button
                    onClick={handleCreateCompany}
                    className="btn btn-primary"
                  >
                    Create Your First Company
                  </button>
                </div>
              </div>
            ) : (
              <CompanyList
                companies={companies}
                onEdit={handleEditCompany}
                onDelete={handleDeleteCompany}
                onSetDefault={handleSetDefault}
                isDeleting={deleteMutation.isLoading}
                isSettingDefault={setDefaultMutation.isLoading}
              />
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <CompanyForm
          company={modalMode === 'edit' ? selectedCompany : null}
          mode={modalMode}
          onSave={handleSaveCompany}
          onCancel={handleCloseModal}
          isLoading={createMutation.isLoading || updateMutation.isLoading}
        />
      )}
    </div>
  );
};

export default CompanyManagement;
