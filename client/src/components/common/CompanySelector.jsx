import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';

const CompanySelector = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select a company...',
  allowCreate = false,
  allowAll = false,
  onCreateNew = null,
  error = null,
  required = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch companies
  const { data: companiesResponse, isLoading, error: apiError } = useQuery({
    queryKey: ['companies'],
    queryFn: api.companies.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Server returns { success: true, data: [...] }
  // Supabase returns { success: true, data: { companies: [...] } }
  const companiesRaw = Array.isArray(companiesResponse?.data) 
    ? companiesResponse.data 
    : companiesResponse?.data?.companies;
  const companies = Array.isArray(companiesRaw) ? companiesRaw : [];
  const hasApiError = !!apiError;
  const hasCompanies = companies.length > 0;

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.legalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected company
  const selectedCompany = value === 'all' && allowAll 
    ? { id: 'all', name: 'All Companies' }
    : companies.find(company => company.id === value);

  const handleSelect = (company) => {
    onChange(company.id, company);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew(searchTerm);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.company-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative company-selector ${className}`}>
      <div
        className={`form-input cursor-pointer flex items-center justify-between ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedCompany ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedCompany ? (
            <div className="flex items-center">
              <span className="font-medium">{selectedCompany.name}</span>
              {selectedCompany.isDefault && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                  Default
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400"
              placeholder="Search companies..."
              autoFocus
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto"></div>
              <span className="text-sm mt-1">Loading companies...</span>
            </div>
          )}

          {/* Error State */}
          {hasApiError && !isLoading && (
            <div className="p-3 text-center text-red-500 dark:text-red-400">
              <div className="text-sm">
                <div className="font-medium">Failed to load companies</div>
                <div className="mt-1 text-xs">
                  {apiError.message?.includes('index') 
                    ? 'Database configuration needed. Please contact support.'
                    : 'Please try again or contact support if the problem persists.'
                  }
                </div>
              </div>
              {allowCreate && onCreateNew && (
                <button
                  type="button"
                  onClick={() => onCreateNew('')}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                >
                  Create New Company
                </button>
              )}
            </div>
          )}

          {/* Companies List */}
          {!isLoading && !hasApiError && (
            <div className="max-h-48 overflow-y-auto">
              {/* All Companies Option */}
              {allowAll && (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none border-b border-gray-200 dark:border-gray-600"
                  onClick={() => handleSelect({ id: 'all', name: 'All Companies' })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        All Companies
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Include all companies in results
                      </div>
                    </div>
                    {value === 'all' && (
                      <div className="text-blue-600 dark:text-blue-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )}
              
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none"
                    onClick={() => handleSelect(company)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {company.name}
                        </div>
                        {company.legalName && company.legalName !== company.name && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {company.legalName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {company.isDefault && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                            Default
                          </span>
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          company.status === 'active' 
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {company.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : searchTerm ? (
                <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-sm">No companies found matching "{searchTerm}"</div>
                  {allowCreate && onCreateNew && (
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                    >
                      Create "{searchTerm}" as new company
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-sm">
                    {hasCompanies ? 'No companies available' : 'No companies found'}
                  </div>
                  {!hasCompanies && allowCreate && onCreateNew && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(false);
                        onCreateNew('');
                      }}
                      className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                    >
                      Create Your First Company
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create New Option */}
          {allowCreate && onCreateNew && !searchTerm && hasCompanies && !hasApiError && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  onCreateNew('');
                }}
                className="w-full px-3 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none text-sm font-medium"
              >
                <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Company
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default CompanySelector;
