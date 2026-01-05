import React, { useState } from 'react';
import { 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

/**
 * IncomeSourceList - Displays list of income sources (customers, income types)
 */
const IncomeSourceList = ({ sources: sourcesProp = [], isLoading, onEdit, onDelete }) => {
  // Ensure sources is always an array to prevent .filter errors
  const sources = Array.isArray(sourcesProp) ? sourcesProp : [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredSources = sources.filter(source => {
    const matchesSearch = !searchTerm || 
      source.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      source.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || source.sourceType === filterType;
    
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Loading income sources...
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search income sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="customer">Customers</option>
          <option value="service">Services</option>
          <option value="product">Products</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* List */}
      {filteredSources.length === 0 ? (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No income sources</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filterType !== 'all' 
              ? 'No sources match your search criteria.'
              : 'Get started by creating a new income source.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSources.map(source => (
            <div 
              key={source.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  source.sourceType === 'customer' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                  source.sourceType === 'service' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' :
                  source.sourceType === 'product' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' :
                  'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  <CurrencyDollarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{source.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{source.sourceType || 'Other'}</span>
                    {source.category && (
                      <>
                        <span>•</span>
                        <span>{source.category}</span>
                      </>
                    )}
                    {source.transactionCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{source.transactionCount} transactions</span>
                      </>
                    )}
                  </div>
                  {source.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{source.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {source.totalAmount !== undefined && (
                  <div className="text-right">
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(source.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Income</div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(source)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(source.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncomeSourceList;
