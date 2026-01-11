import React from 'react';

const CompanyList = ({ 
  companies: companiesProp = [], 
  onEdit, 
  onDelete, 
  onSetDefault, 
  isDeleting, 
  isSettingDefault 
}) => {
  // Ensure companies is always an array
  const companies = Array.isArray(companiesProp) ? companiesProp : [];
  
  console.log('CompanyList received companies:', companies);
  
  const formatAddress = (address) => {
    if (!address) return 'No address';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'No address';
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses.inactive}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeClasses = {
      business: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      personal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      subsidiary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      partnership: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeClasses[type] || typeClasses.business}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {companies.map((company, index) => (
        <div
          key={company.id || `company-${index}`}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {company.name}
                </h3>
                {company.isDefault && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Default
                  </span>
                )}
                {getStatusBadge(company.status)}
                {getTypeBadge(company.type)}
              </div>

              {company.legalName && company.legalName !== company.name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Legal Name: {company.legalName}
                </p>
              )}

              {company.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {company.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="space-y-1">
                    {company.phone && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {company.phone}
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {company.email}
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-start text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{formatAddress(company.address)}</span>
                  </div>
                  {company.taxId && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Tax ID: {company.taxId}
                    </div>
                  )}
                </div>
              </div>

              {(company.extractedFromPDF || company.source === 'pdf_import') && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Extracted from PDF
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {!company.isDefault && (
                <button
                  onClick={() => onSetDefault(company.id)}
                  className={`text-sm font-medium px-3 py-1 rounded-md transition-colors duration-200 ${
                    isSettingDefault
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                  }`}
                  disabled={isSettingDefault}
                  title="Set as default company"
                >
                  {isSettingDefault ? 'Setting...' : 'Set Default'}
                </button>
              )}
              
              <button
                onClick={() => onEdit(company)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                title="Edit company"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={() => onDelete(company.id, company.name)}
                className={`p-2 transition-colors duration-200 rounded-md ${
                  isDeleting
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
                disabled={isDeleting}
                title={company.isDefault ? "Delete default company" : "Delete company"}
                style={!isDeleting ? { cursor: 'pointer' } : { cursor: 'not-allowed' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyList;
